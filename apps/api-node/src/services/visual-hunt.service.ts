import type { VisionFailureReason, VisionResult, VisionTag } from "./vision.service.js";
import type {
  VisualHuntCandidate,
  VisualHuntCandidateQuery
} from "../repositories/visual-hunt.repository.js";
import type { VisualHuntFeedbackInput, VisualHuntSearchInput } from "../validators/visual-hunt.validator.js";
import { visualHuntRepository } from "../repositories/visual-hunt.repository.js";
import { metricsService } from "./metrics.service.js";
import { visionService } from "./vision.service.js";
import { HttpError } from "../utils/http-error.js";
import { hasMatchingImageSignature, imageFormatForMime } from "../utils/image-signature.js";
import { redactedOcrTokens } from "../utils/pii-redaction.js";
import { configRepository } from "../repositories/config.repository.js";

// Google Vision JSON requests base64-expand raw bytes, so keep a safety margin below its request limit.
const MAX_VISUAL_HUNT_IMAGE_BYTES = 7 * 1024 * 1024;
const MAX_CANDIDATES = 200;

type SearchFallbackReason = VisionFailureReason | "NO_USABLE_SIGNALS";

interface SearchSignal {
  tag: string;
  confidence: number;
}

export interface VisualHuntResult {
  postId: string;
  type: "LOST" | "FOUND";
  status: "OPEN" | "MATCHED";
  title: string;
  category: { id: string; name: string | null } | null;
  area: { id: string; name: string | null } | null;
  building: { id: string; name: string | null } | null;
  lostFoundAt: string | null;
  createdAt: string;
  similarityScore: number | null;
  signals: {
    visual: number | null;
    ocr: number | null;
  };
  matchMode: "VISUAL_METADATA" | "FILTER_ONLY";
}

interface VisualHuntDependencies {
  analyzeImageBuffer(buffer: Buffer): Promise<VisionResult>;
  listCandidates(input: VisualHuntCandidateQuery): Promise<VisualHuntCandidate[]>;
  incrementMetric(name: string, labels?: Record<string, string>, amount?: number): void;
  recordFeedback?(actorId: string, input: VisualHuntFeedbackInput): Promise<unknown>;
  candidateThreshold?(): Promise<number>;
}

function roundScore(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function signalMap(signals: SearchSignal[]) {
  const values = new Map<string, number>();
  for (const signal of signals) {
    const tag = signal.tag.trim();
    if (!tag) continue;
    values.set(tag, Math.max(values.get(tag) ?? 0, Math.max(0, Math.min(1, signal.confidence))));
  }
  return values;
}

export function confidenceWeightedOverlap(left: SearchSignal[], right: SearchSignal[]) {
  const leftValues = signalMap(left);
  const rightValues = signalMap(right);
  const terms = new Set([...leftValues.keys(), ...rightValues.keys()]);
  if (terms.size === 0) return 0;

  let intersection = 0;
  let union = 0;
  for (const term of terms) {
    const leftValue = leftValues.get(term) ?? 0;
    const rightValue = rightValues.get(term) ?? 0;
    intersection += Math.min(leftValue, rightValue);
    union += Math.max(leftValue, rightValue);
  }
  return union === 0 ? 0 : intersection / union;
}

function tokenOverlap(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size === 0 || rightSet.size === 0) return 0;
  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  return intersection / (leftSet.size + rightSet.size - intersection);
}

function publicResult(candidate: VisualHuntCandidate, input: {
  similarityScore: number | null;
  visualScore: number | null;
  ocrScore: number | null;
  matchMode: VisualHuntResult["matchMode"];
}): VisualHuntResult {
  return {
    postId: candidate.id,
    type: candidate.type,
    status: candidate.status,
    title: candidate.title,
    category: candidate.category,
    area: candidate.area,
    building: candidate.building,
    lostFoundAt: candidate.lostFoundAt,
    createdAt: candidate.createdAt,
    similarityScore: input.similarityScore,
    signals: {
      visual: input.visualScore,
      ocr: input.ocrScore
    },
    matchMode: input.matchMode
  };
}

