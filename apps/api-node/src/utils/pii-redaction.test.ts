import assert from "node:assert/strict";
import test from "node:test";
import { redactPii, redactedOcrTokens } from "./pii-redaction.js";

test("redacts common OCR identifiers while retaining non-sensitive item words", () => {
  const source = "Black Samsung wallet SE123456 0901 234 567 owner@example.com https://example.com/item";
  const redacted = redactPii(source);

  assert.doesNotMatch(redacted, /SE123456/i);
  assert.doesNotMatch(redacted, /0901/);
  assert.doesNotMatch(redacted, /owner@example\.com/i);
  assert.doesNotMatch(redacted, /example\.com/i);
  assert.match(redacted, /Black Samsung wallet/);
});

test("returns unique normalized OCR tokens without redaction markers", () => {
  const tokens = redactedOcrTokens("Ví Samsung SAMSUNG 12345678 blue");

  assert.deepEqual(tokens, ["samsung", "blue"]);
  assert.equal(tokens.includes("12345678"), false);
  assert.equal(tokens.includes("redacted"), false);
});
