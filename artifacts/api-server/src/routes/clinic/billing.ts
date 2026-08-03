import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clinicBillingTable, clinicPatientsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/clinic/billing", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { patientId, status } = req.query as { patientId?: string; status?: string };

  const conditions = [eq(clinicBillingTable.workspaceId, wid)];
  if (patientId) conditions.push(eq(clinicBillingTable.patientId, parseInt(patientId)));
  if (status) conditions.push(eq(clinicBillingTable.status, status));

  const rows = await db
    .select({ id: clinicBillingTable.id, workspaceId: clinicBillingTable.workspaceId, patientId: clinicBillingTable.patientId, description: clinicBillingTable.description, amount: clinicBillingTable.amount, status: clinicBillingTable.status, dueDate: clinicBillingTable.dueDate, createdAt: clinicBillingTable.createdAt, updatedAt: clinicBillingTable.updatedAt, patientName: clinicPatientsTable.name })
    .from(clinicBillingTable)
    .leftJoin(clinicPatientsTable, eq(clinicBillingTable.patientId, clinicPatientsTable.id))
    .where(and(...conditions))
    .orderBy(clinicBillingTable.createdAt);

  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/clinic/billing", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { patientId, description, amount, status, dueDate } = req.body ?? {};
  if (!patientId || !description || amount == null) { res.status(400).json({ error: "patientId, description, and amount are required" }); return; }

  const [row] = await db
    .insert(clinicBillingTable)
    .values({ workspaceId: wid, patientId: Number(patientId), description, amount: String(amount), status: status ?? "pending", dueDate })
    .returning();

  res.status(201).json({ ...row!, amount: Number(row!.amount), createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() });
});

router.put("/clinic/billing/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { description, amount, status, dueDate, patientId } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (description !== undefined) updates.description = description;
  if (amount !== undefined) updates.amount = String(amount);
  if (status !== undefined) updates.status = status;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (patientId !== undefined) updates.patientId = Number(patientId);

  const [updated] = await db
    .update(clinicBillingTable)
    .set(updates)
    .where(and(eq(clinicBillingTable.id, id), eq(clinicBillingTable.workspaceId, wid)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Billing record not found" }); return; }
  res.json({ ...updated, amount: Number(updated.amount), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/clinic/billing/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db.delete(clinicBillingTable).where(and(eq(clinicBillingTable.id, id), eq(clinicBillingTable.workspaceId, wid))).returning({ id: clinicBillingTable.id });
  if (!deleted) { res.status(404).json({ error: "Billing record not found" }); return; }
  res.json({ success: true });
});

export default router;
