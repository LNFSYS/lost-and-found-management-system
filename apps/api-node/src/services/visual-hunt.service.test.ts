import assert from "node:assert/strict";
import test from "node:test";
import type { VisualHuntCandidate } from "../repositories/visual-hunt.repository.js";
import {
  confidenceWeightedOverlap,
  createVisualHuntService,
  rankVisualHuntCandidates
} from "./visual-hunt.service.js";

function candidate(
  id: string,
  tags: VisualHuntCandidate["tags"],
  createdAt = "2026-07-01 00:00:00"
): VisualHuntCandidate {
  return {
    id,
    type: "FOUND",
    status: "OPEN",
    title: `Candidate ${id}`,
    category: { id: "11111111-1111-4111-8111-111111111111", name: "Electronics" },
    area: { id: "22222222-2222-4222-8222-222222222222", name: "Alpha" },
    building: null,
    lostFoundAt: null,
    createdAt,
    tags
  };
}

function pngFile() {
  const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return {
    fieldname: "image",
    originalname: "item.png",
    encoding: "7bit",
    mimetype: "image/png",
    size: buffer.length,
    buffer
  } as Express.Multer.File;
}

test("computes confidence-weighted overlap and ranks only positive candidates", () => {
  const overlap = confidenceWeightedOverlap(
    [{ tag: "wallet", confidence: 0.9 }, { tag: "black", confidence: 0.8 }],
    [{ tag: "wallet", confidence: 0.7 }, { tag: "black", confidence: 0.8 }]
  );
  assert.ok(overlap > 0.85 && overlap < 0.9);

  const results = rankVisualHuntCandidates({
    candidates: [
      candidate("strong", [
        { tag: "wallet", confidence: 0.7, source: "VISION_OBJECT" },
        { tag: "black", confidence: 0.8, source: "VISION_LABEL" },
        { tag: "0901234567", confidence: 0.7, source: "OCR" }
      ]),
      candidate("weak", [{ tag: "wallet", confidence: 0.4, source: "VISION_LABEL" }]),
      candidate("none", [{ tag: "bicycle", confidence: 0.99, source: "VISION_OBJECT" }])
    ],
    queryVisualSignals: [
      { tag: "wallet", confidence: 0.9 },
      { tag: "black", confidence: 0.8 }
    ],
    queryOcrTokens: [],
    maxResults: 20
  });

  assert.deepEqual(results.map((result) => result.postId), ["strong", "weak"]);
  const serialized = JSON.stringify(results);
  assert.doesNotMatch(serialized, /0901234567/);
  assert.doesNotMatch(serialized, /secure_url|cloudinary|ocrTokens|tags/i);
});

test("applies the configured advisory candidate threshold", () => {
  const results = rankVisualHuntCandidates({
    candidates: [
      candidate("strong", [{ tag: "wallet", confidence: 0.9, source: "VISION_OBJECT" }]),
      candidate("weak", [{ tag: "wallet", confidence: 0.2, source: "VISION_OBJECT" }])
    ],
    queryVisualSignals: [{ tag: "wallet", confidence: 0.9 }],
    queryOcrTokens: [],
    maxResults: 20,
    minimumScore: 0.5
  });
  assert.deepEqual(results.map((result) => result.postId), ["strong"]);
});

test("returns an honest filter-only fallback when Vision is unavailable", async () => {
  const metrics: string[] = [];
  const file = pngFile();
  const service = createVisualHuntService({
    analyzeImageBuffer: async () => ({
      tags: [],
      ocrText: "",
      providerAvailable: false,
      failureReason: "TIMEOUT"
    }),
    listCandidates: async () => [candidate("fallback", [])],
    incrementMetric: (name, labels) => metrics.push(`${name}:${labels?.result ?? labels?.status ?? ""}`)
  });

  const response = await service.search(file, {
    categoryId: "11111111-1111-4111-8111-111111111111",
    maxResults: 20
  });

  assert.equal(response.providerAvailable, false);
  assert.deepEqual(response.fallback, { used: true, mode: "FILTER_ONLY", reason: "TIMEOUT" });
  assert.equal(response.safetyStatus, "NOT_CHECKED");
  assert.equal(response.results[0]?.matchMode, "FILTER_ONLY");
  assert.equal(response.results[0]?.similarityScore, null);
  assert.ok(metrics.some((metric) => metric.includes("lnfs_visual_hunt_requests_total:fallback")));
  assert.ok(file.buffer.every((byte) => byte === 0));
});

test("does not return unrelated recent posts when provider and useful filters are unavailable", async () => {
  let repositoryCalled = false;
  const service = createVisualHuntService({
    analyzeImageBuffer: async () => ({
      tags: [],
      ocrText: "",
      providerAvailable: false,
      failureReason: "NOT_CONFIGURED"
    }),
    listCandidates: async () => {
      repositoryCalled = true;
      return [candidate("unrelated", [])];
    },
    incrementMetric: () => undefined
  });

  const response = await service.search(pngFile(), { maxResults: 20 });

  assert.equal(repositoryCalled, false);
  assert.equal(response.providerAvailable, false);
  assert.equal(response.fallback.used, true);
  assert.equal(response.resultCount, 0);
  assert.deepEqual(response.results, []);
});

test("blocks likely unsafe content before querying posts", async () => {
  let repositoryCalled = false;
  const service = createVisualHuntService({
    analyzeImageBuffer: async () => ({
      tags: [{ tag: "wallet", confidence: 0.9, source: "VISION_OBJECT" }],
      ocrText: "",
      providerAvailable: true,
      safeSearch: { adult: "LIKELY" }
    }),
    listCandidates: async () => {
      repositoryCalled = true;
      return [];
    },
    incrementMetric: () => undefined
  });

  const response = await service.search(pngFile(), { maxResults: 20 });

  assert.equal(repositoryCalled, false);
  assert.equal(response.safetyStatus, "BLOCKED");
  assert.equal(response.resultCount, 0);
});
