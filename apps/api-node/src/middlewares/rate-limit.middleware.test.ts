import assert from "node:assert/strict";
import test from "node:test";
import { consumeLocalRateLimit, resetLocalRateLimitsForTest } from "./rate-limit.middleware.js";

test("local rate limiter counts within a window and resets after expiry", () => {
  resetLocalRateLimitsForTest();
  const first = consumeLocalRateLimit("test:user", 1_000, 10_000);
  const second = consumeLocalRateLimit("test:user", 1_000, 10_500);
  const reset = consumeLocalRateLimit("test:user", 1_000, 11_001);

  assert.equal(first.count, 1);
  assert.equal(second.count, 2);
  assert.equal(second.resetAt, 11_000);
  assert.equal(reset.count, 1);
  assert.equal(reset.resetAt, 12_001);
});
