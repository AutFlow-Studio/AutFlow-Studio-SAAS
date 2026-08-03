import {
  useListMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useListProjects,
  getListMilestonesQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Flag, Plus, Pencil, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";
import { PageError } from "@/components/page-error";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

type MilestoneStatus = "pending" | "in_progress" | "completed";

interface MilestoneItem {
  id: number;
  projectId?: number | null;
  projectName?: string | null;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  return status === "in_progress" ? "In Progress" : status === "completed" ? "Completed" : "Pending";
}

function statusVariantClass(status: string, dueDate?: string | null): string {
  if (status === "completed") return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
  if (status === "in_progress") return "border-blue-500/40 text-blue-400 bg-blue-500/10";
  if (dueDate) {
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return "border-red-500/40 text-red-400 bg-red-500/10";
    if (days <= 7) return "border-amber-500/40 text-amber-400 bg-amber-500/10";
  }
  return "border-border/50 text-muted-foreground bg-muted/30";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === "in_progress") return <Clock size={14} className="text-blue-400" />;
  return <Circle size={14} className="text-muted-foreground" />;
}

// ─── Milestone Dialog ─────────────────────────────────────────────────────────

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: MilestoneItem | null;
  onClose: () => void;
}

function MilestoneDialog({ open, onOpenChange, editing, onClose }: MilestoneDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects } = useListProjects();
  const { mutate: createMilestone, isPending: isCreating } = useCreateMilestone();
  const { mutate: updateMilestone, isPending: isUpdating } = useUpdateMilestone();
  const isPending = isCreating || isUpdating;

  const [name, setName] = useState(editing?.name ?? "");
  const [projectId, setProjectId] = useState(editing ? String(editing.projectId ?? "") : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? "");
  const [status, setStatus] = useState<MilestoneStatus>((editing?.status as MilestoneStatus) ?? "pending");

  function reset() {
    setName(editing?.name ?? "");
    setProjectId(editing ? String(editing.projectId ?? "") : "");
    setDescription(editing?.description ?? "");
    setDueDate(editing?.dueDate ?? "");
    setStatus((editing?.status as MilestoneStatus) ?? "pending");
  }

  function handleClose() {
    reset();
    onClose();
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      projectId: projectId ? parseInt(projectId, 10) : undefined,
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      status,
    };

    if (editing) {
      updateMilestone(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey() });
            toast({ title: "Milestone updated" });
            handleClose();
          },
          onError: () => toast({ title: "Error", description: "Failed to update milestone.", variant: "destructive" }),
        },
      );
    } else {
      createMilestone(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey() });
            toast({ title: "Milestone created" });
            handleClose();
          },
          onError: () => toast({ title: "Error", description: "Failed to create milestone.", variant: "destructive" }),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ms-name">Name *</Label>
            <Input
              id="ms-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend complete, Backend integration, Deployment"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ms-project">Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="ms-project"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
                <SelectTrigger id="ms-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-due">Due Date (optional)</Label>
            <Input id="ms-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-desc">Description (optional)</Label>
            <Textarea
              id="ms-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to happen for this milestone to be complete?"
              rows={2}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Saving…" : editing ? "Save Changes" : "Add Milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteMilestoneDialog({
  milestone,
  onClose,
}: {
  milestone: MilestoneItem | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: deleteMilestone, isPending } = useDeleteMilestone();

  function handleConfirm() {
    if (!milestone) return;
    deleteMilestone(
      { id: milestone.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey() });
          toast({ title: "Milestone deleted" });
          onClose();
        },
        onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
      },
    );
  }

  return (
    <AlertDialog open={!!milestone} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
          <AlertDialogDescription>
            "{milestone?.name}" will be permanently deleted.
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

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MilestonesPage() {
  const { data: milestones, isLoading, error } = useListMilestones();
  const [activeTab, setActiveTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MilestoneItem | null>(null);
  const [deleting, setDeleting] = useState<MilestoneItem | null>(null);

  if (error) return <PageError message="Failed to load milestones." />;

  const allMilestones: MilestoneItem[] = (milestones ?? []) as MilestoneItem[];
  const filtered = activeTab === "all" ? allMilestones : allMilestones.filter((m) => m.status === activeTab);

  const pending = allMilestones.filter((m) => m.status === "pending").length;
  const inProgress = allMilestones.filter((m) => m.status === "in_progress").length;
  const completed = allMilestones.filter((m) => m.status === "completed").length;

  // Overdue = pending/in_progress with past due date
  const overdue = allMilestones.filter((m) => {
    if (m.status === "completed") return false;
    if (!m.dueDate) return false;
    return differenceInDays(parseISO(m.dueDate), new Date()) < 0;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Milestones"
        description="Track key delivery checkpoints across your projects."
      >
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} />
          Add Milestone
        </Button>
      </PageHeader>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: pending, color: "text-muted-foreground" },
          { label: "In Progress", value: inProgress, color: "text-blue-400" },
          { label: "Completed", value: completed, color: "text-emerald-400" },
          { label: "Overdue", value: overdue, color: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/40 border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-bold mt-0.5", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-border/50">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({tab.value === "pending" ? pending : tab.value === "in_progress" ? inProgress : completed})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/40 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Flag size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {activeTab === "all" ? "No milestones yet" : `No ${statusLabel(activeTab).toLowerCase()} milestones`}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
              {activeTab === "all"
                ? "Create milestones to track key checkpoints like 'Frontend complete' or 'Deployed to production'."
                : "Change the filter above to see milestones with other statuses."}
            </p>
            {activeTab === "all" && (
              <Button size="sm" className="mt-4 gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus size={14} />
                Add Milestone
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ms) => {
            const daysLeft = ms.dueDate ? differenceInDays(parseISO(ms.dueDate), new Date()) : null;
            const isOverdue = ms.status !== "completed" && daysLeft !== null && daysLeft < 0;

            return (
              <Card key={ms.id} className="bg-card/40 border-border/50 hover:bg-card/70 transition-colors group">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="mt-0.5 shrink-0">
                    <StatusIcon status={ms.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn(
                          "text-sm font-medium leading-tight",
                          ms.status === "completed" && "line-through text-muted-foreground"
                        )}>
                          {ms.name}
                        </p>
                        {ms.projectName && (
                          <p className="text-xs text-muted-foreground mt-0.5">{ms.projectName}</p>
                        )}
                        {ms.description && (
                          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{ms.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", statusVariantClass(ms.status, ms.dueDate))}
                        >
                          {statusLabel(ms.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        {ms.dueDate ? (
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"
                          )}>
                            <Flag size={10} />
                            {isOverdue
                              ? `${Math.abs(daysLeft!)}d overdue`
                              : daysLeft === 0
                              ? "Due today"
                              : daysLeft === 1
                              ? "Due tomorrow"
                              : `Due ${format(parseISO(ms.dueDate), "MMM d, yyyy")}`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">No due date</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditing(ms); setDialogOpen(true); }}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(ms)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <MilestoneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onClose={() => { setEditing(null); setDialogOpen(false); }}
      />
      <DeleteMilestoneDialog milestone={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
