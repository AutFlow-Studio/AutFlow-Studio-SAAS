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
  Plus,
  Megaphone,
  Search,
  ExternalLink,
  MoreHorizontal,
  Target,
  DollarSign,
  Calendar,
  Building2,
  Briefcase,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useListClients, useListProjects } from "@workspace/api-client-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: number;
  name: string;
  type: string;
  goal: string | null;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  performanceNotes: string | null;
  results: string | null;
  clientId: number | null;
  projectId: number | null;
  clientName: string | null;
  projectName: string | null;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES = [
  { value: "seo", label: "SEO" },
  { value: "paid_ads", label: "Paid Ads" },
  { value: "social_media", label: "Social Media" },
  { value: "email_marketing", label: "Email Marketing" },
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "lead_generation", label: "Lead Generation" },
  { value: "custom", label: "Custom" },
];

const CAMPAIGN_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function getCampaignTypeLabel(type: string) {
  return CAMPAIGN_TYPES.find((t) => t.value === type)?.label ?? type;
}

function getStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": return "default";
    case "planning": return "secondary";
    case "paused": return "outline";
    case "completed": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-500/15 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400";
    case "planning": return "bg-blue-500/15 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400";
    case "paused": return "bg-yellow-500/15 text-yellow-600 border-yellow-200 dark:border-yellow-800 dark:text-yellow-400";
    case "completed": return "bg-secondary text-muted-foreground";
    case "cancelled": return "bg-red-500/15 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400";
    default: return "bg-secondary text-muted-foreground";
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "seo": return "bg-purple-500/15 text-purple-600 dark:text-purple-400";
    case "paid_ads": return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "social_media": return "bg-pink-500/15 text-pink-600 dark:text-pink-400";
    case "email_marketing": return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    case "brand_awareness": return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "lead_generation": return "bg-green-500/15 text-green-600 dark:text-green-400";
    default: return "bg-secondary text-muted-foreground";
  }
}

// ── Campaign Form ──────────────────────────────────────────────────────────────

function CampaignForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: Partial<Campaign>;
  onSubmit: (data: Partial<Campaign>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { data: clientsData } = useListClients({});
  const { data: projectsData } = useListProjects({});
  const clients = clientsData ?? [];
  const projects = projectsData ?? [];

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "custom",
    goal: initial?.goal ?? "",
    budget: initial?.budget ? String(initial.budget) : "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
    status: initial?.status ?? "planning",
    performanceNotes: initial?.performanceNotes ?? "",
    results: initial?.results ?? "",
    clientId: initial?.clientId ? String(initial.clientId) : "",
    projectId: initial?.projectId ? String(initial.projectId) : "",
  });

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      budget: form.budget ? Number(form.budget) : null,
      clientId: form.clientId ? Number(form.clientId) : null,
      projectId: form.projectId ? Number(form.projectId) : null,
      goal: form.goal || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      performanceNotes: form.performanceNotes || null,
      results: form.results || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Campaign Name *</Label>
          <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. Q1 SEO Growth Campaign" required />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Client</Label>
          <Select value={form.clientId || "none"} onValueChange={(v) => handleChange("clientId", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {clients.map((c: { id: number; companyName: string }) => <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Project</Label>
          <Select value={form.projectId || "none"} onValueChange={(v) => handleChange("projectId", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((p: { id: number; name: string }) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Goal</Label>
          <Input value={form.goal} onChange={(e) => handleChange("goal", e.target.value)} placeholder="e.g. Increase organic traffic by 40% in Q1" />
        </div>
        <div>
          <Label>Budget ($)</Label>
          <Input type="number" value={form.budget} onChange={(e) => handleChange("budget", e.target.value)} placeholder="0.00" min={0} step={0.01} />
        </div>
        <div>
          <Label>Start Date</Label>
          <Input type="date" value={form.startDate} onChange={(e) => handleChange("startDate", e.target.value)} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" value={form.endDate} onChange={(e) => handleChange("endDate", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Performance Notes</Label>
          <Textarea value={form.performanceNotes} onChange={(e) => handleChange("performanceNotes", e.target.value)} placeholder="Notes on performance, challenges, or adjustments..." rows={2} />
        </div>
        <div className="col-span-2">
          <Label>Results</Label>
          <Textarea value={form.results} onChange={(e) => handleChange("results", e.target.value)} placeholder="Final campaign results and metrics..." rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending || !form.name}>
          {isPending ? "Saving..." : "Save Campaign"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CampaignsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Campaign>) => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setCreateOpen(false);
      toast({ title: "Campaign created", description: "Your campaign has been created successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Campaign> }) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setEditCampaign(null);
      toast({ title: "Campaign updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update campaign.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete campaign");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete campaign.", variant: "destructive" }),
  });

  const filtered = campaigns.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesType = filterType === "all" || c.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const planningCampaigns = campaigns.filter((c) => c.status === "planning").length;
  const totalBudget = campaigns.filter((c) => c.budget).reduce((sum, c) => sum + (c.budget ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Track every campaign you run for clients — goals, budgets, and results."
      >
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={16} />
          New Campaign
        </Button>
      </PageHeader>

      {/* Stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{campaigns.length}</div>
              <div className="text-sm text-muted-foreground">Total Campaigns</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCampaigns}</div>
              <div className="text-sm text-muted-foreground">Active Now</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{planningCampaigns}</div>
              <div className="text-sm text-muted-foreground">In Planning</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Total Budget</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Megaphone size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {campaigns.length === 0 ? "Launch your first campaign" : "No campaigns match your filters"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            {campaigns.length === 0
              ? "Track SEO, paid ads, social media, and every other campaign you run for clients — goals, budgets, and results in one place."
              : "Try adjusting your search or filters."}
          </p>
          {campaigns.length === 0 && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus size={16} />
              New Campaign
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-base truncate">{campaign.name}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getTypeColor(campaign.type))}>
                        {getCampaignTypeLabel(campaign.type)}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", getStatusColor(campaign.status))}>
                        {CAMPAIGN_STATUSES.find((s) => s.value === campaign.status)?.label ?? campaign.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {campaign.clientName && (
                        <span className="flex items-center gap-1.5">
                          <Building2 size={13} />
                          {campaign.clientName}
                        </span>
                      )}
                      {campaign.projectName && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase size={13} />
                          {campaign.projectName}
                        </span>
                      )}
                      {campaign.goal && (
                        <span className="flex items-center gap-1.5">
                          <Target size={13} />
                          <span className="truncate max-w-xs">{campaign.goal}</span>
                        </span>
                      )}
                      {campaign.budget && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign size={13} />
                          ${campaign.budget.toLocaleString()}
                        </span>
                      )}
                      {campaign.startDate && (
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          {format(new Date(campaign.startDate), "MMM d, yyyy")}
                          {campaign.endDate && ` → ${format(new Date(campaign.endDate), "MMM d, yyyy")}`}
                        </span>
                      )}
                    </div>

                    {campaign.performanceNotes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-1 italic">
                        {campaign.performanceNotes}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditCampaign(campaign)} className="gap-2">
                        <Edit size={14} />
                        Edit Campaign
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(campaign.id)}
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
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <CampaignForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setCreateOpen(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCampaign} onOpenChange={(o) => !o && setEditCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          {editCampaign && (
            <CampaignForm
              initial={editCampaign}
              onSubmit={(data) => updateMutation.mutate({ id: editCampaign.id, data })}
              onCancel={() => setEditCampaign(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
