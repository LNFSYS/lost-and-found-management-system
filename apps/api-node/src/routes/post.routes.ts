import { Router } from "express";
import { claimController } from "../controllers/claim.controller.js";
import { mediaController } from "../controllers/media.controller.js";
import { postController } from "../controllers/post.controller.js";
import { optionalAuth, requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";

export const postRoutes = Router();
export const searchRoutes = Router();
const postWriteLimit = rateLimit({ keyPrefix: "post-write", windowMs: 10 * 60 * 1000, max: 30 });
const postUploadLimit = rateLimit({ keyPrefix: "post-upload", windowMs: 10 * 60 * 1000, max: 15 });

postRoutes.post("/", requireAuth, postWriteLimit, (request, response, next) => {
  postController.create(request, response).catch(next);
});

postRoutes.get("/", (request, response, next) => {
  postController.list(request, response).catch(next);
});

postRoutes.get("/my", requireAuth, (request, response, next) => {
  postController.myPosts(request, response).catch(next);
});

postRoutes.get("/my/match-suggestions", requireAuth, (request, response, next) => {
  postController.myMatchSuggestions(request, response).catch(next);
});

postRoutes.get("/:id/claims", requireAuth, (request, response, next) => {
  claimController.listForPost(request, response).catch(next);
});

postRoutes.get("/:id/matches", requireAuth, (request, response, next) => {
  postController.matches(request, response).catch(next);
});

postRoutes.get("/:id/matches/explanations", requireAuth, (request, response, next) => {
  postController.matchExplanations(request, response).catch(next);
});

postRoutes.post("/:id/matches/:matchId/feedback", requireAuth, (request, response, next) => {
  postController.matchFeedback(request, response).catch(next);
});

postRoutes.post("/:id/matches/re-run", requireAuth, requireAnyRole(["ADMIN"]), (request, response, next) => {
  postController.rerunMatches(request, response).catch(next);
});

postRoutes.get("/:id", optionalAuth, (request, response, next) => {
  postController.detail(request, response).catch(next);
});

postRoutes.put("/:id", requireAuth, postWriteLimit, (request, response, next) => {
  postController.update(request, response).catch(next);
});

postRoutes.patch("/:id/status", requireAuth, postWriteLimit, (request, response, next) => {
  postController.updateStatus(request, response).catch(next);
});

postRoutes.post("/:id/report", requireAuth, (request, response, next) => {
  postController.report(request, response).catch(next);
});

postRoutes.post(
  "/:id/media",
  requireAuth,
  postUploadLimit,
  memoryUpload.fields([
    { name: "images", maxCount: 5 },
    { name: "evidenceImages", maxCount: 5 }
  ]),
  (request, response, next) => {
  mediaController.postMedia(request, response).catch(next);
  }
);

postRoutes.delete("/:id/media/:mediaId", requireAuth, (request, response, next) => {
  mediaController.deletePostMedia(request, response).catch(next);
});

postRoutes.delete("/:id", requireAuth, (request, response, next) => {
  postController.remove(request, response).catch(next);
});

searchRoutes.get("/", (request, response, next) => {
  postController.search(request, response).catch(next);
});
