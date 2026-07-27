import { useGetDashboard } from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { PageError } from "@/components/page-error";
import { AIBriefing } from "@/components/ai-briefing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Briefcase,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Clock,
  Calendar,
  FileText,
  Plus,
  Printer,
  Trash2,
  TriangleAlert,
  Download,
  CheckCircle2,
  ShieldAlert,
  Target,
  DollarSign,
  Activity,
  ArrowRight,
  XCircle,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, getProjectStatusVariant } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DashboardStats = ReturnType<typeof useGetDashboard>["data"] & {
  mrr: number;
  overdueInvoiceCount: number;
  overdueAmount: number;
  completionRate: number;
  healthScore: number;
  inactiveClients: number;
  healthBreakdown: {
    revenue: number;
    delivery: number;
    clientActivity: number;
    payments: number;
  };
};

// ---------------------------------------------------------------------------
// Clear Data Dialog
// ---------------------------------------------------------------------------

const REQUIRED_PHRASE = "DELETE ALL DATA";
const EXPORT_FILES = [
  { url: "/api/export/clients.csv", name: "clients.csv" },
  { url: "/api/export/projects.csv", name: "projects.csv" },
  { url: "/api/export/tasks.csv", name: "tasks.csv" },
  { url: "/api/export/invoices.csv", name: "invoices.csv" },
  { url: "/api/export/documents.csv", name: "documents.csv" },
] as const;

function ClearDataDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phrase, setPhrase] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isConfirmed = phrase === REQUIRED_PHRASE;

  function handleClose(v: boolean) {
    if (!isPending && !isExporting) {
      onOpenChange(v);
      if (!v) setPhrase("");
    }
  }

  async function handleExportAll() {
    setIsExporting(true);
    try {
      for (const file of EXPORT_FILES) {
        const a = document.createElement("a");
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 250));
      }
      toast({ title: "Export started", description: "Your CSV files are downloading." });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleConfirm() {
    if (!isConfirmed || isPending) return;
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationPhrase: REQUIRED_PHRASE }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Clear failed");
      }
      queryClient.invalidateQueries();
      toast({ title: "Data cleared", description: "All business data has been permanently removed." });
      handleClose(false);
    } catch (err) {
      toast({
        title: "Clear failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert size={18} />
            Permanently delete all business data?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p className="text-destructive font-semibold">⚠️ This is an irreversible, unrecoverable action.</p>
              <p className="text-muted-foreground">The following will be permanently destroyed:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>All clients and contact information</li>
                <li>All projects and deliverables</li>
                <li>All invoices and payment records</li>
                <li>All documents and uploaded files</li>
                <li>All meetings, tasks, and notes</li>
                <li>All activity history</li>
              </ul>
              <div className="rounded-md border border-border/60 bg-background/60 p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Export your data first (optional)</p>
                <p className="text-xs text-muted-foreground">Download a CSV backup of everything before clearing.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isExporting || isPending}
                  onClick={handleExportAll}
                >
                  <Download size={14} />
                  {isExporting ? "Exporting…" : "Export All Data (CSV)"}
                </Button>
              </div>
              <p className="text-destructive font-medium">
                There is no undo, no backup, and no recovery. This data will be gone forever.
              </p>
              <div className="pt-1 space-y-2">
                <Label htmlFor="reset-phrase" className="font-medium text-foreground">
                  Type <span className="font-mono font-bold tracking-wide">{REQUIRED_PHRASE}</span> to confirm:
                </Label>
                <Input
                  id="reset-phrase"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={REQUIRED_PHRASE}
                  className="font-mono"
                  disabled={isPending}
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending || isExporting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending || !isConfirmed || isExporting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
          >
            {isPending ? "Clearing…" : "Delete Everything Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Health Score Ring
// ---------------------------------------------------------------------------

function HealthScoreRing({ score }: { score: number }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);

  const color =
    score >= 75 ? "#10b981" : // emerald
    score >= 50 ? "#6366f1" : // indigo
    score >= 30 ? "#f59e0b" : // amber
    "#ef4444";                // red

  const label =
    score >= 75 ? "Healthy" :
    score >= 50 ? "Stable" :
    score >= 30 ? "At Risk" :
    "Critical";

  const labelColor =
    score >= 75 ? "text-emerald-400" :
    score >= 50 ? "text-primary" :
    score >= 30 ? "text-amber-400" :
    "text-red-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-border/40"
          />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none">{score}</span>
          <span className="text-[10px] text-muted-foreground font-medium mt-0.5">/ 100</span>
        </div>
      </div>
      <span className={cn("text-xs font-semibold", labelColor)}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health Breakdown Bar
// ---------------------------------------------------------------------------

function HealthPillar({
  label,
  score,
  max = 25,
}: {
  label: string;
  score: number;
  max?: number;
}) {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 75 ? "bg-emerald-500" :
    pct >= 50 ? "bg-primary" :
    pct >= 30 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-mono text-foreground/70">{score}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconClass?: string;
  cardClass?: string;
  href?: string;
  badge?: { label: string; variant?: "default" | "destructive" | "warning" | "success" };
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass = "text-primary",
  cardClass,
  href,
  badge,
}: KPICardProps) {
  const content = (
    <Card
      className={cn(
        "bg-card/40 backdrop-blur-sm border-border/50 transition-all duration-200 group",
        href && "hover:bg-card/70 hover:border-border/80 cursor-pointer",
        cardClass,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground leading-tight pr-2">
          {title}
        </CardTitle>
        <div className={cn("p-1.5 rounded-lg bg-background/60 border border-border/40 shrink-0", iconClass)}>
          <Icon size={13} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-2">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {badge && (
            <Badge
              variant="outline"
              className={cn(
                "mb-0.5 text-[10px] px-1.5 py-0 h-4 font-medium",
                badge.variant === "destructive" && "border-red-500/40 text-red-400 bg-red-500/10",
                badge.variant === "warning" && "border-amber-500/40 text-amber-400 bg-amber-500/10",
                badge.variant === "success" && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
              )}
            >
              {badge.label}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 leading-tight">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ---------------------------------------------------------------------------
// Risk Alert Item
// ---------------------------------------------------------------------------

type RiskSeverity = "critical" | "warning" | "info";

interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  message: string;
  href?: string;
}

function RiskAlertRow({ alert }: { alert: RiskAlert }) {
  const cfg = {
    critical: {
      icon: XCircle,
      iconClass: "text-red-400",
      rowClass: "border-red-500/15 bg-red-500/5 hover:bg-red-500/10",
      badge: "bg-red-500/15 text-red-400 border-red-500/20",
      label: "Critical",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "text-amber-400",
      rowClass: "border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      label: "Warning",
    },
    info: {
      icon: AlertCircle,
      iconClass: "text-primary/70",
      rowClass: "border-primary/15 bg-primary/5 hover:bg-primary/10",
      badge: "bg-primary/15 text-primary border-primary/20",
      label: "Info",
    },
  }[alert.severity];

  const Icon = cfg.icon;

  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors",
        cfg.rowClass,
        alert.href && "cursor-pointer",
      )}
    >
      <Icon size={14} className={cn("shrink-0", cfg.iconClass)} />
      <p className="text-xs text-foreground/90 flex-1 leading-snug">{alert.message}</p>
      {alert.href && (
        <ArrowRight size={12} className="shrink-0 text-muted-foreground/50" />
      )}
    </div>
  );

  if (alert.href) {
    return <Link key={alert.id} href={alert.href}>{inner}</Link>;
  }
  return <div key={alert.id}>{inner}</div>;
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Executive Command Center" description="Loading your workspace…" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { data: rawStats, isLoading, isError } = useGetDashboard();
  const stats = rawStats as unknown as DashboardStats;
  const { user } = useAuth();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const showResetButton = user?.role === "owner";

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Executive Command Center" description="Your agency at a glance" />
        <PageError message="Failed to load dashboard data." />
      </div>
    );
  }

  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  const quickActions = [
    { label: "New Client", icon: Users, href: "/clients" },
    { label: "New Project", icon: Briefcase, href: "/projects" },
    { label: "New Invoice", icon: CreditCard, href: "/payments" },
  ];

  // ── Risk Detection ─────────────────────────────────────────────────────────
  const riskAlerts: RiskAlert[] = [];
  const today = new Date();

  // Overdue invoices (critical)
  if ((stats.overdueInvoiceCount ?? 0) > 0) {
    riskAlerts.push({
      id: "overdue-invoices",
      severity: "critical",
      message: `${stats.overdueInvoiceCount} overdue invoice${stats.overdueInvoiceCount > 1 ? "s" : ""} totalling $${(stats.overdueAmount ?? 0).toLocaleString()} — follow up immediately.`,
      href: "/payments",
    });
  }

  // Delayed projects (critical)
  if ((stats.delayedProjects ?? 0) > 0) {
    riskAlerts.push({
      id: "delayed-projects",
      severity: "critical",
      message: `${stats.delayedProjects} project${stats.delayedProjects > 1 ? "s are" : " is"} past deadline and still in progress.`,
      href: "/projects",
    });
  }

  // Projects at risk individually
  for (const p of (stats.projectsAtRisk ?? []).slice(0, 3)) {
    const isOverdue = p.deadline && p.deadline < today.toISOString().split("T")[0]!;
    const daysOverdue = isOverdue && p.deadline
      ? differenceInDays(today, new Date(p.deadline))
      : null;
    if (!isOverdue) {
      // Low-progress upcoming deadline — warning
      riskAlerts.push({
        id: `risk-project-${p.id}`,
        severity: "warning",
        message: `"${p.name}" (${p.clientName ?? "Unknown"}) is only ${p.progress}% complete with a deadline approaching.`,
        href: `/projects/${p.id}`,
      });
    } else if (daysOverdue && daysOverdue > 0 && !riskAlerts.find(a => a.id === "delayed-projects")) {
      riskAlerts.push({
        id: `overdue-project-${p.id}`,
        severity: "critical",
        message: `"${p.name}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} past deadline.`,
        href: `/projects/${p.id}`,
      });
    }
  }

  // Outstanding (non-overdue) invoices — info
  const nonOverdueOutstanding = stats.invoicesAwaitingPayment - (stats.overdueInvoiceCount ?? 0);
  if (nonOverdueOutstanding > 0) {
    riskAlerts.push({
      id: "outstanding-invoices",
      severity: "info",
      message: `${nonOverdueOutstanding} invoice${nonOverdueOutstanding > 1 ? "s" : ""} awaiting payment ($${(stats.outstandingPayments - (stats.overdueAmount ?? 0)).toLocaleString()} outstanding).`,
      href: "/payments",
    });
  }

  // Upcoming deadlines (info)
  if ((stats.upcomingDeadlines ?? []).length > 0) {
    const next = stats.upcomingDeadlines[0]!;
    const daysLeft = next.deadline
      ? differenceInDays(new Date(next.deadline), today)
      : null;
    if (daysLeft !== null && daysLeft <= 7) {
      riskAlerts.push({
        id: `deadline-urgent-${next.id}`,
        severity: "warning",
        message: `"${next.name}" (${next.clientName ?? "Unknown"}) is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
        href: `/projects/${next.id}`,
      });
    }
  }

  // Inactive clients (info)
  if ((stats.inactiveClients ?? 0) > 0) {
    riskAlerts.push({
      id: "inactive-clients",
      severity: "info",
      message: `${stats.inactiveClients} client${stats.inactiveClients > 1 ? "s" : ""} marked inactive — consider re-engagement.`,
      href: "/clients",
    });
  }

  // Sort: critical first, then warning, then info
  const sortedAlerts = [...riskAlerts].sort((a, b) => {
    const order: Record<RiskSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = sortedAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = sortedAlerts.filter((a) => a.severity === "warning").length;

  // ── Completion Rate display ────────────────────────────────────────────────
  const completionRate = stats.completionRate ?? 0;
  const healthScore = stats.healthScore ?? 0;
  const hb = stats.healthBreakdown ?? { revenue: 0, delivery: 0, clientActivity: 0, payments: 0 };
  const mrr = stats.mrr ?? 0;

  return (
    <div className="space-y-7 pb-10">
      {showResetButton && (
        <ClearDataDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} />
      )}

      {/* ── Printable header ── */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Executive Command Center — Report</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMMM do, yyyy 'at' h:mm a")}
        </p>
      </div>

      {/* ── Page Header ── */}
      <PageHeader
        title="Executive Command Center"
        description={format(new Date(), "EEEE, MMMM do, yyyy")}
      >
        <div className="flex gap-2 print:hidden">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button size="sm" variant="outline" className="hidden md:flex gap-1.5 h-8 text-xs">
                <action.icon size={13} />
                {action.label}
              </Button>
            </Link>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="hidden md:flex gap-1.5 h-8 text-xs"
            onClick={() => window.print()}
          >
            <Printer size={13} />
            Print
          </Button>
          {showResetButton && (
            <Button
              size="sm"
              variant="outline"
              className="hidden md:flex gap-1.5 h-8 text-xs text-destructive hover:text-destructive border-destructive/30"
              onClick={() => setResetDialogOpen(true)}
            >
              <Trash2 size={13} />
              Clear Data
            </Button>
          )}
          <Link href="/clients">
            <Button size="sm" className="md:hidden">
              <Plus size={16} />
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* ── Health Score + KPI Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
        {/* Health Score Card */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50 print:hidden">
          <CardContent className="pt-5 pb-5 flex flex-col items-center gap-5 min-w-[220px]">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Business Health
              </span>
              <HealthScoreRing score={healthScore} />
            </div>
            <div className="w-full space-y-2.5 px-2">
              <HealthPillar label="Revenue" score={hb.revenue} />
              <HealthPillar label="Delivery" score={hb.delivery} />
              <HealthPillar label="Client Activity" score={hb.clientActivity} />
              <HealthPillar label="Payments" score={hb.payments} />
            </div>
          </CardContent>
        </Card>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 content-start">
          <KPICard
            title="Active Clients"
            value={stats.activeClients}
            subtitle={`out of ${stats.totalClients} total`}
            icon={Users}
            iconClass="text-primary"
            href="/clients"
          />
          <KPICard
            title="Projects In Progress"
            value={stats.projectsInProgress}
            subtitle={`${stats.completedProjects} delivered`}
            icon={Briefcase}
            iconClass="text-blue-500"
            href="/projects"
          />
          <KPICard
            title="This Month's Revenue"
            value={`$${mrr.toLocaleString()}`}
            subtitle="Paid invoices this month"
            icon={TrendingUp}
            iconClass="text-emerald-500"
            href="/payments"
            badge={mrr > 0 ? { label: "MTD", variant: "success" } : undefined}
          />
          <KPICard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            subtitle="All-time paid invoices"
            icon={DollarSign}
            iconClass="text-emerald-400"
            href="/payments"
          />
          <KPICard
            title="Outstanding Invoices"
            value={stats.invoicesAwaitingPayment}
            subtitle={`$${stats.outstandingPayments.toLocaleString()} pending`}
            icon={AlertCircle}
            iconClass={stats.invoicesAwaitingPayment > 0 ? "text-amber-500" : "text-muted-foreground"}
            cardClass={
              (stats.overdueInvoiceCount ?? 0) > 0
                ? "border-red-500/20 bg-red-500/5"
                : undefined
            }
            href="/payments"
            badge={
              (stats.overdueInvoiceCount ?? 0) > 0
                ? { label: `${stats.overdueInvoiceCount} overdue`, variant: "destructive" }
                : undefined
            }
          />
          <KPICard
            title="Completion Rate"
            value={`${completionRate}%`}
            subtitle={`${stats.completedProjects} of ${stats.completedProjects + stats.projectsInProgress} done`}
            icon={Target}
            iconClass={completionRate >= 70 ? "text-emerald-500" : completionRate >= 40 ? "text-amber-500" : "text-red-500"}
            badge={
              completionRate >= 80
                ? { label: "On Track", variant: "success" }
                : stats.delayedProjects > 0
                ? { label: `${stats.delayedProjects} delayed`, variant: "destructive" }
                : undefined
            }
          />
        </div>
      </div>

      {/* ── AI Briefing ── */}
      <div className="print:hidden">
        <AIBriefing />
      </div>

      {/* ── Risk Detection ── */}
      {sortedAlerts.length > 0 && (
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm print:hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame size={15} className="text-amber-500" />
                Risk Detection
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {criticalCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-2 border-red-500/30 text-red-400 bg-red-500/10 font-semibold"
                  >
                    {criticalCount} critical
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-2 border-amber-500/30 text-amber-400 bg-amber-500/10 font-semibold"
                  >
                    {warningCount} warning
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedAlerts.map((alert) => (
                <RiskAlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bottom Grid: Projects at Risk + Deadlines + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects at Risk + Activity Feed (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Projects at Risk */}
          {stats.projectsAtRisk.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
                  <ShieldAlert size={14} />
                  Projects at Risk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.projectsAtRisk.map((project: any) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-red-500/10">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{project.name}</span>
                        <span className="text-xs text-muted-foreground">{project.clientName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge variant={getProjectStatusVariant(project.status)}>
                          {project.status.replace("_", " ")}
                        </StatusBadge>
                        <div className="text-xs font-mono text-red-400">
                          {project.deadline
                            ? format(new Date(project.deadline), "MMM d")
                            : "No deadline"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Deadlines */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock size={14} className="text-primary" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingDeadlines.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No upcoming deadlines in the next 30 days.
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingDeadlines.map((project: any) => {
                    const daysLeft = project.deadline
                      ? differenceInDays(new Date(project.deadline), today)
                      : null;
                    const urgent = daysLeft !== null && daysLeft <= 7;
                    return (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{project.name}</span>
                            <span className="text-xs text-muted-foreground">{project.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {daysLeft !== null && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-5 px-2 font-medium",
                                  urgent
                                    ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                    : "border-border/50 text-muted-foreground",
                                )}
                              >
                                {daysLeft}d left
                              </Badge>
                            )}
                            <div className="text-xs font-mono bg-background px-2 py-1 rounded">
                              {project.deadline
                                ? format(new Date(project.deadline), "MMM d")
                                : "TBD"}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No recent activity.
                </div>
              ) : (
                <div className="relative border-l border-border/50 ml-3 space-y-5 pb-2">
                  {stats.recentActivity.slice(0, 6).map((activity: any) => (
                    <div key={activity.id} className="relative pl-6">
                      <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                      <div className="flex flex-col gap-0.5">
                        <div className="text-sm">
                          <span className="font-medium">{activity.clientName}</span>
                          <span className="text-muted-foreground mx-1.5">·</span>
                          <span className="text-muted-foreground">{activity.description}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Meetings + Notes */}
        <div className="space-y-5">
          {/* Upcoming Meetings */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                Upcoming Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingMeetings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No scheduled meetings.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.upcomingMeetings.map((meeting: any) => (
                    <div
                      key={meeting.id}
                      className="flex gap-3 p-3 rounded-lg bg-secondary/30 border border-transparent"
                    >
                      <div className="flex flex-col items-center justify-center bg-background rounded-lg min-w-[48px] h-12 border border-border/50">
                        <span className="text-[10px] font-bold text-primary uppercase leading-none">
                          {format(new Date(meeting.date), "MMM")}
                        </span>
                        <span className="text-lg font-bold leading-tight">
                          {format(new Date(meeting.date), "d")}
                        </span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-sm leading-tight">
                          {meeting.clientName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(meeting.date), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText size={14} className="text-primary" />
                Recent Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentNotes.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No recent notes.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.recentNotes.slice(0, 3).map((note: any) => (
                    <div
                      key={note.id}
                      className="flex flex-col gap-1.5 p-3 rounded-lg bg-secondary/30 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-primary">
                          {note.clientName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(note.createdAt), "MMM d")}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
