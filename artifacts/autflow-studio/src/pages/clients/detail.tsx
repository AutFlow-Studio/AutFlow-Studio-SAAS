import {
  useGetClient,
  useListDocuments,
  useListNotes,
  useCreateDocument,
  useCreateNote,
  useUpdateClient,
  useCreateProject,
  useCreatePayment,
  useListPayments,
  getGetClientQueryKey,
  getListProjectsQueryKey,
  getListPaymentsQueryKey,
  getListDocumentsQueryKey,
  getListNotesQueryKey,
  getGetDashboardQueryKey,
  type ProjectInputStatus,
  type ProjectInputPriority,
  type PaymentInputStatus,
  type DocumentInputType,
} from "@workspace/api-client-react";
import { PortalAccessPanel } from "@/components/portal-access-panel";
import { PortalMessagesPanel } from "@/components/portal-messages-panel";
import { ClientHistory } from "@/components/client-history";
import { ClientHealthBadge } from "@/components/client-health-badge";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Edit,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
} from "lucide-react";
import {
  StatusBadge,
  getLifecycleStatusVariant,
  getLifecycleStatusLabel,
  getProjectStatusVariant,
  getPaymentStatusVariant,
  getDeliverableStatusVariant,
 getDeliverableStatusLabel,
} from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ExternalLink, StickyNote, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

/** Returns true when the stored URL is a GCS object path (file upload). */
function isFileBacked(url: string | null | undefined): boolean {
  return !!url?.startsWith("/objects/");
}

/** Build the correct URL to download/serve a GCS-backed document. */
function fileServeUrl(objectPath: string, filename?: string): string {
  const base = `/api/storage${objectPath}`;
  return filename ? `${base}?filename=${encodeURIComponent(filename)}` : base;
}

/** Format currency */
function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Lifecycle status selector ─────────────────────────────────────────────────

