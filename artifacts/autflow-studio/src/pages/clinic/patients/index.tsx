import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, User, Phone, Mail, Calendar, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Patient {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  inactive: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
  discharged: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
};

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Request failed"); }
  return res.json();
}

export default function PatientsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", dateOfBirth: "", gender: "", address: "", notes: "" });

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["clinic-patients", search],
    queryFn: () => apiRequest(`/api/clinic/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("/api/clinic/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-patients"] }); setShowAdd(false); setForm({ name: "", phone: "", email: "", dateOfBirth: "", gender: "", address: "", notes: "" }); toast({ title: "Patient added" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clinic/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-patients"] }); toast({ title: "Patient removed" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">{patients.length} patient{patients.length !== 1 ? "s" : ""} in your practice</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus size={15} /> Add Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search patients…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading patients…</div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
            <User size={28} className="text-rose-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">{search ? "No patients found" : "No patients yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Try a different search term." : "Add your first patient to start managing care."}
            </p>
          </div>
          {!search && <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={14} />Add Patient</Button>}
        </div>
      ) : (
        <div className="grid gap-3">
          {patients.map((p) => (
            <div key={p.id} className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-border/80 hover:bg-card/80 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10} />{p.phone}</span>}
                    {p.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={10} />{p.email}</span>}
                    {p.dateOfBirth && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar size={10} />DOB {p.dateOfBirth}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</Badge>
                <span className="text-xs text-muted-foreground hidden sm:block">Since {format(new Date(p.createdAt), "MMM d, yyyy")}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal size={14} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href={`/patients/${p.id}`} className="flex items-center gap-2"><Eye size={13} />View Profile</Link></DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive gap-2" onClick={() => deleteMutation.mutate(p.id)}><Trash2 size={13} />Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Patient Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Patient</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Full name *</Label><Input placeholder="Jane Smith" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phone</Label><Input placeholder="+1 555 000 0000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="jane@email.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Date of birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Input placeholder="123 Main St, City" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea placeholder="Any relevant medical notes…" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.name || addMutation.isPending} onClick={() => addMutation.mutate(form)}>
              {addMutation.isPending ? "Adding…" : "Add Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
