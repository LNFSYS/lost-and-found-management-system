import assert from "node:assert/strict";
import test from "node:test";
import { redactSensitiveOcr } from "./ai-draft.service.js";

test("AI-assisted draft redacts common private OCR patterns", () => {
  const result = redactSensitiveOcr("student@fpt.edu.vn 0912345678 SE12345678 SERIAL-ABCDEFGHIJ");
  assert.doesNotMatch(result, /student@fpt|0912345678|SE12345678|SERIAL-ABCDEFGHIJ/);
  assert.match(result, /REDACTED/);
});

test("AI-assisted draft preserves harmless OCR context", () => {
  assert.equal(redactSensitiveOcr("Sony black headphones"), "Sony black headphones");
});