export function rankVisualHuntCandidates(input: {
  candidates: VisualHuntCandidate[];
  queryVisualSignals: SearchSignal[];
  queryOcrTokens: string[];
  maxResults: number;
  minimumScore?: number;
}) {
  const hasVisualSignal = input.queryVisualSignals.length > 0;
  const hasOcrSignal = input.queryOcrTokens.length > 0;
  const visualWeight = hasVisualSignal ? 0.8 : 0;
  const ocrWeight = hasOcrSignal ? 0.2 : 0;
  const weightSum = visualWeight + ocrWeight || 1;

  return input.candidates
    .map((candidate) => {
      const candidateVisualSignals = candidate.tags
        .filter((tag) => tag.source === "VISION_LABEL" || tag.source === "VISION_OBJECT")
        .map((tag) => ({ tag: tag.tag, confidence: tag.confidence }));
      const candidateOcrTokens = redactedOcrTokens(
        candidate.tags.filter((tag) => tag.source === "OCR").map((tag) => tag.tag).join(" ")
      );
      const visualScore = hasVisualSignal
        ? confidenceWeightedOverlap(input.queryVisualSignals, candidateVisualSignals)
        : null;
      const ocrScore = hasOcrSignal ? tokenOverlap(input.queryOcrTokens, candidateOcrTokens) : null;
      const total = roundScore(
        (visualWeight * (visualScore ?? 0) + ocrWeight * (ocrScore ?? 0)) / weightSum
      );
      return publicResult(candidate, {
        similarityScore: total,
        visualScore: visualScore === null ? null : roundScore(visualScore),
        ocrScore: ocrScore === null ? null : roundScore(ocrScore),
        matchMode: "VISUAL_METADATA"
      });
    })
    .filter((result) => result.similarityScore !== null && result.similarityScore > 0 && result.similarityScore >= Math.max(0, Math.min(1, input.minimumScore ?? 0)))
    .sort((left, right) =>
      (right.similarityScore ?? 0) - (left.similarityScore ?? 0) ||
      right.createdAt.localeCompare(left.createdAt)
    )
    .slice(0, Math.max(1, Math.min(20, input.maxResults)));
}

function unsafeContent(result: VisionResult) {
  const blocked = new Set(["LIKELY", "VERY_LIKELY"]);
  return blocked.has(result.safeSearch?.adult ?? "UNKNOWN") ||
    blocked.has(result.safeSearch?.violence ?? "UNKNOWN") ||
    blocked.has(result.safeSearch?.racy ?? "UNKNOWN");
}

function requireImage(file: Express.Multer.File | undefined) {
  if (!file) {
    throw new HttpError(400, "Missing uploaded file field: image");
  }
  if (!imageFormatForMime(file.mimetype) || !hasMatchingImageSignature(file.buffer, file.mimetype)) {
    throw new HttpError(422, "Only valid JPG, PNG and WEBP still images are allowed");
  }
  if (file.size > MAX_VISUAL_HUNT_IMAGE_BYTES || file.buffer.length > MAX_VISUAL_HUNT_IMAGE_BYTES) {
    throw new HttpError(422, "Visual Hunt image size exceeds 7 MB");
  }
  return file;
}

function queryVisualSignals(tags: VisionTag[]) {
  return tags
    .filter((tag) =>
      (tag.source === "VISION_LABEL" || tag.source === "VISION_OBJECT") &&
      tag.confidence >= 0.5 &&
      tag.tag.trim().length > 0
    )
    .map((tag) => ({ tag: tag.tag, confidence: tag.confidence }));
}

