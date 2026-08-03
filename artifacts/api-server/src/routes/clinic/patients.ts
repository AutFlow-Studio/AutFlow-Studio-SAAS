import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, clinicPatientsTable, clinicAppointmentsTable, clinicTreatmentsTable, clinicBillingTable } from "@workspace/db";

const router: IRouter = Router();

// GET /clinic/patients
router.get("/clinic/patients", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { search, status } = req.query as { search?: string; status?: string };

  const conditions = [eq(clinicPatientsTable.workspaceId, wid)];
  if (status) conditions.push(eq(clinicPatientsTable.status, status));
  if (search) {
    const p = `%${search}%`;
    conditions.push(
      sql`(${ilike(clinicPatientsTable.name, p)} OR ${ilike(clinicPatientsTable.email, p)} OR ${ilike(clinicPatientsTable.phone, p)})`
    );
  }

  const patients = await db
    .select()
    .from(clinicPatientsTable)
    .where(and(...conditions))
    .orderBy(clinicPatientsTable.name);

  res.json(patients.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
});

// GET /clinic/patients/:id
router.get("/clinic/patients/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [patient] = await db
    .select()
    .from(clinicPatientsTable)
    .where(and(eq(clinicPatientsTable.id, id), eq(clinicPatientsTable.workspaceId, wid)))
    .limit(1);

  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  // Fetch related data
  const [appointments, treatments, billing] = await Promise.all([
    db.select().from(clinicAppointmentsTable)
      .where(and(eq(clinicAppointmentsTable.patientId, id), eq(clinicAppointmentsTable.workspaceId, wid)))
      .orderBy(clinicAppointmentsTable.date),
    db.select().from(clinicTreatmentsTable)
      .where(and(eq(clinicTreatmentsTable.patientId, id), eq(clinicTreatmentsTable.workspaceId, wid)))
      .orderBy(clinicTreatmentsTable.date),
    db.select().from(clinicBillingTable)
      .where(and(eq(clinicBillingTable.patientId, id), eq(clinicBillingTable.workspaceId, wid)))
      .orderBy(clinicBillingTable.createdAt),
  ]);

  res.json({
    ...patient,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
    appointments,
    treatments: treatments.map((t) => ({ ...t, cost: t.cost ? Number(t.cost) : null })),
    billing: billing.map((b) => ({ ...b, amount: Number(b.amount) })),
  });
});

// POST /clinic/patients
router.post("/clinic/patients", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { name, phone, email, dateOfBirth, gender, address, status, notes } = req.body ?? {};
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }

  const [patient] = await db
    .insert(clinicPatientsTable)
    .values({ workspaceId: wid, name: String(name).trim(), phone, email, dateOfBirth, gender, address, status: status ?? "active", notes })
    .returning();

  res.status(201).json({ ...patient!, createdAt: patient!.createdAt.toISOString(), updatedAt: patient!.updatedAt.toISOString() });
});

// PUT /clinic/patients/:id
router.put("/clinic/patients/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, phone, email, dateOfBirth, gender, address, status, notes } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
  if (gender !== undefined) updates.gender = gender;
  if (address !== undefined) updates.address = address;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const [updated] = await db
    .update(clinicPatientsTable)
    .set(updates)
    .where(and(eq(clinicPatientsTable.id, id), eq(clinicPatientsTable.workspaceId, wid)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// DELETE /clinic/patients/:id
router.delete("/clinic/patients/:id", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(clinicPatientsTable)
    .where(and(eq(clinicPatientsTable.id, id), eq(clinicPatientsTable.workspaceId, wid)))
    .returning({ id: clinicPatientsTable.id });

  if (!deleted) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json({ success: true });
});

export default router;
