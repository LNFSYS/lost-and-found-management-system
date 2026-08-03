import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { finderQuickScanRepository, type FinderScanCandidateSnapshot } from "../repositories/finder-quick-scan.repository.js";
import { postRepository } from "../repositories/post.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { visualHuntRepository } from "../repositories/visual-hunt.repository.js";
import { HttpError } from "../utils/http-error.js";
import { redactedOcrTokens } from "../utils/pii-redaction.js";
import type { FinderPublishInput, FinderQuickScanInput } from "../validators/finder-quick-scan.validator.js";
import { assertImageFile, requireImageFile } from "./media.service.js";
import { matchingWorkerService } from "./matching-worker.service.js";
import { prepareCreatePostRecord } from "./post.service.js";
import { rankVisualHuntCandidates } from "./visual-hunt.service.js";
import { visionService, type VisionResult } from "./vision.service.js";
import { redactSensitiveOcr } from "./ai-draft.service.js";

const unsafeLikelihoods = new Set(["LIKELY", "VERY_LIKELY"]);

function unsafeContent(result: VisionResult) {
  return Object.values(result.safeSearch ?? {}).some((value) => value && unsafeLikelihoods.has(value));
}

function tier(score: number | null): FinderScanCandidateSnapshot["tier"] {
  if (score === null) return "FILTER_ONLY";
  if (score >= 0.85) return "HIGH_CONFIDENCE";
  if (score >= 0.75) return "NOTIFY";
  if (score >= 0.6) return "SUGGESTION";
  return "WEAK";
}

function canPrepareDraft(status: "ANALYZED" | "DRAFT_READY" | "PUBLISHED" | "EXPIRED") {
  return status === "ANALYZED" || status === "DRAFT_READY";
}

function candidateSnapshot(result: ReturnType<typeof rankVisualHuntCandidates>[number]): FinderScanCandidateSnapshot {
  return {
    postId: result.postId,
    score: result.similarityScore,
    tier: tier(result.similarityScore),
    title: result.title,
    category: result.category,
    area: result.area,
    building: result.building,
    lostFoundAt: result.lostFoundAt
  };
}

async function draftFromVision(vision: VisionResult) {
  const visualTags = vision.tags.filter((tag) => tag.source !== "OCR" && tag.confidence >= 0.45).slice(0, 8);
  const categoryCandidates = await postRepository.suggestCategoriesFromTags(vision.tags.map((tag) => tag.tag));
  const objectLabel = visualTags[0]?.tag?.trim() || "vật phẩm";
  const redactedOcr = redactSensitiveOcr(vision.ocrText);
  return {
    type: "FOUND" as const,
    title: `Nhặt được ${objectLabel}`.slice(0, 255),
    description: `Đã nhặt được ${objectLabel}; cần bổ sung đặc điểm, thời gian và nơi tìm thấy.`.slice(0, 2000),
    categoryCandidates,
    tags: visualTags,
    privacyWarnings: [
      ...(redactedOcr.includes("REDACTED") ? ["Ảnh có dữ liệu định danh hoặc mã dài; hãy che trước khi đăng công khai."] : []),
      "Ảnh chỉ được phân tích trong bộ nhớ và không được lưu trong scan session."
    ],
    missingFields: ["categoryId", "areaId hoặc vị trí", "lostFoundAt", "contactInfo", "handoverPointId hoặc nơi đang giữ"],
    userReviewRequired: true
  };
}

function publicSession(session: NonNullable<Awaited<ReturnType<typeof finderQuickScanRepository.findById>>>) {
  return {
    ...session,
    idempotencyKey: undefined,
    candidates: session.candidates.filter((candidate) => candidate.score === null || candidate.score >= 0.6),
    weakCandidateCount: session.candidates.filter((candidate) => candidate.score !== null && candidate.score >= 0.45 && candidate.score < 0.6).length,
    advisory: "Kết quả là AI-assisted suggestion. Human review required; hệ thống không tự xác nhận quyền sở hữu."
  };
}

