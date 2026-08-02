import assert from "node:assert/strict";
import test from "node:test";
import { assertConfigValueBounds } from "./config-bounds.js";
import { HttpError } from "./http-error.js";

test("AI operational config accepts values inside their effective bounds", () => {
  assert.doesNotThrow(() => assertConfigValueBounds("ai.radar.minimum_observed_count", "3"));
  assert.doesNotThrow(() => assertConfigValueBounds("ai.radar.minimum_z_score", "7.5"));
  assert.doesNotThrow(() => assertConfigValueBounds("ai.radar.minimum_observed_ratio", "1.1"));
  assert.doesNotThrow(() => assertConfigValueBounds("ai.visual_hunt.candidate_threshold", "1"));
});

test("AI operational config rejects values outside their effective bounds", () => {
  for (const [key, value] of [
    ["ai.radar.minimum_observed_count", "2"],
    ["ai.radar.minimum_z_score", "11"],
    ["ai.radar.minimum_observed_ratio", "1"],
    ["ai.visual_hunt.candidate_threshold", "1.01"]
  ] as const) {
    assert.throws(
      () => assertConfigValueBounds(key, value),
      (error: unknown) => error instanceof HttpError && error.statusCode === 422
    );
  }
});

test("unbounded config keys preserve their existing validation behavior", () => {
  assert.doesNotThrow(() => assertConfigValueBounds("post.expiration_days", "999"));
});
