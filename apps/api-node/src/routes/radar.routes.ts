import { Router } from "express";
import { radarController } from "../controllers/radar.controller.js";
import { requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";
import { requireFeatureFlag } from "../middlewares/feature-flag.middleware.js";

export const radarRoutes = Router();
const requireStaffOrAdmin = requireAnyRole(["STAFF", "ADMIN"]);
const requireAdmin = requireAnyRole(["ADMIN"]);
const radarWriteLimit = rateLimit({
  keyPrefix: "campus-radar-write",
  windowMs: 10 * 60 * 1000,
  max: 30,
  key: (request) => request.auth?.sub ?? request.ip ?? "unknown"
});
const radarReadLimit = rateLimit({ keyPrefix: "campus-radar-read", windowMs: 10 * 60 * 1000, max: 120 });
const radarEnabled = requireFeatureFlag("ai.campus_radar_enabled");

radarRoutes.use(requireAuth);

radarRoutes.get("/events", requireStaffOrAdmin, radarReadLimit, radarEnabled, (request, response, next) => {
  radarController.listEvents(request, response).catch(next);
});

radarRoutes.post("/events", requireAdmin, radarWriteLimit, radarEnabled, (request, response, next) => {
  radarController.createEvent(request, response).catch(next);
});

radarRoutes.post("/events/:id/analyze", requireAdmin, radarWriteLimit, radarEnabled, (request, response, next) => {
  radarController.analyzeEvent(request, response).catch(next);
});

radarRoutes.get("/alerts", requireStaffOrAdmin, radarReadLimit, radarEnabled, (request, response, next) => {
  radarController.listAlerts(request, response).catch(next);
});

radarRoutes.get("/alerts/:id/posts", requireStaffOrAdmin, radarReadLimit, radarEnabled, (request, response, next) => {
  radarController.relatedPosts(request, response).catch(next);
});

radarRoutes.patch("/alerts/:id/status", requireStaffOrAdmin, radarWriteLimit, radarEnabled, (request, response, next) => {
  radarController.updateAlertStatus(request, response).catch(next);
});

radarRoutes.get("/audit", requireAdmin, radarReadLimit, radarEnabled, (request, response, next) => {
  radarController.audit(request, response).catch(next);
});
