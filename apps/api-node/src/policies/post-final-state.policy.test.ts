import assert from "node:assert/strict";
import test from "node:test";
import { finalPostStateSchema } from "../validators/post.validator.js";

const baseState = {
  type: "FOUND" as const,
  title: "Found student card",
  description: "A student card was found near the library entrance.",
  categoryId: "11111111-1111-4111-8111-111111111111",
  areaId: null,
  buildingId: null,
  roomText: "Library front desk",
  customLocation: null,
  contactInfo: "Contact campus support",
  lostFoundAt: "2026-07-13T06:00:00.000Z",
  handoverPointId: null,
  hasSecretVerification: false
};

test("final merged FOUND state cannot clear every holding location", () => {
  const result = finalPostStateSchema.safeParse({ ...baseState, roomText: null });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "handoverPointId"));
  }
});

test("final merged post state cannot clear contact information", () => {
  const result = finalPostStateSchema.safeParse({ ...baseState, contactInfo: null });
  assert.equal(result.success, false);
});

test("existing LOST secret verification keeps an otherwise valid merged update valid", () => {
  const result = finalPostStateSchema.safeParse({
    ...baseState,
    type: "LOST",
    roomText: null,
    hasSecretVerification: true
  });
  assert.equal(result.success, true);
});

test("LOST state without existing or replacement secret verification is rejected", () => {
  const result = finalPostStateSchema.safeParse({
    ...baseState,
    type: "LOST",
    roomText: null,
    hasSecretVerification: false
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "secretVerification"));
  }
});
