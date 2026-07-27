import {
  Users,
  FolderOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  MoreHorizontal,
  ArrowUpRight,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  Bell,
  Search,
  LayoutDashboard,
  Briefcase,
  FileText,
  CreditCard,
  Settings,
  BarChart3,
} from "lucide-react";

const KPI_CARDS = [
  {
    label: "Active Clients",
    value: "24",
    change: "+3",
    trend: "up",
    sub: "vs last month",
    icon: Users,
    color: "hsl(221 83% 53%)",
    bg: "hsl(221 83% 53% / 0.08)",
  },
  {
    label: "Projects In Progress",
    value: "11",
    change: "+2",
    trend: "up",
    sub: "vs last month",
    icon: FolderOpen,
    color: "hsl(262 80% 58%)",
    bg: "hsl(262 80% 58% / 0.08)",
  },
  {
    label: "Monthly Revenue",
    value: "$42,800",
    change: "+18%",
    trend: "up",
    sub: "vs last month",
    icon: DollarSign,
    color: "hsl(142 70% 40%)",
    bg: "hsl(142 70% 40% / 0.08)",
  },
  {
    label: "Overdue Invoices",
    value: "3",
    change: "-1",
    trend: "down-good",
    sub: "vs last month",
    icon: CreditCard,
    color: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 50% / 0.08)",
  },
];

const PROJECTS = [
  { name: "Brand Identity Refresh", client: "Luminary Studio", progress: 78, daysLeft: 5, status: "on-track" },
  { name: "E-commerce Platform", client: "Nova Digital", progress: 42, daysLeft: 2, status: "at-risk" },
  { name: "Annual Report 2025", client: "Apex Ventures", progress: 91, daysLeft: 12, status: "on-track" },
  { name: "Social Media Strategy", client: "Blueshift Co.", progress: 15, daysLeft: 21, status: "on-track" },
];

const ACTIVITY = [
  { text: "Invoice #0051 paid by Luminary Studio", time: "2 min ago", type: "success" },
  { text: "Project milestone overdue: E-commerce MVP", time: "1 hr ago", type: "warning" },
  { text: "New meeting scheduled with Apex Ventures", time: "3 hr ago", type: "info" },
  { text: "Document signed: Nova Digital contract", time: "Yesterday", type: "success" },
];

