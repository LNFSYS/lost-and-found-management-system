import assert from "node:assert/strict";
import test from "node:test";
import { recoveryTimelineInternals } from "./recovery-timeline.service.js";

test("Recovery Timeline returns safe copy without private notes or storage URLs", () => {
  const event = recoveryTimelineInternals.safeEvent({
    id: "event-1",
    type: "CLAIM_EVIDENCE_ADDED",
    entityType: "CLAIM",
    entityId: "claim-1",
    actorId: "claimant-1",
    state: "OWNERSHIP_PROOF",
    createdAt: "2026-08-03T10:00:00.000Z"
  }, "claimant-1");
  assert.equal(event.actor, "YOU");
  assert.equal(event.title, "Đã bổ sung bằng chứng");
  assert.equal("note" in event, false);
  assert.equal("url" in event, false);
});

test("Recovery Timeline recommends human workflow instead of automatic ownership", () => {
  const next = recoveryTimelineInternals.nextAction([{
    id: "match-1",
    type: "MATCH_CANDIDATE_DETECTED",
    entityType: "MATCH",
    entityId: "match-1",
    actorId: null,
    state: "HIGH_CONFIDENCE",
    createdAt: "2026-08-03T10:00:00.000Z"
  }], "OPEN");
  assert.match(next ?? "", /gợi ý|claim/i);
  assert.doesNotMatch(next ?? "", /tự động xác nhận/i);
});