const LIFECYCLE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active Client" },
  { value: "at_risk", label: "At Risk" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

// ── Financial stat card ───────────────────────────────────────────────────────

function FinancialStat({
  label,
  value,
  variant = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  variant?: "default" | "success" | "warning" | "destructive";
  icon: React.ElementType;
}) {
  const colors: Record<string, string> = {
    default: "text-primary bg-primary/10",
    success: "text-emerald-500 bg-emerald-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    destructive: "text-red-500 bg-red-500/10",
  };
  const textColors: Record<string, string> = {
    default: "text-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    destructive: "text-red-500",
  };
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", colors[variant])}>
          <Icon size={15} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={cn("font-bold text-sm tabular-nums", textColors[variant])}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: client, isLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) },
  });

  const { data: payments } = useListPayments(
    { clientId },
    { query: { enabled: !!clientId, queryKey: getListPaymentsQueryKey({ clientId }) } },
  );
  const { data: documents } = useListDocuments(clientId, {
    query: { enabled: !!clientId, queryKey: getListDocumentsQueryKey(clientId) },
  });
  const { data: notes } = useListNotes(
    { clientId },
    { query: { enabled: !!clientId, queryKey: getListNotesQueryKey({ clientId }) } },
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    companyName: "",
    primaryContact: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
    lifecycleStatus: "active",
    notes: "",
  });
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    status: "planning" as ProjectInputStatus,
    priority: "medium" as ProjectInputPriority,
    deadline: "",
  });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "",
    amount: "",
    status: "pending" as PaymentInputStatus,
    dueDate: "",
  });
  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    title: "",
    type: "other" as DocumentInputType,
    url: "",
    notes: "",
  });
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setEditOpen(false);
        toast({ title: "Client updated" });
      },
      onError: () => toast({ title: "Failed to update client", variant: "destructive" }),
    },
  });

  const createProject = useCreateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey({ clientId }) });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setProjectOpen(false);
        toast({ title: "Project created" });
      },
      onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
    },
  });

  const createPayment = useCreatePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ clientId }) });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setInvoiceOpen(false);
        toast({ title: "Invoice created" });
      },
      onError: () => toast({ title: "Failed to create invoice", variant: "destructive" }),
    },
  });

  const createDocument = useCreateDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(clientId) });
        setDocumentOpen(false);
        setDocumentForm({ title: "", type: "other", url: "", notes: "" });
        toast({ title: "Document added" });
      },
      onError: () => toast({ title: "Failed to add document", variant: "destructive" }),
    },
  });

  const createNote = useCreateNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey({ clientId }) });
        setNoteOpen(false);
        setNoteContent("");
        toast({ title: "Note added" });
      },
      onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
    },
  });

  const openEditDialog = () => {
    if (!client) return;
    setEditForm({
      companyName: client.companyName,
      primaryContact: client.primaryContact || "",
      industry: client.industry || "",
      website: client.website || "",
      phone: client.phone || "",
      email: client.email || "",
      lifecycleStatus: (client as any).lifecycleStatus || "active",
      notes: client.notes || "",
    });
    setEditOpen(true);
  };

  // Quick lifecycle update (no dialog)
  const setLifecycle = (value: string) => {
    updateClient.mutate({ id: clientId, data: { lifecycleStatus: value as any } });
  };

  if (isLoading || !client) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 items-center mb-8">
          <Skeleton className="w-20 h-20 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="w-64 h-8" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
        <Skeleton className="w-full h-[500px] rounded-xl" />
      </div>
    );
  }

  // Derived data from enriched client detail response
  const ls = (client as any).lifecycleStatus as string ?? "active";
  const healthScore = (client as any).healthScore as number | null ?? null;
  const healthReasons: string[] = (client as any).healthReasons ?? [];
  const totalRevenue: number = (client as any).totalRevenue ?? 0;
  const totalInvoiced: number = (client as any).totalInvoiced ?? 0;
  const outstandingBalance: number = (client as any).outstandingBalance ?? 0;
  const overdueAmount: number = (client as any).overdueAmount ?? 0;
  const activeProjectsCount: number = (client as any).activeProjectsCount ?? 0;
  const deliverablesSummary = (client as any).deliverablesSummary as {
    pendingApproval: number;
    approved: number;
    changesRequested: number;
    total: number;
  } | undefined;
  const lastActivityAt: string | null = (client as any).lastActivityAt ?? null;
  const projects: any[] = (client as any).projects ?? [];
  const recentActivity: any[] = (client as any).recentActivity ?? [];

  const isAtRisk = ls === "at_risk";

  return (
    <div className="space-y-6 pb-12">
      {/* ── Client Header ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card/40 backdrop-blur-sm border rounded-2xl p-6",
          isAtRisk && "border-amber-500/30 bg-amber-500/5",
        )}
      >
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <Avatar className="h-20 w-20 border-2 border-border bg-background shadow-xl shrink-0">
            <AvatarImage
              src={client.logoUrl || undefined}
              alt={client.companyName}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {client.companyName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight truncate">{client.companyName}</h1>
              {isAtRisk && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={11} />
                  At Risk
                </span>
              )}
            </div>

            {/* Sub-info row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
              {client.industry && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} /> {client.industry}
                </span>
              )}
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Globe size={13} /> {client.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {client.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {client.address}
                </span>
              )}
              {lastActivityAt && (
                <span className="flex items-center gap-1.5">
                  <Activity size={13} /> Last active{" "}
                  {formatDistanceToNow(new Date(lastActivityAt), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Lifecycle selector + health badge */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={ls} onValueChange={setLifecycle}>
                <SelectTrigger className="h-7 w-auto gap-1.5 text-xs border-border/60 bg-background/60 px-2.5">
                  <StatusBadge
                    variant={getLifecycleStatusVariant(ls)}
                    className="border-0 bg-transparent px-0 py-0 text-xs font-semibold"
                  >
                    {getLifecycleStatusLabel(ls)}
                  </StatusBadge>
                </SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ClientHealthBadge score={healthScore} reasons={healthReasons} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openEditDialog}>
            <Edit size={14} />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setInvoiceOpen(true)}>
            <DollarSign size={14} />
            Invoice
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setProjectOpen(true)}>
            <Plus size={14} />
            New Project
          </Button>
        </div>
      </div>

      {/* ── Edit dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update this client's details.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateClient.mutate({
                id: clientId,
                data: {
                  companyName: editForm.companyName,
                  primaryContact: editForm.primaryContact || undefined,
                  industry: editForm.industry || undefined,
                  website: editForm.website || undefined,
                  phone: editForm.phone || undefined,
                  email: editForm.email || undefined,
                  lifecycleStatus: editForm.lifecycleStatus as any,
                  notes: editForm.notes || undefined,
                },
              });
            }}
          >
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                required
                value={editForm.companyName}
                onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={editForm.primaryContact}
                  onChange={(e) => setEditForm((f) => ({ ...f, primaryContact: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={editForm.industry}
                  onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lifecycle Stage</Label>
                <Select
                  value={editForm.lifecycleStatus}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, lifecycleStatus: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={editForm.website}
                  onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateClient.isPending}>
                {updateClient.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Project dialog */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new project for {client.companyName}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createProject.mutate({
                data: {
                  clientId,
                  name: projectForm.name,
                  status: projectForm.status,
                  priority: projectForm.priority,
                  deadline: projectForm.deadline || undefined,
                },
              });
            }}
          >
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                required
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={projectForm.status}
                  onValueChange={(v) => setProjectForm((f) => ({ ...f, status: v as ProjectInputStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="client_review">Client Review</SelectItem>
                    <SelectItem value="revision">Revision</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={projectForm.priority}
                  onValueChange={(v) =>
                    setProjectForm((f) => ({ ...f, priority: v as ProjectInputPriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={projectForm.deadline}
                onChange={(e) => setProjectForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createProject.isPending || !projectForm.name}>
                {createProject.isPending ? "Creating…" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Invoice dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Create an invoice for {client.companyName}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createPayment.mutate({
                data: {
                  clientId,
                  invoiceNumber: invoiceForm.invoiceNumber,
                  amount: parseFloat(invoiceForm.amount || "0"),
                  status: invoiceForm.status,
                  dueDate: invoiceForm.dueDate || undefined,
                },
              });
            }}
          >
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                required
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={invoiceForm.status}
                  onValueChange={(v) => setInvoiceForm((f) => ({ ...f, status: v as PaymentInputStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createPayment.isPending || !invoiceForm.invoiceNumber}>
                {createPayment.isPending ? "Creating…" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-card/40 backdrop-blur-sm border overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="overview" className="py-2 px-4">Overview</TabsTrigger>
          <TabsTrigger value="projects" className="py-2 px-4">
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="py-2 px-4">Financials</TabsTrigger>
          <TabsTrigger value="deliverables" className="py-2 px-4">
            Deliverables
            {deliverablesSummary && deliverablesSummary.pendingApproval > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500">
                {deliverablesSummary.pendingApproval}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="py-2 px-4">Documents</TabsTrigger>
          <TabsTrigger value="notes" className="py-2 px-4">Notes</TabsTrigger>
          <TabsTrigger value="portal" className="py-2 px-4">Portal</TabsTrigger>
          <TabsTrigger value="history" className="py-2 px-4">History</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: contact details */}
              <div className="md:col-span-2 space-y-6">
                <Card className="bg-card/40 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Contact Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Primary Contact</div>
                      <div className="font-medium">{client.primaryContact || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Secondary Contact</div>
                      <div className="font-medium">{client.secondaryContact || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-muted-foreground" />
                        {client.email ? (
                          <a href={`mailto:${client.email}`} className="hover:text-primary text-sm">
                            {client.email}
                          </a>
                        ) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Phone</div>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-muted-foreground" />
                        {client.phone ? (
                          <a href={`tel:${client.phone}`} className="hover:text-primary text-sm">
                            {client.phone}
                          </a>
                        ) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Timezone</div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-muted-foreground" />
                        <span className="text-sm">{client.timezone || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Start Date</div>
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-muted-foreground" />
                        <span className="text-sm">
                          {client.startDate
                            ? format(new Date(client.startDate), "MMM d, yyyy")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Deliverables at-a-glance */}
                {deliverablesSummary && deliverablesSummary.total > 0 && (
                  <Card className="bg-card/40 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Layers size={16} /> Deliverables
                        </CardTitle>
                        <button
                          className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                          onClick={() => {
                            const el = document.querySelector('[data-state][value="deliverables"]');
                            (el as HTMLElement)?.click();
                          }}
                        >
                          View all
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center p-3 rounded-lg bg-secondary/40">
                        <div className="text-2xl font-bold tabular-nums">
                          {deliverablesSummary.pendingApproval}
                        </div>
                        <div className="text-xs text-amber-500 mt-0.5">Pending Approval</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/40">
                        <div className="text-2xl font-bold tabular-nums text-emerald-500">
                          {deliverablesSummary.approved}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Approved</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/40">
                        <div className="text-2xl font-bold tabular-nums text-red-500">
                          {deliverablesSummary.changesRequested}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Changes Requested</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/40">
                        <div className="text-2xl font-bold tabular-nums">
                          {deliverablesSummary.total}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Total</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {client.notes && (
                  <Card className="bg-card/40 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                        {client.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: financials + health + tags */}
              <div className="space-y-6">
                {/* Health score card */}
                {healthScore != null && (
                  <Card className="bg-card/40 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-sm">Relationship Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <ClientHealthBadge score={healthScore} reasons={healthReasons} />
                        <span className="text-3xl font-bold tabular-nums">{healthScore}</span>
                      </div>
                      <Progress value={healthScore} className="h-2" />
                      {healthReasons.length > 0 && (
                        <ul className="space-y-1 pt-1">
                          {healthReasons.map((r, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                              <TrendingDown size={11} className="text-red-400 mt-0.5 shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                      {healthReasons.length === 0 && healthScore >= 90 && (
                        <p className="text-xs text-emerald-500 flex items-center gap-1.5">
                          <CheckCircle2 size={11} /> All good — no issues detected
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Financial summary */}
                <Card className="bg-card/40 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Financials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <FinancialStat
                      label="Total Invoiced"
                      value={fmt(totalInvoiced)}
                      icon={DollarSign}
                    />
                    <FinancialStat
                      label="Revenue Received"
                      value={fmt(totalRevenue)}
                      variant="success"
                      icon={TrendingUp}
                    />
                    <FinancialStat
                      label="Outstanding"
                      value={fmt(outstandingBalance)}
                      variant={outstandingBalance > 0 ? "warning" : "default"}
                      icon={Clock3}
                    />
                    {overdueAmount > 0 && (
                      <FinancialStat
                        label="Overdue"
                        value={fmt(overdueAmount)}
                        variant="destructive"
                        icon={AlertTriangle}
                      />
                    )}
                    {client.contractValue && (
                      <FinancialStat
                        label="Contract Value"
                        value={fmt(Number(client.contractValue))}
                        icon={FileCheck}
                      />
                    )}
                    {client.monthlyRetainer && (
                      <FinancialStat
                        label="Monthly Retainer"
                        value={`${fmt(Number(client.monthlyRetainer))}/mo`}
                        variant="success"
                        icon={TrendingUp}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Active projects stat */}
                {activeProjectsCount > 0 && (
                  <Card className="bg-card/40 backdrop-blur-sm">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Active Projects</div>
                        <div className="text-2xl font-bold">{activeProjectsCount}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                  <Card className="bg-card/40 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-sm">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── PROJECTS ── */}
          <TabsContent value="projects" className="m-0">
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>All projects for {client.companyName}</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setProjectOpen(true)}>
                  <Plus size={14} />
                  Add Project
                </Button>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No projects yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {projects.map((project: any) => (
                      <div key={project.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-medium hover:text-primary transition-colors block"
                            >
                              {project.name}
                            </Link>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {project.deadline
                                  ? format(new Date(project.deadline), "MMM d, yyyy")
                                  : "No deadline"}
                              </span>
                              {project.estimatedBudget && (
                                <span className="flex items-center gap-1">
                                  <DollarSign size={11} />
                                  {fmt(project.estimatedBudget)}
                                </span>
                              )}
                            </div>
                          </div>
                          <StatusBadge
                            variant={getProjectStatusVariant(project.status)}
                            className="shrink-0"
                          >
                            {project.status.replace(/_/g, " ")}
                          </StatusBadge>
                        </div>
                        {project.progress != null && (
                          <div className="flex items-center gap-2">
                            <Progress value={project.progress} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                              {project.progress}%
                            </span>
                          </div>
                        )}
                        {project.blockers && (
                          <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
                            <AlertTriangle size={11} /> {project.blockers}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FINANCIALS ── */}
          <TabsContent value="payments" className="m-0 space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Invoiced", value: fmt(totalInvoiced), color: "text-foreground" },
                { label: "Received", value: fmt(totalRevenue), color: "text-emerald-500" },
                { label: "Outstanding", value: fmt(outstandingBalance), color: "text-amber-500" },
                { label: "Overdue", value: fmt(overdueAmount), color: "text-red-500" },
              ].map((s) => (
                <Card key={s.label} className="bg-card/40 backdrop-blur-sm p-4">
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</div>
                </Card>
              ))}
            </div>

            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Invoice &amp; Payment History</CardTitle>
                  <CardDescription>Billing history for {client.companyName}</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setInvoiceOpen(true)}>
                  <Plus size={14} />
                  Create Invoice
                </Button>
              </CardHeader>
              <CardContent>
                {!payments || payments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No invoices yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="py-4 first:pt-0 last:pb-0 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium font-mono text-sm mb-0.5">
                            {payment.invoiceNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due:{" "}
                            {payment.dueDate
                              ? format(new Date(payment.dueDate), "MMM d, yyyy")
                              : "—"}
                            {payment.paidDate &&
                              ` · Paid ${format(new Date(payment.paidDate), "MMM d, yyyy")}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold font-mono text-sm">
                            {fmt(payment.amount)}
                          </span>
                          <StatusBadge variant={getPaymentStatusVariant(payment.status)}>
                            {payment.status}
                          </StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DELIVERABLES ── */}
          <TabsContent value="deliverables" className="m-0">
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
                <CardDescription>
                  Everything this client is waiting on, reviewing, or has approved — across all projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!projects || projects.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No projects yet — deliverables will appear here once projects are added.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {projects.map((project: any) => {
                      if (!project.deliverables || project.deliverables.length === 0) return null;
                      const actionable = project.deliverables.filter((d: any) =>
                        ["sent", "changes_requested"].includes(d.status)
                      );
                      return (
                        <div key={project.id}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {project.name}
                            </div>
                            {actionable.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                {actionable.length} needs attention
                              </span>
                            )}
                          </div>
                          <div className="divide-y divide-border/50 border rounded-lg overflow-hidden">
                            {project.deliverables.map((d: any) => {
                              const isActionable = ["sent", "changes_requested"].includes(d.status);
                              return (
                                <div
                                  key={d.id}
                                  className={`py-3 px-4 flex items-start justify-between gap-4 ${isActionable ? "bg-amber-500/5" : ""}`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium">{d.title}</div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                      {d.type && (
                                        <span className="text-xs text-muted-foreground">{d.type}</span>
                                      )}
                                      {d.assignedTo && (
                                        <span className="text-xs text-muted-foreground">Owner: {d.assignedTo}</span>
                                      )}
                                      {d.deadline && (
                                        <span className="text-xs text-muted-foreground">
                                          Due {format(new Date(d.deadline + "T00:00:00"), "MMM d, yyyy")}
                                        </span>
                                      )}
                                      {d.approvalDate && (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                          Approved {format(new Date(d.approvalDate + "T00:00:00"), "MMM d")}
                                        </span>
                                      )}
                                      {(d.revisionCount ?? 0) > 0 && (
                                        <span className="text-xs text-orange-600 dark:text-orange-400">
                                          {d.revisionCount} revision{d.revisionCount !== 1 ? "s" : ""}
                                        </span>
                                      )}
                                    </div>
                                    {d.feedbackNotes && d.status === "changes_requested" && (
                                      <div className="mt-1.5 text-xs text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 rounded px-2 py-1 line-clamp-2">
                                        {d.feedbackNotes}
                                      </div>
                                    )}
                                  </div>
                                  <StatusBadge variant={getDeliverableStatusVariant(d.status)} className="shrink-0 mt-0.5">
                                    {getDeliverableStatusLabel(d.status)}
                                  </StatusBadge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {projects.every((p: any) => !p.deliverables?.length) && (
                      <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg border-dashed">
                        No deliverables found across any project.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DOCUMENTS ── */}
          <TabsContent value="documents" className="m-0">
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setDocumentOpen(true)}>
                  <Plus size={14} />
                  Add Document
                </Button>
              </CardHeader>
              <CardContent>
                {!documents || documents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No documents yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={16} className="text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{doc.title}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {doc.type.replace(/_/g, " ")}
                            </div>
                          </div>
                        </div>
                        {doc.url && (
                          <a
                            href={isFileBacked(doc.url) ? fileServeUrl(doc.url, doc.title) : doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-primary shrink-0"
                          >
                            {isFileBacked(doc.url) ? <Download size={16} /> : <ExternalLink size={16} />}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTES ── */}
          <TabsContent value="notes" className="m-0">
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Notes</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setNoteOpen(true)}>
                  <Plus size={14} />
                  Add Note
                </Button>
              </CardHeader>
              <CardContent>
                {!notes || notes.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No notes yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg border border-border/50 bg-background/40 flex gap-3"
                      >
                        <StickyNote size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm">{note.content}</p>
                          {note.createdAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PORTAL ── */}
          <TabsContent value="portal" className="m-0 space-y-6">
            <PortalAccessPanel clientId={clientId} />
            <PortalMessagesPanel clientId={clientId} />
          </TabsContent>

          {/* ── HISTORY ── */}
          <TabsContent value="history" className="m-0">
            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-6">
              <div className="mb-6">
                <h3 className="text-base font-semibold">Activity History</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Everything that's happened with {client.companyName}.
                </p>
              </div>
              <ClientHistory clientId={clientId} />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Add Document dialog */}
      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>Attach a document or link for {client.companyName}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createDocument.mutate({
                clientId,
                data: {
                  title: documentForm.title,
                  type: documentForm.type,
                  url: documentForm.url || undefined,
                  notes: documentForm.notes || undefined,
                },
              });
            }}
          >
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                required
                value={documentForm.title}
                onChange={(e) => setDocumentForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={documentForm.type}
                onValueChange={(v) => setDocumentForm((f) => ({ ...f, type: v as DocumentInputType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="brand_assets">Brand Assets</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="google_drive">Google Drive</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="figma">Figma</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="https://…"
                value={documentForm.url}
                onChange={(e) => setDocumentForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createDocument.isPending || !documentForm.title}>
                {createDocument.isPending ? "Adding…" : "Add Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add an internal note about {client.companyName}.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createNote.mutate({ data: { clientId, content: noteContent } });
            }}
          >
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                required
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createNote.isPending || !noteContent.trim()}>
                {createNote.isPending ? "Adding…" : "Add Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
