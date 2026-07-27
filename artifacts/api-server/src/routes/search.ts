import { Router, type IRouter } from "express";
import { ilike, or, and, eq } from "drizzle-orm";
import {
  db,
  clientsTable,
  projectsTable,
  paymentsTable,
  notesTable,
  meetingsTable,
  documentsTable,
  tasksTable,
} from "@workspace/db";
import { GlobalSearchQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const parsed = GlobalSearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { q } = parsed.data;
  if (!q || q.trim().length === 0) {
    res.json({ results: [], total: 0 });
    return;
  }

  const wid = req.session.workspaceId!;
  const term = `%${q}%`;

  const [clients, projects, payments, notes, meetings, documents, tasks] = await Promise.all([
    db.select().from(clientsTable).where(and(eq(clientsTable.workspaceId, wid), ilike(clientsTable.companyName, term))).limit(5),
    db.select().from(projectsTable).where(and(eq(projectsTable.workspaceId, wid), ilike(projectsTable.name, term))).limit(5),
    db.select().from(paymentsTable).where(and(eq(paymentsTable.workspaceId, wid), ilike(paymentsTable.invoiceNumber, term))).limit(5),
    db.select().from(notesTable).where(and(eq(notesTable.workspaceId, wid), ilike(notesTable.content, term))).limit(5),
    db.select().from(meetingsTable).where(
      and(
        eq(meetingsTable.workspaceId, wid),
        or(ilike(meetingsTable.summary, term), ilike(meetingsTable.actionItems, term)),
      ),
    ).limit(5),
    db.select().from(documentsTable).where(and(eq(documentsTable.workspaceId, wid), ilike(documentsTable.title, term))).limit(5),
    db.select().from(tasksTable).where(and(eq(tasksTable.workspaceId, wid), ilike(tasksTable.title, term))).limit(5),
  ]);

  const results: Array<{
    id: number;
    type: string;
    title: string;
    subtitle: string | null;
    url: string | null;
  }> = [
    ...clients.map((c) => ({ id: c.id, type: "client" as const, title: c.companyName, subtitle: c.industry ?? c.email ?? null, url: `/clients/${c.id}` })),
    ...projects.map((p) => ({ id: p.id, type: "project" as const, title: p.name, subtitle: `Status: ${p.status}`, url: `/projects/${p.id}` })),
    ...payments.map((p) => ({ id: p.id, type: "payment" as const, title: `Invoice ${p.invoiceNumber}`, subtitle: `$${Number(p.amount).toLocaleString()} · ${p.status}`, url: `/payments` })),
    ...notes.map((n) => ({ id: n.id, type: "note" as const, title: n.content.substring(0, 60) + (n.content.length > 60 ? "..." : ""), subtitle: null, url: n.clientId ? `/clients/${n.clientId}` : `/documents` })),
    ...meetings.map((m) => ({ id: m.id, type: "meeting" as const, title: `Meeting on ${new Date(m.date).toISOString().split("T")[0]}`, subtitle: m.summary?.substring(0, 60) ?? null, url: `/calendar` })),
    ...documents.map((d) => ({ id: d.id, type: "document" as const, title: d.title, subtitle: d.type, url: d.url ?? null })),
    ...tasks.map((t) => ({ id: t.id, type: "task" as const, title: t.title, subtitle: `Priority: ${t.priority} · ${t.status}`, url: `/tasks` })),
  ];

  res.json({ results, total: results.length });
});

export default router;
