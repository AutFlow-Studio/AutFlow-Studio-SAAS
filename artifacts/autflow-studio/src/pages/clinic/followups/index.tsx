import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Bell, AlertTriangle, CheckCircle2, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";

interface Followup { id: number; patientId: number; patientName: string | null; reason: string; dueDate: string; status: string; notes: string | null; }
interface Patient { id: number; name: string; }

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Request failed"); }
  return res.json();
}

function dueDateLabel(d: string) {
  const date = new Date(d + "T00:00:00");
  if (isToday(date)) return { label: "Due today", urgent: true };
  if (isPast(date)) return { label: `Overdue — ${format(date, "MMM d")}`, urgent: true };
  return { label: `Due ${format(date, "MMM d, yyyy")}`, urgent: false };
}

export default function FollowupsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patientId: "", reason: "", dueDate: "", notes: "" });

  const { data: followups = [], isLoading } = useQuery<Followup[]>({
    queryKey: ["clinic-followups", statusFilter],
    queryFn: () => apiRequest(`/api/clinic/followups${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["clinic-patients"],
    queryFn: () => apiRequest("/api/clinic/patients"),
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("/api/clinic/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, patientId: Number(body.patientId) }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-followups"] }); setShowAdd(false); setForm({ patientId: "", reason: "", dueDate: "", notes: "" }); toast({ title: "Follow-up added" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const complete = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clinic/followups/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-followups"] }); toast({ title: "Follow-up completed" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clinic/followups/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-followups"] }); toast({ title: "Follow-up removed" }); },
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">{followups.length} follow-up{followups.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={15} />Add Follow-up</Button>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading follow-ups…</div>
      ) : followups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Bell size={28} className="text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">No follow-ups</p>
            <p className="text-sm text-muted-foreground mt-1">Add follow-ups to stay on top of patient care.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={14} />Add Follow-up</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {followups.map((f) => {
            const { label, urgent } = dueDateLabel(f.dueDate);
            return (
              <div key={f.id} className={`group flex items-center justify-between rounded-xl border bg-card px-5 py-4 hover:bg-card/80 transition-all ${urgent && f.status === "pending" ? "border-amber-500/40" : "border-border"}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${urgent && f.status === "pending" ? "bg-amber-500/10" : "bg-muted"}`}>
                    {urgent && f.status === "pending" ? <AlertTriangle size={15} className="text-amber-500" /> : <Bell size={15} className="text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{f.reason}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.patientName} · <span className={urgent && f.status === "pending" ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>{label}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className={`text-xs ${f.status === "completed" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"}`}>
                    {f.status === "completed" ? "Completed" : "Pending"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal size={14} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {f.status === "pending" && <DropdownMenuItem onClick={() => complete.mutate(f.id)} className="gap-2"><CheckCircle2 size={13} />Mark Done</DropdownMenuItem>}
                      <DropdownMenuItem className="text-destructive gap-2" onClick={() => deleteMutation.mutate(f.id)}><Trash2 size={13} />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Reason *</Label><Input placeholder="e.g. Post-surgery check-in" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Due date *</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea placeholder="Additional notes…" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.patientId || !form.reason || !form.dueDate || addMutation.isPending} onClick={() => addMutation.mutate(form)}>
              {addMutation.isPending ? "Adding…" : "Add Follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
