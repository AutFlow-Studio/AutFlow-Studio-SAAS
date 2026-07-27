import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalAuth } from "@/components/portal-auth-provider";
import { Briefcase, CreditCard, Calendar, TrendingUp, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface DashboardData {
  client: { companyName: string } | null;
  stats: {
    totalProjects: number;
    activeProjects: number;
    pendingInvoices: number;
    totalOutstanding: number;
  };
  upcomingDeadlines: Array<{ id: number; name: string; status: string; deadline: string | null }>;
  recentProjects: Array<{ id: number; name: string; status: string; progress: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-500/15 text-slate-400",
  design: "bg-purple-500/15 text-purple-400",
  development: "bg-blue-500/15 text-blue-400",
  testing: "bg-amber-500/15 text-amber-400",
  review: "bg-orange-500/15 text-orange-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-zinc-500/15 text-zinc-400",
  cancelled: "bg-red-500/15 text-red-400",
  waiting: "bg-yellow-500/15 text-yellow-400",
};

export default function PortalDashboard() {
  const { user } = usePortalAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/dashboard", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then(setData)
      .catch(() => setError("Unable to load dashboard. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <AlertCircle size={32} />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] ?? ""}
        </h1>
        {data?.client && (
          <p className="text-muted-foreground mt-1">{data.client.companyName} — Client Portal</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Briefcase size={16} className="text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-bold">{data?.stats.totalProjects ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-0.5">Total Projects</div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
            </div>
            <div className="text-2xl font-bold">{data?.stats.activeProjects ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-0.5">Active Projects</div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CreditCard size={16} className="text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-bold">{data?.stats.pendingInvoices ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-0.5">Open Invoices</div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard size={16} className="text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">
              ${(data?.stats.totalOutstanding ?? 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">Outstanding</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent projects */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Projects</CardTitle>
            <Link href="/portal/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            {!data?.recentProjects?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No projects yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {data.recentProjects.map((p) => (
                  <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <Link href={`/portal/projects/${p.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[p.status] ?? "bg-secondary text-muted-foreground")}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{p.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
            <Calendar size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!data?.upcomingDeadlines?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming deadlines.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {data.upcomingDeadlines.map((p) => (
                  <div key={p.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <Link href={`/portal/projects/${p.id}`} className="text-sm font-medium hover:text-primary transition-colors block">
                        {p.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {p.deadline ? format(parseISO(p.deadline), "MMM d, yyyy") : "No date set"}
                      </span>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[p.status] ?? "bg-secondary text-muted-foreground")}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
