import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, FileText, Stethoscope, CreditCard, Clock, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PatientDetail {
  id: number; name: string; phone: string | null; email: string | null; dateOfBirth: string | null;
  gender: string | null; address: string | null; status: string; notes: string | null; createdAt: string;
  appointments: { id: number; date: string; time: string; type: string; status: string }[];
  treatments: { id: number; name: string; date: string; status: string; cost: number | null }[];
  billing: { id: number; description: string; amount: number; status: string; dueDate: string | null }[];
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? "Request failed"); }
  return res.json();
}

type Tab = "overview" | "appointments" | "treatments" | "billing";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 dark:text-green-400",
  inactive: "bg-zinc-500/10 text-zinc-500",
  discharged: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  scheduled: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
  cancelled: "bg-zinc-500/10 text-zinc-500",
  missed: "bg-red-500/10 text-red-600 dark:text-red-400",
  planned: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "in-progress": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  paid: "bg-green-500/10 text-green-600 dark:text-green-400",
  overdue: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function PatientDetailPage() {
  const [, params] = useRoute("/patients/:id");
  const id = params?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const { data: patient, isLoading } = useQuery<PatientDetail>({
    queryKey: ["clinic-patient", id],
    queryFn: () => apiRequest(`/api/clinic/patients/${id}`),
    enabled: !!id,
    onSuccess: (d) => setNotesValue(d.notes ?? ""),
  } as any);

  const saveNotes = useMutation({
    mutationFn: (notes: string) => apiRequest(`/api/clinic/patients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-patient", id] }); setEditingNotes(false); toast({ title: "Notes saved" }); },
  });

  if (isLoading) return <div className="flex-1 flex items-center justify-center p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!patient) return <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground">Patient not found.</div>;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "appointments", label: "Appointments", count: patient.appointments.length },
    { key: "treatments", label: "Treatments", count: patient.treatments.length },
    { key: "billing", label: "Billing", count: patient.billing.length },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Back */}
      <Link href="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Back to Patients
      </Link>

      {/* Patient header */}
      <div className="flex items-start gap-5">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{patient.name}</h1>
            <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[patient.status] ?? ""}`}>{patient.status}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {patient.phone && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone size={12} />{patient.phone}</span>}
            {patient.email && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail size={12} />{patient.email}</span>}
            {patient.dateOfBirth && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar size={12} />DOB {patient.dateOfBirth}</span>}
            {patient.gender && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><User size={12} className="capitalize" />{patient.gender}</span>}
          </div>
          {patient.address && <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1"><MapPin size={12} />{patient.address}</p>}
        </div>
        <p className="text-xs text-muted-foreground shrink-0">Patient since {format(new Date(patient.createdAt), "MMM d, yyyy")}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 tabular-nums">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Medical notes */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><FileText size={15} />Medical Notes</h3>
              {!editingNotes && (
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => { setNotesValue(patient.notes ?? ""); setEditingNotes(true); }}>
                  <Pencil size={12} /> Edit
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-3">
                <Textarea rows={5} value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Add medical notes…" />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditingNotes(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveNotes.mutate(notesValue)} disabled={saveNotes.isPending}>{saveNotes.isPending ? "Saving…" : "Save"}</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{patient.notes || "No notes recorded."}</p>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Clock, label: "Appointments", value: patient.appointments.length },
              { icon: Stethoscope, label: "Treatments", value: patient.treatments.length },
              { icon: CreditCard, label: "Billing records", value: patient.billing.length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                <Icon size={18} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{patient.appointments.length} appointment{patient.appointments.length !== 1 ? "s" : ""}</p>
            <Link href="/appointments"><Button size="sm" variant="outline" className="gap-1.5"><Plus size={12} />New Appointment</Button></Link>
          </div>
          {patient.appointments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">No appointments for this patient yet.</div>
          ) : (
            <div className="grid gap-2">
              {[...patient.appointments].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{format(new Date(a.date + "T00:00:00"), "EEE, MMM d yyyy")} at {a.time}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{a.type.replace(/-/g, " ")}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[a.status] ?? ""}`}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "treatments" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{patient.treatments.length} treatment{patient.treatments.length !== 1 ? "s" : ""}</p>
            <Link href="/treatments"><Button size="sm" variant="outline" className="gap-1.5"><Plus size={12} />New Treatment</Button></Link>
          </div>
          {patient.treatments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">No treatments recorded for this patient.</div>
          ) : (
            <div className="grid gap-2">
              {[...patient.treatments].sort((a, b) => b.date.localeCompare(a.date)).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(t.date + "T00:00:00"), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.cost != null && <span className="text-sm font-medium">${t.cost.toFixed(2)}</span>}
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[t.status] ?? ""}`}>{t.status.replace(/-/g, " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total: ${patient.billing.reduce((s, b) => s + b.amount, 0).toFixed(2)} ·
              Paid: ${patient.billing.filter((b) => b.status === "paid").reduce((s, b) => s + b.amount, 0).toFixed(2)}
            </p>
            <Link href="/clinic-billing"><Button size="sm" variant="outline" className="gap-1.5"><Plus size={12} />New Record</Button></Link>
          </div>
          {patient.billing.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">No billing records for this patient.</div>
          ) : (
            <div className="grid gap-2">
              {patient.billing.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{b.description}</p>
                    {b.dueDate && <p className="text-xs text-muted-foreground mt-0.5">Due {format(new Date(b.dueDate + "T00:00:00"), "MMM d, yyyy")}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">${b.amount.toFixed(2)}</span>
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[b.status] ?? ""}`}>{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
