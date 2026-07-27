import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Project {
  id: number;
  name: string;
  status: string;
  priority: string;
  progress: number;
  startDate: string | null;
  deadline: string | null;
  description: string | null;
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

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

export default function PortalProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/projects", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProjects)
      .catch(() => setError("Unable to load projects."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground mt-1">Track progress on all your projects</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="bg-card/40 border-border/50">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No projects found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/portal/projects/${p.id}`}>
              <Card className="bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/40 hover:bg-card/60 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">{p.name}</h3>
                        <span className={cn("shrink-0 text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[p.status] ?? "bg-secondary text-muted-foreground")}>
                          {p.status}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{p.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{p.progress}%</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className={cn("font-medium", PRIORITY_COLORS[p.priority])}>
                          {p.priority} priority
                        </span>
                        {p.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Due {format(parseISO(p.deadline), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
