import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, clientsTable, projectsTable, activityTable, notificationsTable } from "@workspace/db";
import { requireOwner, requireAuth } from "../middleware/auth";
import { exec } from "child_process";
import path from "path";

const router: IRouter = Router();

// POST /api/admin/reset — truncate this workspace's business data
router.post("/admin/reset", requireOwner, async (req, res): Promise<void> => {
  const { confirmationPhrase } = req.body as { confirmationPhrase?: string };
  if (confirmationPhrase !== "DELETE ALL DATA") {
    res.status(422).json({
      error: 'Confirmation phrase does not match. Send { confirmationPhrase: "DELETE ALL DATA" }.',
    });
    return;
  }

  const wid = req.session.workspaceId!;

  // Delete workspace-scoped data only (preserves other workspaces)
  await db.execute(sql`
    DELETE FROM activity     WHERE workspace_id = ${wid};
    DELETE FROM notifications WHERE workspace_id = ${wid};
    DELETE FROM meetings     WHERE workspace_id = ${wid};
    DELETE FROM notes        WHERE workspace_id = ${wid};
    DELETE FROM tasks        WHERE workspace_id = ${wid};
    DELETE FROM deliverables WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id = ${wid}
    );
    DELETE FROM documents    WHERE workspace_id = ${wid};
    DELETE FROM payments     WHERE workspace_id = ${wid};
    DELETE FROM projects     WHERE workspace_id = ${wid};
    DELETE FROM clients      WHERE workspace_id = ${wid};
  `);

  res.json({ success: true });
});

// POST /api/admin/seed-demo — loads demo data for this workspace
router.post("/admin/seed-demo", requireAuth, async (req, res): Promise<void> => {
  const workspaceRoot = path.resolve(process.cwd(), "../..");
  const wid = req.session.workspaceId!;

  exec(
    `pnpm --filter @workspace/scripts run seed`,
    {
      cwd: workspaceRoot,
      timeout: 60000,
      env: { ...process.env, SEED_WORKSPACE_ID: String(wid) },
    },
    (err, _stdout, stderr) => {
      if (err) {
        res.status(500).json({ error: "Demo data load failed", details: stderr.slice(0, 500) });
        return;
      }
      res.json({ success: true });
    },
  );
});

export default router;
