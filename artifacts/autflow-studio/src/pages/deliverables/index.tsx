import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Search,
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Briefcase,
  Edit,
  Trash2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useListProjects } from "@workspace/api-client-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Deliverable {
  id: number;
  projectId: number;
  title: string;
  status: string;
  deadline: string | null;
  assignedTo: string | null;
  completionDate: string | null;
  notes: string | null;
  createdAt: string;
  // joined
  projectName?: string;
  clientName?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DELIVERABLE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "revision", label: "Needs Revision" },
  { value: "completed", label: "Completed" },
];

const DELIVERABLE_EXAMPLES = [
  "Website",
  "Landing Page",
  "Brand Identity",
  "Logo",
  "Ad Creatives",
  "Email Sequence",
  "Social Media Assets",
  "Marketing Report",
  "Video",
  "Automation Workflow",
  "Custom",
];

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
    case "completed": return "bg-green-500/15 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400";
    case "in_progress": return "bg-blue-500/15 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400";
    case "review": return "bg-yellow-500/15 text-yellow-600 border-yellow-200 dark:border-yellow-800 dark:text-yellow-400";
    case "revision": return "bg-orange-500/15 text-orange-600 border-orange-200 dark:border-orange-800 dark:text-orange-400";
    case "pending": return "bg-secondary text-muted-foreground border-border";
    default: return "bg-secondary text-muted-foreground border-border";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
    case "completed": return CheckCircle2;
    case "in_progress": return Clock;
    case "review": return AlertCircle;
    case "revision": return XCircle;
    default: return Package;
  }
}

// ── Deliverable Form ───────────────────────────────────────────────────────────

