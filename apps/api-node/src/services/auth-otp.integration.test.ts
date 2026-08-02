import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { dbPool } from "../config/db.js";
import { userRepository } from "../repositories/user.repository.js";

const runDatabaseIntegration = process.env.AUTH_DB_INTEGRATION === "1";

test("an OTP can be consumed by exactly one concurrent request", {
  skip: runDatabaseIntegration ? false : "set AUTH_DB_INTEGRATION=1 to run against MySQL"
}, async () => {
  const otpId = randomUUID();
  const email = `otp-race-${otpId}@integration.test`;

  try {
    await dbPool.execute(
      `
        INSERT INTO email_verification_otps (
          id, user_id, email, normalized_email, otp_hash, purpose, status,
          attempt_count, max_attempts, expires_at
        )
        VALUES (?, NULL, ?, ?, 'integration-test-hash', 'PASSWORD_RESET', 'PENDING', 1, 5, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE))
      `,
      [otpId, email, email]
    );

    const results = await Promise.all(
      Array.from({ length: 10 }, () => userRepository.consumeOtp(otpId))
    );
    assert.equal(results.filter(Boolean).length, 1);
  } finally {
    await dbPool.execute("DELETE FROM email_verification_otps WHERE id = ?", [otpId]).catch(() => undefined);
  }
});

after(async () => {
  if (runDatabaseIntegration) {
    await dbPool.end();
  }
});
