import assert from "node:assert/strict";
import test from "node:test";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { assertPostStatusTransition } from "./post-state.policy.js";

const ownerAuth: AccessTokenPayload = { sub: "owner", email: "owner@example.com", roles: ["STUDENT"] };
const adminAuth: AccessTokenPayload = { sub: "admin", email: "admin@example.com", roles: ["ADMIN"] };
const otherAuth: AccessTokenPayload = { sub: "other", email: "other@example.com", roles: ["STUDENT"] };

test("post owner can close and reopen an active post", () => {
  assert.doesNotThrow(() =>
    assertPostStatusTransition({ auth: ownerAuth, ownerId: "owner", from: "OPEN", to: "CLOSED" })
  );
  assert.doesNotThrow(() =>
    assertPostStatusTransition({ auth: ownerAuth, ownerId: "owner", from: "CLOSED", to: "OPEN" })
  );
});

test("post owner cannot manually resolve, match, or hide a post", () => {
  for (const to of ["MATCHED", "RESOLVED", "HIDDEN"] as const) {
    assert.throws(() =>
      assertPostStatusTransition({ auth: ownerAuth, ownerId: "owner", from: "OPEN", to })
    );
  }
});

test("admin can moderate lifecycle states but cannot reopen resolved posts", () => {
  assert.doesNotThrow(() =>
    assertPostStatusTransition({ auth: adminAuth, ownerId: "owner", from: "OPEN", to: "HIDDEN" })
  );
  assert.throws(() =>
    assertPostStatusTransition({ auth: adminAuth, ownerId: "owner", from: "RESOLVED", to: "OPEN" })
  );
});

test("unrelated non-admin user cannot change status", () => {
  assert.throws(() =>
    assertPostStatusTransition({ auth: otherAuth, ownerId: "owner", from: "OPEN", to: "CLOSED" })
  );
});
