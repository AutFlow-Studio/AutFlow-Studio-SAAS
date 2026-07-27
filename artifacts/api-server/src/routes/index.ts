import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { apiRateLimiter } from "../middleware/rate-limit";
import healthRouter from "./health";
import authRouter from "./auth";
import portalRouter from "./portal";
import storageRouter from "./storage";
import settingsApiRouter from "./settings-api";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import deliverablesRouter from "./deliverables";
import paymentsRouter from "./payments";
import documentsRouter from "./documents";
import notesRouter from "./notes";
import meetingsRouter from "./meetings";
import tasksRouter from "./tasks";
import timelineRouter from "./timeline";
import activityRouter from "./activity";
import calendarRouter from "./calendar";
import searchRouter from "./search";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import adminRouter from "./admin";
import templatesRouter from "./templates";
import notificationsRouter from "./notifications";
import exportRouter from "./export";
import aiRouter from "./ai";

const router: IRouter = Router();

// ── Global rate limiter ───────────────────────────────────────────────────────
// Applied first so it covers both public and protected routes.
router.use(apiRateLimiter);

// ── Public routes (no authentication required) ───────────────────────────────
router.use(healthRouter);
router.use(authRouter);   // /auth/login, /auth/logout, /auth/me (me checks internally)

// ── Client portal routes ──────────────────────────────────────────────────────
// Mounted before the team auth gate — portal auth is handled internally by
// requireClientPortalAuth middleware on each protected portal endpoint.
// The portal-admin/* routes inside this router use requireAuth internally.
router.use(portalRouter);

// ── Auth gate ────────────────────────────────────────────────────────────────
// All routes mounted below this line require a valid team session.
router.use(requireAuth);

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(storageRouter);
router.use(settingsApiRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(deliverablesRouter);
router.use(paymentsRouter);
router.use(documentsRouter);
router.use(notesRouter);
router.use(meetingsRouter);
router.use(tasksRouter);
router.use(timelineRouter);
router.use(activityRouter);
router.use(calendarRouter);
router.use(searchRouter);
router.use(reportsRouter);
router.use(adminRouter);
router.use(templatesRouter);
router.use(notificationsRouter);
router.use(exportRouter);
router.use(aiRouter);

export default router;
