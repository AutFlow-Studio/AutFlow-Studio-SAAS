import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, tasksTable, clientsTable, projectsTable, activityTable } from "@workspace/db";
import { createNotification } from "../lib/createNotification";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { clientId, projectId, status } = parsed.data;
  const wid = req.session.workspaceId!;

  const conditions = [eq(tasksTable.workspaceId, wid)];
  if (clientId) conditions.push(eq(tasksTable.clientId, clientId));
  if (projectId) conditions.push(eq(tasksTable.projectId, projectId));
  if (status) conditions.push(eq(tasksTable.status, status));

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(...conditions))
    .orderBy(tasksTable.sortOrder, tasksTable.createdAt);

  const clientIds = [...new Set(tasks.map((t) => t.clientId).filter(Boolean) as number[])];
  const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean) as number[])];

  const [clients, projects] = await Promise.all([
    clientIds.length > 0
      ? db.select().from(clientsTable).where(and(inArray(clientsTable.id, clientIds), eq(clientsTable.workspaceId, wid)))
      : Promise.resolve([]),
    projectIds.length > 0
      ? db.select().from(projectsTable).where(and(inArray(projectsTable.id, projectIds), eq(projectsTable.workspaceId, wid)))
      : Promise.resolve([]),
  ]);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.companyName]));
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  res.json(
    tasks.map((t) => ({
      ...t,
      clientName: t.clientId ? (clientMap[t.clientId] ?? null) : null,
      projectName: t.projectId ? (projectMap[t.projectId] ?? null) : null,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [task] = await db
    .insert(tasksTable)
    .values({ ...parsed.data, workspaceId: wid })
    .returning();

  await db.insert(activityTable).values({
    type: "task_created",
    entityType: "task",
    entityId: task.id,
    description: `Task "${task.title}" created`,
    clientId: task.clientId ?? null,
    workspaceId: wid,
  });

  void createNotification(
    {
      type: "task_created",
      title: "Task created",
      message: `Task "${task.title}" (${task.priority} priority) has been added.`,
      entityType: "task",
      entityId: task.id,
      href: `/tasks`,
    },
    wid,
  );

  const [clients, projects] = await Promise.all([
    task.clientId
      ? db.select().from(clientsTable).where(and(eq(clientsTable.id, task.clientId), eq(clientsTable.workspaceId, wid)))
      : Promise.resolve([]),
    task.projectId
      ? db.select().from(projectsTable).where(and(eq(projectsTable.id, task.projectId), eq(projectsTable.workspaceId, wid)))
      : Promise.resolve([]),
  ]);

  res.status(201).json({
    ...task,
    clientName: clients[0]?.companyName ?? null,
    projectName: projects[0]?.name ?? null,
    createdAt: task.createdAt.toISOString(),
  });
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [task] = await db
    .update(tasksTable)
    .set(parsed.data)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.workspaceId, wid)))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await db.insert(activityTable).values({
    type: "task_updated",
    entityType: "task",
    entityId: task.id,
    description: `Task "${task.title}" updated`,
    clientId: task.clientId ?? null,
    workspaceId: wid,
  });

  const [clients, projects] = await Promise.all([
    task.clientId
      ? db.select().from(clientsTable).where(and(eq(clientsTable.id, task.clientId), eq(clientsTable.workspaceId, wid)))
      : Promise.resolve([]),
    task.projectId
      ? db.select().from(projectsTable).where(and(eq(projectsTable.id, task.projectId), eq(projectsTable.workspaceId, wid)))
      : Promise.resolve([]),
  ]);

  res.json({
    ...task,
    clientName: clients[0]?.companyName ?? null,
    projectName: projects[0]?.name ?? null,
    createdAt: task.createdAt.toISOString(),
  });
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [task] = await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.workspaceId, wid)))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
