import { createHash } from "node:crypto";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import {
  canTransitionRadarAlert as repositoryCanTransitionRadarAlert,
  radarRepository,
  type RadarAggregateBucket,
  type RadarAlertCandidate,
  type RadarSeverity
} from "../repositories/radar.repository.js";
import { HttpError } from "../utils/http-error.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { metricsService } from "./metrics.service.js";
import { configRepository } from "../repositories/config.repository.js";
import type {
  CreateRadarEventInput,
  RadarAlertListQuery,
  RadarAlertStatusInput,
  RadarEventListQuery
} from "../validators/radar.validator.js";

export interface RadarPolicy {
  detectorVersion: string;
  baselineDays: number;
  windowMinutes: number;
  stepMinutes: number;
  minimumObservedCount: number;
  minimumZScore: number;
  minimumObservedRatio: number;
  cooldownMinutes: number;
}

export const RADAR_POLICY: Readonly<RadarPolicy> = Object.freeze({
  detectorVersion: "campus-lost-sliding-v1",
  baselineDays: 28,
  windowMinutes: 60,
  stepMinutes: 15,
  minimumObservedCount: 3,
  minimumZScore: 2,
  minimumObservedRatio: 2,
  cooldownMinutes: 6 * 60
});

export const RADAR_ADVISORY =
  "Advisory aggregate only. A staff member must review operational context before taking action; this alert does not identify fault, ownership, cause, or weather.";

interface RadarEventForAnalysis {
  id: string;
  eventType: CreateRadarEventInput["eventType"];
  source: { type: CreateRadarEventInput["sourceType"]; reference: string };
  area: { id: string; name: string | null } | null;
  building: { id: string; name: string | null } | null;
  startsAt: string;
  endsAt: string;
  status: "ACTIVE" | "CANCELLED";
}

interface CandidateComputationInput {
  event: RadarEventForAnalysis;
  observedEnd: Date;
  buckets: RadarAggregateBucket[];
  detectedAt: Date;
}

type RadarRepositoryPort = Pick<
  typeof radarRepository,
  | "activeLocationExists"
  | "listOperationalReviewerIds"
  | "createEvent"
  | "findEventById"
  | "listEvents"
  | "listLostPostBuckets"
  | "upsertAlert"
  | "recordEventAnalysis"
  | "listAlerts"
  | "findAlertById"
  | "listRelatedPosts"
  | "transitionAlert"
  | "listAudit"
>;

type RadarNotifier = (input: { alert: { id: string; emissionCount?: number; observedCount?: number; severity?: string }; event: RadarEventForAnalysis }) => Promise<void>;

function requireAdmin(auth: AccessTokenPayload) {
  if (!auth.roles.includes("ADMIN")) {
    throw new HttpError(403, "Admin role is required for campus radar event writes");
  }
}

function requireOperationalReviewer(auth: AccessTokenPayload) {
  if (!auth.roles.includes("STAFF") && !auth.roles.includes("ADMIN")) {
    throw new HttpError(403, "Staff or admin role is required for campus radar access");
  }
}

