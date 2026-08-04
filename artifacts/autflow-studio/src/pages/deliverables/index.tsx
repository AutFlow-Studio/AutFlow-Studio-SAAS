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
  Send,
  ArrowRight,
  RotateCcw,
  Flag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useListProjects } from "@workspace/api-client-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Deliverable {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  type?: string | null;
  status: string;
  deadline: string | null;
  assignedTo: string | null;
  completionDate: string | null;
  notes: string | null;
  approvalDate?: string | null;
  approvedBy?: string | null;
  revisionCount?: number;
  feedbackNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
  // joined
  projectName?: string;
  clientName?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DELIVERABLE_STATUSES = [
  { value: "draft",              label: "Draft",              color: "bg-slate-500/15 text-slate-600 border-slate-200 dark:border-slate-700 dark:text-slate-400" },
  { value: "internal_review",   label: "Internal Review",    color: "bg-blue-500/15 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400" },
  { value: "sent",              label: "Sent to Client",     color: "bg-amber-500/15 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400" },
  { value: "approved",          label: "Approved",           color: "bg-green-500/15 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400" },
  { value: "changes_requested", label: "Changes Requested",  color: "bg-orange-500/15 text-orange-600 border-orange-200 dark:border-orange-800 dark:text-orange-400" },
  { value: "completed",         label: "Completed",          color: "bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400" },
];

const DELIVERABLE_TYPES = [
  "Website", "Landing Page", "Brand Identity", "Logo", "Ad Creatives",
  "Email Sequence", "Social Media Assets", "Marketing Report", "Video",
  "Automation Workflow", "Copy / Content", "Design System", "Other",
];

// Next-step transitions for the approval workflow
const STATUS_TRANSITIONS: Record<string, { value: string; label: string; icon: typeof ArrowRight }[]> = {
  draft:              [{ value: "internal_review",   label: "Send for Internal Review", icon: ArrowRight }],
  internal_review:    [{ value: "sent",              label: "Send to Client",            icon: Send       }, { value: "draft", label: "Back to Draft", icon: RotateCcw }],
  sent:               [{ value: "approved",          label: "Mark Approved",             icon: CheckCircle2 }, { value: "changes_requested", label: "Log Revision Request", icon: RotateCcw }],
  approved:           [{ value: "completed",         label: "Mark Completed",            icon: Flag       }],
  changes_requested:  [{ value: "internal_review",   label: "Back to Internal Review",   icon: ArrowRight }],
  completed:          [],
};

function getStatusInfo(status: string) {
  return DELIVERABLE_STATUSES.find((s) => s.value === status) ?? { value: status, label: status, color: "bg-secondary text-muted-foreground border-border" };
}

