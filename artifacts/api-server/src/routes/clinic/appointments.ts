import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clinicAppointmentsTable, clinicPatientsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /clinic/appointments
router.get("/clinic/appointments", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { status, date } = req.query as { status?: string; date?: string };

  const conditions = [eq(clinicAppointmentsTable.workspaceId, wid)];
  if (status) conditions.push(eq(clinicAppointmentsTable.status, status));
  if (date) conditions.push(eq(clinicAppointmentsTable.date, date));

  const rows = await db
    .select({
      id: clinicAppointmentsTable.id,
      workspaceId: clinicAppointmentsTable.workspaceId,
      patientId: clinicAppointmentsTable.patientId,
      date: clinicAppointmentsTable.date,
      time: clinicAppointmentsTable.time,
      type: clinicAppointmentsTable.type,
      status: clinicAppointmentsTable.status,
      notes: clinicAppointmentsTable.notes,
      createdAt: clinicAppointmentsTable.createdAt,
      updatedAt: clinicAppointmentsTable.updatedAt,
      patientName: clinicPatientsTable.name,
    })
    .from(clinicAppointmentsTable)
    .leftJoin(clinicPatientsTable, eq(clinicAppointmentsTable.patientId, clinicPatientsTable.id))
    .where(and(...conditions))
    .orderBy(clinicAppointmentsTable.date, clinicAppointmentsTable.time);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

// GET /clinic/appointments/:id
router.get("/clinic/appointments/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ id: clinicAppointmentsTable.id, workspaceId: clinicAppointmentsTable.workspaceId, patientId: clinicAppointmentsTable.patientId, date: clinicAppointmentsTable.date, time: clinicAppointmentsTable.time, type: clinicAppointmentsTable.type, status: clinicAppointmentsTable.status, notes: clinicAppointmentsTable.notes, createdAt: clinicAppointmentsTable.createdAt, updatedAt: clinicAppointmentsTable.updatedAt, patientName: clinicPatientsTable.name })
    .from(clinicAppointmentsTable)
    .leftJoin(clinicPatientsTable, eq(clinicAppointmentsTable.patientId, clinicPatientsTable.id))
    .where(and(eq(clinicAppointmentsTable.id, id), eq(clinicAppointmentsTable.workspaceId, wid)))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

// POST /clinic/appointments
router.post("/clinic/appointments", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { patientId, date, time, type, status, notes } = req.body ?? {};
  if (!patientId || !date || !time) { res.status(400).json({ error: "patientId, date, and time are required" }); return; }

  const [appt] = await db
    .insert(clinicAppointmentsTable)
    .values({ workspaceId: wid, patientId: Number(patientId), date, time, type: type ?? "consultation", status: status ?? "scheduled", notes })
    .returning();

  res.status(201).json({ ...appt!, createdAt: appt!.createdAt.toISOString(), updatedAt: appt!.updatedAt.toISOString() });
});

// PUT /clinic/appointments/:id
router.put("/clinic/appointments/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { patientId, date, time, type, status, notes } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (patientId !== undefined) updates.patientId = Number(patientId);
  if (date !== undefined) updates.date = date;
  if (time !== undefined) updates.time = time;
  if (type !== undefined) updates.type = type;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const [updated] = await db
    .update(clinicAppointmentsTable)
    .set(updates)
    .where(and(eq(clinicAppointmentsTable.id, id), eq(clinicAppointmentsTable.workspaceId, wid)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// DELETE /clinic/appointments/:id
router.delete("/clinic/appointments/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(clinicAppointmentsTable)
    .where(and(eq(clinicAppointmentsTable.id, id), eq(clinicAppointmentsTable.workspaceId, wid)))
    .returning({ id: clinicAppointmentsTable.id });

  if (!deleted) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json({ success: true });
});

export default router;
