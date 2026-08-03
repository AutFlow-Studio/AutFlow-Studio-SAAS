import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  ListTimeEntriesQueryParams,
  CreateTimeEntryBody,
  UpdateTimeEntryParams,
  UpdateTimeEntryBody,
  DeleteTimeEntryParams,
} from "@workspace/api-zod";
import { db, timeEntriesTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

async function withProjectName(
  entry: typeof timeEntriesTable.$inferSelect,
  wid: number,
): Promise<object> {
  let projectName: string | null = null;
  if (entry.projectId) {
    const [project] = await db
      .select({ name: projectsTable.name })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, entry.projectId), eq(projectsTable.workspaceId, wid)));
    projectName = project?.name ?? null;
  }
  return {
    ...entry,
    projectName,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

router.get("/time-entries", async (req, res): Promise<void> => {
  const parsed = ListTimeEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;
  const { projectId } = parsed.data;

  const conditions = [eq(timeEntriesTable.workspaceId, wid)];
  if (projectId) conditions.push(eq(timeEntriesTable.projectId, projectId));

  const entries = await db
    .select({
      id: timeEntriesTable.id,
      projectId: timeEntriesTable.projectId,
      date: timeEntriesTable.date,
      durationMinutes: timeEntriesTable.durationMinutes,
      notes: timeEntriesTable.notes,
      createdAt: timeEntriesTable.createdAt,
      updatedAt: timeEntriesTable.updatedAt,
      workspaceId: timeEntriesTable.workspaceId,
      projectName: projectsTable.name,
    })
    .from(timeEntriesTable)
    .leftJoin(
      projectsTable,
      and(
        eq(timeEntriesTable.projectId, projectsTable.id),
        eq(projectsTable.workspaceId, wid),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(timeEntriesTable.date), desc(timeEntriesTable.createdAt));

  res.json(
    entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  );
});

router.post("/time-entries", async (req, res): Promise<void> => {
  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [entry] = await db
    .insert(timeEntriesTable)
    .values({ ...parsed.data, workspaceId: wid })
    .returning();

  res.status(201).json(await withProjectName(entry, wid));
});

router.patch("/time-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateTimeEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [entry] = await db
    .update(timeEntriesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(timeEntriesTable.id, params.data.id), eq(timeEntriesTable.workspaceId, wid)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }

  res.json(await withProjectName(entry, wid));
});

router.delete("/time-entries/:id", async (req, res): Promise<void> => {
  const params = DeleteTimeEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [entry] = await db
    .delete(timeEntriesTable)
    .where(and(eq(timeEntriesTable.id, params.data.id), eq(timeEntriesTable.workspaceId, wid)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
