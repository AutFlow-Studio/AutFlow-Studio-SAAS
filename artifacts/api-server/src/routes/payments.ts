import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, paymentsTable, clientsTable, activityTable } from "@workspace/db";
import { createNotification } from "../lib/createNotification";
import {
  ListPaymentsQueryParams,
  CreatePaymentBody,
  GetPaymentParams,
  UpdatePaymentParams,
  UpdatePaymentBody,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapPayment(p: typeof paymentsTable.$inferSelect, clientName?: string | null) {
  return {
    ...p,
    clientName: clientName ?? null,
    amount: Number(p.amount),
    remainingBalance: p.remainingBalance ? Number(p.remainingBalance) : null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/payments", async (req, res): Promise<void> => {
  const parsed = ListPaymentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { clientId, status } = parsed.data;
  const wid = req.session.workspaceId!;

  const conditions = [eq(paymentsTable.workspaceId, wid)];
  if (clientId) conditions.push(eq(paymentsTable.clientId, clientId));
  if (status) conditions.push(eq(paymentsTable.status, status));

  const rows = await db
    .select({ payment: paymentsTable, clientName: clientsTable.companyName })
    .from(paymentsTable)
    .leftJoin(clientsTable, eq(paymentsTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(sql`${paymentsTable.createdAt} DESC`);

  res.json(rows.map(({ payment, clientName }) => mapPayment(payment, clientName)));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      ...parsed.data,
      workspaceId: wid,
      amount: String(parsed.data.amount),
      remainingBalance: parsed.data.remainingBalance != null ? String(parsed.data.remainingBalance) : undefined,
    })
    .returning();

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, payment.clientId));

  await db.insert(activityTable).values({
    type: "payment_added",
    entityType: "payment",
    entityId: payment.id,
    description: `Invoice ${payment.invoiceNumber} added (${payment.amount})`,
    clientId: payment.clientId,
    workspaceId: wid,
  });

  void createNotification(
    {
      type: "invoice_created",
      title: "Invoice created",
      message: `Invoice ${payment.invoiceNumber} for ${Number(payment.amount).toLocaleString()} created${client ? ` (${client.companyName})` : ""}.`,
      entityType: "payment",
      entityId: payment.id,
      href: `/payments`,
    },
    wid,
  );

  res.status(201).json(mapPayment(payment, client?.companyName ?? null));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [row] = await db
    .select({ payment: paymentsTable, clientName: clientsTable.companyName })
    .from(paymentsTable)
    .leftJoin(clientsTable, eq(paymentsTable.clientId, clientsTable.id))
    .where(and(eq(paymentsTable.id, params.data.id), eq(paymentsTable.workspaceId, wid)));

  if (!row) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(mapPayment(row.payment, row.clientName));
});

router.patch("/payments/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const wasNotPaid = async () => {
    const [current] = await db
      .select({ status: paymentsTable.status })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.id, params.data.id), eq(paymentsTable.workspaceId, wid)));
    return current?.status !== "paid";
  };
  const notPaidBefore = parsed.data.status === "paid" ? await wasNotPaid() : false;

  const [payment] = await db
    .update(paymentsTable)
    .set({
      ...parsed.data,
      amount: parsed.data.amount != null ? String(parsed.data.amount) : undefined,
      remainingBalance: parsed.data.remainingBalance != null ? String(parsed.data.remainingBalance) : undefined,
    })
    .where(and(eq(paymentsTable.id, params.data.id), eq(paymentsTable.workspaceId, wid)))
    .returning();

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, payment.clientId));

  await db.insert(activityTable).values({
    type: "payment_updated",
    entityType: "payment",
    entityId: payment.id,
    description: `Invoice ${payment.invoiceNumber} updated`,
    clientId: payment.clientId,
    workspaceId: wid,
  });

  if (parsed.data.status === "paid" && notPaidBefore) {
    void createNotification(
      {
        type: "invoice_paid",
        title: "Invoice paid",
        message: `Invoice ${payment.invoiceNumber} (${Number(payment.amount).toLocaleString()}) has been marked as paid${client ? ` — ${client.companyName}` : ""}.`,
        entityType: "payment",
        entityId: payment.id,
        href: `/payments`,
      },
      wid,
    );
  }

  res.json(mapPayment(payment, client?.companyName ?? null));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [payment] = await db
    .delete(paymentsTable)
    .where(and(eq(paymentsTable.id, params.data.id), eq(paymentsTable.workspaceId, wid)))
    .returning();

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