export function createVisualHuntService(dependencies: VisualHuntDependencies) {
  return {
    async search(file: Express.Multer.File | undefined, input: VisualHuntSearchInput) {
      const image = requireImage(file);
      const startedAt = Date.now();
      try {
        const vision = await dependencies.analyzeImageBuffer(image.buffer);
        dependencies.incrementMetric("lnfs_visual_hunt_provider_total", {
          status: vision.providerAvailable ? "available" : "unavailable",
          reason: vision.failureReason ?? "none"
        });

        if (vision.providerAvailable && unsafeContent(vision)) {
          dependencies.incrementMetric("lnfs_visual_hunt_requests_total", { result: "blocked" });
          return {
            providerAvailable: true,
            fallback: { used: false, mode: "NONE" as const, reason: null },
            safetyStatus: "BLOCKED" as const,
            resultCount: 0,
            results: [] as VisualHuntResult[]
          };
        }

        const visualSignals = queryVisualSignals(vision.tags);
        const ocrTokens = redactedOcrTokens(vision.ocrText);
        const hasSearchSignals = visualSignals.length > 0 || ocrTokens.length > 0;
        const filterFallbackAllowed = Boolean(input.categoryId || input.areaId);
        const fallbackReason: SearchFallbackReason | null = vision.providerAvailable
          ? hasSearchSignals ? null : "NO_USABLE_SIGNALS"
          : vision.failureReason ?? "NETWORK_ERROR";
        const useFilterFallback = fallbackReason !== null && filterFallbackAllowed;

        if (fallbackReason !== null && !useFilterFallback) {
          dependencies.incrementMetric("lnfs_visual_hunt_requests_total", { result: "fallback_empty" });
          return {
            providerAvailable: vision.providerAvailable,
            fallback: { used: true, mode: "FILTER_ONLY" as const, reason: fallbackReason },
            safetyStatus: vision.providerAvailable ? "CLEAR" as const : "NOT_CHECKED" as const,
            resultCount: 0,
            results: [] as VisualHuntResult[]
          };
        }

        const priorityTerms = Array.from(new Set([
          ...visualSignals.map((signal) => signal.tag),
          ...ocrTokens
        ])).slice(0, 60);
        const candidates = await dependencies.listCandidates({
          targetType: input.targetType,
          categoryId: input.categoryId,
          areaId: input.areaId,
          priorityTerms: useFilterFallback ? [] : priorityTerms,
          candidateLimit: Math.min(MAX_CANDIDATES, Math.max(100, input.maxResults * 10))
        });

        const minimumScore = dependencies.candidateThreshold
          ? Math.max(0, Math.min(1, await dependencies.candidateThreshold()))
          : 0;
        const results = useFilterFallback
          ? candidates.slice(0, input.maxResults).map((candidate) => publicResult(candidate, {
              similarityScore: null,
              visualScore: null,
              ocrScore: null,
              matchMode: "FILTER_ONLY"
            }))
          : rankVisualHuntCandidates({
              candidates,
              queryVisualSignals: visualSignals,
              queryOcrTokens: ocrTokens,
              maxResults: input.maxResults,
              minimumScore
            });

        dependencies.incrementMetric("lnfs_visual_hunt_requests_total", {
          result: useFilterFallback ? "fallback" : "ranked"
        });
        dependencies.incrementMetric("lnfs_visual_hunt_results_total", {
          mode: useFilterFallback ? "filter_only" : "visual_metadata"
        }, results.length);
        return {
          providerAvailable: vision.providerAvailable,
          fallback: {
            used: useFilterFallback,
            mode: useFilterFallback ? "FILTER_ONLY" as const : "NONE" as const,
            reason: useFilterFallback ? fallbackReason : null
          },
          safetyStatus: vision.providerAvailable ? "CLEAR" as const : "NOT_CHECKED" as const,
          resultCount: results.length,
          results
        };
      } catch (error) {
        dependencies.incrementMetric("lnfs_visual_hunt_requests_total", { result: "error" });
        throw error;
      } finally {
        dependencies.incrementMetric("lnfs_visual_hunt_inference_duration_milliseconds_sum", {}, Date.now() - startedAt);
        dependencies.incrementMetric("lnfs_visual_hunt_inference_duration_milliseconds_count");
        image.buffer.fill(0);
      }
    },

    async recordFeedback(actorId: string, input: VisualHuntFeedbackInput) {
      if (!dependencies.recordFeedback) throw new Error("Visual Hunt feedback repository is unavailable");
      const feedback = await dependencies.recordFeedback(actorId, input);
      dependencies.incrementMetric("lnfs_visual_hunt_feedback_total", { decision: input.decision.toLowerCase() });
      return { feedback };
    }
  };
}

export const visualHuntService = createVisualHuntService({
  analyzeImageBuffer: (buffer) => visionService.analyzeImageBuffer(buffer),
  listCandidates: (input) => visualHuntRepository.listCandidates(input),
  incrementMetric: (name, labels, amount) => metricsService.increment(name, labels, amount),
  recordFeedback: (actorId, input) => visualHuntRepository.recordFeedback(actorId, input),
  candidateThreshold: () => configRepository.numberValue("ai.visual_hunt.candidate_threshold", 0.2)
});
