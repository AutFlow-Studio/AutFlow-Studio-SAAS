import {
  useListTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useListProjects,
  getListTimeEntriesQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, Pencil, Trash2, BarChart3, Calendar, Briefcase } from "lucide-react";
import { PageError } from "@/components/page-error";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek, startOfMonth, isAfter, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeEntryItem {
  id: number;
  projectId?: number | null;
  projectName?: string | null;
  date: string;
  durationMinutes: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function parseDurationInput(value: string): number | null {
  // Accepts formats: "2", "2.5", "2h", "2h30m", "150" (minutes)
  value = value.trim().toLowerCase();
  const hm = value.match(/^(\d+)h\s*(\d+)m?$/);
  if (hm) return parseInt(hm[1]!, 10) * 60 + parseInt(hm[2]!, 10);
  const hOnly = value.match(/^(\d+(?:\.\d+)?)h?$/);
  if (hOnly) return Math.round(parseFloat(hOnly[1]!) * 60);
  return null;
}

function totalMinutes(entries: TimeEntryItem[]): number {
  return entries.reduce((acc, e) => acc + e.durationMinutes, 0);
}

// ─── Log Time Dialog ──────────────────────────────────────────────────────────

interface LogTimeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: TimeEntryItem | null;
  onClose: () => void;
}

