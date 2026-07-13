import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { containsPrivateOwnershipSignal, protectClaimSecret } from "../services/claim-secret.service.js";

test("claim ownership answer is persisted only as a bcrypt hash", async () => {
  const secret = "IMEI 359876543210123 with a blue sticker";
  const protectedSecret = await protectClaimSecret(secret);

  assert.notEqual(protectedSecret.secretAnswerHash, secret);
  assert.equal(await bcrypt.compare(secret, protectedSecret.secretAnswerHash), true);
  assert.equal(protectedSecret.hasPrivateSignal, true);
});

test("generic ownership text does not fabricate a strong private signal", () => {
  assert.equal(containsPrivateOwnershipSignal("This item belongs to me"), false);
});
