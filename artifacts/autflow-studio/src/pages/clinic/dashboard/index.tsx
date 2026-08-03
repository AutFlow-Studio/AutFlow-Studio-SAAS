import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CalendarDays,
  Users,
  Clock,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  Bell,
  Stethoscope,
  ArrowRight,
  TrendingUp,
  Bot,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import { isToday, isPast, format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  appointments: {
    today: { id: number; time: string; type: string; status: string; patientName: string | null }[];
    todayCount: number;
    upcoming: { id: number; date: string; time: string; type: string; patientName: string | null }[];
    completedTotal: number;
  };
  patients: { total: number; new: number; needingFollowup: number };
  billing: { revenue: number; pendingPayments: number; overduePayments: number };
  activity: {
    overdueFollowups: { id: number; dueDate: string; patientName: string | null }[];
    recentTreatments: { id: number; name: string; date: string; status: string; patientName: string | null }[];
  };
}

interface ClinicSummary {
  greeting: string;
  headline: string;
  alerts: string[];
  recommendedActions: string[];
  upcomingPriorities: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiRequest<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-border bg-card p-5 hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} />
        </div>
        {href && <ArrowRight size={14} className="text-muted-foreground" />}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── AI Summary Widget ─────────────────────────────────────────────────────────

function AISummaryWidget() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<{ summary: ClinicSummary; generatedAt: string; aiGenerated: boolean }>({
    queryKey: ["clinic-ai-summary"],
    queryFn: () => apiRequest("/api/ai/clinic-summary"),
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot size={15} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold">AI Summary</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">
              Generating…
            </span>
          </div>
        </div>
        <div className="space-y-2.5 animate-pulse">
          <div className="h-4 bg-muted/60 rounded w-3/4" />
          <div className="h-3 bg-muted/40 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="h-16 bg-muted/30 rounded-xl" />
            <div className="h-16 bg-muted/30 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold">AI Summary</span>
        </div>
        <p className="text-xs text-muted-foreground">
          AI summary unavailable. Add an{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">OPENAI_API_KEY</code>{" "}
          to enable daily intelligence.
        </p>
      </div>
    );
  }

  const { summary, aiGenerated } = data;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-purple-500/3 to-transparent p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <Bot size={15} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Today's AI Summary</span>
              {aiGenerated && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">
                  <Sparkles size={9} />
                  AI
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          title="Refresh summary"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Headline */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground font-medium">{summary.greeting}</p>
        <p className="text-sm leading-relaxed">{summary.headline}</p>
      </div>

      {/* Alerts + Recommended Actions */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Alerts */}
        {summary.alerts.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={13} className="text-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Alerts
              </span>
            </div>
            <ul className="space-y-1">
              {summary.alerts.map((alert, i) => (
                <li key={i} className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed flex gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Actions */}
        {summary.recommendedActions.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={13} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Recommended
              </span>
            </div>
            <ul className="space-y-1">
              {summary.recommendedActions.map((action, i) => (
                <li key={i} className="text-xs text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed flex gap-1.5">
                  <span className="mt-0.5 shrink-0">{i + 1}.</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upcoming Priorities (shown if no alerts to fill the grid) */}
        {summary.alerts.length === 0 && summary.upcomingPriorities.length > 0 && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={13} className="text-blue-500 shrink-0" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Upcoming
              </span>
            </div>
            <ul className="space-y-1">
              {summary.upcomingPriorities.map((p, i) => (
                <li key={i} className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed flex gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Link to AI assistant */}
      <Link
        href="/ai-assistant"
        className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline w-fit"
      >
        Ask AI anything about your clinic
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function ClinicDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["clinic-dashboard"],
    queryFn: () => apiRequest("/api/clinic/dashboard"),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading clinic overview…</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { appointments, patients, billing, activity } = data;
  const overdueCount = activity.overdueFollowups.length;

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Practice Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* AI Summary Widget */}
      <AISummaryWidget />

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <Link href="/followups">
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 cursor-pointer hover:bg-amber-500/10 transition-colors">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <span className="font-semibold">
                {overdueCount} overdue follow-up{overdueCount > 1 ? "s" : ""}
              </span>{" "}
              need attention — view follow-ups
            </p>
            <ArrowRight size={14} className="text-amber-500 ml-auto" />
          </div>
        </Link>
      )}

      {/* Today's appointments */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Today's Appointments
          </h2>
          <Link
            href="/appointments"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {appointments.today.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-6 text-center">
            <CalendarDays size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No appointments today</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {appointments.today.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3"
              >
                <div className="flex items-center gap-2 w-16 shrink-0">
                  <Clock size={12} className="text-muted-foreground" />
                  <span className="text-sm font-medium tabular-nums">{a.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {a.patientName ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {a.type.replace(/-/g, " ")}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === "completed"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : a.status === "cancelled"
                        ? "bg-zinc-500/10 text-zinc-500"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats grid */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Patient Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Total patients"
            value={patients.total}
            color="bg-rose-500/10 text-rose-500"
            href="/patients"
          />
          <StatCard
            icon={Users}
            label="New this week"
            value={patients.new}
            color="bg-blue-500/10 text-blue-500"
            href="/patients"
          />
          <StatCard
            icon={Bell}
            label="Needing follow-up"
            value={patients.needingFollowup}
            color={
              patients.needingFollowup > 0
                ? "bg-amber-500/10 text-amber-500"
                : "bg-muted text-muted-foreground"
            }
            href="/followups"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Appointments
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            icon={CalendarDays}
            label="Today"
            value={appointments.todayCount}
            color="bg-blue-500/10 text-blue-500"
            href="/appointments"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed total"
            value={appointments.completedTotal}
            color="bg-green-500/10 text-green-500"
          />
          <StatCard
            icon={CalendarDays}
            label="Upcoming"
            value={appointments.upcoming.length}
            color="bg-violet-500/10 text-violet-500"
            href="/appointments"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Financial Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Revenue collected"
            value={`$${billing.revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            color="bg-green-500/10 text-green-500"
            href="/clinic-billing"
          />
          <StatCard
            icon={CreditCard}
            label="Pending payments"
            value={`$${billing.pendingPayments.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            color="bg-amber-500/10 text-amber-500"
            href="/clinic-billing"
          />
          <StatCard
            icon={CreditCard}
            label="Overdue"
            value={`$${billing.overduePayments.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            color={
              billing.overduePayments > 0
                ? "bg-red-500/10 text-red-500"
                : "bg-muted text-muted-foreground"
            }
            href="/clinic-billing"
          />
        </div>
      </section>

      {/* Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming appointments */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Upcoming
            </h2>
            <Link href="/appointments" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {appointments.upcoming.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
              No upcoming appointments
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {appointments.upcoming.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <CalendarDays size={13} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.patientName ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.date + "T00:00:00"), "EEE MMM d")} at{" "}
                      {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent treatments */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Treatments
            </h2>
            <Link href="/treatments" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {activity.recentTreatments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
              No treatments recorded yet
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {activity.recentTreatments.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <Stethoscope size={13} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.patientName} ·{" "}
                      {format(new Date(t.date + "T00:00:00"), "MMM d")}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      t.status === "completed"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
