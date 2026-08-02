import { Router } from "express";
import { visualHuntController } from "../controllers/visual-hunt.controller.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";
import { requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";
import { requireFeatureFlag } from "../middlewares/feature-flag.middleware.js";

export const visualHuntRoutes = Router();
const visualHuntLimit = rateLimit({ keyPrefix: "visual-hunt", windowMs: 10 * 60 * 1000, max: 20 });
const visualHuntEnabled = requireFeatureFlag("ai.visual_hunt_enabled");

visualHuntRoutes.use(requireAuth, requireAnyRole(["STAFF", "ADMIN"]));

visualHuntRoutes.post("/", visualHuntLimit, visualHuntEnabled, memoryUpload.single("image"), (request, response, next) => {
  visualHuntController.search(request, response).catch(next);
});

visualHuntRoutes.post("/feedback", visualHuntLimit, visualHuntEnabled, (request, response, next) => {
  visualHuntController.feedback(request, response).catch(next);
});
