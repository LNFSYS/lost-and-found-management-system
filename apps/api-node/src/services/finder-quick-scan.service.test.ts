import assert from "node:assert/strict";
import test from "node:test";
import { finderQuickScanInternals } from "./finder-quick-scan.service.js";

test("Finder Quick Scan maps matching thresholds to advisory tiers", () => {
  assert.equal(finderQuickScanInternals.tier(0.44), "WEAK");
  assert.equal(finderQuickScanInternals.tier(0.6), "SUGGESTION");
  assert.equal(finderQuickScanInternals.tier(0.75), "NOTIFY");
  assert.equal(finderQuickScanInternals.tier(0.85), "HIGH_CONFIDENCE");
  assert.equal(finderQuickScanInternals.tier(null), "FILTER_ONLY");
});

test("Finder Quick Scan blocks likely unsafe Vision results", () => {
  assert.equal(finderQuickScanInternals.unsafeContent({ tags: [], ocrText: "", providerAvailable: true, safeSearch: { adult: "LIKELY" } }), true);
  assert.equal(finderQuickScanInternals.unsafeContent({ tags: [], ocrText: "", providerAvailable: true, safeSearch: { adult: "UNLIKELY" } }), false);
});

test("Finder Quick Scan cannot recreate a draft after publish or expiry", () => {
  assert.equal(finderQuickScanInternals.canPrepareDraft("ANALYZED"), true);
  assert.equal(finderQuickScanInternals.canPrepareDraft("DRAFT_READY"), true);
  assert.equal(finderQuickScanInternals.canPrepareDraft("PUBLISHED"), false);
  assert.equal(finderQuickScanInternals.canPrepareDraft("EXPIRED"), false);
});
