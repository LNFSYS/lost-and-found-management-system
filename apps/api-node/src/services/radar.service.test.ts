import assert from "node:assert/strict";
import test from "node:test";
import { shouldEmitRadarAlert } from "../repositories/radar.repository.js";
import { HttpError } from "../utils/http-error.js";
import { createRadarEventSchema } from "../validators/radar.validator.js";
import {
  RADAR_ADVISORY,
  RADAR_POLICY,
  buildRadarAlertFingerprint,
  canTransitionRadarAlert,
  computeRadarCandidates,
  createRadarService,
  radarService
} from "./radar.service.js";

const eventId = "11111111-1111-4111-8111-111111111111";
const areaId = "22222222-2222-4222-8222-222222222222";
const categoryId = "33333333-3333-4333-8333-333333333333";

const auth = (sub: string, roles: string[]) => ({ sub, roles, email: `${sub}@example.com`, sessionVersion: 0 });

function radarEvent() {
  return {
    id: eventId,
    eventType: "ACADEMIC" as const,
    source: { type: "OFFICIAL_CALENDAR" as const, reference: "https://fpt.example.edu/events/exam-week" },
    area: { id: areaId, name: "Campus" },
    building: null,
    startsAt: "2026-01-29 10:00:00",
    endsAt: "2026-01-29 12:00:00",
    status: "ACTIVE" as const
  };
}

