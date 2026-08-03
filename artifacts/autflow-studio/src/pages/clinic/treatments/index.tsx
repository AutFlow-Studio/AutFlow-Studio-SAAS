import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Stethoscope, MoreHorizontal, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Treatment { id: number; patientId: number; patientName: string | null; name: string; date: string; status: string; cost: number | null; notes: string | null; }
interface Patient { id: number; name: string; }

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "in-progress": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-200 dark:border-zinc-700",
};

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Request failed"); }
  return res.json();
}

export default function TreatmentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patientId: "", name: "", date: "", status: "planned", cost: "", notes: "" });

  const { data: treatments = [], isLoading } = useQuery<Treatment[]>({
    queryKey: ["clinic-treatments", statusFilter],
    queryFn: () => apiRequest(`/api/clinic/treatments${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["clinic-patients"],
    queryFn: () => apiRequest("/api/clinic/patients"),
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("/api/clinic/treatments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, patientId: Number(body.patientId), cost: body.cost ? Number(body.cost) : undefined }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-treatments"] }); setShowAdd(false); setForm({ patientId: "", name: "", date: "", status: "planned", cost: "", notes: "" }); toast({ title: "Treatment added" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest(`/api/clinic/treatments/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinic-treatments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clinic/treatments/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-treatments"] }); toast({ title: "Treatment removed" }); },
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Treatments</h1>
          <p className="text-sm text-muted-foreground">{treatments.length} treatment{treatments.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={15} />Add Treatment</Button>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="planned">Planned</SelectItem>
          <SelectItem value="in-progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading treatments…</div>
      ) : treatments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
            <Stethoscope size={28} className="text-rose-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">No treatments recorded</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first treatment to begin tracking patient care.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={14} />Add Treatment</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {treatments.map((t) => (
            <div key={t.id} className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:bg-card/80 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Stethoscope size={15} className="text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.patientName} · {format(new Date(t.date + "T00:00:00"), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {t.cost != null && <span className="text-sm font-medium tabular-nums">${t.cost.toFixed(2)}</span>}
                <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[t.status] ?? ""}`}>{t.status.replace(/-/g, " ")}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal size={14} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {t.status !== "completed" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: t.id, status: "completed" })} className="gap-2"><CheckCircle2 size={13} />Mark Completed</DropdownMenuItem>}
                    {t.status === "planned" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: t.id, status: "in-progress" })} className="gap-2">Start Treatment</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive gap-2" onClick={() => deleteMutation.mutate(t.id)}><Trash2 size={13} />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Treatment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Treatment name *</Label><Input placeholder="e.g. Physical Therapy Session" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Cost ($)</Label><Input type="number" placeholder="0.00" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea placeholder="Treatment notes…" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.patientId || !form.name || !form.date || addMutation.isPending} onClick={() => addMutation.mutate(form)}>
              {addMutation.isPending ? "Adding…" : "Add Treatment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
