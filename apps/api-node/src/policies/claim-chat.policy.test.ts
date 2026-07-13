import assert from "node:assert/strict";
import test from "node:test";
import { canAccessClaimRecord, canUseClaimChatRecord, type ClaimChatAccess } from "./claim-chat.policy.js";

const accepted: ClaimChatAccess = {
  claimantId: "claimant",
  postOwnerId: "owner",
  status: "ACCEPTED"
};

test("accepted claim chat is limited to participants and reviewers", () => {
  assert.equal(canUseClaimChatRecord(accepted, "claimant", ["USER"]), true);
  assert.equal(canUseClaimChatRecord(accepted, "owner", ["USER"]), true);
  assert.equal(canUseClaimChatRecord(accepted, "staff", ["STAFF"]), true);
  assert.equal(canUseClaimChatRecord(accepted, "admin", ["ADMIN"]), true);
  assert.equal(canUseClaimChatRecord(accepted, "unrelated", ["USER"]), false);
});

test("non-accepted claims cannot open chat, including for reviewers", () => {
  for (const status of ["PENDING", "NEED_MORE_INFO", "REJECTED", "CANCELLED"] as const) {
    const claim = { ...accepted, status };
    assert.equal(canUseClaimChatRecord(claim, "claimant", ["USER"]), false);
    assert.equal(canUseClaimChatRecord(claim, "admin", ["ADMIN"]), false);
  }
});

test("claim detail access remains available for authorized review before acceptance", () => {
  const pending = { ...accepted, status: "PENDING" as const };
  assert.equal(canAccessClaimRecord(pending, "claimant", ["USER"]), true);
  assert.equal(canAccessClaimRecord(pending, "owner", ["USER"]), true);
  assert.equal(canAccessClaimRecord(pending, "staff", ["STAFF"]), true);
  assert.equal(canAccessClaimRecord(pending, "unrelated", ["USER"]), false);
});
