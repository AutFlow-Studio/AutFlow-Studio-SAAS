import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clinicTreatmentsTable, clinicPatientsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/clinic/treatments", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { patientId, status } = req.query as { patientId?: string; status?: string };

  const conditions = [eq(clinicTreatmentsTable.workspaceId, wid)];
  if (patientId) conditions.push(eq(clinicTreatmentsTable.patientId, parseInt(patientId)));
  if (status) conditions.push(eq(clinicTreatmentsTable.status, status));

  const rows = await db
    .select({ id: clinicTreatmentsTable.id, workspaceId: clinicTreatmentsTable.workspaceId, patientId: clinicTreatmentsTable.patientId, name: clinicTreatmentsTable.name, date: clinicTreatmentsTable.date, status: clinicTreatmentsTable.status, notes: clinicTreatmentsTable.notes, cost: clinicTreatmentsTable.cost, createdAt: clinicTreatmentsTable.createdAt, updatedAt: clinicTreatmentsTable.updatedAt, patientName: clinicPatientsTable.name })
    .from(clinicTreatmentsTable)
    .leftJoin(clinicPatientsTable, eq(clinicTreatmentsTable.patientId, clinicPatientsTable.id))
    .where(and(...conditions))
    .orderBy(clinicTreatmentsTable.date);

  res.json(rows.map((r) => ({ ...r, cost: r.cost ? Number(r.cost) : null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/clinic/treatments", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { patientId, name, date, status, notes, cost } = req.body ?? {};
  if (!patientId || !name || !date) { res.status(400).json({ error: "patientId, name, and date are required" }); return; }

  const [row] = await db
    .insert(clinicTreatmentsTable)
    .values({ workspaceId: wid, patientId: Number(patientId), name, date, status: status ?? "planned", notes, cost: cost != null ? String(cost) : undefined })
    .returning();

  res.status(201).json({ ...row!, cost: row!.cost ? Number(row!.cost) : null, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() });
});

router.put("/clinic/treatments/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, date, status, notes, cost, patientId } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (date !== undefined) updates.date = date;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (cost !== undefined) updates.cost = cost != null ? String(cost) : null;
  if (patientId !== undefined) updates.patientId = Number(patientId);

  const [updated] = await db
    .update(clinicTreatmentsTable)
    .set(updates)
    .where(and(eq(clinicTreatmentsTable.id, id), eq(clinicTreatmentsTable.workspaceId, wid)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Treatment not found" }); return; }
  res.json({ ...updated, cost: updated.cost ? Number(updated.cost) : null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/clinic/treatments/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db.delete(clinicTreatmentsTable).where(and(eq(clinicTreatmentsTable.id, id), eq(clinicTreatmentsTable.workspaceId, wid))).returning({ id: clinicTreatmentsTable.id });
  if (!deleted) { res.status(404).json({ error: "Treatment not found" }); return; }
  res.json({ success: true });
});

export default router;
