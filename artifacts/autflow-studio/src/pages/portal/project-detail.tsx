import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Deliverable {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  assignedTo: string | null;
  completionDate: string | null;
  notes: string | null;
}

interface Project {
  id: number;
  name: string;
  status: string;
  priority: string;
  progress: number;
  startDate: string | null;
  deadline: string | null;
  description: string | null;
  deliverables: Deliverable[];
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

const DELIVERABLE_STATUS: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  "in-progress": { icon: Clock, color: "text-blue-400" },
  completed: { icon: CheckCircle2, color: "text-emerald-400" },
  cancelled: { icon: AlertCircle, color: "text-red-400" },
};

export default function PortalProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/portal/projects/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProject)
      .catch(() => setError("Unable to load project."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <AlertCircle size={32} />
        <p className="text-sm">{error ?? "Project not found."}</p>
        <Link href="/portal/projects" className="text-xs text-primary hover:underline">← Back to projects</Link>
      </div>
    );
  }

  const done = project.deliverables.filter((d) => d.status === "completed").length;
  const total = project.deliverables.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal/projects" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[project.status] ?? "bg-secondary text-muted-foreground")}>
          {project.status}
        </span>
      </div>

      {/* Summary card */}
      <Card className="bg-card/40 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Overall Progress</span>
              <span className="font-bold">{project.progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <div className="text-sm font-medium capitalize">{project.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Priority</div>
              <div className="text-sm font-medium capitalize">{project.priority}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={11} /> Start Date</div>
              <div className="text-sm font-medium">
                {project.startDate ? format(parseISO(project.startDate), "MMM d, yyyy") : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={11} /> Deadline</div>
              <div className="text-sm font-medium">
                {project.deadline ? format(parseISO(project.deadline), "MMM d, yyyy") : "—"}
              </div>
            </div>
          </div>

          {project.description && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-2">Description</div>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card className="bg-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Deliverables</span>
            {total > 0 && (
              <span className="text-sm font-normal text-muted-foreground">{done}/{total} complete</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No deliverables have been added yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {project.deliverables.map((d) => {
                const { icon: Icon, color } = DELIVERABLE_STATUS[d.status] ?? DELIVERABLE_STATUS.pending;
                return (
                  <div key={d.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <Icon size={16} className={cn("mt-0.5 shrink-0", color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm font-medium", d.status === "completed" && "line-through text-muted-foreground")}>
                          {d.title}
                        </span>
                        {d.deadline && (
                          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                            <Calendar size={11} />
                            {format(parseISO(d.deadline), "MMM d")}
                          </span>
                        )}
                      </div>
                      {d.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{d.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
