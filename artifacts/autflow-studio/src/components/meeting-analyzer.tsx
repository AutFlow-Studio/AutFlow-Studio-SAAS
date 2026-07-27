import { useState } from "react";
import { Sparkles, Loader2, CheckSquare, FileText, Lightbulb, Target, User, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FollowUpTask {
  title: string;
  priority: "high" | "medium" | "low";
  notes?: string;
}

interface MeetingAnalysis {
  summary: string;
  decisions: string[];
  actionItems: string[];
  followUpTasks: FollowUpTask[];
  clientIntel: string[];
}

interface MeetingAnalyzerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  clientId?: number;
  initialNotes?: string;
}

function Section({
  icon: Icon,
  label,
  items,
  color = "text-muted-foreground",
}: {
  icon: React.ElementType;
  label: string;
  items: string[];
  color?: string;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={color} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-muted-foreground mt-1 flex-shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PRIORITY_COLORS = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function MeetingAnalyzer({
  open,
  onOpenChange,
  clientName,
  clientId,
  initialNotes = "",
}: MeetingAnalyzerProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingTaskIdx, setCreatingTaskIdx] = useState<number | null>(null);
  const [createdTaskIdxs, setCreatedTaskIdxs] = useState<Set<number>>(new Set());

  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  async function analyzeNotes() {
    if (!notes.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setCreatedTaskIdxs(new Set());

    try {
      const res = await fetch("/api/ai/analyze-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes, clientName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Analysis failed");
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function createTaskFromItem(task: FollowUpTask, idx: number) {
    setCreatingTaskIdx(idx);
    try {
      await createTask.mutateAsync({
        data: {
          title: task.title,
          priority: task.priority as "low" | "medium" | "high" | "urgent",
          notes: task.notes ?? undefined,
          clientId: clientId ?? undefined,
          status: "todo",
        },
      });
      setCreatedTaskIdxs((prev) => new Set([...prev, idx]));
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Task created", description: `"${task.title}" added to your tasks.` });
    } catch {
      toast({ title: "Failed to create task", variant: "destructive" });
    } finally {
      setCreatingTaskIdx(null);
    }
  }

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setNotes(initialNotes);
      setAnalysis(null);
      setError(null);
      setCreatedTaskIdxs(new Set());
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            AI Meeting Analyzer
            {clientName && (
              <span className="text-sm font-normal text-muted-foreground">— {clientName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!analysis ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting Notes or Transcript</label>
                <Textarea
                  placeholder="Paste your meeting notes or transcript here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  className="resize-none text-sm"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={analyzeNotes}
                disabled={!notes.trim() || loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Analysing meeting…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Analyse Meeting
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-5">
              {/* Summary */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm">{analysis.summary}</p>
              </div>

              <Section icon={Target} label="Decisions Made" items={analysis.decisions} color="text-emerald-400" />
              <Section icon={CheckSquare} label="Action Items" items={analysis.actionItems} color="text-orange-400" />
              <Section icon={User} label="Client Intelligence" items={analysis.clientIntel} color="text-blue-400" />

              {/* Follow-up tasks with create buttons */}
              {analysis.followUpTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-yellow-400" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Suggested Tasks
                    </span>
                  </div>
                  <div className="space-y-2">
                    {analysis.followUpTasks.map((task, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{task.title}</span>
                            <span
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full border",
                                PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium,
                              )}
                            >
                              {task.priority}
                            </span>
                          </div>
                          {task.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{task.notes}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={createdTaskIdxs.has(i) ? "ghost" : "outline"}
                          className="h-7 text-xs flex-shrink-0 gap-1"
                          onClick={() => createTaskFromItem(task, i)}
                          disabled={creatingTaskIdx === i || createdTaskIdxs.has(i)}
                        >
                          {creatingTaskIdx === i ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : createdTaskIdxs.has(i) ? (
                            <CheckSquare size={11} className="text-emerald-400" />
                          ) : (
                            <Plus size={11} />
                          )}
                          {createdTaskIdxs.has(i) ? "Created" : "Add Task"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAnalysis(null); setError(null); }}
                  className="flex-1 gap-1.5"
                >
                  <X size={13} />
                  Analyse Different Notes
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
