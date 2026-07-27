import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Payment {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  paymentMethod: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-amber-500/15 text-amber-400" },
  paid: { label: "Paid", class: "bg-emerald-500/15 text-emerald-400" },
  overdue: { label: "Overdue", class: "bg-red-500/15 text-red-400" },
  cancelled: { label: "Cancelled", class: "bg-zinc-500/15 text-zinc-400" },
};

export default function PortalPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/payments", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPayments)
      .catch(() => setError("Unable to load invoices."))
      .finally(() => setLoading(false));
  }, []);

  const outstanding = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((s, p) => s + p.amount, 0);

  const paid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-36" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground mt-1">Your billing history and outstanding payments</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-1">Outstanding</div>
            <div className="text-2xl font-bold text-amber-400">${outstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground mb-1">Total Paid</div>
            <div className="text-2xl font-bold text-emerald-400">${paid.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      ) : payments.length === 0 ? (
        <Card className="bg-card/40 border-border/50">
          <CardContent className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Receipt size={40} className="opacity-30" />
            <p className="text-sm">No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              {payments.map((p) => {
                const sc = STATUS_CONFIG[p.status] ?? { label: p.status, class: "bg-secondary text-muted-foreground" };
                return (
                  <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Receipt size={15} className="text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-mono font-medium">{p.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.dueDate ? `Due ${format(parseISO(p.dueDate), "MMM d, yyyy")}` : `Issued ${format(parseISO(p.createdAt), "MMM d, yyyy")}`}
                          {p.paidDate && ` · Paid ${format(parseISO(p.paidDate), "MMM d, yyyy")}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-bold font-mono text-sm">${p.amount.toLocaleString()}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.class)}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