function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
    case "completed":         return CheckCircle2;
    case "internal_review":   return Clock;
    case "sent":              return Send;
    case "changes_requested": return XCircle;
    case "draft":             return Package;
    default:                  return Package;
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
    title:       initial?.title ?? "",
    description: initial?.description ?? "",
    type:        initial?.type ?? "",
    status:      initial?.status ?? "draft",
    deadline:    initial?.deadline ?? "",
    assignedTo:  initial?.assignedTo ?? "",
    notes:       initial?.notes ?? "",
    feedbackNotes: initial?.feedbackNotes ?? "",
    projectId:   initial?.projectId ? String(initial.projectId) : preselectedProjectId ? String(preselectedProjectId) : "",
  });

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId) return;
    onSubmit(Number(form.projectId), {
      title:        form.title,
      description:  form.description || null,
      type:         form.type || null,
      status:       form.status,
      deadline:     form.deadline || null,
      assignedTo:   form.assignedTo || null,
      notes:        form.notes || null,
      feedbackNotes: form.feedbackNotes || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="e.g. Brand Identity Package, Website Redesign…"
            required
          />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="What does this deliverable include?"
            rows={2}
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type || ""} onValueChange={(v) => handleChange("type", v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {DELIVERABLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DELIVERABLE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Project *</Label>
          <Select value={form.projectId || ""} onValueChange={(v) => handleChange("projectId", v)}>
            <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {(projects as { id: number; name: string }[]).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" value={form.deadline} onChange={(e) => handleChange("deadline", e.target.value)} />
        </div>
        <div>
          <Label>Owner / Assigned To</Label>
          <Input
            value={form.assignedTo}
            onChange={(e) => handleChange("assignedTo", e.target.value)}
            placeholder="Team member name or role"
          />
        </div>
        <div className="col-span-2">
          <Label>Internal Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Internal notes for the team…"
            rows={2}
          />
        </div>
        <div className="col-span-2">
          <Label>Client Feedback / Revision Notes</Label>
          <Textarea
            value={form.feedbackNotes}
            onChange={(e) => handleChange("feedbackNotes", e.target.value)}
            placeholder="What did the client request? Paste their feedback here…"
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending || !form.title || !form.projectId}>
          {isPending ? "Saving…" : "Save Deliverable"}
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

  const { data: projectsData } = useListProjects({});
  const projects: ProjectRow[] = (projectsData ?? []) as ProjectRow[];

  const { data: allDeliverables = [], isLoading } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables/all", projects.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];
      const results = await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await fetch(`/api/projects/${p.id}/deliverables`, { credentials: "include" });
            if (!res.ok) return [];
            const items = await res.json();
            return items.map((d: Deliverable) => ({ ...d, projectName: p.name }));
          } catch {
            return [];
          }
        }),
      );
      return results.flat();
    },
    enabled: projects.length > 0,
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

  function advanceStatus(deliverable: Deliverable, newStatus: string) {
    updateMutation.mutate({ id: deliverable.id, data: { status: newStatus } });
  }

  const filtered = allDeliverables.filter((d) => {
    const matchesSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.projectName?.toLowerCase().includes(search.toLowerCase()) ||
      d.type?.toLowerCase().includes(search.toLowerCase()) ||
      d.assignedTo?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter options with counts
  const filterOptions = [
    { value: "all",              label: "All",              count: allDeliverables.length },
    { value: "internal_review",  label: "Pending Review",   count: allDeliverables.filter((d) => d.status === "internal_review").length },
    { value: "sent",             label: "Waiting Client",   count: allDeliverables.filter((d) => d.status === "sent").length },
    { value: "approved",         label: "Approved",         count: allDeliverables.filter((d) => d.status === "approved").length },
    { value: "changes_requested",label: "Changes Requested",count: allDeliverables.filter((d) => d.status === "changes_requested").length },
  ];

  // Stats
  const draftCount      = allDeliverables.filter((d) => d.status === "draft").length;
  const inReviewCount   = allDeliverables.filter((d) => d.status === "internal_review").length;
  const waitingClient   = allDeliverables.filter((d) => d.status === "sent").length;
  const changesCount    = allDeliverables.filter((d) => d.status === "changes_requested").length;
  const approvedCount   = allDeliverables.filter((d) => d.status === "approved" || d.status === "completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliverables"
        description="Track every deliverable across all projects — ownership, approval workflow, and deadlines."
      >
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={16} />
          New Deliverable
        </Button>
      </PageHeader>

      {/* Stats */}
      {allDeliverables.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{draftCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Draft</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inReviewCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Internal Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{waitingClient}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Waiting Client</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{changesCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Changes Requested</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Approved / Done</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deliverables, projects, owners…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                filterStatus === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
              )}
            >
              {opt.label}
              {opt.count > 0 && (
                <span className={cn(
                  "ml-1.5 text-xs rounded-full px-1.5 py-0.5",
                  filterStatus === opt.value ? "bg-primary-foreground/20" : "bg-muted",
                )}>
                  {opt.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading || !projects ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />)}
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
              ? "Start by adding a deliverable to a project. Track websites, brand identities, ad creatives, and more — with owner, due date, and the full approval workflow."
              : "Try adjusting your search or filter."}
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
            const info = getStatusInfo(deliverable.status);
            const StatusIcon = getStatusIcon(deliverable.status);
            const isOverdue =
              deliverable.deadline &&
              deliverable.deadline < new Date().toISOString().split("T")[0]! &&
              !["approved", "completed"].includes(deliverable.status);
            const transitions = STATUS_TRANSITIONS[deliverable.status] ?? [];

            return (
              <Card key={deliverable.id} className={cn("hover:shadow-md transition-shadow", isOverdue && "border-destructive/40")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <StatusIcon size={15} className="text-muted-foreground flex-shrink-0" />
                        <h3 className="font-semibold text-base">{deliverable.title}</h3>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", info.color)}>
                          {info.label}
                        </span>
                        {deliverable.type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                            {deliverable.type}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/15 text-destructive border border-destructive/20">
                            Overdue
                          </span>
                        )}
                        {(deliverable.revisionCount ?? 0) > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-500/10 text-orange-600 border border-orange-200 dark:border-orange-800 dark:text-orange-400 flex items-center gap-1">
                            <RotateCcw size={10} />
                            Rev. {deliverable.revisionCount}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {deliverable.description && (
                        <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">{deliverable.description}</p>
                      )}

                      {/* Meta row */}
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
                            {format(new Date(deliverable.deadline + "T00:00:00"), "MMM d, yyyy")}
                          </span>
                        )}
                        {deliverable.approvalDate && (
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={13} />
                            Approved {format(new Date(deliverable.approvalDate + "T00:00:00"), "MMM d")}
                          </span>
                        )}
                      </div>

                      {/* Client feedback notes */}
                      {deliverable.feedbackNotes && deliverable.status === "changes_requested" && (
                        <div className="mt-2 text-sm text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md px-3 py-1.5 line-clamp-2">
                          <span className="font-medium">Client feedback: </span>
                          {deliverable.feedbackNotes}
                        </div>
                      )}

                      {/* Quick workflow transitions */}
                      {transitions.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {transitions.map((t) => {
                            const TIcon = t.icon;
                            return (
                              <Button
                                key={t.value}
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 font-medium"
                                disabled={updateMutation.isPending}
                                onClick={() => advanceStatus(deliverable, t.value)}
                              >
                                <TIcon size={12} />
                                {t.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions menu */}
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
                        {transitions.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Advance workflow</DropdownMenuLabel>
                            {transitions.map((t) => (
                              <DropdownMenuItem
                                key={t.value}
                                className="gap-2"
                                onClick={() => advanceStatus(deliverable, t.value)}
                              >
                                <t.icon size={14} />
                                {t.label}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
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
