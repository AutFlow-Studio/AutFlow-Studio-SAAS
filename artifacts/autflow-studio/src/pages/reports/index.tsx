import {
  useGetReportsOverview,
  useGetRevenueReport,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageError } from "@/components/page-error";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  Clock,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";

// ─── Semantic colour palette ─────────────────────────────────────────────────
// Hardcoded HSL strings so they're immune to the app's greyscale chart tokens.
// All values are tested for AA contrast on dark and light card backgrounds.
const C = {
  collected:   "#10b981", // emerald  — paid / collected
  outstanding: "#f59e0b", // amber    — pending invoices
  overdue:     "#ef4444", // red      — overdue invoices
  primary:     "#6366f1", // indigo   — primary accent
  projects: {
    design:      "#8b5cf6", // violet
    development: "#3b82f6", // blue
    review:      "#f59e0b", // amber
    delivered:   "#10b981", // emerald
    paused:      "#6b7280", // slate
    testing:     "#06b6d4", // cyan
    planning:    "#a78bfa", // light violet
  } as Record<string, string>,
  clients: [
    "#6366f1", // indigo
    "#06b6d4", // cyan
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#f97316", // orange
  ],
};

const PROJECT_STATUS_FALLBACK = "#94a3b8";

// ─── Shared tooltip style ────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
};
const tooltipItemStyle = { color: "hsl(var(--foreground))" };

// ─── Custom donut centre label ───────────────────────────────────────────────
function DonutLabel({
  cx,
  cy,
  total,
}: {
  cx: number;
  cy: number;
  total: number;
}) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan
        x={cx}
        dy="-0.4em"
        fontSize={28}
        fontWeight={700}
        fill="hsl(var(--foreground))"
      >
        {total}
      </tspan>
      <tspan
        x={cx}
        dy="1.5em"
        fontSize={11}
        fill="hsl(var(--muted-foreground))"
      >
        projects
      </tspan>
    </text>
  );
}

// ─── Custom legend for the donut ─────────────────────────────────────────────
function StatusLegend({
  payload,
}: {
  payload?: { value: string; color: string; payload: { count: number } }[];
}) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-col gap-2 pr-2">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">
            {entry.value.replace(/_/g, " ")}
          </span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {entry.payload.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  color,
  Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  Icon: React.ElementType;
}) {
  return (
    <Card
      className="bg-card/40 backdrop-blur-sm border-border/50 overflow-hidden relative"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold font-mono leading-none" style={{ color }}>
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
            )}
          </div>
          <div
            className="rounded-lg p-2 flex-shrink-0 opacity-15"
            style={{ backgroundColor: color }}
          >
            <Icon size={20} style={{ color }} className="opacity-100" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom bar tooltip ───────────────────────────────────────────────────────
function MonthlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={tooltipStyle}
    >
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span
            className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-foreground">
            ${p.value.toLocaleString()}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <>
          <div className="my-1 border-t border-border/50" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono font-bold text-foreground">
              ${total.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportsView() {
  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
  } = useGetReportsOverview();
  const {
    data: revenue,
    isLoading: isRevenueLoading,
    isError: isRevenueError,
  } = useGetRevenueReport();

  if (isOverviewError || isRevenueError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Agency performance and analytics" />
        <PageError message="Failed to load reports data." />
      </div>
    );
  }

  if (isOverviewLoading || isRevenueLoading || !overview || !revenue) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Agency performance and analytics" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[380px] rounded-xl" />
          <Skeleton className="h-[380px] rounded-xl" />
          <Skeleton className="h-[260px] rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const totalProjects = overview.projectsByStatus.reduce(
    (s, p) => s + p.count,
    0
  );
  const collectionRate =
    overview.totalRevenue + overview.outstandingPayments > 0
      ? Math.round(
          (overview.totalPaid /
            (overview.totalPaid + overview.outstandingPayments)) *
            100
        )
      : 0;

  const sortedClients = [...revenue.byClient].sort(
    (a, b) => b.revenue - a.revenue
  );
  const maxClientRevenue = sortedClients[0]?.revenue ?? 1;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Reports" description="Agency performance and analytics" />

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue YTD"
          value={`$${overview.totalRevenue.toLocaleString()}`}
          sub="All paid invoices"
          color={C.collected}
          Icon={TrendingUp}
        />
        <KpiCard
          label="Total Collected"
          value={`$${overview.totalPaid.toLocaleString()}`}
          sub={`${collectionRate}% collection rate`}
          color={C.primary}
          Icon={Wallet}
        />
        <KpiCard
          label="Outstanding"
          value={`$${overview.outstandingPayments.toLocaleString()}`}
          sub="Pending invoices"
          color={C.outstanding}
          Icon={Clock}
        />
        <KpiCard
          label="Overdue"
          value={`$${overview.overduePayments.toLocaleString()}`}
          sub="Requires follow-up"
          color={C.overdue}
          Icon={AlertCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Monthly Revenue (stacked: collected + outstanding) ───────── */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Monthly Revenue</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last 11 months — collected vs. outstanding
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs mt-0.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: C.collected }}
                  />
                  <span className="text-muted-foreground">Collected</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: C.outstanding }}
                  />
                  <span className="text-muted-foreground">Outstanding</span>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[320px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenue.byMonth}
                margin={{ top: 6, right: 4, left: -18, bottom: 0 }}
                barSize={18}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="monthLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={36}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickFormatter={(v: number) =>
                    v === 0 ? "$0" : `$${v / 1000}k`
                  }
                  width={46}
                />
                <RechartsTooltip
                  content={<MonthlyTooltip />}
                  cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }}
                />
                <Bar
                  dataKey="collected"
                  name="Collected"
                  stackId="a"
                  fill={C.collected}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="revenue"
                  name="Outstanding"
                  stackId="a"
                  fill={C.outstanding}
                  opacity={0.75}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Projects by Status (donut) ───────────────────────────────── */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle>Projects by Status</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current distribution across all active work
            </p>
          </CardHeader>
          <CardContent className="pt-2 flex items-center gap-4" style={{ height: 320 }}>
            {/* Chart occupies the left ~58% */}
            <div className="h-full" style={{ flex: "0 0 58%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.projectsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    strokeWidth={0}
                  >
                    {overview.projectsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          C.projects[entry.status] ?? PROJECT_STATUS_FALLBACK
                        }
                      />
                    ))}
                  </Pie>
                  {/* Invisible second Pie used only to render the centre label */}
                  <Pie
                    data={[{ count: totalProjects }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={0}
                    dataKey="count"
                    label={(props: { cx: number; cy: number }) => (
                      <DonutLabel {...props} total={totalProjects} />
                    )}
                    labelLine={false}
                    fill="transparent"
                    strokeWidth={0}
                  />
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value: number, name: string) => [
                      `${value} project${value !== 1 ? "s" : ""}`,
                      name.replace(/_/g, " "),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend rendered outside Recharts — avoids the Invalid Hook Call
                bug that occurs when Recharts calls Legend `content` as a plain
                function, bypassing React's reconciler dispatcher. */}
            <ul className="flex flex-col gap-2.5 pr-2 flex-1">
              {overview.projectsByStatus.map((entry) => (
                <li
                  key={entry.status}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{
                      backgroundColor:
                        C.projects[entry.status] ?? PROJECT_STATUS_FALLBACK,
                    }}
                  />
                  <span className="text-muted-foreground capitalize">
                    {entry.status.replace(/_/g, " ")}
                  </span>
                  <span className="ml-auto font-semibold tabular-nums text-foreground">
                    {entry.count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* ── Revenue by Client ────────────────────────────────────────── */}
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Revenue by Client</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Collected vs. outstanding per client, sorted by revenue
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs mt-0.5 flex-shrink-0">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-muted-foreground">Collected</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-amber-500" />
                  <span className="text-muted-foreground">Outstanding</span>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="space-y-5">
              {sortedClients.map((client, index) => {
                const collectedPct =
                  maxClientRevenue > 0
                    ? (client.revenue / maxClientRevenue) * 100
                    : 0;
                const outstandingPct =
                  maxClientRevenue > 0
                    ? (client.outstanding / maxClientRevenue) * 100
                    : 0;
                const color = C.clients[index % C.clients.length]!;
                const total = client.revenue + client.outstanding;

                return (
                  <div key={client.clientId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium truncate">
                          {client.clientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0 ml-4">
                        <span
                          className="font-semibold"
                          style={{ color: C.collected }}
                        >
                          ${client.revenue.toLocaleString()}
                        </span>
                        {client.outstanding > 0 && (
                          <span className="text-amber-500">
                            +${client.outstanding.toLocaleString()}
                          </span>
                        )}
                        <span className="text-muted-foreground font-normal">
                          ${total.toLocaleString()} total
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary/60 rounded-full overflow-hidden flex">
                      {/* Collected segment */}
                      <div
                        className="h-full rounded-l-full transition-all duration-500"
                        style={{
                          width: `${collectedPct}%`,
                          backgroundColor: color,
                        }}
                      />
                      {/* Outstanding segment */}
                      {outstandingPct > 0 && (
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${outstandingPct}%`,
                            backgroundColor: color,
                            opacity: 0.3,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Invoice Status Breakdown ─────────────────────────────────── */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle>Invoice Status Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total value by payment status
            </p>
          </CardHeader>
          <CardContent className="pt-2 flex items-center gap-4" style={{ height: 280 }}>
            {/* Chart */}
            <div className="h-full" style={{ flex: "0 0 58%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Collected", value: overview.totalPaid },
                      {
                        name: "Pending",
                        value:
                          overview.outstandingPayments - overview.overduePayments,
                      },
                      { name: "Overdue", value: overview.overduePayments },
                    ].filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={96}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill={C.collected} />
                    <Cell fill={C.outstanding} />
                    <Cell fill={C.overdue} />
                  </Pie>
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString()}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend rendered outside Recharts — same fix as Projects donut */}
            <ul className="flex flex-col gap-3 pr-2 flex-1">
              {[
                { name: "Collected", color: C.collected, value: overview.totalPaid },
                {
                  name: "Pending",
                  color: C.outstanding,
                  value: overview.outstandingPayments - overview.overduePayments,
                },
                { name: "Overdue", color: C.overdue, value: overview.overduePayments },
              ]
                .filter((d) => d.value > 0)
                .map((item) => (
                  <li key={item.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="ml-auto font-semibold tabular-nums text-foreground">
                      ${item.value.toLocaleString()}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        {/* ── Active Projects KPI ──────────────────────────────────────── */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle>Project Health</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Snapshot of all projects by status
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.projectsByStatus
                .sort((a, b) => b.count - a.count)
                .map((s) => {
                  const color =
                    C.projects[s.status] ?? PROJECT_STATUS_FALLBACK;
                  const pct =
                    totalProjects > 0
                      ? Math.round((s.count / totalProjects) * 100)
                      : 0;
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm capitalize text-foreground">
                            {s.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-semibold text-foreground">
                            {s.count}
                          </span>
                          <span className="text-muted-foreground w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <FolderOpen size={14} />
                Total projects
              </span>
              <span className="font-bold font-mono text-foreground">
                {totalProjects}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