function utcDate(value: string) {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

function alignUp(value: Date, stepMs: number) {
  return new Date(Math.ceil(value.getTime() / stepMs) * stepMs);
}

function bucketKey(value: Date) {
  return value.getTime();
}

function roundMetric(value: number) {
  return Number(value.toFixed(4));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function populationStandardDeviation(values: number[], average: number) {
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(values.length, 1);
  return Math.sqrt(variance);
}

function severityForScore(zScore: number): RadarSeverity {
  if (zScore >= 5) {
    return "CRITICAL";
  }
  if (zScore >= 3) {
    return "WARNING";
  }
  return "WATCH";
}

export function buildRadarAlertFingerprint(eventId: string, categoryId: string | null) {
  return createHash("sha256")
    .update(`${RADAR_POLICY.detectorVersion}|${eventId}|${categoryId ?? "ALL_CATEGORIES"}`, "utf8")
    .digest("hex");
}

function windowStarts(from: Date, through: Date, windowMs: number, stepMs: number) {
  const starts: Date[] = [];
  const first = alignUp(from, stepMs).getTime();
  const last = through.getTime() - windowMs;
  for (let value = first; value <= last; value += stepMs) {
    starts.push(new Date(value));
  }
  return starts;
}

function bucketMaps(buckets: RadarAggregateBucket[]) {
  const all = new Map<number, number>();
  const categories = new Map<string, Map<number, number>>();

  for (const bucket of buckets) {
    const time = bucketKey(utcDate(bucket.bucketStart));
    all.set(time, (all.get(time) ?? 0) + bucket.count);
    if (bucket.categoryId) {
      const category = categories.get(bucket.categoryId) ?? new Map<number, number>();
      category.set(time, (category.get(time) ?? 0) + bucket.count);
      categories.set(bucket.categoryId, category);
    }
  }
  return { all, categories };
}

function countWindow(counts: Map<number, number>, start: Date, windowMs: number, stepMs: number) {
  let total = 0;
  for (let value = start.getTime(); value < start.getTime() + windowMs; value += stepMs) {
    total += counts.get(value) ?? 0;
  }
  return total;
}

function candidateForScope(input: {
  event: RadarEventForAnalysis;
  categoryId: string | null;
  counts: Map<number, number>;
  baselineStarts: Date[];
  currentStarts: Date[];
  baselineStart: Date;
  detectedAt: Date;
  policy: RadarPolicy;
}): RadarAlertCandidate | null {
  const windowMs = input.policy.windowMinutes * 60 * 1000;
  const stepMs = input.policy.stepMinutes * 60 * 1000;
  const baselineCounts = input.baselineStarts.map((start) => countWindow(input.counts, start, windowMs, stepMs));
  const expectedMean = mean(baselineCounts);
  const standardDeviation = populationStandardDeviation(baselineCounts, expectedMean);

  const scoredWindows = input.currentStarts.map((start) => {
    const observedCount = countWindow(input.counts, start, windowMs, stepMs);
    const zScore = (observedCount - expectedMean) / Math.max(standardDeviation, 1);
    const observedRatio = observedCount / Math.max(expectedMean, 1);
    return { start, observedCount, zScore, observedRatio };
  });
  scoredWindows.sort((left, right) =>
    right.zScore - left.zScore ||
    right.observedCount - left.observedCount ||
    left.start.getTime() - right.start.getTime()
  );
  const best = scoredWindows[0];
  if (
    !best ||
    best.observedCount < input.policy.minimumObservedCount ||
    best.zScore < input.policy.minimumZScore ||
    best.observedRatio < input.policy.minimumObservedRatio
  ) {
    return null;
  }

  return {
    eventId: input.event.id,
    fingerprint: buildRadarAlertFingerprint(input.event.id, input.categoryId),
    detectorVersion: input.policy.detectorVersion,
    categoryId: input.categoryId,
    windowStart: best.start,
    windowEnd: new Date(best.start.getTime() + windowMs),
    windowMinutes: input.policy.windowMinutes,
    stepMinutes: input.policy.stepMinutes,
    baselineStart: input.baselineStart,
    baselineEnd: utcDate(input.event.startsAt),
    baselineWindowCount: baselineCounts.length,
    observedCount: best.observedCount,
    expectedMean: roundMetric(expectedMean),
    standardDeviation: roundMetric(standardDeviation),
    zScore: roundMetric(best.zScore),
    observedRatio: roundMetric(best.observedRatio),
    severity: severityForScore(best.zScore),
    detectedAt: input.detectedAt,
    cooldownMinutes: input.policy.cooldownMinutes
  };
}

export function computeRadarCandidates(input: CandidateComputationInput, policy: RadarPolicy = RADAR_POLICY) {
  const eventStart = utcDate(input.event.startsAt);
  const baselineStart = new Date(eventStart.getTime() - policy.baselineDays * 24 * 60 * 60 * 1000);
  const windowMs = policy.windowMinutes * 60 * 1000;
  const stepMs = policy.stepMinutes * 60 * 1000;
  const baselineStarts = windowStarts(baselineStart, eventStart, windowMs, stepMs);
  const currentStarts = windowStarts(eventStart, input.observedEnd, windowMs, stepMs);
  const maps = bucketMaps(input.buckets);

  const currentStartMs = eventStart.getTime();
  const currentEndMs = input.observedEnd.getTime();
  const activeCategoryIds = Array.from(maps.categories.entries())
    .filter(([, counts]) => Array.from(counts.keys()).some((time) => time >= currentStartMs && time < currentEndMs))
    .map(([categoryId]) => categoryId)
    .sort();

  const scopes: Array<{ categoryId: string | null; counts: Map<number, number> }> = [
    { categoryId: null, counts: maps.all },
    ...activeCategoryIds.map((categoryId) => ({ categoryId, counts: maps.categories.get(categoryId)! }))
  ];
  const candidates = scopes
    .map((scope) => candidateForScope({
      event: input.event,
      categoryId: scope.categoryId,
      counts: scope.counts,
      baselineStarts,
      currentStarts,
      baselineStart,
      detectedAt: input.detectedAt,
      policy
    }))
    .filter((candidate): candidate is RadarAlertCandidate => candidate !== null);

  return { candidates, evaluatedScopes: scopes.length };
}

export const canTransitionRadarAlert = repositoryCanTransitionRadarAlert;

export function createRadarService(
  repository: RadarRepositoryPort = radarRepository,
  clock = () => new Date(),
  notifyAlert: RadarNotifier = async () => undefined,
  policyProvider: () => Promise<RadarPolicy> = async () => RADAR_POLICY
) {
  return {
    async createEvent(auth: AccessTokenPayload, input: CreateRadarEventInput, requestId?: string | null) {
      requireAdmin(auth);
      if (input.eventType === "WEATHER" && input.sourceType !== "WEATHER_BULLETIN") {
        throw new HttpError(422, "Weather events require an explicit weather bulletin source");
      }
      if (!(await repository.activeLocationExists(input.areaId ?? null, input.buildingId ?? null))) {
        throw new HttpError(422, "Campus radar area/building is inactive or inconsistent");
      }
      const event = await repository.createEvent(input, auth.sub, requestId);
      if (!event) {
        throw new Error("Unable to load created campus radar event");
      }
      return { event };
    },

    async listEvents(auth: AccessTokenPayload, query: RadarEventListQuery) {
      requireOperationalReviewer(auth);
      return { events: await repository.listEvents(query) };
    },

    async analyzeEvent(auth: AccessTokenPayload, eventId: string, requestId?: string | null) {
      requireAdmin(auth);
      const event = await repository.findEventById(eventId) as RadarEventForAnalysis | null;
      if (!event) {
        throw new HttpError(404, "Campus radar event not found");
      }
      if (event.status !== "ACTIVE") {
        throw new HttpError(409, "Cancelled campus radar events cannot be analyzed");
      }
      if (event.eventType === "WEATHER" && event.source.type !== "WEATHER_BULLETIN") {
        throw new HttpError(422, "Weather analysis requires an explicit weather bulletin source");
      }

      const now = clock();
      const policy = await policyProvider();
      const eventStart = utcDate(event.startsAt);
      const eventEnd = utcDate(event.endsAt);
      const observedEnd = new Date(Math.min(eventEnd.getTime(), now.getTime()));
      if (observedEnd.getTime() - eventStart.getTime() < policy.windowMinutes * 60 * 1000) {
        throw new HttpError(409, `At least ${policy.windowMinutes} minutes of event observations are required`);
      }
      const baselineStart = new Date(eventStart.getTime() - policy.baselineDays * 24 * 60 * 60 * 1000);
      const buckets = await repository.listLostPostBuckets({
        from: baselineStart,
        to: observedEnd,
        areaId: event.area?.id ?? null,
        buildingId: event.building?.id ?? null,
        bucketMinutes: policy.stepMinutes
      });
      const computation = computeRadarCandidates({ event, observedEnd, buckets, detectedAt: now }, policy);
      const alerts = [];
      let emittedAlerts = 0;
      for (const candidate of computation.candidates) {
        const result = await repository.upsertAlert(candidate, auth.sub, requestId);
        alerts.push(result.alert);
        if (result.emitted) {
          emittedAlerts += 1;
          await notifyAlert({ alert: result.alert, event });
        }
      }
      await repository.recordEventAnalysis({
        eventId,
        actorId: auth.sub,
        detectedAlerts: computation.candidates.length,
        emittedAlerts,
        evaluatedScopes: computation.evaluatedScopes,
        requestId
      });
      metricsService.increment("lnfs_radar_analysis_total", { result: "completed" });
      metricsService.increment("lnfs_radar_alerts_detected_total", {}, computation.candidates.length);
      metricsService.increment("lnfs_radar_alerts_emitted_total", {}, emittedAlerts);
      return {
        eventId,
        detectorVersion: RADAR_POLICY.detectorVersion,
        evaluatedScopes: computation.evaluatedScopes,
        detectedAlerts: computation.candidates.length,
        emittedAlerts,
        alerts,
        advisory: RADAR_ADVISORY
      };
    },

    async listAlerts(auth: AccessTokenPayload, query: RadarAlertListQuery) {
      requireOperationalReviewer(auth);
      return { alerts: await repository.listAlerts(query), advisory: RADAR_ADVISORY };
    },

    async listRelatedPosts(auth: AccessTokenPayload, alertId: string, limit: number) {
      requireOperationalReviewer(auth);
      const alert = await repository.findAlertById(alertId);
      if (!alert) throw new HttpError(404, "Campus radar alert not found");
      return { posts: await repository.listRelatedPosts(alertId, limit), advisory: RADAR_ADVISORY };
    },

    async transitionAlert(
      auth: AccessTokenPayload,
      alertId: string,
      input: RadarAlertStatusInput,
      requestId?: string | null
    ) {
      requireOperationalReviewer(auth);
      const result = await repository.transitionAlert(alertId, input, auth.sub, requestId);
      if (result.updated) {
        metricsService.increment("lnfs_radar_alert_dispositions_total", {
          status: input.status.toLowerCase(),
          reason: input.reason.toLowerCase()
        });
      }
      return {
        ...result,
        advisory: RADAR_ADVISORY
      };
    },

    async listAudit(auth: AccessTokenPayload, limit: number) {
      requireAdmin(auth);
      return { audit: await repository.listAudit(limit) };
    }
  };
}

export const radarService = createRadarService(radarRepository, () => new Date(), async ({ alert, event }) => {
  const userIds = await radarRepository.listOperationalReviewerIds();
  const location = event.building?.name ?? event.area?.name ?? "toàn campus";
  await notificationRepository.createMany(userIds.map((userId) => ({
    userId,
    type: "CAMPUS_RADAR_ALERT",
    title: "Radar phát hiện cụm báo mất bất thường",
    body: `${alert.observedCount ?? "Nhiều"} báo LOST quanh ${location}. Đây là tín hiệu thống kê cần nhân viên kiểm tra.`,
    entityType: "RADAR_ALERT",
    entityId: alert.id,
    dedupeKey: `radar:${alert.id}:emission:${alert.emissionCount ?? 1}`
  })));
}, async () => ({
  ...RADAR_POLICY,
  minimumObservedCount: Math.round(clamp(await configRepository.numberValue("ai.radar.minimum_observed_count", 3), 3, 50)),
  minimumZScore: clamp(await configRepository.numberValue("ai.radar.minimum_z_score", 2), 1, 10),
  minimumObservedRatio: clamp(await configRepository.numberValue("ai.radar.minimum_observed_ratio", 2), 1.1, 10)
}));
