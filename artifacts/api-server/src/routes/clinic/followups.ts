import { Router, type IRouter } from "express";
import { eq, and, lte } from "drizzle-orm";
import { db, clinicFollowupsTable, clinicPatientsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/clinic/followups", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { patientId, status, overdue } = req.query as { patientId?: string; status?: string; overdue?: string };

  const conditions = [eq(clinicFollowupsTable.workspaceId, wid)];
  if (patientId) conditions.push(eq(clinicFollowupsTable.patientId, parseInt(patientId)));
  if (status) conditions.push(eq(clinicFollowupsTable.status, status));
  if (overdue === "true") {
    const today = new Date().toISOString().split("T")[0]!;
    conditions.push(lte(clinicFollowupsTable.dueDate, today));
    conditions.push(eq(clinicFollowupsTable.status, "pending"));
  }

  const rows = await db
    .select({ id: clinicFollowupsTable.id, workspaceId: clinicFollowupsTable.workspaceId, patientId: clinicFollowupsTable.patientId, reason: clinicFollowupsTable.reason, dueDate: clinicFollowupsTable.dueDate, status: clinicFollowupsTable.status, notes: clinicFollowupsTable.notes, createdAt: clinicFollowupsTable.createdAt, updatedAt: clinicFollowupsTable.updatedAt, patientName: clinicPatientsTable.name })
    .from(clinicFollowupsTable)
    .leftJoin(clinicPatientsTable, eq(clinicFollowupsTable.patientId, clinicPatientsTable.id))
    .where(and(...conditions))
    .orderBy(clinicFollowupsTable.dueDate);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/clinic/followups", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { patientId, reason, dueDate, status, notes } = req.body ?? {};
  if (!patientId || !reason || !dueDate) { res.status(400).json({ error: "patientId, reason, and dueDate are required" }); return; }

  const [row] = await db
    .insert(clinicFollowupsTable)
    .values({ workspaceId: wid, patientId: Number(patientId), reason, dueDate, status: status ?? "pending", notes })
    .returning();

  res.status(201).json({ ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() });
});

router.put("/clinic/followups/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { reason, dueDate, status, notes, patientId } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (reason !== undefined) updates.reason = reason;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (patientId !== undefined) updates.patientId = Number(patientId);

  const [updated] = await db
    .update(clinicFollowupsTable)
    .set(updates)
    .where(and(eq(clinicFollowupsTable.id, id), eq(clinicFollowupsTable.workspaceId, wid)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Follow-up not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/clinic/followups/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db.delete(clinicFollowupsTable).where(and(eq(clinicFollowupsTable.id, id), eq(clinicFollowupsTable.workspaceId, wid))).returning({ id: clinicFollowupsTable.id });
  if (!deleted) { res.status(404).json({ error: "Follow-up not found" }); return; }
  res.json({ success: true });
});

export default router;