export const finderQuickScanService = {
  async scan(auth: AccessTokenPayload, input: FinderQuickScanInput, file: Express.Multer.File | undefined) {
    const existing = await finderQuickScanRepository.findByIdempotencyKey(auth.sub, input.idempotencyKey);
    if (existing) return publicSession(existing);

    const image = requireImageFile(file, "image");
    await assertImageFile(image);
    try {
      const vision = await visionService.analyzeImageBuffer(image.buffer);
      if (vision.providerAvailable && unsafeContent(vision)) {
        throw new HttpError(422, "Image was rejected by Safe Search. Please choose a clear item photo.");
      }
      const visualSignals = vision.tags
        .filter((tag) => tag.source !== "OCR" && tag.confidence >= 0.5)
        .map((tag) => ({ tag: tag.tag, confidence: tag.confidence }));
      const ocrTokens = redactedOcrTokens(vision.ocrText);
      const hasSignals = visualSignals.length > 0 || ocrTokens.length > 0;
      const allowFilterFallback = Boolean(input.categoryId || input.areaId);
      const candidates = (!hasSignals && !allowFilterFallback)
        ? []
        : await visualHuntRepository.listCandidates({
            targetType: "LOST",
            categoryId: input.categoryId,
            areaId: input.areaId,
            priorityTerms: hasSignals ? [...visualSignals.map((signal) => signal.tag), ...ocrTokens].slice(0, 60) : [],
            candidateLimit: 150
          });
      const ranked = hasSignals
        ? rankVisualHuntCandidates({
            candidates,
            queryVisualSignals: visualSignals,
            queryOcrTokens: ocrTokens,
            maxResults: Math.max(input.maxResults, 10),
            minimumScore: 0.45
          })
        : candidates.slice(0, input.maxResults).map((candidate) => ({
            postId: candidate.id,
            type: candidate.type,
            status: candidate.status,
            title: candidate.title,
            category: candidate.category,
            area: candidate.area,
            building: candidate.building,
            lostFoundAt: candidate.lostFoundAt,
            createdAt: candidate.createdAt,
            similarityScore: null,
            signals: { visual: null, ocr: null },
            matchMode: "FILTER_ONLY" as const
          }));
      const draft = await draftFromVision(vision);
      const session = await finderQuickScanRepository.create({
        actorId: auth.sub,
        idempotencyKey: input.idempotencyKey,
        draft,
        candidates: ranked.map(candidateSnapshot),
        providerStatus: vision.providerAvailable ? "AVAILABLE" : "FALLBACK",
        providerReason: vision.failureReason ?? (!hasSignals ? "NO_USABLE_SIGNALS" : null)
      });
      if (!session) throw new HttpError(500, "Unable to create Finder Quick Scan session");
      await userRepository.createActivityLog({
        userId: auth.sub,
        action: "FINDER_QUICK_SCAN_ANALYZED",
        entityType: "FINDER_SCAN",
        entityId: session.id,
        metadata: { source: input.source, candidateCount: ranked.length, providerStatus: session.providerStatus }
      });
      return publicSession(session);
    } finally {
      image.buffer.fill(0);
    }
  },

  async createDraft(auth: AccessTokenPayload, sessionId: string, selectedLostPostId: string | null) {
    const session = await finderQuickScanRepository.findById(sessionId, auth.sub);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) throw new HttpError(404, "Active scan session not found");
    if (!canPrepareDraft(session.status)) {
      throw new HttpError(409, "Scan session can no longer create a draft");
    }
    if (selectedLostPostId && !session.candidates.some((candidate) => candidate.postId === selectedLostPostId)) {
      throw new HttpError(422, "Selected LOST post is not a candidate from this scan");
    }
    const updated = await finderQuickScanRepository.markDraftReady(sessionId, auth.sub, selectedLostPostId);
    if (!updated) throw new HttpError(409, "Scan session can no longer create a draft");
    return publicSession(updated);
  },

  async publish(auth: AccessTokenPayload, sessionId: string, input: FinderPublishInput) {
    const record = await prepareCreatePostRecord(auth, input);
    const result = await finderQuickScanRepository.withLockedSession(sessionId, auth.sub, async (connection, session) => {
      if (session.createdPostId) return { postId: session.createdPostId, created: false };
      if (session.status !== "DRAFT_READY" || new Date(session.expiresAt).getTime() <= Date.now()) {
        throw new HttpError(409, "Finder scan draft is not ready or has expired");
      }
      await postRepository.insertWithConnection(connection, record);
      await finderQuickScanRepository.markPublishedOnConnection(connection, session.id, record.id);
      return { postId: record.id, created: true };
    });
    if (!result) throw new HttpError(404, "Finder scan session not found");
    const post = await postRepository.findById(result.postId);
    if (!post) throw new HttpError(500, "Published FOUND post could not be loaded");
    if (result.created) {
      await matchingWorkerService.enqueue(post.id);
      await userRepository.createActivityLog({
        userId: auth.sub,
        action: "FINDER_QUICK_SCAN_PUBLISHED",
        entityType: "POST",
        entityId: post.id,
        metadata: { scanSessionId: sessionId }
      });
    }
    return { post, reused: !result.created, humanReviewRequired: true };
  }
};

export const finderQuickScanInternals = { tier, unsafeContent, publicSession, canPrepareDraft };
