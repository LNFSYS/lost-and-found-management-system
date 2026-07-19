import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldFailWhenRedisIsUnavailable,
  validateRedisConfiguration
} from "./redis.js";

test("Redis remains optional when REDIS_REQUIRED is false", () => {
  assert.doesNotThrow(() => validateRedisConfiguration(undefined, false));
  assert.equal(shouldFailWhenRedisIsUnavailable(false), false);
});

test("required Redis fails fast when REDIS_URL is missing", () => {
  assert.throws(
    () => validateRedisConfiguration("", true),
    /REDIS_URL is required/
  );
  assert.equal(shouldFailWhenRedisIsUnavailable(true), true);
});
