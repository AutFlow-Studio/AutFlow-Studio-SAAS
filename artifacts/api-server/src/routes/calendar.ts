import { Router, type IRouter } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db, projectsTable, meetingsTable, paymentsTable, clientsTable } from "@workspace/db";
import { GetCalendarQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/calendar", async (req, res): Promise<void> => {
  const parsed = GetCalendarQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const events: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    clientId: number | null;
    clientName: string | null;
    entityId: number | null;
  }> = [];

  const [projects, meetings, payments] = await Promise.all([
    db
      .select({ project: projectsTable, clientName: clientsTable.companyName })
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(and(eq(projectsTable.workspaceId, wid), sql`${projectsTable.deadline} IS NOT NULL`)),
    db
      .select({ meeting: meetingsTable, clientName: clientsTable.companyName })
      .from(meetingsTable)
      .leftJoin(clientsTable, eq(meetingsTable.clientId, clientsTable.id))
      .where(eq(meetingsTable.workspaceId, wid)),
    db
      .select({ payment: paymentsTable, clientName: clientsTable.companyName })
      .from(paymentsTable)
      .leftJoin(clientsTable, eq(paymentsTable.clientId, clientsTable.id))
      .where(and(eq(paymentsTable.workspaceId, wid), sql`${paymentsTable.dueDate} IS NOT NULL`)),
  ]);

  for (const { project, clientName } of projects) {
    if (project.deadline) {
      events.push({
        id: `deadline-${project.id}`,
        type: "deadline",
        title: `${project.name} Deadline`,
        date: project.deadline,
        clientId: project.clientId,
        clientName: clientName ?? null,
        entityId: project.id,
      });
    }
  }

  for (const { meeting, clientName } of meetings) {
    events.push({
      id: `meeting-${meeting.id}`,
      type: "meeting",
      title: `Meeting: ${clientName ?? "Unknown"}`,
      date: meeting.date.toISOString().split("T")[0],
      clientId: meeting.clientId,
      clientName: clientName ?? null,
      entityId: meeting.id,
    });
  }

  for (const { payment, clientName } of payments) {
    if (payment.dueDate && payment.status !== "paid") {
      events.push({
        id: `payment-${payment.id}`,
        type: "payment",
        title: `Invoice ${payment.invoiceNumber} Due`,
        date: payment.dueDate,
        clientId: payment.clientId,
        clientName: clientName ?? null,
        entityId: payment.id,
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  res.json(events);
});

export default router;