function DeliverableForm({
  initial,
  projectId: preselectedProjectId,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: Partial<Deliverable>;
  projectId?: number;
  onSubmit: (projectId: number, data: Partial<Deliverable>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { data: projectsData } = useListProjects({});
  const projects = projectsData ?? [];

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    status: initial?.status ?? "pending",
    deadline: initial?.deadline ?? "",
    assignedTo: initial?.assignedTo ?? "",
    notes: initial?.notes ?? "",
    projectId: initial?.projectId ? String(initial.projectId) : preselectedProjectId ? String(preselectedProjectId) : "",
  });

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId) return;
    onSubmit(Number(form.projectId), {
      title: form.title,
      status: form.status,
      deadline: form.deadline || null,
      assignedTo: form.assignedTo || null,
      notes: form.notes || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Deliverable Title *</Label>
          <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="e.g. Brand Identity Package, Website Redesign..." required />
        </div>
        <div className="col-span-2">
          <Label>Project *</Label>
          <Select value={form.projectId || ""} onValueChange={(v) => handleChange("projectId", v)}>
            <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p: { id: number; name: string }) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DELIVERABLE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" value={form.deadline} onChange={(e) => handleChange("deadline", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Owner / Assigned To</Label>
          <Input value={form.assignedTo} onChange={(e) => handleChange("assignedTo", e.target.value)} placeholder="Team member name or role" />
        </div>
        <div className="col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Revision notes, approval comments..." rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending || !form.title || !form.projectId}>
          {isPending ? "Saving..." : "Save Deliverable"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface ProjectRow {
  id: number;
  name: string;
  clientId: number;
  clientName?: string;
}

export default function DeliverablesView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDeliverable, setEditDeliverable] = useState<Deliverable | null>(null);

  // Load all projects to fetch deliverables per-project
  const { data: projectsData } = useListProjects({});
  const projects: ProjectRow[] = (projectsData ?? []) as ProjectRow[];

  // Fetch deliverables for ALL projects
  const { data: allDeliverables = [], isLoading } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables/all"],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];
      const results = await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await fetch(`/api/projects/${p.id}/deliverables`, { credentials: "include" });
            if (!res.ok) return [];
            const items = await res.json();
            return items.map((d: Deliverable) => ({
              ...d,
              projectName: p.name,
            }));
          } catch {
            return [];
          }
        }),
      );
      return results.flat();
    },
    enabled: !!projects && projects.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: Partial<Deliverable> }) => {
      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create deliverable");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables/all"] });
      setCreateOpen(false);
      toast({ title: "Deliverable created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create deliverable.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Deliverable> }) => {
      const res = await fetch(`/api/deliverables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update deliverable");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables/all"] });
      setEditDeliverable(null);
      toast({ title: "Deliverable updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update deliverable.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/deliverables/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete deliverable");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables/all"] });
      toast({ title: "Deliverable deleted" });
    },
  });

  const filtered = allDeliverables.filter((d) => {
    const matchesSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.projectName?.toLowerCase().includes(search.toLowerCase()) || d.assignedTo?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const pending = allDeliverables.filter((d) => d.status === "pending").length;
  const inReview = allDeliverables.filter((d) => d.status === "review").length;
  const needsRevision = allDeliverables.filter((d) => d.status === "revision").length;
  const approved = allDeliverables.filter((d) => d.status === "approved" || d.status === "completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliverables"
        description="Track every deliverable across all projects — ownership, approval status, and deadlines."
      >
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={16} />
          New Deliverable
        </Button>
      </PageHeader>

      {/* Stats */}
      {allDeliverables.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{allDeliverables.length}</div>
              <div className="text-sm text-muted-foreground">Total Deliverables</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{inReview}</div>
              <div className="text-sm text-muted-foreground">Awaiting Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{needsRevision}</div>
              <div className="text-sm text-muted-foreground">Needs Revision</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{approved}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deliverables..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {DELIVERABLE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading || !projects ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Package size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {allDeliverables.length === 0 ? "No deliverables yet" : "No deliverables match your filters"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            {allDeliverables.length === 0
              ? "Deliverables appear here when added to projects. Track websites, brand identities, ad creatives, and more — with owner, due date, and approval status."
              : "Try adjusting your search or filters."}
          </p>
          {allDeliverables.length === 0 && projects.length > 0 && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus size={16} />
              New Deliverable
            </Button>
          )}
          {projects.length === 0 && (
            <p className="text-xs text-muted-foreground">Create a project first to start adding deliverables.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((deliverable) => {
            const StatusIcon = getStatusIcon(deliverable.status);
            const isOverdue = deliverable.deadline && deliverable.deadline < new Date().toISOString().split("T")[0]! && !["approved", "completed"].includes(deliverable.status);
            return (
              <Card key={deliverable.id} className={cn("hover:shadow-md transition-shadow", isOverdue && "border-destructive/40")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <StatusIcon size={16} className="text-muted-foreground flex-shrink-0" />
                        <h3 className="font-semibold text-base">{deliverable.title}</h3>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", getStatusColor(deliverable.status))}>
                          {DELIVERABLE_STATUSES.find((s) => s.value === deliverable.status)?.label ?? deliverable.status}
                        </span>
                        {isOverdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/15 text-destructive border border-destructive/20">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {deliverable.projectName && (
                          <span className="flex items-center gap-1.5">
                            <Briefcase size={13} />
                            {deliverable.projectName}
                          </span>
                        )}
                        {deliverable.assignedTo && (
                          <span className="flex items-center gap-1.5">
                            <User size={13} />
                            {deliverable.assignedTo}
                          </span>
                        )}
                        {deliverable.deadline && (
                          <span className={cn("flex items-center gap-1.5", isOverdue && "text-destructive")}>
                            <Calendar size={13} />
                            {format(new Date(deliverable.deadline), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      {deliverable.notes && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-1 italic">{deliverable.notes}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditDeliverable(deliverable)} className="gap-2">
                          <Edit size={14} />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(deliverable.id)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Deliverable</DialogTitle>
          </DialogHeader>
          <DeliverableForm
            onSubmit={(projectId, data) => createMutation.mutate({ projectId, data })}
            onCancel={() => setCreateOpen(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDeliverable} onOpenChange={(o) => !o && setEditDeliverable(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deliverable</DialogTitle>
          </DialogHeader>
          {editDeliverable && (
            <DeliverableForm
              initial={editDeliverable}
              projectId={editDeliverable.projectId}
              onSubmit={(_pid, data) => updateMutation.mutate({ id: editDeliverable.id, data })}
              onCancel={() => setEditDeliverable(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
