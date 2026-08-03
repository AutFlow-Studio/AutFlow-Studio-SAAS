import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  ListMilestonesQueryParams,
  CreateMilestoneBody,
  UpdateMilestoneParams,
  UpdateMilestoneBody,
  DeleteMilestoneParams,
} from "@workspace/api-zod";
import { db, milestonesTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

async function withProjectName(
  ms: typeof milestonesTable.$inferSelect,
  wid: number,
): Promise<object> {
  let projectName: string | null = null;
  if (ms.projectId) {
    const [project] = await db
      .select({ name: projectsTable.name })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, ms.projectId), eq(projectsTable.workspaceId, wid)));
    projectName = project?.name ?? null;
  }
  return {
    ...ms,
    projectName,
    createdAt: ms.createdAt.toISOString(),
    updatedAt: ms.updatedAt.toISOString(),
  };
}

router.get("/milestones", async (req, res): Promise<void> => {
  const parsed = ListMilestonesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;
  const { projectId, status } = parsed.data;

  const conditions = [eq(milestonesTable.workspaceId, wid)];
  if (projectId) conditions.push(eq(milestonesTable.projectId, projectId));
  if (status) conditions.push(eq(milestonesTable.status, status));

  const milestones = await db
    .select({
      id: milestonesTable.id,
      projectId: milestonesTable.projectId,
      name: milestonesTable.name,
      description: milestonesTable.description,
      dueDate: milestonesTable.dueDate,
      status: milestonesTable.status,
      createdAt: milestonesTable.createdAt,
      updatedAt: milestonesTable.updatedAt,
      workspaceId: milestonesTable.workspaceId,
      projectName: projectsTable.name,
    })
    .from(milestonesTable)
    .leftJoin(
      projectsTable,
      and(
        eq(milestonesTable.projectId, projectsTable.id),
        eq(projectsTable.workspaceId, wid),
      ),
    )
    .where(and(...conditions))
    .orderBy(milestonesTable.dueDate, desc(milestonesTable.createdAt));

  res.json(
    milestones.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  );
});

router.post("/milestones", async (req, res): Promise<void> => {
  const parsed = CreateMilestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [ms] = await db
    .insert(milestonesTable)
    .values({ ...parsed.data, workspaceId: wid })
    .returning();

  res.status(201).json(await withProjectName(ms, wid));
});

router.patch("/milestones/:id", async (req, res): Promise<void> => {
  const params = UpdateMilestoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMilestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [ms] = await db
    .update(milestonesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(milestonesTable.id, params.data.id), eq(milestonesTable.workspaceId, wid)))
    .returning();

  if (!ms) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }

  res.json(await withProjectName(ms, wid));
});

router.delete("/milestones/:id", async (req, res): Promise<void> => {
  const params = DeleteMilestoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [ms] = await db
    .delete(milestonesTable)
    .where(and(eq(milestonesTable.id, params.data.id), eq(milestonesTable.workspaceId, wid)))
    .returning();

  if (!ms) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
