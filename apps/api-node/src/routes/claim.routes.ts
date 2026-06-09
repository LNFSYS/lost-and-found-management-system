import { Router } from "express";
import { claimController } from "../controllers/claim.controller.js";
import { mediaController } from "../controllers/media.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";

export const claimRoutes = Router();

claimRoutes.post("/", requireAuth, (request, response, next) => {
  claimController.create(request, response).catch(next);
});

claimRoutes.get("/:id", requireAuth, (request, response, next) => {
  claimController.detail(request, response).catch(next);
});

claimRoutes.post("/:id/evidence", requireAuth, memoryUpload.single("evidence"), (request, response, next) => {
  mediaController.claimEvidence(request, response).catch(next);
});