function Sidebar() {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Users, label: "Clients" },
    { icon: Briefcase, label: "Projects" },
    { icon: FileText, label: "Documents" },
    { icon: CreditCard, label: "Payments" },
    { icon: BarChart3, label: "Reports" },
    { icon: Calendar, label: "Calendar" },
  ];
  return (
    <div
      className="flex flex-col w-56 flex-shrink-0 border-r border-[hsl(215_20%_91%)] bg-white"
      style={{ minHeight: "100vh" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[hsl(215_20%_91%)]">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(221 83% 53%)" }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-[hsl(220_30%_12%)] tracking-tight">
          AutFlow Studio
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
            style={
              active
                ? { background: "hsl(221 83% 53% / 0.1)", color: "hsl(221 83% 45%)" }
                : { color: "hsl(215 20% 45%)" }
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className={`text-sm ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
            {active && (
              <div
                className="ml-auto w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(221 83% 53%)" }}
              />
            )}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-[hsl(215_20%_91%)] pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer" style={{ color: "hsl(215 20% 45%)" }}>
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "hsl(221 83% 53%)" }}
          >
            A
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[hsl(220_30%_12%)] truncate">Admin User</p>
            <p className="text-xs text-[hsl(215_20%_50%)] truncate">admin@autflow.io</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPolish() {
  return (
    <div
      className="flex h-screen bg-[hsl(210_40%_98%)] overflow-hidden text-[hsl(220_30%_12%)]"
      style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[hsl(215_20%_91%)] flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-[hsl(220_30%_12%)]">Good morning, Admin 👋</h1>
            <p className="text-xs text-[hsl(215_20%_50%)]">Tuesday, Jul 27 · Your agency is in great health</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[hsl(215_20%_95%)] rounded-xl px-3.5 py-2">
              <Search className="w-3.5 h-3.5 text-[hsl(215_20%_50%)]" />
              <span className="text-sm text-[hsl(215_20%_50%)]">Search…</span>
            </div>
            <button className="relative w-9 h-9 rounded-xl bg-[hsl(215_20%_95%)] flex items-center justify-center">
              <Bell className="w-4 h-4 text-[hsl(215_20%_45%)]" />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
                style={{ background: "hsl(0 84% 60%)" }}
              />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4">
            {KPI_CARDS.map(({ label, value, change, trend, sub, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-[hsl(215_20%_92%)] p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[hsl(215_20%_48%)]">{label}</span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[hsl(220_30%_8%)] mb-2">{value}</p>
                <div className="flex items-center gap-1.5">
                  {trend === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(142 70% 40%)" }} />
                  ) : trend === "down-good" ? (
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: "hsl(142 70% 40%)" }} />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: "hsl(0 84% 60%)" }} />
                  )}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: trend !== "down-bad" ? "hsl(142 70% 40%)" : "hsl(0 84% 60%)" }}
                  >
                    {change}
                  </span>
                  <span className="text-xs text-[hsl(215_20%_55%)]">{sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Projects + Activity */}
          <div className="grid grid-cols-3 gap-4">
            {/* Projects table */}
            <div className="col-span-2 bg-white rounded-2xl border border-[hsl(215_20%_92%)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(215_20%_93%)]">
                <div>
                  <h2 className="text-sm font-semibold text-[hsl(220_30%_12%)]">Active Projects</h2>
                  <p className="text-xs text-[hsl(215_20%_50%)]">11 in progress</p>
                </div>
                <button
                  className="flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-1.5"
                  style={{ color: "hsl(221 83% 53%)", background: "hsl(221 83% 53% / 0.08)" }}
                >
                  View all
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-[hsl(215_20%_94%)]">
                {PROJECTS.map(({ name, client, progress, daysLeft, status }) => (
                  <div
                    key={name}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[hsl(215_20%_98%)] transition-colors cursor-pointer"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ background: status === "at-risk" ? "hsl(38 92% 50%)" : "hsl(221 83% 53%)" }}
                    >
                      {name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[hsl(220_30%_12%)] truncate">{name}</p>
                      <p className="text-xs text-[hsl(215_20%_50%)]">{client}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 w-28 flex-shrink-0">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-[hsl(215_20%_50%)]">{progress}%</span>
                        <div className="flex items-center gap-1">
                          {status === "at-risk" ? (
                            <AlertTriangle className="w-3 h-3" style={{ color: "hsl(38 92% 50%)" }} />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" style={{ color: "hsl(142 70% 40%)" }} />
                          )}
                          <span
                            className="text-xs font-medium"
                            style={{
                              color: status === "at-risk" ? "hsl(38 80% 45%)" : "hsl(142 60% 38%)",
                            }}
                          >
                            {daysLeft}d left
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[hsl(215_20%_92%)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progress}%`,
                            background:
                              status === "at-risk"
                                ? "hsl(38 92% 50%)"
                                : "hsl(221 83% 53%)",
                          }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[hsl(215_20%_60%)] flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="col-span-1 bg-white rounded-2xl border border-[hsl(215_20%_92%)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(215_20%_93%)]">
                <h2 className="text-sm font-semibold text-[hsl(220_30%_12%)]">Recent Activity</h2>
                <button className="text-[hsl(215_20%_55%)]">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-[hsl(215_20%_94%)]">
                {ACTIVITY.map(({ text, time, type }) => (
                  <div key={text} className="flex items-start gap-3 px-5 py-3.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background:
                          type === "success"
                            ? "hsl(142 70% 40% / 0.12)"
                            : type === "warning"
                              ? "hsl(38 92% 50% / 0.12)"
                              : "hsl(221 83% 53% / 0.12)",
                      }}
                    >
                      {type === "success" ? (
                        <CheckCircle2
                          className="w-3.5 h-3.5"
                          style={{ color: "hsl(142 70% 40%)" }}
                        />
                      ) : type === "warning" ? (
                        <AlertTriangle
                          className="w-3.5 h-3.5"
                          style={{ color: "hsl(38 92% 50%)" }}
                        />
                      ) : (
                        <Clock
                          className="w-3.5 h-3.5"
                          style={{ color: "hsl(221 83% 53%)" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[hsl(220_20%_25%)] leading-snug">{text}</p>
                      <p className="text-xs text-[hsl(215_20%_55%)] mt-0.5">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-[hsl(215_20%_93%)]">
                <button
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: "hsl(221 83% 53%)" }}
                >
                  View all activity
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
