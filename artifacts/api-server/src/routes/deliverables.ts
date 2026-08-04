import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, deliverablesTable, activityTable, projectsTable } from "@workspace/db";
import {
  ListDeliverablesParams,
  CreateDeliverableParams,
  CreateDeliverableBody,
  UpdateDeliverableParams,
  UpdateDeliverableBody,
  DeleteDeliverableParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapDeliverable(d: typeof deliverablesTable.$inferSelect) {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/**
 * Verify that a project belongs to the given workspace.
 * Returns the project row or null.
 */
async function getProjectForWorkspace(projectId: number, workspaceId: number) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.workspaceId, workspaceId)));
  return project ?? null;
}

router.get("/projects/:projectId/deliverables", async (req, res): Promise<void> => {
  const params = ListDeliverablesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const project = await getProjectForWorkspace(params.data.projectId, wid);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const deliverables = await db
    .select()
    .from(deliverablesTable)
    .where(eq(deliverablesTable.projectId, params.data.projectId))
    .orderBy(deliverablesTable.createdAt);

  res.json(deliverables.map(mapDeliverable));
});

router.post("/projects/:projectId/deliverables", async (req, res): Promise<void> => {
  const params = CreateDeliverableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateDeliverableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const project = await getProjectForWorkspace(params.data.projectId, wid);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [deliverable] = await db
    .insert(deliverablesTable)
    .values({
      ...parsed.data,
      projectId: params.data.projectId,
      workspaceId: wid,
      status: parsed.data.status ?? "draft",
      revisionCount: 0,
    })
    .returning();

  await db.insert(activityTable).values({
    type: "deliverable_created",
    entityType: "deliverable",
    entityId: deliverable.id,
    description: `Deliverable "${deliverable.title}" added to project "${project.name}"`,
    clientId: project.clientId ?? null,
    workspaceId: wid,
  });

  res.status(201).json(mapDeliverable(deliverable));
});

router.patch("/deliverables/:id", async (req, res): Promise<void> => {
  const params = UpdateDeliverableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDeliverableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  // Verify the deliverable's parent project belongs to this workspace
  const [existing] = await db
    .select({ deliverable: deliverablesTable, projectName: projectsTable.name, clientId: projectsTable.clientId })
    .from(deliverablesTable)
    .innerJoin(projectsTable, eq(deliverablesTable.projectId, projectsTable.id))
    .where(
      and(
        eq(deliverablesTable.id, params.data.id),
        eq(projectsTable.workspaceId, wid),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Deliverable not found" });
    return;
  }

  const prev = existing.deliverable;
  const newStatus = parsed.data.status;
  const now = new Date();

  // Build the update payload with automatic workflow side-effects
  const updatePayload: Partial<typeof deliverablesTable.$inferInsert> & { updatedAt: Date } = {
    ...parsed.data,
    updatedAt: now,
  };

  // Status transition logic
  if (newStatus && newStatus !== prev.status) {
    if (newStatus === "changes_requested") {
      // Increment revision counter each time client requests changes
      updatePayload.revisionCount = (prev.revisionCount ?? 0) + 1;
    }
    if (newStatus === "approved") {
      // Record who approved and when
      updatePayload.approvalDate = now.toISOString().split("T")[0]!;
      if (!updatePayload.approvedBy && req.session.userId) {
        updatePayload.approvedBy = `User #${req.session.userId}`;
      }
    }
    if (newStatus === "completed") {
      // Auto-set completion date if not already provided
      if (!updatePayload.completionDate) {
        updatePayload.completionDate = now.toISOString().split("T")[0]!;
      }
    }
  }

  const [deliverable] = await db
    .update(deliverablesTable)
    .set(updatePayload)
    .where(eq(deliverablesTable.id, params.data.id))
    .returning();

  if (!deliverable) {
    res.status(404).json({ error: "Deliverable not found" });
    return;
  }

  // Log status transitions as activity
  if (newStatus && newStatus !== prev.status) {
    const statusLabels: Record<string, string> = {
      draft: "Draft",
      internal_review: "Internal Review",
      sent: "Sent to Client",
      approved: "Approved",
      changes_requested: "Changes Requested",
      completed: "Completed",
    };
    await db.insert(activityTable).values({
      type: "deliverable_updated",
      entityType: "deliverable",
      entityId: deliverable.id,
      description: `Deliverable "${deliverable.title}" moved to ${statusLabels[newStatus] ?? newStatus}`,
      clientId: existing.clientId ?? null,
      workspaceId: wid,
    });
  }

  res.json(mapDeliverable(deliverable));
});

router.delete("/deliverables/:id", async (req, res): Promise<void> => {
  const params = DeleteDeliverableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  // Verify the deliverable's parent project belongs to this workspace
  const [existing] = await db
    .select({ deliverable: deliverablesTable })
    .from(deliverablesTable)
    .innerJoin(projectsTable, eq(deliverablesTable.projectId, projectsTable.id))
    .where(
      and(
        eq(deliverablesTable.id, params.data.id),
        eq(projectsTable.workspaceId, wid),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Deliverable not found" });
    return;
  }

  await db
    .delete(deliverablesTable)
    .where(eq(deliverablesTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
