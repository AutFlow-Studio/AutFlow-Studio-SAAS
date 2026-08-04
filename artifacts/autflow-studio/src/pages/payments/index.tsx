import {
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useListClients,
  useListProjects,
  getListPaymentsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { PageError } from "@/components/page-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  MoreHorizontal,
  Send,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { StatusBadge, getPaymentStatusVariant, getPaymentStatusLabel } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Payment } from "@workspace/api-client-react";

// ── Status tabs config ────────────────────────────────────────────────────────
const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `INV-${year}${month}-${rand}`;
}

// ── Create / Edit Invoice Dialog ──────────────────────────────────────────────
interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Payment | null;
}

function InvoiceFormDialog({ open, onOpenChange, initial }: InvoiceFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients } = useListClients();
  const { data: projects } = useListProjects();
  const { mutate: createPayment, isPending: creating } = useCreatePayment();
  const { mutate: updatePayment, isPending: updating } = useUpdatePayment();
  const isPending = creating || updating;
  const isEdit = !!initial;

  const [clientId, setClientId] = useState(initial ? String(initial.clientId) : "");
  const [projectId, setProjectId] = useState(initial?.projectId ? String(initial.projectId) : "none");
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? generateInvoiceNumber());
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [status, setStatus] = useState<string>(initial?.status ?? "draft");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Reset on open
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      if (!isEdit) {
        setClientId("");
        setProjectId("none");
        setInvoiceNumber(generateInvoiceNumber());
        setAmount("");
        setStatus("draft");
        setDueDate("");
        setNotes("");
      }
    }
    onOpenChange(v);
  };

  // Filter projects by selected client
  const clientProjects = useMemo(
    () => (clientId ? (projects ?? []).filter((p) => p.clientId === parseInt(clientId, 10)) : (projects ?? [])),
    [projects, clientId],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !invoiceNumber.trim() || !amount) return;

    const payload = {
      clientId: parseInt(clientId, 10),
      projectId: projectId && projectId !== "none" ? parseInt(projectId, 10) : undefined,
      invoiceNumber: invoiceNumber.trim(),
      amount: parseFloat(amount),
      status: status as Payment["status"],
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEdit) {
      updatePayment(
        { id: initial!.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            toast({ title: "Invoice updated", description: `Invoice "${invoiceNumber}" was updated.` });
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: "Error", description: "Failed to update invoice.", variant: "destructive" });
          },
        },
      );
    } else {
      createPayment(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            toast({ title: "Invoice created", description: `Invoice "${invoiceNumber}" was created.` });
            handleOpenChange(false);
          },
          onError: () => {
            toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
          },
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-client">Client *</Label>
              <Select
                value={clientId}
                onValueChange={(v) => { setClientId(v); setProjectId("none"); }}
                required
              >
                <SelectTrigger id="inv-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="inv-project">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clientProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-number">Invoice Number *</Label>
              <Input
                id="inv-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2025-001"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="inv-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-amount">Amount *</Label>
              <Input
                id="inv-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due">Due Date</Label>
              <Input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, additional details…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save Changes" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: payments, isLoading, error } = useListPayments();
  const { mutate: updatePayment } = useUpdatePayment();
  const { mutate: deletePayment } = useDeletePayment();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!payments) return [];
    return payments.filter((p) => {
      const matchesTab = activeTab === "all" || p.status === activeTab;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        (p.clientName ?? "").toLowerCase().includes(q) ||
        (p.projectName ?? "").toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [payments, activeTab, search]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!payments) return null;
    const totalInvoiced = payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = payments
      .filter((p) => p.status === "sent" || p.status === "overdue")
      .reduce((s, p) => s + p.amount, 0);
    const paid = payments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);
    const overdueCount = payments.filter((p) => p.status === "overdue").length;
    return { totalInvoiced, outstanding, paid, overdueCount };
  }, [payments]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function statusAction(payment: Payment, newStatus: Payment["status"], label: string) {
    updatePayment(
      { id: payment.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: `Invoice ${label}`, description: `Invoice ${payment.invoiceNumber} marked as ${newStatus}.` });
        },
        onError: () => {
          toast({ title: "Error", description: `Failed to update invoice.`, variant: "destructive" });
        },
      },
    );
  }

  function handleDelete(payment: Payment) {
    deletePayment(
      { id: payment.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Invoice deleted", description: `Invoice ${payment.invoiceNumber} was deleted.` });
          setDeleteTarget(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete invoice.", variant: "destructive" });
        },
      },
    );
  }

  if (error) return <PageError message="Failed to load invoices." />;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Invoices"
        description="Manage invoices and track payments for all clients."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          New Invoice
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoiced</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{fmt(stats?.totalInvoiced ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-amber-500">{fmt(stats?.outstanding ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collected</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-emerald-500">{fmt(stats?.paid ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-2xl font-bold ${(stats?.overdueCount ?? 0) > 0 ? "text-destructive" : ""}`}>
                  {stats?.overdueCount ?? 0}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-1">
          {STATUS_TABS.map((tab) => {
            const count = tab.value === "all"
              ? (payments?.length ?? 0)
              : (payments?.filter((p) => p.status === tab.value).length ?? 0);
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FileText size={32} className="mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search || activeTab !== "all" ? "No invoices match your filters." : "No invoices yet."}
          </p>
          {!search && activeTab === "all" && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-1.5" /> Create your first invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[160px]">Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[52px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => (
                <TableRow key={payment.id} className="group hover:bg-secondary/20 transition-colors">
                  <TableCell>
                    <Link
                      href={`/payments/${payment.id}`}
                      className="font-mono text-sm font-semibold hover:text-primary transition-colors"
                    >
                      {payment.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${payment.clientId}`}
                      className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {payment.clientName ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.projectId ? (
                      <Link
                        href={`/projects/${payment.projectId}`}
                        className="hover:text-primary transition-colors"
                      >
                        {payment.projectName ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={getPaymentStatusVariant(payment.status)}>
                      {getPaymentStatusLabel(payment.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.dueDate ? format(new Date(payment.dueDate + "T00:00:00"), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    ${payment.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setEditTarget(payment)}>
                          <Pencil size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {payment.status === "draft" && (
                          <DropdownMenuItem onClick={() => statusAction(payment, "sent", "sent")}>
                            <Send size={14} className="mr-2" /> Mark as Sent
                          </DropdownMenuItem>
                        )}
                        {(payment.status === "sent" || payment.status === "overdue" || payment.status === "draft") && (
                          <DropdownMenuItem onClick={() => statusAction(payment, "paid", "paid")}>
                            <CheckCircle2 size={14} className="mr-2" /> Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {payment.status !== "cancelled" && payment.status !== "paid" && (
                          <DropdownMenuItem onClick={() => statusAction(payment, "cancelled", "cancelled")}>
                            <XCircle size={14} className="mr-2" /> Cancel Invoice
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(payment)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <InvoiceFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editTarget && (
        <InvoiceFormDialog
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          initial={editTarget}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice{" "}
              <span className="font-mono font-semibold">{deleteTarget?.invoiceNumber}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
