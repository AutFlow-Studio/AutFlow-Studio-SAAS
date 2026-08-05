import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/**
 * Middleware: require the request to have an authenticated session.
 * Returns 401 if no session user is present.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      name: usersTable.name,
      email: usersTable.email,
      workspaceId: usersTable.workspaceId,
      isEmailVerified: usersTable.isEmailVerified,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user || !user.workspaceId) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Rehydrate tenant identity from the database on every authenticated request.
  // This prevents stale or tampered session workspace data from crossing tenants.
  req.session.userRole = user.role;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.workspaceId = user.workspaceId;
  req.session.isEmailVerified = user.isEmailVerified;
  next();
}

/**
 * Middleware: require the authenticated user to have verified their email.
 * Returns 401 if not authenticated, 403 if authenticated but unverified.
 */
export function requireVerified(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!req.session.isEmailVerified) {
    res.status(403).json({ error: "Email verification required" });
    return;
  }
  next();
}

/**
 * Middleware: require the authenticated user to have the "owner" role.
 * Returns 401 if not authenticated, 403 if authenticated but not owner.
 */
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.session.userRole !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  next();
}

/**
 * Middleware: require the request to have an authenticated CLIENT PORTAL session.
 * Client portal sessions are completely separate from team sessions.
 */
export function requireClientPortalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.clientPortalUserId) {
    res.status(401).json({ error: "Client portal authentication required" });
    return;
  }
  next();
}
