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

claimRoutes.get("/:id/verification", requireAuth, (request, response, next) => {
  claimController.verification(request, response).catch(next);
});

claimRoutes.patch("/:id/more-info", requireAuth, (request, response, next) => {
  claimController.requestMoreInfo(request, response).catch(next);
});

claimRoutes.patch("/:id/accept", requireAuth, (request, response, next) => {
  claimController.accept(request, response).catch(next);
});

claimRoutes.patch("/:id/reject", requireAuth, (request, response, next) => {
  claimController.reject(request, response).catch(next);
});

claimRoutes.patch("/:id/cancel", requireAuth, (request, response, next) => {
  claimController.cancel(request, response).catch(next);
});

claimRoutes.post("/:id/evidence", requireAuth, memoryUpload.single("evidence"), (request, response, next) => {
  mediaController.claimEvidence(request, response).catch(next);
});

claimRoutes.post("/:id/chat-image", requireAuth, memoryUpload.single("image"), (request, response, next) => {
  mediaController.claimChatImage(request, response).catch(next);
});
