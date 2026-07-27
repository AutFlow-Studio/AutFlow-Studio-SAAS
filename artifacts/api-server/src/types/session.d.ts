import "express-session";

declare module "express-session" {
  interface SessionData {
    // ── Team / agency user ────────────────────────────────────────────────────
    userId: number;
    userRole: string;
    userName: string;
    userEmail: string;
    workspaceId: number;
    isEmailVerified: boolean;

    // ── Client portal user ───────────────────────────────────────────────────
    clientPortalUserId: number;
    clientPortalClientId: number;
    clientPortalWorkspaceId: number;
    clientPortalUserName: string;
  }
}
