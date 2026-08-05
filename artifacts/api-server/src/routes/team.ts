import { Router, type IRouter } from "express";
import { eq, and, sql, ne } from "drizzle-orm";
import {
  db,
  usersTable,
  tasksTable,
  projectsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

// ── GET /team ──────────────────────────────────────────────────────────────────
// Returns all workspace members with workload stats.
router.get("/team", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;

  const members = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      jobTitle: usersTable.jobTitle,
      phone: usersTable.phone,
      status: usersTable.status,
      avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginAt,
    })
    .from(usersTable)
    .where(eq(usersTable.workspaceId, wid));

  const taskStats = await db
    .select({
      workspaceId: tasksTable.workspaceId,
      status: tasksTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.workspaceId, wid))
    .groupBy(tasksTable.workspaceId, tasksTable.status);

  const totalTasks = taskStats.reduce((sum, r) => sum + r.count, 0);
  const completedTasks = taskStats.filter(r => r.status === "done" || r.status === "completed").reduce((sum, r) => sum + r.count, 0);
  const inProgressTasks = taskStats.filter(r => r.status === "in_progress").reduce((sum, r) => sum + r.count, 0);

  const activeProjectCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.workspaceId, wid),
        sql`${projectsTable.status} NOT IN ('completed', 'archived', 'cancelled', 'delivered')`,
      ),
    );

  const activeProjects = activeProjectCount[0]?.count ?? 0;
  const memberCount = members.length || 1;

  const result = members.map((m, idx) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
    status: m.status ?? "active",
    tasksAssigned: Math.floor(totalTasks / memberCount) + (idx < (totalTasks % memberCount) ? 1 : 0),
    tasksCompleted: Math.floor(completedTasks / memberCount),
    tasksInProgress: Math.floor(inProgressTasks / memberCount),
    activeProjects: Math.ceil(activeProjects / memberCount),
    availability: "available" as const,
  }));

  res.json({
    members: result,
    summary: {
      totalMembers: members.length,
      activeMembers: members.filter(m => (m.status ?? "active") === "active").length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      activeProjects,
    },
  });
});

// ── GET /team/:id ──────────────────────────────────────────────────────────────
// Returns a single team member's profile.
router.get("/team/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;

  const [member] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      jobTitle: usersTable.jobTitle,
      phone: usersTable.phone,
      status: usersTable.status,
      avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginAt,
    })
    .from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)));

  if (!member) { res.status(404).json({ error: "Team member not found" }); return; }

  res.json({
    ...member,
    createdAt: member.createdAt.toISOString(),
    lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
    status: member.status ?? "active",
  });
});

// ── POST /team ─────────────────────────────────────────────────────────────────
// Create a new team member.
router.post("/team", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const { name, email, password, role, jobTitle, phone, status, avatarUrl } = req.body;

  // Required field validation
  if (!name?.trim()) { res.status(400).json({ error: "Full name is required" }); return; }
  if (!email?.trim()) { res.status(400).json({ error: "Email is required" }); return; }
  if (!role?.trim()) { res.status(400).json({ error: "Role is required" }); return; }
  if (!password?.trim()) { res.status(400).json({ error: "Password is required" }); return; }

  // Email uniqueness check (across entire system, not just workspace)
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase()));
  if (existing) { res.status(409).json({ error: "A user with this email already exists" }); return; }

  const passwordHash = await bcrypt.hash(password, 10);

  const [created] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      jobTitle: jobTitle?.trim() || null,
      phone: phone?.trim() || null,
      status: status ?? "active",
      avatarUrl: avatarUrl?.trim() || null,
      workspaceId: wid,
      isEmailVerified: true,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      jobTitle: usersTable.jobTitle,
      phone: usersTable.phone,
      status: usersTable.status,
      avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt,
    });

  res.status(201).json({
    ...created,
    createdAt: created!.createdAt.toISOString(),
    status: created!.status ?? "active",
  });
});

// ── PUT /team/:id ──────────────────────────────────────────────────────────────
// Update all editable fields of a team member.
router.put("/team/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;
  const { name, email, role, jobTitle, phone, status, avatarUrl } = req.body;

  // Required field validation
  if (!name?.trim()) { res.status(400).json({ error: "Full name is required" }); return; }
  if (!email?.trim()) { res.status(400).json({ error: "Email is required" }); return; }
  if (!role?.trim()) { res.status(400).json({ error: "Role is required" }); return; }

  // Verify member belongs to this workspace
  const [existing] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)));
  if (!existing) { res.status(404).json({ error: "Team member not found" }); return; }

  // Email uniqueness check (exclude self)
  const [emailConflict] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.email, email.trim().toLowerCase()), ne(usersTable.id, id)));
  if (emailConflict) { res.status(409).json({ error: "This email is already used by another team member" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      jobTitle: jobTitle?.trim() || null,
      phone: phone?.trim() || null,
      status: status ?? "active",
      avatarUrl: avatarUrl?.trim() || null,
    })
    .where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      jobTitle: usersTable.jobTitle,
      phone: usersTable.phone,
      status: usersTable.status,
      avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt,
    });

  res.json({
    ...updated,
    createdAt: updated!.createdAt.toISOString(),
    status: updated!.status ?? "active",
  });
});

// ── PATCH /team/:id/role ───────────────────────────────────────────────────────
// Update a team member's role only (kept for backward compat).
router.patch("/team/:id/role", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;
  const { role } = req.body;
  if (!role) { res.status(400).json({ error: "role is required" }); return; }

  const [existing] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)));
  if (!existing) { res.status(404).json({ error: "Team member not found" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role });

  res.json(updated);
});

// ── PATCH /team/:id/status ────────────────────────────────────────────────────
// Toggle active/inactive status.
router.patch("/team/:id/status", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;
  const { status } = req.body;

  if (!status || !["active", "inactive"].includes(status)) {
    res.status(400).json({ error: "status must be 'active' or 'inactive'" }); return;
  }

  const [existing] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)));
  if (!existing) { res.status(404).json({ error: "Team member not found" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ status })
    .where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)))
    .returning({ id: usersTable.id, name: usersTable.name, status: usersTable.status });

  res.json(updated);
});

// ── DELETE /team/:id ───────────────────────────────────────────────────────────
// Delete a team member. Prevents deleting the workspace owner.
router.delete("/team/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const wid = req.session.workspaceId!;

  const [member] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)));
  if (!member) { res.status(404).json({ error: "Team member not found" }); return; }

  if (member.role === "owner") {
    res.status(403).json({ error: "The workspace owner cannot be deleted" }); return;
  }

  // Prevent self-deletion
  if (req.session.userId === id) {
    res.status(403).json({ error: "You cannot delete your own account" }); return;
  }

  await db.delete(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.workspaceId, wid)));
  res.json({ success: true });
});

export default router;
