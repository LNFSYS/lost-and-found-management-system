import assert from "node:assert/strict";
import test from "node:test";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { isAccessSessionCurrent } from "./access-session.service.js";

const payload: AccessTokenPayload = {
  sub: "user-1",
  email: "user@example.com",
  roles: ["STUDENT"],
  sessionVersion: 3
};

test("access session accepts only an active user with the same session version", () => {
  assert.equal(isAccessSessionCurrent(payload, { status: "ACTIVE", sessionVersion: 3 }), true);
  assert.equal(isAccessSessionCurrent(payload, { status: "ACTIVE", sessionVersion: 4 }), false);
  assert.equal(isAccessSessionCurrent(payload, { status: "LOCKED", sessionVersion: 3 }), false);
  assert.equal(isAccessSessionCurrent(payload, null), false);
});

test("legacy access tokens without a session version fail closed", () => {
  assert.equal(
    isAccessSessionCurrent({ ...payload, sessionVersion: undefined }, { status: "ACTIVE", sessionVersion: 0 }),
    false
  );
});