test("sliding-window radar statistics are deterministic and aggregate-only", () => {
  const input = {
    event: radarEvent(),
    observedEnd: new Date("2026-01-29T12:00:00.000Z"),
    detectedAt: new Date("2026-01-29T12:05:00.000Z"),
    buckets: [
      { categoryId, bucketStart: "2026-01-29 10:00:00", count: 1 },
      { categoryId, bucketStart: "2026-01-29 10:15:00", count: 1 },
      { categoryId, bucketStart: "2026-01-29 10:30:00", count: 1 }
    ]
  };

  const first = computeRadarCandidates(input);
  const second = computeRadarCandidates(input);
  assert.deepEqual(first, second);
  assert.equal(first.evaluatedScopes, 2);
  assert.equal(first.candidates.length, 2);
  assert.deepEqual(first.candidates.map((candidate) => candidate.categoryId), [null, categoryId]);
  assert.equal(first.candidates[0]?.observedCount, 3);
  assert.equal(first.candidates[0]?.zScore, 3);
  assert.equal(first.candidates[0]?.severity, "WARNING");
  assert.equal(first.candidates[0]?.windowStart.toISOString(), "2026-01-29T10:00:00.000Z");

  const serialized = JSON.stringify(first);
  for (const forbidden of ["title", "description", "roomText", "contactInfo", "userId", "ocrText"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("bounded thresholds suppress low-volume windows", () => {
  const result = computeRadarCandidates({
    event: radarEvent(),
    observedEnd: new Date("2026-01-29T12:00:00.000Z"),
    detectedAt: new Date("2026-01-29T12:05:00.000Z"),
    buckets: [
      { categoryId, bucketStart: "2026-01-29 10:00:00", count: 1 },
      { categoryId, bucketStart: "2026-01-29 10:15:00", count: 1 }
    ]
  });
  assert.equal(result.candidates.length, 0);
});

test("runtime Radar thresholds remain configurable within the detector policy", () => {
  const result = computeRadarCandidates({
    event: radarEvent(),
    observedEnd: new Date("2026-01-29T12:00:00.000Z"),
    detectedAt: new Date("2026-01-29T12:05:00.000Z"),
    buckets: [
      { categoryId, bucketStart: "2026-01-29 10:00:00", count: 1 },
      { categoryId, bucketStart: "2026-01-29 10:15:00", count: 1 },
      { categoryId, bucketStart: "2026-01-29 10:30:00", count: 1 }
    ]
  }, { ...RADAR_POLICY, minimumObservedCount: 4 });
  assert.equal(result.candidates.length, 0);
});

test("fingerprints deduplicate by detector, event and aggregate category scope", () => {
  const allFingerprint = buildRadarAlertFingerprint(eventId, null);
  assert.equal(allFingerprint, buildRadarAlertFingerprint(eventId, null));
  assert.notEqual(allFingerprint, buildRadarAlertFingerprint(eventId, categoryId));
  assert.match(allFingerprint, /^[a-f0-9]{64}$/);
});

test("cooldown suppresses repeats while expiry and severity escalation re-emit", () => {
  const base = {
    status: "OPEN" as const,
    currentSeverity: "WARNING" as const,
    nextSeverity: "WARNING" as const,
    cooldownUntil: "2026-01-29 18:00:00",
    detectedAt: new Date("2026-01-29T12:00:00.000Z")
  };
  assert.equal(shouldEmitRadarAlert(base), false);
  assert.equal(shouldEmitRadarAlert({ ...base, nextSeverity: "CRITICAL" }), true);
  assert.equal(shouldEmitRadarAlert({ ...base, detectedAt: new Date("2026-01-29T18:00:00.000Z") }), true);
  assert.equal(shouldEmitRadarAlert({ ...base, status: "RESOLVED" }), false);
});

test("campus event validation requires sourced weather and rejects raw detail fields", () => {
  const base = {
    eventType: "WEATHER" as const,
    sourceType: "WEATHER_BULLETIN" as const,
    sourceReference: "https://weather.example.edu/bulletins/2026-01-29",
    areaId,
    startsAt: "2026-01-29T10:00:00.000Z",
    endsAt: "2026-01-29T12:00:00.000Z"
  };
  assert.equal(createRadarEventSchema.parse(base).eventType, "WEATHER");
  assert.throws(() => createRadarEventSchema.parse({ ...base, sourceType: "CAMPUS_NOTICE" }));
  assert.throws(() => createRadarEventSchema.parse({ ...base, roomText: "private room" }));
  assert.throws(() => createRadarEventSchema.parse({ ...base, sourceReference: "person@example.edu" }));
});

test("radar authorization and human advisory fail closed", async () => {
  await assert.rejects(
    radarService.listEvents(auth("student", ["USER", "STUDENT"]), { limit: 10 }),
    (error: unknown) => error instanceof HttpError && error.statusCode === 403
  );
  await assert.rejects(
    radarService.createEvent(auth("staff", ["STAFF"]), {} as never),
    (error: unknown) => error instanceof HttpError && error.statusCode === 403
  );
  await assert.rejects(
    radarService.listRelatedPosts(auth("student", ["USER", "STUDENT"]), eventId, 10),
    (error: unknown) => error instanceof HttpError && error.statusCode === 403
  );
  assert.match(RADAR_ADVISORY, /staff member must review/i);
  assert.match(RADAR_ADVISORY, /does not identify.*cause.*weather/i);
});

test("manual analysis persists aggregate alerts and an activity/audit summary", async () => {
  let analysisAudit: Record<string, unknown> | null = null;
  const fakeRepository = {
    activeLocationExists: async () => true,
    createEvent: async () => radarEvent(),
    findEventById: async () => radarEvent(),
    listEvents: async () => [radarEvent()],
    listLostPostBuckets: async () => [
      { categoryId, bucketStart: "2026-01-29 10:00:00", count: 1 },
      { categoryId, bucketStart: "2026-01-29 10:15:00", count: 1 },
      { categoryId, bucketStart: "2026-01-29 10:30:00", count: 1 }
    ],
    upsertAlert: async (candidate: { fingerprint: string }) => ({
      alert: { id: candidate.fingerprint },
      emitted: true
    }),
    recordEventAnalysis: async (input: Record<string, unknown>) => {
      analysisAudit = input;
    },
    listAlerts: async () => [],
    transitionAlert: async () => ({ alert: null, updated: false }),
    listAudit: async () => []
  } as unknown as Parameters<typeof createRadarService>[0];
  const service = createRadarService(fakeRepository, () => new Date("2026-01-29T12:05:00.000Z"));
  const result = await service.analyzeEvent(auth("admin", ["ADMIN"]), eventId, "request-radar-test");

  assert.equal(result.detectedAlerts, 2);
  assert.equal(result.emittedAlerts, 2);
  assert.deepEqual(analysisAudit, {
    eventId,
    actorId: "admin",
    detectedAlerts: 2,
    emittedAlerts: 2,
    evaluatedScopes: 2,
    requestId: "request-radar-test"
  });
});

test("human alert dispositions allow only forward advisory transitions", () => {
  assert.equal(canTransitionRadarAlert("OPEN", "ACKNOWLEDGED"), true);
  assert.equal(canTransitionRadarAlert("ACKNOWLEDGED", "RESOLVED"), true);
  assert.equal(canTransitionRadarAlert("RESOLVED", "OPEN"), false);
  assert.equal(canTransitionRadarAlert("DISMISSED", "ACKNOWLEDGED"), false);
});
