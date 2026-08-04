import {
  useGetPayment,
  useUpdatePayment,
  useDeletePayment,
  useListClients,
  useListProjects,
  getListPaymentsQueryKey,
  getGetPaymentQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { PageError } from "@/components/page-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, getPaymentStatusVariant, getPaymentStatusLabel } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Pencil, Send, CheckCircle2, XCircle, Trash2, Building2, FolderOpen, Calendar, DollarSign, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import type { Payment } from "@workspace/api-client-react";

// ── Edit Dialog (reused from list page logic) ─────────────────────────────────
function EditInvoiceDialog({
  open,
  onOpenChange,
  payment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payment: Payment;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients } = useListClients();
  const { data: projects } = useListProjects();
  const { mutate: updatePayment, isPending } = useUpdatePayment();

  const [clientId, setClientId] = useState(String(payment.clientId));
  const [projectId, setProjectId] = useState(payment.projectId ? String(payment.projectId) : "none");
  const [invoiceNumber, setInvoiceNumber] = useState(payment.invoiceNumber);
  const [amount, setAmount] = useState(String(payment.amount));
  const [status, setStatus] = useState<string>(payment.status);
  const [dueDate, setDueDate] = useState(payment.dueDate ?? "");
  const [notes, setNotes] = useState(payment.notes ?? "");

  const clientProjects = useMemo(
    () => (clientId ? (projects ?? []).filter((p) => p.clientId === parseInt(clientId, 10)) : (projects ?? [])),
    [projects, clientId],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updatePayment(
      {
        id: payment.id,
        data: {
          projectId: projectId && projectId !== "none" ? parseInt(projectId, 10) : undefined,
          invoiceNumber: invoiceNumber.trim(),
          amount: parseFloat(amount),
          status: status as Payment["status"],
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPaymentQueryKey(payment.id) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Invoice updated" });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update invoice.", variant: "destructive" });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={(v) => { setClientId(v); setProjectId("none"); }} required>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clientProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Number *</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Amount *</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail page ───────────────────────────────────────────────────────────────
export default function PaymentDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payment, isLoading, error } = useGetPayment(id);
  const { mutate: updatePayment } = useUpdatePayment();
  const { mutate: deletePayment, isPending: deleting } = useDeletePayment();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function statusAction(newStatus: Payment["status"], label: string) {
    if (!payment) return;
    updatePayment(
      { id: payment.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPaymentQueryKey(payment.id) });
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: `Invoice ${label}`, description: `Invoice ${payment.invoiceNumber} is now ${newStatus}.` });
        },
        onError: () => toast({ title: "Error", description: "Update failed.", variant: "destructive" }),
      },
    );
  }

  function handleDelete() {
    if (!payment) return;
    deletePayment(
      { id: payment.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "Invoice deleted" });
          navigate("/payments");
        },
        onError: () => toast({ title: "Error", description: "Delete failed.", variant: "destructive" }),
      },
    );
  }

  if (error) return <PageError message="Invoice not found." />;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back */}
      <Link href="/payments" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={15} /> Back to Invoices
      </Link>

      {/* Header */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-40" />
        </div>
      ) : payment ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold font-mono">{payment.invoiceNumber}</h1>
              <StatusBadge variant={getPaymentStatusVariant(payment.status)}>
                {getPaymentStatusLabel(payment.status)}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {format(new Date(payment.createdAt), "MMM d, yyyy")}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1.5" /> Edit
            </Button>
            {payment.status === "draft" && (
              <Button variant="outline" size="sm" onClick={() => statusAction("sent", "sent")}>
                <Send size={14} className="mr-1.5" /> Mark as Sent
              </Button>
            )}
            {(payment.status === "sent" || payment.status === "overdue" || payment.status === "draft") && (
              <Button variant="outline" size="sm" className="border-emerald-600 text-emerald-600 hover:bg-emerald-600/10" onClick={() => statusAction("paid", "paid")}>
                <CheckCircle2 size={14} className="mr-1.5" /> Mark as Paid
              </Button>
            )}
            {payment.status !== "cancelled" && payment.status !== "paid" && (
              <Button variant="outline" size="sm" className="border-muted-foreground/30 text-muted-foreground hover:border-destructive hover:text-destructive" onClick={() => statusAction("cancelled", "cancelled")}>
                <XCircle size={14} className="mr-1.5" /> Cancel
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} className="mr-1.5" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : payment ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Invoice Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText size={15} className="text-muted-foreground" /> Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-mono font-semibold">{payment.invoiceNumber}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign size={13} /> Amount</span>
                <span className="text-lg font-bold">{fmt(payment.amount)}</span>
              </div>
              {payment.dueDate && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar size={13} /> Due Date</span>
                    <span className={payment.status === "overdue" ? "text-destructive font-semibold" : ""}>
                      {format(new Date(payment.dueDate + "T00:00:00"), "MMM d, yyyy")}
                    </span>
                  </div>
                </>
              )}
              {payment.paidDate && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle2 size={13} /> Paid On</span>
                    <span className="text-emerald-500 font-semibold">
                      {format(new Date(payment.paidDate + "T00:00:00"), "MMM d, yyyy")}
                    </span>
                  </div>
                </>
              )}
              {payment.paymentMethod && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="capitalize">{payment.paymentMethod}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Client & Project */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Linked To</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md border border-border bg-secondary/50 p-1.5">
                  <Building2 size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Client</p>
                  {payment.clientId ? (
                    <Link
                      href={`/clients/${payment.clientId}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {payment.clientName ?? `Client #${payment.clientId}`}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md border border-border bg-secondary/50 p-1.5">
                  <FolderOpen size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Project</p>
                  {payment.projectId ? (
                    <Link
                      href={`/projects/${payment.projectId}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {payment.projectName ?? `Project #${payment.projectId}`}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Not linked to a project</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {payment.notes && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payment.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Edit dialog */}
      {payment && (
        <EditInvoiceDialog open={editOpen} onOpenChange={setEditOpen} payment={payment} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice{" "}
              <span className="font-mono font-semibold">{payment?.invoiceNumber}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
