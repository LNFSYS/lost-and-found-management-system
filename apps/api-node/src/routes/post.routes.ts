import { Router } from "express";
import { claimController } from "../controllers/claim.controller.js";
import { mediaController } from "../controllers/media.controller.js";
import { postController } from "../controllers/post.controller.js";
import { requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";

export const postRoutes = Router();
export const searchRoutes = Router();

postRoutes.post("/", requireAuth, (request, response, next) => {
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

postRoutes.post("/:id/matches/re-run", requireAuth, requireAnyRole(["ADMIN"]), (request, response, next) => {
  postController.rerunMatches(request, response).catch(next);
});

postRoutes.get("/:id", (request, response, next) => {
  postController.detail(request, response).catch(next);
});

postRoutes.put("/:id", requireAuth, (request, response, next) => {
  postController.update(request, response).catch(next);
});

postRoutes.patch("/:id/status", requireAuth, (request, response, next) => {
  postController.updateStatus(request, response).catch(next);
});

postRoutes.post("/:id/report", requireAuth, (request, response, next) => {
  postController.report(request, response).catch(next);
});

postRoutes.post(
  "/:id/media",
  requireAuth,
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
