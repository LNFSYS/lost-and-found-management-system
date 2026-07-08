import { Router } from "express";
import { claimController } from "../controllers/claim.controller.js";
import { mediaController } from "../controllers/media.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";

export const claimRoutes = Router();
const claimWriteLimit = rateLimit({ keyPrefix: "claim-write", windowMs: 10 * 60 * 1000, max: 30 });
const claimUploadLimit = rateLimit({ keyPrefix: "claim-upload", windowMs: 10 * 60 * 1000, max: 15 });

claimRoutes.post("/", requireAuth, claimWriteLimit, (request, response, next) => {
  claimController.create(request, response).catch(next);
});

claimRoutes.get("/:id", requireAuth, (request, response, next) => {
  claimController.detail(request, response).catch(next);
});

claimRoutes.get("/:id/verification", requireAuth, (request, response, next) => {
  claimController.verification(request, response).catch(next);
});

claimRoutes.patch("/:id/more-info", requireAuth, claimWriteLimit, (request, response, next) => {
  claimController.requestMoreInfo(request, response).catch(next);
});

claimRoutes.patch("/:id/accept", requireAuth, claimWriteLimit, (request, response, next) => {
  claimController.accept(request, response).catch(next);
});

claimRoutes.patch("/:id/reject", requireAuth, claimWriteLimit, (request, response, next) => {
  claimController.reject(request, response).catch(next);
});

claimRoutes.patch("/:id/cancel", requireAuth, claimWriteLimit, (request, response, next) => {
  claimController.cancel(request, response).catch(next);
});

claimRoutes.post("/:id/evidence", requireAuth, claimUploadLimit, memoryUpload.single("evidence"), (request, response, next) => {
  mediaController.claimEvidence(request, response).catch(next);
});

claimRoutes.get("/:id/evidence/:evidenceId/image", requireAuth, (request, response, next) => {
  mediaController.claimEvidenceImage(request, response).catch(next);
});

claimRoutes.post("/:id/chat-image", requireAuth, claimUploadLimit, memoryUpload.single("image"), (request, response, next) => {
  mediaController.claimChatImage(request, response).catch(next);
});

claimRoutes.get("/:id/chat-image", requireAuth, (request, response, next) => {
  mediaController.claimChatImageFile(request, response).catch(next);
});
