import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CreditCard, MoreHorizontal, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BillingRecord { id: number; patientId: number; patientName: string | null; description: string; amount: number; status: string; dueDate: string | null; createdAt: string; }
interface Patient { id: number; name: string; }

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  overdue: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
};

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Request failed"); }
  return res.json();
}

export default function ClinicBillingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patientId: "", description: "", amount: "", status: "pending", dueDate: "" });

  const { data: records = [], isLoading } = useQuery<BillingRecord[]>({
    queryKey: ["clinic-billing", statusFilter],
    queryFn: () => apiRequest(`/api/clinic/billing${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["clinic-patients"],
    queryFn: () => apiRequest("/api/clinic/patients"),
  });

  const totalRevenue = records.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const totalPending = records.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const totalOverdue = records.filter((r) => r.status === "overdue").reduce((s, r) => s + r.amount, 0);

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("/api/clinic/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, patientId: Number(body.patientId), amount: Number(body.amount) }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-billing"] }); setShowAdd(false); setForm({ patientId: "", description: "", amount: "", status: "pending", dueDate: "" }); toast({ title: "Billing record added" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clinic/billing/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid" }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-billing"] }); toast({ title: "Marked as paid" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clinic/billing/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-billing"] }); toast({ title: "Record removed" }); },
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Patient payment records</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={15} />Add Record</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Revenue", value: totalRevenue, color: "text-green-600 dark:text-green-400" },
          { label: "Pending", value: totalPending, color: "text-amber-600 dark:text-amber-400" },
          { label: "Overdue", value: totalOverdue, color: "text-red-600 dark:text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold tabular-nums mt-1 ${color}`}>${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading billing records…</div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CreditCard size={28} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-lg">No billing records</p>
            <p className="text-sm text-muted-foreground mt-1">Add patient billing records to track revenue and payments.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={14} />Add Record</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {records.map((r) => (
            <div key={r.id} className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:bg-card/80 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <CreditCard size={15} className="text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.patientName} · {r.dueDate ? `Due ${format(new Date(r.dueDate + "T00:00:00"), "MMM d, yyyy")}` : format(new Date(r.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold tabular-nums">${r.amount.toFixed(2)}</span>
                <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[r.status] ?? ""}`}>{r.status}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal size={14} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {r.status !== "paid" && <DropdownMenuItem onClick={() => markPaid.mutate(r.id)} className="gap-2"><CheckCircle2 size={13} />Mark Paid</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive gap-2" onClick={() => deleteMutation.mutate(r.id)}><Trash2 size={13} />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Billing Record</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Description *</Label><Input placeholder="e.g. Consultation fee" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Amount ($) *</Label><Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.patientId || !form.description || !form.amount || addMutation.isPending} onClick={() => addMutation.mutate(form)}>
              {addMutation.isPending ? "Adding…" : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
