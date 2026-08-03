import { Router } from "express";
import { claimController } from "../controllers/claim.controller.js";
import { mediaController } from "../controllers/media.controller.js";
import { postController } from "../controllers/post.controller.js";
import { verificationQuestionController } from "../controllers/verification-question.controller.js";
import { optionalAuth, requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";
import { requireFeatureFlag } from "../middlewares/feature-flag.middleware.js";
import { aiDraftController } from "../controllers/ai-draft.controller.js";
import { searchCompanionController } from "../controllers/search-companion.controller.js";
import { recoveryTimelineController } from "../controllers/recovery-timeline.controller.js";
import { finderQuickScanController } from "../controllers/finder-quick-scan.controller.js";

export const postRoutes = Router();
export const searchRoutes = Router();
const postWriteLimit = rateLimit({ keyPrefix: "post-write", windowMs: 10 * 60 * 1000, max: 30 });
const postUploadLimit = rateLimit({ keyPrefix: "post-upload", windowMs: 10 * 60 * 1000, max: 15 });
const verificationQuestionsEnabled = requireFeatureFlag("ai.verification_questions_enabled");
const quickDraftEnabled = requireFeatureFlag("ai.quick_post_draft_enabled");
const searchCompanionEnabled = requireFeatureFlag("ai.search_companion_enabled");
const recoveryTimelineEnabled = requireFeatureFlag("recovery.timeline_enabled");
const finderQuickScanEnabled = requireFeatureFlag("ai.finder_quick_scan_enabled");

postRoutes.post("/ai-draft", requireAuth, postUploadLimit, quickDraftEnabled, memoryUpload.single("image"), (request, response, next) => {
  aiDraftController.create(request, response).catch(next);
});

postRoutes.post("/finder-quick-scan", requireAuth, postUploadLimit, finderQuickScanEnabled, memoryUpload.single("image"), (request, response, next) => {
  finderQuickScanController.scan(request, response).catch(next);
});

postRoutes.post("/finder-quick-scan/:sessionId/create-draft", requireAuth, postWriteLimit, finderQuickScanEnabled, (request, response, next) => {
  finderQuickScanController.createDraft(request, response).catch(next);
});

postRoutes.post("/finder-quick-scan/:sessionId/publish", requireAuth, postWriteLimit, finderQuickScanEnabled, (request, response, next) => {
  finderQuickScanController.publish(request, response).catch(next);
});

postRoutes.post("/", requireAuth, postWriteLimit, (request, response, next) => {
  postController.create(request, response).catch(next);
});

postRoutes.get("/", optionalAuth, (request, response, next) => {
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

postRoutes.get("/:id/search-companion", requireAuth, searchCompanionEnabled, (request, response, next) => {
  searchCompanionController.get(request, response).catch(next);
});

postRoutes.post("/:id/search-companion/answers", requireAuth, postWriteLimit, searchCompanionEnabled, (request, response, next) => {
  searchCompanionController.answer(request, response).catch(next);
});

postRoutes.post("/:id/search-companion/skip", requireAuth, postWriteLimit, searchCompanionEnabled, (request, response, next) => {
  searchCompanionController.skip(request, response).catch(next);
});

postRoutes.post("/:id/search-companion/undo", requireAuth, postWriteLimit, searchCompanionEnabled, (request, response, next) => {
  searchCompanionController.undo(request, response).catch(next);
});

postRoutes.post("/:id/search-companion/recalculate", requireAuth, postWriteLimit, searchCompanionEnabled, (request, response, next) => {
  searchCompanionController.recalculate(request, response).catch(next);
});

postRoutes.post("/:id/search-companion/apply", requireAuth, postWriteLimit, searchCompanionEnabled, (request, response, next) => {
  searchCompanionController.apply(request, response).catch(next);
});

postRoutes.get("/:id/recovery-timeline", requireAuth, recoveryTimelineEnabled, (request, response, next) => {
  recoveryTimelineController.get(request, response).catch(next);
});

postRoutes.post("/:id/verification-questions/suggest", requireAuth, postWriteLimit, verificationQuestionsEnabled, (request, response, next) => {
  verificationQuestionController.suggest(request, response).catch(next);
});

postRoutes.get("/:id/verification-questions", requireAuth, verificationQuestionsEnabled, (request, response, next) => {
  verificationQuestionController.listForPost(request, response).catch(next);
});

postRoutes.post("/:id/verification-questions", requireAuth, postWriteLimit, verificationQuestionsEnabled, (request, response, next) => {
  verificationQuestionController.create(request, response).catch(next);
});

postRoutes.patch("/:id/verification-questions/:questionId/status", requireAuth, postWriteLimit, verificationQuestionsEnabled, (request, response, next) => {
  verificationQuestionController.updateStatus(request, response).catch(next);
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

postRoutes.get("/:id/media/:mediaId/image", requireAuth, (request, response, next) => {
  mediaController.postEvidenceImage(request, response).catch(next);
});

postRoutes.delete("/:id", requireAuth, (request, response, next) => {
  postController.remove(request, response).catch(next);
});

searchRoutes.get("/", optionalAuth, (request, response, next) => {
  postController.search(request, response).catch(next);
});
