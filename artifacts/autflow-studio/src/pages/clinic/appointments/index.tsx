import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarDays, Clock, User, MoreHorizontal, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow } from "date-fns";

interface Appointment { id: number; patientId: number; patientName: string | null; date: string; time: string; type: string; status: string; notes: string | null; }
interface Patient { id: number; name: string; }

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800", icon: CalendarDays },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-zinc-500/10 text-zinc-500 border-zinc-200 dark:border-zinc-700", icon: XCircle },
  missed: { label: "Missed", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800", icon: XCircle },
};

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Request failed"); }
  return res.json();
}

function dateLabel(d: string) {
  const date = new Date(d + "T00:00:00");
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patientId: "", date: "", time: "", type: "consultation", notes: "" });

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["clinic-appointments", statusFilter],
    queryFn: () => apiRequest(`/api/clinic/appointments${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["clinic-patients"],
    queryFn: () => apiRequest("/api/clinic/patients"),
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("/api/clinic/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, patientId: Number(body.patientId) }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-appointments"] }); setShowAdd(false); setForm({ patientId: "", date: "", time: "", type: "consultation", notes: "" }); toast({ title: "Appointment scheduled" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest(`/api/clinic/appointments/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinic-appointments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clinic/appointments/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-appointments"] }); toast({ title: "Appointment removed" }); },
  });

  // Group by date
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">{appointments.length} appointment{appointments.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={15} />Schedule</Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading appointments…</div>
      ) : sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <CalendarDays size={28} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">No appointments scheduled</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first appointment to get started.</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus size={14} />Schedule Appointment</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <CalendarDays size={13} />
                {dateLabel(date)}
              </p>
              <div className="grid gap-2">
                {grouped[date]!.map((a) => {
                  const meta = STATUS_META[a.status] ?? STATUS_META.scheduled!;
                  return (
                    <div key={a.id} className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5 hover:bg-card/80 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 shrink-0">
                          <Clock size={12} className="text-muted-foreground mb-0.5" />
                          <span className="text-sm font-semibold tabular-nums">{a.time}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            <User size={12} className="text-muted-foreground" />
                            {a.patientName ?? "Unknown patient"}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">{a.type.replace(/-/g, " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal size={14} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {a.status === "scheduled" && <>
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: a.id, status: "completed" })} className="gap-2"><CheckCircle2 size={13} />Mark Completed</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: a.id, status: "cancelled" })} className="gap-2"><XCircle size={13} />Cancel</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: a.id, status: "missed" })} className="gap-2 text-amber-600"><XCircle size={13} />Mark Missed</DropdownMenuItem>
                            </>}
                            <DropdownMenuItem className="text-destructive gap-2" onClick={() => deleteMutation.mutate(a.id)}><Trash2 size={13} />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Time *</Label><Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Appointment type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="check-up">Check-up</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea placeholder="Any notes for this appointment…" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.patientId || !form.date || !form.time || addMutation.isPending} onClick={() => addMutation.mutate(form)}>
              {addMutation.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
