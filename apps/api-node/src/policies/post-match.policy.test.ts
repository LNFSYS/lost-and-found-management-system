import assert from "node:assert/strict";
import test from "node:test";
import { canReadPostMatches } from "./post-match.policy.js";

const auth = (sub: string, roles: string[]) => ({ sub, roles, email: `${sub}@example.com` });

test("post owner and operational reviewers can read match details", () => {
  assert.equal(canReadPostMatches(auth("owner", ["USER"]), "owner"), true);
  assert.equal(canReadPostMatches(auth("staff", ["STAFF"]), "owner"), true);
  assert.equal(canReadPostMatches(auth("admin", ["ADMIN"]), "owner"), true);
});

test("unrelated authenticated users cannot read match details", () => {
  assert.equal(canReadPostMatches(auth("viewer", ["USER", "STUDENT"]), "owner"), false);
});
