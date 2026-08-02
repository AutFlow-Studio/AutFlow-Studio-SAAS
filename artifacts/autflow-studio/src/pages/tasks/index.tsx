import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListClients,
  getListTasksQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, GripVertical, Calendar, Trash2 } from "lucide-react";
import { PageError } from "@/components/page-error";
import { StatusBadge, getProjectPriorityVariant } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: number;
  title: string;
  priority: string;
  status: string;
  sortOrder?: number;
  deadline?: string | null;
  notes?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  projectName?: string | null;
  createdAt: string;
}

// ─── New Task Dialog ──────────────────────────────────────────────────────────

function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients } = useListClients();
  const { mutate: createTask, isPending } = useCreateTask();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<string>("todo");
  const [deadline, setDeadline] = useState("");
  const [clientId, setClientId] = useState("");

  function resetForm() {
    setTitle("");
    setPriority("medium");
    setStatus("todo");
    setDeadline("");
    setClientId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask(
      {
        data: {
          title: title.trim(),
          priority: priority as any,
          status: status as any,
          deadline: deadline || undefined,
          clientId: clientId ? parseInt(clientId, 10) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Task created" });
          resetForm();
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nt-title">Title *</Label>
            <Input id="nt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nt-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="nt-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low","medium","high","urgent"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="nt-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt-deadline">Deadline</Label>
            <Input id="nt-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt-client">Client (optional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="nt-client">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Creating…" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Detail Dialog ───────────────────────────────────────────────────────

interface TaskDetailDialogProps {
  task: TaskItem | null;
  onClose: () => void;
  onDelete: (id: number) => void;
}

function TaskDetailDialog({ task, onClose, onDelete }: TaskDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateTask, isPending } = useUpdateTask();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!task) return null;

  function handleStatusChange(newStatus: string) {
    if (!task) return;
    updateTask(
      { id: task.id, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Task updated" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <>
      <Dialog open={!!task} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="pr-6">{task.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge variant={getProjectPriorityVariant(task.priority)}>
                {task.priority}
              </StatusBadge>
              {task.clientName && (
                <Link href={`/clients/${task.clientId}`} className="text-xs text-muted-foreground hover:text-primary truncate">
                  {task.clientName}
                </Link>
              )}
              {task.projectName && (
                <span className="text-xs text-muted-foreground truncate">{task.projectName}</span>
              )}
            </div>

            {task.deadline && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar size={14} />
                Due: {format(new Date(task.deadline), "MMM d, yyyy")}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="td-status">Status</Label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={isPending}>
                <SelectTrigger id="td-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {task.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDelete(task.id); setConfirmDelete(false); onClose(); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Drop Indicator ───────────────────────────────────────────────────────────

function DropIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="h-0.5 bg-primary rounded-full mx-1 my-0.5 opacity-80" />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksList() {
  const { data: tasks, isLoading, isError } = useListTasks();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: updateTask } = useUpdateTask();

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // ── Drag-and-drop state ─────────────────────────────────────────────────────
  // draggingId: the task being dragged
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // dropTarget: where the dragged card would be inserted
  const [dropTarget, setDropTarget] = useState<{
    columnId: string;
    beforeTaskId: number | null; // null = insert at end of column
  } | null>(null);
  // Ref to enforce dragging only from the grip handle
  const dragHandleActive = useRef(false);

  // ── Sort helper ─────────────────────────────────────────────────────────────
  function sortByOrder(items: TaskItem[]): TaskItem[] {
    return [...items].sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const handleGripPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    dragHandleActive.current = true;
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: number) => {
    if (!dragHandleActive.current) {
      e.preventDefault();
      return;
    }
    dragHandleActive.current = false;
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    e.dataTransfer.setData("text/plain", String(taskId));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
    dragHandleActive.current = false;
  }, []);

  // Called when dragging over a task card — sets drop position to before that card
  const handleDragOverCard = useCallback(
    (e: React.DragEvent, columnId: string, beforeTaskId: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDropTarget((prev) =>
        prev?.columnId === columnId && prev?.beforeTaskId === beforeTaskId
          ? prev
          : { columnId, beforeTaskId }
      );
    },
    []
  );

  // Called when dragging over the column's empty-drop area — sets drop to end
  const handleDragOverColumn = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTarget((prev) =>
        prev?.columnId === columnId && prev?.beforeTaskId === null
          ? prev
          : { columnId, beforeTaskId: null }
      );
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetColumnId: string, beforeTaskId: number | null) => {
      e.preventDefault();
      if (!draggingId || !tasks) return;

      const allTasks = tasks as TaskItem[];
      const draggedTask = allTasks.find((t) => t.id === draggingId);
      if (!draggedTask) return;

      const fromColumnId = draggedTask.status;
      const targetColItems = sortByOrder(allTasks.filter((t) => t.status === targetColumnId));

      if (fromColumnId === targetColumnId) {
        // ── Same-column reorder ──────────────────────────────────────────────
        const withoutDragged = targetColItems.filter((t) => t.id !== draggingId);
        const insertAt =
          beforeTaskId !== null
            ? withoutDragged.findIndex((t) => t.id === beforeTaskId)
            : withoutDragged.length;
        const idx = insertAt === -1 ? withoutDragged.length : insertAt;
        withoutDragged.splice(idx, 0, draggedTask);

        // Assign new sortOrders (0, 100, 200, …)
        const updates = withoutDragged.map((t, i) => ({ id: t.id, sortOrder: i * 100 }));

        // Optimistic update — immediately reflect new order in the cache
        const updatedCache = allTasks.map((t) => {
          const u = updates.find((upd) => upd.id === t.id);
          return u ? { ...t, sortOrder: u.sortOrder } : t;
        });
        queryClient.setQueryData(getListTasksQueryKey(), updatedCache);

        // Persist every changed task's sortOrder in the background
        updates.forEach(({ id, sortOrder }) => {
          updateTask({ id, data: { sortOrder } as any });
        });

        // Re-sync from server after all writes likely land
        setTimeout(
          () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
          800
        );
      } else {
        // ── Cross-column move: change status + assign sortOrder ──────────────
        let newSortOrder: number;
        if (beforeTaskId !== null) {
          const beforeIdx = targetColItems.findIndex((t) => t.id === beforeTaskId);
          const prev = targetColItems[beforeIdx - 1];
          const curr = targetColItems[beforeIdx];
          if (prev) {
            newSortOrder = Math.floor(
              ((prev.sortOrder ?? 0) + (curr.sortOrder ?? (prev.sortOrder ?? 0) + 100)) / 2
            );
          } else {
            newSortOrder = (curr.sortOrder ?? 100) - 100;
          }
        } else {
          const last = targetColItems[targetColItems.length - 1];
          newSortOrder = last ? (last.sortOrder ?? 0) + 100 : 0;
        }

        // Optimistic update
        const updatedCache = allTasks.map((t) =>
          t.id === draggingId
            ? { ...t, status: targetColumnId, sortOrder: newSortOrder }
            : t
        );
        queryClient.setQueryData(getListTasksQueryKey(), updatedCache);

        updateTask(
          { id: draggingId, data: { status: targetColumnId as any, sortOrder: newSortOrder } as any },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            },
            onError: () => {
              // Roll back on failure
              queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
              toast({
                title: "Error",
                description: "Failed to move task. Please try again.",
                variant: "destructive",
              });
            },
          }
        );
      }

      setDraggingId(null);
      setDropTarget(null);
    },
    [draggingId, tasks, queryClient, updateTask, toast]
  );

  // ── Delete ──────────────────────────────────────────────────────────────────

  function handleDeleteTask(id: number) {
    deleteTask(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Task deleted" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
        },
      }
    );
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tasks" description="Manage your internal to-do list" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] rounded-xl" />
          <Skeleton className="h-[500px] rounded-xl" />
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tasks" description="Manage your internal to-do list" />
        <PageError message="Failed to load tasks." />
      </div>
    );
  }

  // ── Kanban columns ─────────────────────────────────────────────────────────

  const allTasks = (tasks ?? []) as TaskItem[];

  const columns = [
    { id: "todo", title: "To Do", items: sortByOrder(allTasks.filter((t) => t.status === "todo")) },
    { id: "in_progress", title: "In Progress", items: sortByOrder(allTasks.filter((t) => t.status === "in_progress")) },
    { id: "done", title: "Done", items: sortByOrder(allTasks.filter((t) => t.status === "done")) },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Tasks" description="Manage your internal to-do list">
        <Button className="gap-2" onClick={() => setNewTaskOpen(true)}>
          <Plus size={16} />
          New Task
        </Button>
      </PageHeader>

      <NewTaskDialog open={newTaskOpen} onOpenChange={setNewTaskOpen} />
      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onDelete={handleDeleteTask}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {columns.map((col) => {
          const isDropTarget =
            dropTarget?.columnId === col.id && dropTarget?.beforeTaskId === null;

          return (
            <div
              key={col.id}
              className="flex flex-col h-full bg-secondary/20 rounded-xl border border-border/50 overflow-hidden"
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id, null)}
            >
              {/* Column header */}
              <div className="p-4 border-b border-border/50 bg-secondary/50 flex items-center justify-between">
                <h3 className="font-semibold">{col.title}</h3>
                <span className="bg-background px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground border">
                  {col.items.length}
                </span>
              </div>

              {/* Column body */}
              <div
                className={`p-3 flex-1 overflow-y-auto space-y-0 transition-colors ${
                  isDropTarget && draggingId !== null ? "bg-primary/5" : ""
                }`}
              >
                {col.items.length === 0 ? (
                  <>
                    {draggingId !== null && isDropTarget && (
                      <DropIndicator active />
                    )}
                    <div
                      className={`text-center p-6 text-sm text-muted-foreground border border-dashed rounded-lg transition-colors ${
                        isDropTarget && draggingId !== null
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50"
                      }`}
                    >
                      {draggingId !== null ? "Drop here" : "No tasks here."}
                    </div>
                  </>
                ) : (
                  <div className="space-y-0">
                    {col.items.map((task) => {
                      const isBeforeIndicator =
                        dropTarget?.columnId === col.id &&
                        dropTarget?.beforeTaskId === task.id;
                      const isDragging = task.id === draggingId;

                      return (
                        <div key={task.id}>
                          {/* Drop indicator line before this card */}
                          <DropIndicator active={isBeforeIndicator && draggingId !== null} />

                          <div className="mb-3">
                            <Card
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => handleDragOverCard(e, col.id, task.id)}
                              onDrop={(e) => handleDrop(e, col.id, task.id)}
                              className={`bg-card cursor-pointer hover:border-primary/50 transition-all shadow-sm group select-none ${
                                isDragging ? "opacity-40 scale-[0.98]" : ""
                              }`}
                              onClick={() => {
                                if (draggingId === null) setSelectedTask(task);
                              }}
                            >
                              <CardContent className="p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <StatusBadge
                                    variant={getProjectPriorityVariant(task.priority)}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {task.priority}
                                  </StatusBadge>
                                  {/* Drag handle — drag only initiates from here */}
                                  <div
                                    className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-0.5 -mr-0.5 rounded hover:bg-secondary/60 touch-none"
                                    onPointerDown={handleGripPointerDown}
                                    title="Drag to reorder"
                                  >
                                    <GripVertical size={14} className="text-muted-foreground" />
                                  </div>
                                </div>

                                <div className="font-medium text-sm mb-2 leading-tight">
                                  {task.title}
                                </div>

                                {task.clientName && (
                                  <span
                                    className="text-xs text-muted-foreground hover:text-primary block mb-2 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Link href={`/clients/${task.clientId}`}>
                                      {task.clientName}
                                    </Link>
                                  </span>
                                )}

                                {task.deadline && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mt-3 pt-2 border-t border-border/50">
                                    <Calendar size={12} />
                                    {format(new Date(task.deadline), "MMM d")}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    })}

                    {/* Drop indicator at end of column (when dragging over column area below last card) */}
                    {isDropTarget && draggingId !== null && (
                      <DropIndicator active />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
