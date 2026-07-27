import { eq } from "drizzle-orm";
import { db, notificationsTable, agencySettingsTable } from "@workspace/db";
import type { InsertNotification } from "@workspace/db";

/**
 * Maps notification types to their corresponding agency settings preference field.
 * When a notification type is in this map, it will be skipped if the preference is disabled.
 */
const PREFERENCE_MAP: Partial<
  Record<string, keyof typeof agencySettingsTable.$inferSelect>
> = {
  invoice_paid: "notifyInvoicePaid",
  deadline_approaching: "notifyDeadlineApproaching",
  weekly_digest: "notifyWeeklyDigest",
};

/**
 * Fire-and-forget helper — inserts a workspace-scoped notification and never throws.
 * Respects workspace notification preferences: if the relevant preference is
 * disabled in agency_settings for this workspace, the notification is silently skipped.
 * Use after the primary mutation succeeds.
 */
export async function createNotification(
  data: InsertNotification,
  workspaceId: number,
): Promise<void> {
  try {
    const prefKey = PREFERENCE_MAP[data.type];
    if (prefKey) {
      const [settings] = await db
        .select()
        .from(agencySettingsTable)
        .where(eq(agencySettingsTable.workspaceId, workspaceId))
        .limit(1);
      if (settings && !settings[prefKey]) {
        // Preference disabled — skip creating this notification
        return;
      }
    }
    await db.insert(notificationsTable).values({ ...data, workspaceId });
  } catch (err) {
    // Non-fatal — log but don't propagate so the calling route isn't affected
    console.error("[notifications] failed to create notification:", err);
  }
}
