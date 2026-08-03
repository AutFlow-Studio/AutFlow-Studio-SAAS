import { Router, type IRouter } from "express";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { db, clinicPatientsTable, clinicAppointmentsTable, clinicTreatmentsTable, clinicFollowupsTable, clinicBillingTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/clinic/dashboard", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const today = new Date().toISOString().split("T")[0]!;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]!;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]!;

  const [
    totalPatients,
    newPatients,
    todayAppts,
    upcomingAppts,
    completedAppts,
    pendingFollowups,
    overdueFollowups,
    recentTreatments,
    billingStats,
  ] = await Promise.all([
    // Total patients
    db.select({ count: sql<number>`count(*)::int` }).from(clinicPatientsTable)
      .where(eq(clinicPatientsTable.workspaceId, wid))
      .then((r) => r[0]!.count),

    // New patients (last 7 days)
    db.select({ count: sql<number>`count(*)::int` }).from(clinicPatientsTable)
      .where(and(eq(clinicPatientsTable.workspaceId, wid), gte(sql`clinic_patients.created_at::date`, sevenDaysAgo)))
      .then((r) => r[0]!.count),

    // Today's appointments
    db.select({ id: clinicAppointmentsTable.id, time: clinicAppointmentsTable.time, type: clinicAppointmentsTable.type, status: clinicAppointmentsTable.status, patientName: clinicPatientsTable.name })
      .from(clinicAppointmentsTable)
      .leftJoin(clinicPatientsTable, eq(clinicAppointmentsTable.patientId, clinicPatientsTable.id))
      .where(and(eq(clinicAppointmentsTable.workspaceId, wid), eq(clinicAppointmentsTable.date, today)))
      .orderBy(clinicAppointmentsTable.time),

    // Upcoming appointments (tomorrow onward, limit 5)
    db.select({ id: clinicAppointmentsTable.id, date: clinicAppointmentsTable.date, time: clinicAppointmentsTable.time, type: clinicAppointmentsTable.type, status: clinicAppointmentsTable.status, patientName: clinicPatientsTable.name })
      .from(clinicAppointmentsTable)
      .leftJoin(clinicPatientsTable, eq(clinicAppointmentsTable.patientId, clinicPatientsTable.id))
      .where(and(eq(clinicAppointmentsTable.workspaceId, wid), gte(clinicAppointmentsTable.date, tomorrow), eq(clinicAppointmentsTable.status, "scheduled")))
      .orderBy(clinicAppointmentsTable.date, clinicAppointmentsTable.time)
      .limit(5),

    // Completed appointments count
    db.select({ count: sql<number>`count(*)::int` }).from(clinicAppointmentsTable)
      .where(and(eq(clinicAppointmentsTable.workspaceId, wid), eq(clinicAppointmentsTable.status, "completed")))
      .then((r) => r[0]!.count),

    // Pending follow-ups
    db.select({ count: sql<number>`count(*)::int` }).from(clinicFollowupsTable)
      .where(and(eq(clinicFollowupsTable.workspaceId, wid), eq(clinicFollowupsTable.status, "pending")))
      .then((r) => r[0]!.count),

    // Overdue follow-ups (due date <= today, still pending)
    db.select({ id: clinicFollowupsTable.id, reason: clinicFollowupsTable.dueDate, dueDate: clinicFollowupsTable.dueDate, patientName: clinicPatientsTable.name })
      .from(clinicFollowupsTable)
      .leftJoin(clinicPatientsTable, eq(clinicFollowupsTable.patientId, clinicPatientsTable.id))
      .where(and(eq(clinicFollowupsTable.workspaceId, wid), eq(clinicFollowupsTable.status, "pending"), lte(clinicFollowupsTable.dueDate, today)))
      .orderBy(clinicFollowupsTable.dueDate)
      .limit(5),

    // Recent treatments (last 5)
    db.select({ id: clinicTreatmentsTable.id, name: clinicTreatmentsTable.name, date: clinicTreatmentsTable.date, status: clinicTreatmentsTable.status, patientName: clinicPatientsTable.name })
      .from(clinicTreatmentsTable)
      .leftJoin(clinicPatientsTable, eq(clinicTreatmentsTable.patientId, clinicPatientsTable.id))
      .where(eq(clinicTreatmentsTable.workspaceId, wid))
      .orderBy(clinicTreatmentsTable.date)
      .limit(5),

    // Billing stats
    db.select({ status: clinicBillingTable.status, total: sql<number>`sum(amount::numeric)::float` })
      .from(clinicBillingTable)
      .where(eq(clinicBillingTable.workspaceId, wid))
      .groupBy(clinicBillingTable.status),
  ]);

  const revenue = billingStats.find((b) => b.status === "paid")?.total ?? 0;
  const pendingPayments = billingStats.find((b) => b.status === "pending")?.total ?? 0;
  const overduePayments = billingStats.find((b) => b.status === "overdue")?.total ?? 0;

  res.json({
    appointments: {
      today: todayAppts,
      todayCount: todayAppts.length,
      upcoming: upcomingAppts,
      completedTotal: completedAppts,
    },
    patients: {
      total: totalPatients,
      new: newPatients,
      needingFollowup: pendingFollowups,
    },
    billing: {
      revenue,
      pendingPayments,
      overduePayments,
    },
    activity: {
      overdueFollowups,
      recentTreatments,
    },
  });
});

export default router;
