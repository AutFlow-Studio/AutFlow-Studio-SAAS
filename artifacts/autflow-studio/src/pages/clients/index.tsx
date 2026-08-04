import {
  useListClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  getListClientsQueryKey,
  getGetDashboardQueryKey,
  type Client,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { PageError } from "@/components/page-error";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  MoreVertical,
  Users,
  TrendingUp,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  StatusBadge,
  getLifecycleStatusVariant,
  getLifecycleStatusLabel,
} from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type LifecycleFilter =
  | "all"
  | "lead"
  | "prospect"
  | "active"
  | "at_risk"
  | "completed"
  | "archived";

type SortOption = "name" | "healthScore" | "revenue" | "recentActivity";

interface ClientFormState {
  companyName: string;
  primaryContact: string;
  email: string;
  phone: string;
  industry: string;
  website: string;
  notes: string;
  lifecycleStatus: string;
}

const EMPTY_FORM: ClientFormState = {
  companyName: "",
  primaryContact: "",
  email: "",
  phone: "",
  industry: "",
  website: "",
  notes: "",
  lifecycleStatus: "prospect",
};

// ── Health score ring ─────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number | null | undefined }) {
  if (score == null) return null;

  const radius = 14;
  const circ = 2 * Math.PI * radius;
  const filled = (score / 100) * circ;

  const color =
    score >= 90
      ? "#10b981"
      : score >= 70
        ? "#3b82f6"
        : score >= 40
          ? "#f59e0b"
          : "#ef4444";

  const label =
    score >= 90
      ? "Healthy"
      : score >= 70
        ? "Stable"
        : score >= 40
          ? "Needs attention"
          : "Risk";

  return (
    <div className="flex items-center gap-1.5" title={`Health: ${label} (${score}/100)`}>
      <svg width={32} height={32} viewBox="0 0 32 32" className="-rotate-90">
        <circle cx={16} cy={16} r={radius} fill="none" stroke="currentColor" strokeWidth={3} className="text-secondary" />
        <circle
          cx={16}
          cy={16}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ── Lifecycle filter pills ────────────────────────────────────────────────────

const LIFECYCLE_FILTERS: { value: LifecycleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lead", label: "Leads" },
  { value: "prospect", label: "Prospects" },
  { value: "active", label: "Active" },
  { value: "at_risk", label: "At Risk" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

// ── Client form dialog ────────────────────────────────────────────────────────

function ClientFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ClientFormState;
  onSubmit: (values: ClientFormState) => void;
  isSubmitting: boolean;
  title: string;
}) {
  const [form, setForm] = useState<ClientFormState>(initial);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setForm(initial);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Client details are used across projects, invoices, and reports.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          {/* Required fields */}
          <div className="space-y-2">
            <Label htmlFor="companyName">
              Client / Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              required
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryContact">Contact Person</Label>
              <Input
                id="primaryContact"
                value={form.primaryContact}
                onChange={(e) => setForm((f) => ({ ...f, primaryContact: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lifecycleStatus">Lifecycle Stage</Label>
              <Select
                value={form.lifecycleStatus}
                onValueChange={(v) => setForm((f) => ({ ...f, lifecycleStatus: v }))}
              >
                <SelectTrigger id="lifecycleStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active Client</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Brief description or first notes…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !form.companyName}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main list page ────────────────────────────────────────────────────────────

export default function ClientsList() {
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("all");
  const [sort, setSort] = useState<SortOption>("name");

  const { data: clients, isLoading, isError } = useListClients({
    search: search || undefined,
    lifecycleStatus: lifecycle === "all" ? undefined : lifecycle,
    sort: sort !== "name" ? sort : undefined,
  } as Parameters<typeof useListClients>[0]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  };

  const createClient = useCreateClient({
    mutation: {
      onSuccess: () => {
        invalidate();
        setAddOpen(false);
        toast({ title: "Client added", description: "The new client has been created." });
      },
      onError: () => toast({ title: "Failed to add client", variant: "destructive" }),
    },
  });

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        invalidate();
        setEditClient(null);
        toast({ title: "Client updated" });
      },
      onError: () => toast({ title: "Failed to update client", variant: "destructive" }),
    },
  });

  const deleteClientMutation = useDeleteClient({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDeleteClient(null);
        toast({ title: "Client deleted" });
      },
      onError: () => toast({ title: "Failed to delete client", variant: "destructive" }),
    },
  });

  // Counts per lifecycle for badge indicators
  const counts =
    clients?.reduce<Record<string, number>>((acc, c) => {
      const ls = (c as any).lifecycleStatus ?? "active";
      acc[ls] = (acc[ls] ?? 0) + 1;
      return acc;
    }, {}) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your agency's client relationships">
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add Client
        </Button>
      </PageHeader>

      <ClientFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initial={EMPTY_FORM}
        isSubmitting={createClient.isPending}
        title="Add Client"
        onSubmit={(values) =>
          createClient.mutate({
            data: {
              companyName: values.companyName,
              primaryContact: values.primaryContact || undefined,
              email: values.email || undefined,
              phone: values.phone || undefined,
              industry: values.industry || undefined,
              website: values.website || undefined,
              notes: values.notes || undefined,
              lifecycleStatus: values.lifecycleStatus as any,
            },
          })
        }
      />

      {editClient && (
        <ClientFormDialog
          open={!!editClient}
          onOpenChange={(o) => !o && setEditClient(null)}
          initial={{
            companyName: editClient.companyName,
            primaryContact: editClient.primaryContact || "",
            email: editClient.email || "",
            phone: editClient.phone || "",
            industry: editClient.industry || "",
            website: editClient.website || "",
            notes: editClient.notes || "",
            lifecycleStatus: (editClient as any).lifecycleStatus || "active",
          }}
          isSubmitting={updateClient.isPending}
          title="Edit Client"
          onSubmit={(values) =>
            updateClient.mutate({
              id: editClient.id,
              data: {
                companyName: values.companyName,
                primaryContact: values.primaryContact || undefined,
                email: values.email || undefined,
                phone: values.phone || undefined,
                industry: values.industry || undefined,
                website: values.website || undefined,
                notes: values.notes || undefined,
                lifecycleStatus: values.lifecycleStatus as any,
              },
            })
          }
        />
      )}

      <AlertDialog open={!!deleteClient} onOpenChange={(o) => !o && setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteClient?.companyName}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  This will permanently delete <strong>{deleteClient?.companyName}</strong> and{" "}
                  <strong>all data associated with this client</strong>:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>All projects and deliverables</li>
                  <li>All invoices and payment records</li>
                  <li>All documents and uploaded files</li>
                  <li>All meetings, tasks, and notes</li>
                </ul>
                <p className="text-destructive font-medium pt-1">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteClient && deleteClientMutation.mutate({ id: deleteClient.id })}
            >
              Delete Client &amp; All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search + Sort toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search by name, industry, email…"
            className="pl-9 bg-card/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-44 bg-card/50">
            <SelectValue placeholder="Sort by…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="healthScore">Health Score</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="recentActivity">Recent Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lifecycle filter pills */}
      <div className="flex flex-wrap gap-2">
        {LIFECYCLE_FILTERS.map((f) => {
          const count = f.value === "all" ? clients?.length : counts[f.value];
          return (
            <button
              key={f.value}
              onClick={() => setLifecycle(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                lifecycle === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/50 border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
            >
              {f.label}
              {count != null && count > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    lifecycle === f.value ? "bg-white/20" : "bg-secondary",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Client grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <PageError message="Failed to load clients." />
      ) : !clients || clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card/30 border-dashed">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4 text-muted-foreground">
            <Users size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-1">No clients found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            {search || lifecycle !== "all"
              ? "No clients match your current filters."
              : "You haven't added any clients yet. Start by adding your first client."}
          </p>
          {!search && lifecycle === "all" && (
            <Button onClick={() => setAddOpen(true)}>Add New Client</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const ls = (client as any).lifecycleStatus as string ?? "active";
            const healthScore = (client as any).healthScore as number | null ?? null;
            const isAtRisk = ls === "at_risk";

            return (
              <Card
                key={client.id}
                className={cn(
                  "overflow-hidden flex flex-col hover:border-primary/50 transition-colors group bg-card/40 backdrop-blur-sm",
                  isAtRisk && "border-amber-500/40",
                )}
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Header: avatar + name + menu */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border border-border/50 shrink-0">
                        <AvatarImage src={client.logoUrl || undefined} alt={client.companyName} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {client.companyName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-semibold hover:text-primary transition-colors line-clamp-1 block"
                        >
                          {client.companyName}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {client.industry || "No industry"}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 -mr-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditClient(client)}>
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteClient(client)}
                        >
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 mt-1 text-sm">
                    {client.primaryContact && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users size={13} className="shrink-0" />
                        <span className="truncate">{client.primaryContact}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail size={13} className="shrink-0" />
                      <span className="truncate">{client.email || "No email"}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone size={13} className="shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ExternalLink size={13} className="shrink-0" />
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:text-primary transition-colors"
                        >
                          {client.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Contract value */}
                  {client.contractValue && (
                    <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
                      <TrendingUp size={13} className="text-emerald-500" />
                      <span>${client.contractValue.toLocaleString()}</span>
                      {client.monthlyRetainer && (
                        <span className="text-muted-foreground font-normal text-xs">
                          · ${client.monthlyRetainer.toLocaleString()}/mo
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: lifecycle badge + health ring */}
                <div className="px-5 py-3 bg-secondary/30 border-t border-border/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusBadge variant={getLifecycleStatusVariant(ls)}>
                      {isAtRisk && <AlertTriangle size={10} className="mr-1 inline" />}
                      {getLifecycleStatusLabel(ls)}
                    </StatusBadge>
                    {client.industry && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 size={11} />
                        <span className="truncate max-w-[80px]">{client.industry}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <HealthRing score={healthScore} />
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Briefcase size={12} />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
