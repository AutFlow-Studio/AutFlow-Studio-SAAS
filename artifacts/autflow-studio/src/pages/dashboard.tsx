import { useGetDashboard } from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { PageError } from "@/components/page-error";
import { AIBriefing } from "@/components/ai-briefing";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { useAgencyProfile } from "@/components/agency-profile-provider";
import { getNicheConfig } from "@/lib/niche-config";
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
  Megaphone,
  Package,
  UserCog,
  CheckCheck,
  ClipboardList,
  CircleDot,
  Heart,
  ReceiptText,
  Layers,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, getProjectStatusVariant } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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

import type { DashboardStats } from "@workspace/api-client-react";

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
    score >= 75 ? "#10b981" :
    score >= 50 ? "#6366f1" :
    score >= 30 ? "#f59e0b" :
    "#ef4444";

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
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-border/40" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
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

function HealthPillar({ label, score, max = 25 }: { label: string; score: number; max?: number }) {
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
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
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

function KPICard({ title, value, subtitle, icon: Icon, iconClass = "text-primary", cardClass, href, badge }: KPICardProps) {
  const content = (
    <Card className={cn(
      "bg-card/40 backdrop-blur-sm border-border/50 transition-all duration-200 group",
      href && "hover:bg-card/70 hover:border-border/80 cursor-pointer",
      cardClass,
    )}>
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground leading-tight pr-2">{title}</CardTitle>
        <div className={cn("p-1.5 rounded-lg bg-background/60 border border-border/40 shrink-0", iconClass)}>
          <Icon size={13} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-2">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {badge && (
            <Badge variant="outline" className={cn(
              "mb-0.5 text-[10px] px-1.5 py-0 h-4 font-medium",
              badge.variant === "destructive" && "border-red-500/40 text-red-400 bg-red-500/10",
              badge.variant === "warning" && "border-amber-500/40 text-amber-400 bg-amber-500/10",
              badge.variant === "success" && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
            )}>
              {badge.label}
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 leading-tight">{subtitle}</p>}
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ---------------------------------------------------------------------------
// Risk Alert Row
// ---------------------------------------------------------------------------

type RiskSeverity = "critical" | "warning" | "info";
interface RiskAlert { id: string; severity: RiskSeverity; message: string; href?: string; }

function RiskAlertRow({ alert }: { alert: RiskAlert }) {
  const cfg = {
    critical: { icon: XCircle, iconClass: "text-red-400", rowClass: "border-red-500/15 bg-red-500/5 hover:bg-red-500/10", badge: "bg-red-500/15 text-red-400 border-red-500/20", label: "Critical" },
    warning: { icon: AlertTriangle, iconClass: "text-amber-400", rowClass: "border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10", badge: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Warning" },
    info: { icon: AlertCircle, iconClass: "text-primary/70", rowClass: "border-primary/15 bg-primary/5 hover:bg-primary/10", badge: "bg-primary/15 text-primary border-primary/20", label: "Info" },
  }[alert.severity];
  const Icon = cfg.icon;
  const inner = (
    <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors", cfg.rowClass, alert.href && "cursor-pointer")}>
      <Icon size={14} className={cn("shrink-0", cfg.iconClass)} />
      <p className="text-xs text-foreground/90 flex-1 leading-snug">{alert.message}</p>
      {alert.href && <ArrowRight size={12} className="shrink-0 text-muted-foreground/50" />}
    </div>
  );
  if (alert.href) return <Link key={alert.id} href={alert.href}>{inner}</Link>;
  return <div key={alert.id}>{inner}</div>;
}

// ---------------------------------------------------------------------------
// Priority pill for tasks
// ---------------------------------------------------------------------------

function PriorityDot({ priority }: { priority: string }) {
  const cls =
    priority === "urgent" ? "bg-red-500" :
    priority === "high" ? "bg-amber-500" :
    priority === "medium" ? "bg-primary" :
    "bg-muted-foreground/40";
  return <span className={cn("w-2 h-2 rounded-full shrink-0", cls)} />;
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground/60">
      <Icon size={22} />
      <p className="text-xs text-center">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Agency Command Center" description="Loading your workspace…" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionTitle({ icon: Icon, title, badge, href, iconClass }: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  href?: string;
  iconClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <Icon size={14} className={iconClass ?? "text-primary"} />
        {title}
      </CardTitle>
      <div className="flex items-center gap-2">
        {badge}
        {href && (
          <Link href={href}>
            <span className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              View all <ArrowRight size={10} />
            </span>
          </Link>
        )}
      </div>
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
  const { profile: agencyProfile } = useAgencyProfile();
  const nicheConfig = getNicheConfig(agencyProfile.businessType);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const showResetButton = user?.role === "owner";

  const { data: campaigns = [] } = useQuery<{ status: string; budget?: number | null }[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={nicheConfig.dashboardTitle} description={nicheConfig.dashboardDescription} />
        <PageError message="Failed to load dashboard data." />
      </div>
    );
  }

  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  // ── Campaign stats ──────────────────────────────────────────────────────
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const planningCampaigns = campaigns.filter((c) => c.status === "planning").length;
  const totalCampaignBudget = campaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0);

  const quickActions = [
    { label: "New Client", icon: Users, href: "/clients" },
    { label: "New Project", icon: Briefcase, href: "/projects" },
    { label: "New Invoice", icon: CreditCard, href: "/payments" },
  ];

  // ── Risk Detection ────────────────────────────────────────────────────
  const riskAlerts: RiskAlert[] = [];
  const today = new Date();

  if ((stats.overdueInvoiceCount ?? 0) > 0) {
    riskAlerts.push({
      id: "overdue-invoices",
      severity: "critical",
      message: `${stats.overdueInvoiceCount} overdue invoice${stats.overdueInvoiceCount > 1 ? "s" : ""} totalling $${(stats.overdueAmount ?? 0).toLocaleString()} — follow up immediately.`,
      href: "/payments",
    });
  }

  if ((stats.delayedProjects ?? 0) > 0) {
    riskAlerts.push({
      id: "delayed-projects",
      severity: "critical",
      message: `${stats.delayedProjects} project${stats.delayedProjects > 1 ? "s are" : " is"} past deadline and still in progress.`,
      href: "/projects",
    });
  }

  for (const p of (stats.projectsAtRisk ?? []).slice(0, 3)) {
    const isOverdue = p.deadline && p.deadline < today.toISOString().split("T")[0]!;
    const daysOverdue = isOverdue && p.deadline ? differenceInDays(today, new Date(p.deadline)) : null;
    if (!isOverdue) {
      riskAlerts.push({
        id: `risk-project-${p.id}`,
        severity: "warning",
        message: `"${p.name}" (${(p as any).clientName ?? "Unknown"}) is only ${p.progress}% complete with a deadline approaching.`,
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

  const nonOverdueOutstanding = stats.invoicesAwaitingPayment - (stats.overdueInvoiceCount ?? 0);
  if (nonOverdueOutstanding > 0) {
    riskAlerts.push({
      id: "outstanding-invoices",
      severity: "info",
      message: `${nonOverdueOutstanding} invoice${nonOverdueOutstanding > 1 ? "s" : ""} awaiting payment ($${(stats.outstandingPayments - (stats.overdueAmount ?? 0)).toLocaleString()} outstanding).`,
      href: "/payments",
    });
  }

  if ((stats.upcomingDeadlines ?? []).length > 0) {
    const next = stats.upcomingDeadlines[0]!;
    const daysLeft = next.deadline ? differenceInDays(new Date(next.deadline), today) : null;
    if (daysLeft !== null && daysLeft <= 7) {
      riskAlerts.push({
        id: `deadline-urgent-${next.id}`,
        severity: "warning",
        message: `"${next.name}" (${(next as any).clientName ?? "Unknown"}) is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
        href: `/projects/${next.id}`,
      });
    }
  }

  if ((stats.taskSummary?.overdueCount ?? 0) > 0) {
    riskAlerts.push({
      id: "overdue-tasks",
      severity: "warning",
      message: `${stats.taskSummary.overdueCount} task${stats.taskSummary.overdueCount > 1 ? "s are" : " is"} past due and need your attention.`,
      href: "/tasks",
    });
  }

  if ((stats.deliverableSummary?.pendingRevisionsCount ?? 0) > 0) {
    riskAlerts.push({
      id: "pending-revisions",
      severity: "warning",
      message: `${stats.deliverableSummary.pendingRevisionsCount} deliverable${stats.deliverableSummary.pendingRevisionsCount > 1 ? "s have" : " has"} revision requests waiting.`,
      href: "/deliverables",
    });
  }

  if ((stats.deliverableSummary?.waitingApprovalCount ?? 0) > 0) {
    riskAlerts.push({
      id: "waiting-approval",
      severity: "info",
      message: `${stats.deliverableSummary.waitingApprovalCount} deliverable${stats.deliverableSummary.waitingApprovalCount > 1 ? "s are" : " is"} waiting for client approval.`,
      href: "/deliverables",
    });
  }

  const sortedAlerts = [...riskAlerts].sort((a, b) => {
    const order: Record<RiskSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = sortedAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = sortedAlerts.filter((a) => a.severity === "warning").length;

  // ── Derived stats ──────────────────────────────────────────────────────
  const completionRate = stats.completionRate ?? 0;
  const healthScore = stats.healthScore ?? 0;
  const hb = stats.healthBreakdown ?? { revenue: 0, delivery: 0, clientActivity: 0, payments: 0 };
  const mrr = stats.mrr ?? 0;
  const totalInvoiced = (stats as any).totalInvoiced ?? stats.totalRevenue + stats.outstandingPayments;
  const taskSummary = stats.taskSummary ?? { overdueCount: 0, todayCount: 0, upcomingCount: 0, totalActive: 0, overdueTasks: [], todayTasks: [], upcomingTasks: [] };
  const deliverableSummary = stats.deliverableSummary ?? { waitingApprovalCount: 0, pendingRevisionsCount: 0, recentlyApprovedCount: 0, waitingApproval: [], pendingRevisions: [], recentlyApproved: [] };
  const clientHealth = stats.clientHealth ?? [];
  const revenueByClient = (stats as any).revenueByClient ?? [];

  const healthyClients = clientHealth.filter((c: any) => c.healthStatus === "healthy");
  const attentionClients = clientHealth.filter((c: any) => c.healthStatus === "attention");
  const atRiskClients = clientHealth.filter((c: any) => c.healthStatus === "at_risk");

  return (
    <div className="space-y-7 pb-12">
      {showResetButton && <ClearDataDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} />}

      {/* Printable header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Agency Command Center — Report</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM do, yyyy 'at' h:mm a")}</p>
      </div>

      {/* ── Page Header ── */}
      <PageHeader title={nicheConfig.dashboardTitle} description={format(new Date(), "EEEE, MMMM do, yyyy")}>
        <div className="flex gap-2 print:hidden">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button size="sm" variant="outline" className="hidden md:flex gap-1.5 h-8 text-xs">
                <action.icon size={13} />
                {action.label}
              </Button>
            </Link>
          ))}
          <Button size="sm" variant="outline" className="hidden md:flex gap-1.5 h-8 text-xs" onClick={() => window.print()}>
            <Printer size={13} />
            Print
          </Button>
          {showResetButton && (
            <Button size="sm" variant="outline"
              className="hidden md:flex gap-1.5 h-8 text-xs text-destructive hover:text-destructive border-destructive/30"
              onClick={() => setResetDialogOpen(true)}>
              <Trash2 size={13} />
              Clear Data
            </Button>
          )}
          <Link href="/clients">
            <Button size="sm" className="md:hidden"><Plus size={16} /></Button>
          </Link>
        </div>
      </PageHeader>

      {/* ── 1. Business Health + KPI Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
        {/* Health Score Card */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50 print:hidden">
          <CardContent className="pt-5 pb-5 flex flex-col items-center gap-5 min-w-[220px]">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Business Health</span>
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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
          <KPICard title="Active Clients" value={stats.activeClients}
            subtitle={`of ${stats.totalClients} total`} icon={Users} iconClass="text-primary" href="/clients" />
          <KPICard title="Projects In Progress" value={stats.projectsInProgress}
            subtitle={`${stats.completedProjects} delivered`} icon={Briefcase} iconClass="text-blue-500" href="/projects"
            badge={stats.delayedProjects > 0 ? { label: `${stats.delayedProjects} delayed`, variant: "destructive" } : undefined} />
          <KPICard title="Monthly Revenue" value={`$${mrr.toLocaleString()}`}
            subtitle="Paid invoices this month" icon={TrendingUp} iconClass="text-emerald-500" href="/payments"
            badge={mrr > 0 ? { label: "MTD", variant: "success" } : undefined} />
          <KPICard title="Outstanding" value={`$${(stats.outstandingPayments ?? 0).toLocaleString()}`}
            subtitle={`${stats.invoicesAwaitingPayment} invoice${stats.invoicesAwaitingPayment !== 1 ? "s" : ""} pending`}
            icon={AlertCircle}
            iconClass={(stats.overdueInvoiceCount ?? 0) > 0 ? "text-red-500" : "text-amber-500"}
            cardClass={(stats.overdueInvoiceCount ?? 0) > 0 ? "border-red-500/20 bg-red-500/5" : undefined}
            href="/payments"
            badge={(stats.overdueInvoiceCount ?? 0) > 0 ? { label: `${stats.overdueInvoiceCount} overdue`, variant: "destructive" } : undefined} />
          <KPICard title="Total Revenue" value={`$${(stats.totalRevenue ?? 0).toLocaleString()}`}
            subtitle="All-time paid" icon={DollarSign} iconClass="text-emerald-400" href="/payments" />
          <KPICard title="Completion Rate" value={`${completionRate}%`}
            subtitle={`${stats.completedProjects} of ${stats.completedProjects + stats.projectsInProgress} done`}
            icon={Target}
            iconClass={completionRate >= 70 ? "text-emerald-500" : completionRate >= 40 ? "text-amber-500" : "text-red-500"}
            badge={completionRate >= 80 ? { label: "On Track", variant: "success" } : undefined} />
          <KPICard title="Active Tasks" value={taskSummary.totalActive}
            subtitle={taskSummary.overdueCount > 0 ? `${taskSummary.overdueCount} overdue` : taskSummary.todayCount > 0 ? `${taskSummary.todayCount} due today` : "All on track"}
            icon={ClipboardList} iconClass={taskSummary.overdueCount > 0 ? "text-red-500" : "text-indigo-500"} href="/tasks"
            badge={taskSummary.overdueCount > 0 ? { label: `${taskSummary.overdueCount} overdue`, variant: "destructive" } : undefined} />
          <KPICard title="Deliverables" value={deliverableSummary.waitingApprovalCount + deliverableSummary.pendingRevisionsCount || "—"}
            subtitle={deliverableSummary.waitingApprovalCount > 0 ? `${deliverableSummary.waitingApprovalCount} awaiting approval` : deliverableSummary.pendingRevisionsCount > 0 ? `${deliverableSummary.pendingRevisionsCount} revisions requested` : "All clear"}
            icon={Package} iconClass="text-blue-500" href="/deliverables"
            badge={deliverableSummary.pendingRevisionsCount > 0 ? { label: `${deliverableSummary.pendingRevisionsCount} revisions`, variant: "warning" } : undefined} />
        </div>
      </div>

      {/* ── 2. AI Briefing ── */}
      <div className="print:hidden">
        <SectionErrorBoundary>
          <AIBriefing />
        </SectionErrorBoundary>
      </div>

      {/* ── 3. Needs Attention Today ── */}
      {sortedAlerts.length > 0 && (
        <Card className="border-border/50 bg-card/30 backdrop-blur-sm print:hidden">
          <CardHeader className="pb-3">
            <SectionTitle
              icon={Zap}
              title="What Needs Attention Today"
              iconClass="text-amber-500"
              badge={
                <div className="flex items-center gap-1.5">
                  {criticalCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-red-500/30 text-red-400 bg-red-500/10 font-semibold">
                      {criticalCount} critical
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-amber-500/30 text-amber-400 bg-amber-500/10 font-semibold">
                      {warningCount} warning
                    </Badge>
                  )}
                </div>
              }
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedAlerts.map((alert) => <RiskAlertRow key={alert.id} alert={alert} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 4. Client Health + Project Operations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Client Health */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <SectionTitle
              icon={Heart}
              title="Client Health"
              href="/clients"
              badge={
                <div className="flex items-center gap-1">
                  {atRiskClients.length > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-red-500/30 text-red-400 bg-red-500/10">
                      {atRiskClients.length} at risk
                    </Badge>
                  )}
                  {attentionClients.length > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-amber-500/30 text-amber-400 bg-amber-500/10">
                      {attentionClients.length} needs attention
                    </Badge>
                  )}
                </div>
              }
            />
          </CardHeader>
          <CardContent>
            {clientHealth.length === 0 ? (
              <EmptyState icon={Users} message="No active clients yet. Add your first client to get started." />
            ) : (
              <div className="space-y-1.5">
                {clientHealth.map((client: any) => {
                  const statusCfg = {
                    healthy: { dot: "bg-emerald-500", text: "text-emerald-400", bg: "hover:bg-emerald-500/5" },
                    attention: { dot: "bg-amber-500", text: "text-amber-400", bg: "hover:bg-amber-500/5" },
                    at_risk: { dot: "bg-red-500", text: "text-red-400", bg: "hover:bg-red-500/5" },
                  }[client.healthStatus as "healthy" | "attention" | "at_risk"];
                  return (
                    <Link key={client.id} href={`/clients/${client.id}`}>
                      <div className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                        statusCfg.bg,
                      )}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", statusCfg.dot)} />
                          <span className="text-sm font-medium truncate">{client.companyName}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn("text-[11px]", statusCfg.text)}>{client.reason}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono text-muted-foreground">{client.healthScore}</span>
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

        {/* Project Operations */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <SectionTitle icon={ShieldAlert} title="Project Operations" href="/projects" iconClass="text-blue-500"
              badge={stats.projectsAtRisk.length > 0 ? (
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-red-500/30 text-red-400 bg-red-500/10">
                  {stats.projectsAtRisk.length} at risk
                </Badge>
              ) : undefined}
            />
          </CardHeader>
          <CardContent>
            {stats.projectsAtRisk.length === 0 && stats.upcomingDeadlines.length === 0 ? (
              <EmptyState icon={Briefcase} message="No active projects with issues. Great work!" />
            ) : (
              <div className="space-y-2">
                {[...stats.projectsAtRisk, ...stats.upcomingDeadlines.filter(
                  (d) => !stats.projectsAtRisk.find((r) => r.id === d.id)
                )].slice(0, 6).map((project: any) => {
                  const isAtRisk = stats.projectsAtRisk.some((r) => r.id === project.id);
                  const daysLeft = project.deadline
                    ? differenceInDays(new Date(project.deadline), today)
                    : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className={cn(
                        "p-3 rounded-lg border transition-colors cursor-pointer",
                        isAtRisk ? "border-red-500/15 bg-red-500/5 hover:bg-red-500/10" : "border-border/30 bg-secondary/20 hover:bg-secondary/40",
                      )}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <span className="font-medium text-sm leading-tight">{project.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{project.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge variant={getProjectStatusVariant(project.status)}>
                              {project.status?.replace(/_/g, " ")}
                            </StatusBadge>
                            {project.deadline && (
                              <span className={cn("text-[11px] font-mono", isOverdue ? "text-red-400" : daysLeft !== null && daysLeft <= 7 ? "text-amber-400" : "text-muted-foreground")}>
                                {isOverdue ? `${Math.abs(daysLeft!)}d overdue` : `${daysLeft}d left`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={project.progress ?? 0} className="h-1.5 flex-1" />
                          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{project.progress ?? 0}%</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Task Management + Deliverables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Task Management */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <SectionTitle
              icon={ClipboardList}
              title="Task Management"
              href="/tasks"
              iconClass="text-indigo-500"
              badge={
                <div className="flex items-center gap-1">
                  {taskSummary.overdueCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-red-500/30 text-red-400 bg-red-500/10">
                      {taskSummary.overdueCount} overdue
                    </Badge>
                  )}
                  {taskSummary.todayCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-primary/30 text-primary bg-primary/10">
                      {taskSummary.todayCount} today
                    </Badge>
                  )}
                </div>
              }
            />
          </CardHeader>
          <CardContent>
            {taskSummary.totalActive === 0 ? (
              <EmptyState icon={CheckCheck} message="No active tasks. Add tasks to track your team's work." />
            ) : (
              <div className="space-y-3">
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Overdue", count: taskSummary.overdueCount, cls: taskSummary.overdueCount > 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-muted-foreground bg-muted/20 border-border/30" },
                    { label: "Due Today", count: taskSummary.todayCount, cls: taskSummary.todayCount > 0 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-muted-foreground bg-muted/20 border-border/30" },
                    { label: "This Week", count: taskSummary.upcomingCount, cls: "text-primary bg-primary/10 border-primary/20" },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className={cn("rounded-lg border px-3 py-2 text-center", cls)}>
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-[10px] font-medium">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Task items */}
                <div className="space-y-1">
                  {[...taskSummary.overdueTasks, ...taskSummary.todayTasks, ...taskSummary.upcomingTasks]
                    .slice(0, 5)
                    .map((task: any) => {
                      const isOverdue = task.deadline && task.deadline < today.toISOString().split("T")[0]!;
                      return (
                        <Link key={task.id} href="/tasks">
                          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
                            <PriorityDot priority={task.priority} />
                            <span className="text-sm flex-1 truncate">{task.title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {task.clientName && (
                                <span className="text-[10px] text-muted-foreground hidden md:block">{task.clientName}</span>
                              )}
                              {task.deadline && (
                                <span className={cn("text-[10px] font-mono", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                                  {isOverdue ? "overdue" : format(new Date(task.deadline), "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>

                {taskSummary.totalActive > 5 && (
                  <Link href="/tasks">
                    <div className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                      +{taskSummary.totalActive - 5} more tasks
                    </div>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliverables Overview */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <SectionTitle
              icon={Package}
              title="Deliverables"
              href="/deliverables"
              iconClass="text-blue-500"
              badge={
                <div className="flex items-center gap-1">
                  {deliverableSummary.waitingApprovalCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-amber-500/30 text-amber-400 bg-amber-500/10">
                      {deliverableSummary.waitingApprovalCount} awaiting
                    </Badge>
                  )}
                  {deliverableSummary.pendingRevisionsCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-red-500/30 text-red-400 bg-red-500/10">
                      {deliverableSummary.pendingRevisionsCount} revisions
                    </Badge>
                  )}
                </div>
              }
            />
          </CardHeader>
          <CardContent>
            {deliverableSummary.waitingApprovalCount === 0 && deliverableSummary.pendingRevisionsCount === 0 && deliverableSummary.recentlyApprovedCount === 0 ? (
              <EmptyState icon={Layers} message="No deliverables in progress. Create deliverables inside your projects." />
            ) : (
              <div className="space-y-3">
                {/* Delivery status summary */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Awaiting Approval", count: deliverableSummary.waitingApprovalCount, cls: deliverableSummary.waitingApprovalCount > 0 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-muted-foreground bg-muted/20 border-border/30" },
                    { label: "Revisions", count: deliverableSummary.pendingRevisionsCount, cls: deliverableSummary.pendingRevisionsCount > 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-muted-foreground bg-muted/20 border-border/30" },
                    { label: "Approved (7d)", count: deliverableSummary.recentlyApprovedCount, cls: deliverableSummary.recentlyApprovedCount > 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground bg-muted/20 border-border/30" },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className={cn("rounded-lg border px-3 py-2 text-center", cls)}>
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-[10px] font-medium leading-tight">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Deliverable items */}
                <div className="space-y-1">
                  {[
                    ...deliverableSummary.pendingRevisions.map((d: any) => ({ ...d, _type: "revision" })),
                    ...deliverableSummary.waitingApproval.map((d: any) => ({ ...d, _type: "waiting" })),
                    ...deliverableSummary.recentlyApproved.map((d: any) => ({ ...d, _type: "approved" })),
                  ].slice(0, 5).map((item: any) => {
                    const typeCfg = {
                      revision: { dot: "bg-red-500", label: "Revision", href: `/projects/${item.projectId}` },
                      waiting: { dot: "bg-amber-500", label: "Awaiting", href: `/projects/${item.projectId}` },
                      approved: { dot: "bg-emerald-500", label: "Approved", href: `/projects/${item.projectId}` },
                    }[item._type as "revision" | "waiting" | "approved"];
                    return (
                      <Link key={`${item._type}-${item.id}`} href={typeCfg.href}>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", typeCfg.dot)} />
                          <span className="text-sm flex-1 truncate">{item.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.clientName && (
                              <span className="text-[10px] text-muted-foreground hidden md:block">{item.clientName}</span>
                            )}
                            <span className={cn("text-[10px] font-medium",
                              item._type === "revision" ? "text-red-400" :
                              item._type === "waiting" ? "text-amber-400" : "text-emerald-400"
                            )}>
                              {typeCfg.label}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Revenue Dashboard ── */}
      <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <SectionTitle icon={ReceiptText} title="Revenue Overview" href="/payments" iconClass="text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: "Total Invoiced", value: `$${totalInvoiced.toLocaleString()}`, sub: "All time", cls: "text-foreground" },
              { label: "Collected", value: `$${(stats.totalRevenue ?? 0).toLocaleString()}`, sub: `${totalInvoiced > 0 ? Math.round((stats.totalRevenue / totalInvoiced) * 100) : 0}% of invoiced`, cls: "text-emerald-400" },
              { label: "Outstanding", value: `$${(stats.outstandingPayments ?? 0).toLocaleString()}`, sub: `${stats.invoicesAwaitingPayment} invoice${stats.invoicesAwaitingPayment !== 1 ? "s" : ""}`, cls: stats.outstandingPayments > 0 ? "text-amber-400" : "text-muted-foreground" },
              { label: "Overdue", value: `$${(stats.overdueAmount ?? 0).toLocaleString()}`, sub: `${stats.overdueInvoiceCount} invoice${stats.overdueInvoiceCount !== 1 ? "s" : ""}`, cls: stats.overdueAmount > 0 ? "text-red-400" : "text-muted-foreground" },
            ].map(({ label, value, sub, cls }) => (
              <div key={label} className="rounded-xl border border-border/40 bg-background/40 px-4 py-3">
                <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
                <div className={cn("text-xl font-bold", cls)}>{value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* Collection rate bar */}
          {totalInvoiced > 0 && (
            <div className="mb-5 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Collection rate</span>
                <span className="text-xs font-mono text-foreground/70">
                  {Math.round((stats.totalRevenue / totalInvoiced) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-border/40 overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.round((stats.totalRevenue / totalInvoiced) * 100)}%` }} />
                <div className="h-full bg-amber-500/80 transition-all duration-700" style={{ width: `${Math.round(((stats.outstandingPayments - (stats.overdueAmount ?? 0)) / totalInvoiced) * 100)}%` }} />
                <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${Math.round(((stats.overdueAmount ?? 0) / totalInvoiced) * 100)}%` }} />
              </div>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Paid</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/80" />Outstanding</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Overdue</span>
              </div>
            </div>
          )}

          {/* Revenue by client */}
          {revenueByClient.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Top clients by revenue</p>
              <div className="space-y-2">
                {revenueByClient.slice(0, 4).map((c: any) => {
                  const maxRevenue = revenueByClient[0]?.revenue ?? 1;
                  const pct = maxRevenue > 0 ? Math.round((c.revenue / maxRevenue) * 100) : 0;
                  return (
                    <div key={c.clientId} className="flex items-center gap-3">
                      <span className="text-xs text-foreground/80 w-32 truncate shrink-0">{c.clientName}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
                        <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-emerald-400 w-20 text-right shrink-0">
                        ${c.revenue.toLocaleString()}
                      </span>
                      {c.outstanding > 0 && (
                        <span className="text-[10px] font-mono text-amber-400 w-18 text-right shrink-0">
                          +${c.outstanding.toLocaleString()} owed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 7. Bottom Grid: Activity + Upcoming Deadlines + Meetings/Notes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Feed + Upcoming Deadlines (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Upcoming Deadlines */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionTitle icon={Clock} title="Upcoming Deadlines" href="/projects" />
            </CardHeader>
            <CardContent>
              {stats.upcomingDeadlines.length === 0 ? (
                <EmptyState icon={Clock} message="No deadlines in the next 30 days." />
              ) : (
                <div className="space-y-2">
                  {stats.upcomingDeadlines.map((project: any) => {
                    const daysLeft = project.deadline ? differenceInDays(new Date(project.deadline), today) : null;
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
                              <Badge variant="outline" className={cn(
                                "text-[10px] h-5 px-2 font-medium",
                                urgent ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-border/50 text-muted-foreground",
                              )}>
                                {daysLeft}d left
                              </Badge>
                            )}
                            <div className="text-xs font-mono bg-background px-2 py-1 rounded">
                              {project.deadline ? format(new Date(project.deadline), "MMM d") : "TBD"}
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
              <SectionTitle icon={Activity} title="Recent Activity" />
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <EmptyState icon={Activity} message="No recent activity yet." />
              ) : (
                <div className="relative border-l border-border/50 ml-3 space-y-5 pb-2">
                  {stats.recentActivity.slice(0, 8).map((activity: any) => (
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
              <SectionTitle icon={Calendar} title="Upcoming Meetings" href="/calendar" />
            </CardHeader>
            <CardContent>
              {stats.upcomingMeetings.length === 0 ? (
                <EmptyState icon={Calendar} message="No scheduled meetings." />
              ) : (
                <div className="space-y-2.5">
                  {stats.upcomingMeetings.map((meeting: any) => (
                    <div key={meeting.id} className="flex gap-3 p-3 rounded-lg bg-secondary/30 border border-transparent">
                      <div className="flex flex-col items-center justify-center bg-background rounded-lg min-w-[48px] h-12 border border-border/50">
                        <span className="text-[10px] font-bold text-primary uppercase leading-none">
                          {format(new Date(meeting.date), "MMM")}
                        </span>
                        <span className="text-lg font-bold leading-tight">
                          {format(new Date(meeting.date), "d")}
                        </span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-sm leading-tight">{meeting.clientName}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(meeting.date), "h:mm a")}</span>
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
              <SectionTitle icon={FileText} title="Recent Notes" />
            </CardHeader>
            <CardContent>
              {stats.recentNotes.length === 0 ? (
                <EmptyState icon={FileText} message="No recent notes." />
              ) : (
                <div className="space-y-2.5">
                  {stats.recentNotes.slice(0, 3).map((note: any) => (
                    <div key={note.id} className="flex flex-col gap-1.5 p-3 rounded-lg bg-secondary/30 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-primary">{note.clientName}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(note.createdAt), "MMM d")}</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">{note.content}</p>
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
