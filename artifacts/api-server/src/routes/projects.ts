import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, projectsTable, clientsTable, activityTable } from "@workspace/db";
import { createNotification } from "../lib/createNotification";
import {
  ListProjectsQueryParams,
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapProject(p: typeof projectsTable.$inferSelect, clientName?: string | null) {
  const rev = p.revenue ? Number(p.revenue) : null;
  const cost = p.actualCost ? Number(p.actualCost) : null;
  return {
    ...p,
    clientName: clientName ?? null,
    estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null,
    actualCost: cost,
    revenue: rev,
    profit: rev != null && cost != null ? rev - cost : null,
    updatedAt: p.updatedAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/projects", async (req, res): Promise<void> => {
  const parsed = ListProjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { clientId, status, search } = parsed.data;
  const wid = req.session.workspaceId!;

  const conditions = [eq(projectsTable.workspaceId, wid)];
  if (clientId) conditions.push(eq(projectsTable.clientId, clientId));
  if (status) conditions.push(eq(projectsTable.status, status));
  if (search) conditions.push(ilike(projectsTable.name, `%${search}%`));

  const rows = await db
    .select({ project: projectsTable, clientName: clientsTable.companyName })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(sql`${projectsTable.createdAt} DESC`);

  res.json(rows.map(({ project, clientName }) => mapProject(project, clientName)));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [project] = await db
    .insert(projectsTable)
    .values({
      ...parsed.data,
      workspaceId: wid,
      progress: parsed.data.progress ?? 0,
      estimatedBudget: parsed.data.estimatedBudget != null ? String(parsed.data.estimatedBudget) : undefined,
      actualCost: parsed.data.actualCost != null ? String(parsed.data.actualCost) : undefined,
      revenue: parsed.data.revenue != null ? String(parsed.data.revenue) : undefined,
    })
    .returning();

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, project.clientId));

  await db.insert(activityTable).values({
    type: "project_created",
    entityType: "project",
    entityId: project.id,
    description: `Project "${project.name}" created`,
    clientId: project.clientId,
    workspaceId: wid,
  });

  void createNotification(
    {
      type: "project_created",
      title: "New project created",
      message: `Project "${project.name}" has been created${client ? ` for ${client.companyName}` : ""}.`,
      entityType: "project",
      entityId: project.id,
      href: `/projects/${project.id}`,
    },
    wid,
  );

  res.status(201).json(mapProject(project, client?.companyName ?? null));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [row] = await db
    .select({ project: projectsTable, clientName: clientsTable.companyName })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.workspaceId, wid)));

  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(mapProject(row.project, row.clientName));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [project] = await db
    .update(projectsTable)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
      estimatedBudget: parsed.data.estimatedBudget != null ? String(parsed.data.estimatedBudget) : undefined,
      actualCost: parsed.data.actualCost != null ? String(parsed.data.actualCost) : undefined,
      revenue: parsed.data.revenue != null ? String(parsed.data.revenue) : undefined,
    })
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.workspaceId, wid)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, project.clientId));

  await db.insert(activityTable).values({
    type: "project_updated",
    entityType: "project",
    entityId: project.id,
    description: `Project "${project.name}" updated`,
    clientId: project.clientId,
    workspaceId: wid,
  });

  if (parsed.data.status) {
    void createNotification(
      {
        type: "project_status_changed",
        title: "Project status updated",
        message: `"${project.name}" status changed to ${project.status}.`,
        entityType: "project",
        entityId: project.id,
        href: `/projects/${project.id}`,
      },
      wid,
    );
  }

  res.json(mapProject(project, client?.companyName ?? null));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [project] = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.workspaceId, wid)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