function LogTimeDialog({ open, onOpenChange, editing, onClose }: LogTimeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects } = useListProjects();
  const { mutate: createEntry, isPending: isCreating } = useCreateTimeEntry();
  const { mutate: updateEntry, isPending: isUpdating } = useUpdateTimeEntry();
  const isPending = isCreating || isUpdating;

  const today = format(new Date(), "yyyy-MM-dd");
  const [projectId, setProjectId] = useState<string>(editing ? String(editing.projectId ?? "") : "");
  const [date, setDate] = useState(editing?.date ?? today);
  const [duration, setDuration] = useState(
    editing ? formatDuration(editing.durationMinutes).replace("h ", "h ").replace("h", "h ").trim() : ""
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [durationError, setDurationError] = useState("");

  // Reset when dialog opens/closes or editing changes
  function reset() {
    setProjectId(editing ? String(editing.projectId ?? "") : "");
    setDate(editing?.date ?? today);
    setDuration(editing ? formatDuration(editing.durationMinutes) : "");
    setNotes(editing?.notes ?? "");
    setDurationError("");
  }

  function handleClose() {
    reset();
    onClose();
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseDurationInput(duration);
    if (!mins || mins < 1) {
      setDurationError("Enter a valid duration, e.g. 1.5 or 1h30m");
      return;
    }
    setDurationError("");

    const payload = {
      projectId: projectId ? parseInt(projectId, 10) : undefined,
      date,
      durationMinutes: mins,
      notes: notes.trim() || undefined,
    };

    if (editing) {
      updateEntry(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
            toast({ title: "Time entry updated" });
            handleClose();
          },
          onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
        },
      );
    } else {
      createEntry(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
            toast({ title: "Time logged" });
            handleClose();
          },
          onError: () => toast({ title: "Error", description: "Failed to log time.", variant: "destructive" }),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Time Entry" : "Log Time"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="te-project">Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="te-project"><SelectValue placeholder="No project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="te-date">Date *</Label>
              <Input id="te-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-duration">Duration *</Label>
              <Input
                id="te-duration"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); setDurationError(""); }}
                placeholder="e.g. 2h30m or 1.5"
                required
              />
              {durationError && <p className="text-xs text-destructive">{durationError}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-notes">Notes (optional)</Label>
            <Input id="te-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you work on?" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending || !date || !duration}>
              {isPending ? "Saving…" : editing ? "Save Changes" : "Log Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteEntryDialog({
  entry,
  onClose,
}: {
  entry: TimeEntryItem | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: deleteEntry, isPending } = useDeleteTimeEntry();

  function handleConfirm() {
    if (!entry) return;
    deleteEntry(
      { id: entry.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
          toast({ title: "Entry deleted" });
          onClose();
        },
        onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
      },
    );
  }

  return (
    <AlertDialog open={!!entry} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the{" "}
            {entry ? formatDuration(entry.durationMinutes) : ""} entry
            {entry?.projectName ? ` on ${entry.projectName}` : ""} from{" "}
            {entry ? format(parseISO(entry.date), "MMM d, yyyy") : ""}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimeTrackingPage() {
  const { data: entries, isLoading, error } = useListTimeEntries();
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntryItem | null>(null);
  const [deleting, setDeleting] = useState<TimeEntryItem | null>(null);

  if (error) return <PageError message="Failed to load time entries." />;

  const allEntries: TimeEntryItem[] = (entries ?? []) as TimeEntryItem[];

  // Stats
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const weekEntries = allEntries.filter((e) => {
    const d = parseISO(e.date);
    return isAfter(d, weekStart) || d.toDateString() === weekStart.toDateString();
  });
  const monthEntries = allEntries.filter((e) => {
    const d = parseISO(e.date);
    return isAfter(d, monthStart) || d.toDateString() === monthStart.toDateString();
  });

  // Hours by project
  const byProject: Record<string, number> = {};
  for (const e of allEntries) {
    const key = e.projectName ?? "No project";
    byProject[key] = (byProject[key] ?? 0) + e.durationMinutes;
  }
  const topProjects = Object.entries(byProject)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxProjectMins = topProjects[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Tracking"
        description="Log hours per project to keep your invoices backed up."
      >
        <Button onClick={() => { setEditing(null); setLogOpen(true); }} className="gap-2">
          <Plus size={16} />
          Log Time
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50">
          <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">This Week</CardTitle>
            <div className="p-1.5 rounded-lg bg-background/60 border border-border/40 text-primary">
              <Clock size={13} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatDuration(totalMinutes(weekEntries))}</div>
            <p className="text-xs text-muted-foreground mt-1">{weekEntries.length} entr{weekEntries.length === 1 ? "y" : "ies"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-border/50">
          <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">This Month</CardTitle>
            <div className="p-1.5 rounded-lg bg-background/60 border border-border/40 text-indigo-400">
              <Calendar size={13} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatDuration(totalMinutes(monthEntries))}</div>
            <p className="text-xs text-muted-foreground mt-1">{monthEntries.length} entr{monthEntries.length === 1 ? "y" : "ies"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-border/50">
          <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">All Time</CardTitle>
            <div className="p-1.5 rounded-lg bg-background/60 border border-border/40 text-emerald-400">
              <BarChart3 size={13} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatDuration(totalMinutes(allEntries))}</div>
            <p className="text-xs text-muted-foreground mt-1">{allEntries.length} total entr{allEntries.length === 1 ? "y" : "ies"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">Recent Entries</h2>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : allEntries.length === 0 ? (
            <Card className="bg-card/40 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock size={32} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No time entries yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                  Log your first entry to start tracking hours per project.
                </p>
                <Button size="sm" className="mt-4 gap-2" onClick={() => { setEditing(null); setLogOpen(true); }}>
                  <Plus size={14} />
                  Log Time
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allEntries.map((entry) => (
                <Card key={entry.id} className="bg-card/40 border-border/50 hover:bg-card/70 transition-colors group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Clock size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{formatDuration(entry.durationMinutes)}</span>
                        {entry.projectName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase size={10} />
                            {entry.projectName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(entry.date), "EEE, MMM d, yyyy")}
                        </span>
                        {entry.notes && (
                          <span className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
                            · {entry.notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditing(entry); setLogOpen(true); }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(entry)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Hours by Project */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">Hours by Project</h2>
          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-4 space-y-4">
              {topProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                topProjects.map(([name, mins]) => (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">{name}</span>
                      <span className="text-xs font-mono font-medium shrink-0">{formatDuration(mins)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(mins / maxProjectMins) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <LogTimeDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        editing={editing}
        onClose={() => { setEditing(null); setLogOpen(false); }}
      />
      <DeleteEntryDialog entry={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
