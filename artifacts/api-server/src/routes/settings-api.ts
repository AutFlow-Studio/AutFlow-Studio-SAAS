import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, agencySettingsTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const SUPPORTED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "INR", "BRL", "MXN", "SGD", "ZAR",
]);

function parseServices(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Get or create the workspace's agency settings row. */
async function getOrCreateSettings(workspaceId: number) {
  const [existing] = await db
    .select()
    .from(agencySettingsTable)
    .where(eq(agencySettingsTable.workspaceId, workspaceId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(agencySettingsTable)
    .values({ workspaceId })
    .returning();
  return created;
}

// GET /api/settings/agency
router.get("/settings/agency", requireAuth, async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings(req.session.workspaceId!);
  res.json({
    ...settings,
    mainServices: parseServices(settings.mainServices),
    taxRate: settings.taxRate ? Number(settings.taxRate) : 0,
  });
});

// PUT /api/settings/agency
router.put("/settings/agency", requireAuth, async (req, res): Promise<void> => {
  const {
    agencyName,
    agencyEmail,
    website,
    supportEmail,
    logoUrl,
    businessType,
    agencyType,
    teamSize,
    mainServices,
    activeClientCount,
    defaultCurrency,
    timezone,
    invoicePrefix,
    paymentTermsDays,
    taxRate,
    notifyInvoicePaid,
    notifyDeadlineApproaching,
    notifyWeeklyDigest,
    onboardingCompleted,
  } = req.body ?? {};

  const updates: Record<string, unknown> = {};
  if (agencyName !== undefined) {
    const normalizedName = String(agencyName).trim();
    if (!normalizedName) {
      res.status(400).json({ error: "Agency name cannot be blank" });
      return;
    }
    updates.agencyName = normalizedName;
  }
  if (agencyEmail !== undefined) updates.agencyEmail = String(agencyEmail).trim();
  if (website !== undefined) updates.website = website ? String(website).trim() : null;
  if (supportEmail !== undefined) updates.supportEmail = supportEmail ? String(supportEmail).trim() : null;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl ? String(logoUrl).trim() : null;
  if (businessType !== undefined) updates.businessType = businessType ? String(businessType).trim() : null;
  if (agencyType !== undefined) updates.agencyType = agencyType ? String(agencyType).trim() : null;
  if (teamSize !== undefined) updates.teamSize = teamSize ? String(teamSize).trim() : null;
  if (mainServices !== undefined) {
    if (mainServices !== null && !Array.isArray(mainServices)) {
      res.status(400).json({ error: "Services must be a list" });
      return;
    }
    updates.mainServices = mainServices?.length ? JSON.stringify(mainServices) : null;
  }
  if (activeClientCount !== undefined) updates.activeClientCount = activeClientCount ? String(activeClientCount).trim() : null;
  if (defaultCurrency !== undefined) {
    const normalizedCurrency = String(defaultCurrency).trim().toUpperCase();
    if (!SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
      res.status(400).json({ error: "Unsupported currency" });
      return;
    }
    updates.defaultCurrency = normalizedCurrency;
  }
  if (timezone !== undefined) updates.timezone = String(timezone).trim();
  if (invoicePrefix !== undefined) updates.invoicePrefix = String(invoicePrefix).trim();
  if (paymentTermsDays !== undefined) updates.paymentTermsDays = Number(paymentTermsDays);
  if (taxRate !== undefined) updates.taxRate = String(Number(taxRate));
  if (notifyInvoicePaid !== undefined) updates.notifyInvoicePaid = Boolean(notifyInvoicePaid);
  if (notifyDeadlineApproaching !== undefined) updates.notifyDeadlineApproaching = Boolean(notifyDeadlineApproaching);
  if (notifyWeeklyDigest !== undefined) updates.notifyWeeklyDigest = Boolean(notifyWeeklyDigest);
  if (onboardingCompleted !== undefined) updates.onboardingCompleted = Boolean(onboardingCompleted);

  const existing = await getOrCreateSettings(req.session.workspaceId!);
  const [updated] = await db
    .update(agencySettingsTable)
    .set(updates)
    .where(eq(agencySettingsTable.id, existing.id))
    .returning();

  const result = updated ?? existing;
  res.json({
    ...result,
    mainServices: parseServices(result.mainServices),
    taxRate: result.taxRate ? Number(result.taxRate) : 0,
  });
});

export default router;
