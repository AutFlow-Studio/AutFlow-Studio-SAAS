import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import {
  db,
  campaignsTable,
  clientsTable,
  projectsTable,
  activityTable,
} from "@workspace/db";

const router: IRouter = Router();

function mapCampaign(
  c: typeof campaignsTable.$inferSelect,
  extra?: { clientName?: string | null; projectName?: string | null },
) {
  return {
    ...c,
    budget: c.budget ? Number(c.budget) : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    clientName: extra?.clientName ?? null,
    projectName: extra?.projectName ?? null,
  };
}

// List campaigns
router.get("/campaigns", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { status, type, clientId, search } = req.query as Record<string, string | undefined>;

  const rows = await db
    .select({
      campaign: campaignsTable,
      clientName: clientsTable.companyName,
      projectName: projectsTable.name,
    })
    .from(campaignsTable)
    .leftJoin(clientsTable, eq(campaignsTable.clientId, clientsTable.id))
    .leftJoin(projectsTable, eq(campaignsTable.projectId, projectsTable.id))
    .where(
      and(
        eq(campaignsTable.workspaceId, wid),
        status ? eq(campaignsTable.status, status) : undefined,
        type ? eq(campaignsTable.type, type) : undefined,
        clientId ? eq(campaignsTable.clientId, Number(clientId)) : undefined,
        search ? ilike(campaignsTable.name, `%${search}%`) : undefined,
      ),
    )
    .orderBy(sql`${campaignsTable.createdAt} DESC`);

  res.json(
    rows.map((r) =>
      mapCampaign(r.campaign, {
        clientName: r.clientName,
        projectName: r.projectName,
      }),
    ),
  );
});

// Get single campaign
router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;

  const [row] = await db
    .select({
      campaign: campaignsTable,
      clientName: clientsTable.companyName,
      projectName: projectsTable.name,
    })
    .from(campaignsTable)
    .leftJoin(clientsTable, eq(campaignsTable.clientId, clientsTable.id))
    .leftJoin(projectsTable, eq(campaignsTable.projectId, projectsTable.id))
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.workspaceId, wid)));

  if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }
  res.json(mapCampaign(row.campaign, { clientName: row.clientName, projectName: row.projectName }));
});

// Create campaign
router.post("/campaigns", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { name, type, goal, budget, startDate, endDate, status, performanceNotes, results, clientId, projectId } = req.body;

  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      workspaceId: wid,
      name,
      type: type ?? "custom",
      goal: goal ?? null,
      budget: budget != null ? String(budget) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      status: status ?? "planning",
      performanceNotes: performanceNotes ?? null,
      results: results ?? null,
      clientId: clientId ? Number(clientId) : null,
      projectId: projectId ? Number(projectId) : null,
    })
    .returning();

  await db.insert(activityTable).values({
    type: "campaign_created",
    entityType: "campaign",
    entityId: campaign.id,
    description: `Campaign "${campaign.name}" created`,
    clientId: campaign.clientId ?? null,
    workspaceId: wid,
  });

  res.status(201).json(mapCampaign(campaign));
});

// Update campaign
router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;

  const [existing] = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.workspaceId, wid)));
  if (!existing) { res.status(404).json({ error: "Campaign not found" }); return; }

  const { name, type, goal, budget, startDate, endDate, status, performanceNotes, results, clientId, projectId } = req.body;

  const updates: Partial<typeof campaignsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (goal !== undefined) updates.goal = goal;
  if (budget !== undefined) updates.budget = budget != null ? String(budget) : null;
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;
  if (status !== undefined) updates.status = status;
  if (performanceNotes !== undefined) updates.performanceNotes = performanceNotes;
  if (results !== undefined) updates.results = results;
  if (clientId !== undefined) updates.clientId = clientId ? Number(clientId) : null;
  if (projectId !== undefined) updates.projectId = projectId ? Number(projectId) : null;

  const [campaign] = await db
    .update(campaignsTable)
    .set(updates)
    .where(eq(campaignsTable.id, id))
    .returning();

  res.json(mapCampaign(campaign));
});

// Delete campaign
router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;

  const [existing] = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.id, id), eq(campaignsTable.workspaceId, wid)));
  if (!existing) { res.status(404).json({ error: "Campaign not found" }); return; }

  await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
  res.sendStatus(204);
});

export default router;
