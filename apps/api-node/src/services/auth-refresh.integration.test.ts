import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { env } from "../config/env.js";
import { sha256 } from "../utils/hash.js";
import { HttpError } from "../utils/http-error.js";
import { userRepository } from "../repositories/user.repository.js";
import { authService } from "./auth.service.js";

const runDatabaseIntegration = process.env.AUTH_DB_INTEGRATION === "1";

interface RefreshStateRow extends RowDataPacket {
  id: string;
  token_hash: string;
  revoked_at: string | null;
  replaced_by_token_id: string | null;
}

test("concurrent refresh rotation allows exactly one request to consume the token", {
  skip: runDatabaseIntegration ? false : "set AUTH_DB_INTEGRATION=1 to run against MySQL"
}, async () => {
  const userId = randomUUID();
  const oldTokenId = randomUUID();
  const email = `auth-refresh-${userId}@integration.test`;
  const refreshToken = `integration-${randomUUID()}-${randomUUID()}`;
  const previousJwtSecret = env.jwtAccessSecret;
  env.jwtAccessSecret = previousJwtSecret || "auth-refresh-integration-secret";

  try {
    await dbPool.execute(
      `
        INSERT INTO users (
          id, email, normalized_email, full_name, status, email_verified_at
        )
        VALUES (?, ?, ?, 'Refresh Integration User', 'ACTIVE', UTC_TIMESTAMP())
      `,
      [userId, email, email]
    );
    await userRepository.createRefreshToken({
      id: oldTokenId,
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + 60_000)
    });

    const attempts = await Promise.allSettled([
      authService.refresh({ refreshToken }, { userAgent: "concurrency-a", ipAddress: "127.0.0.1" }),
      authService.refresh({ refreshToken }, { userAgent: "concurrency-b", ipAddress: "127.0.0.1" })
    ]);

    const fulfilled = attempts.filter(
      (attempt): attempt is PromiseFulfilledResult<Awaited<ReturnType<typeof authService.refresh>>> =>
        attempt.status === "fulfilled"
    );
    const rejected = attempts.filter(
      (attempt): attempt is PromiseRejectedResult => attempt.status === "rejected"
    );

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].reason instanceof HttpError);
    assert.equal(rejected[0].reason.statusCode, 401);

    const [rows] = await dbPool.query<RefreshStateRow[]>(
      `
        SELECT id, token_hash, revoked_at, replaced_by_token_id
        FROM refresh_tokens
        WHERE user_id = ?
        ORDER BY created_at, id
      `,
      [userId]
    );
    const activeTokens = rows.filter((row) => row.revoked_at === null);
    const oldToken = rows.find((row) => row.id === oldTokenId);

    assert.equal(rows.length, 2);
    assert.equal(activeTokens.length, 1);
    assert.equal(activeTokens[0].token_hash, sha256(fulfilled[0].value.tokens.refreshToken));
    assert.ok(oldToken?.revoked_at);
    assert.equal(oldToken?.replaced_by_token_id, activeTokens[0].id);
  } finally {
    await dbPool.execute(
      "UPDATE refresh_tokens SET replaced_by_token_id = NULL WHERE user_id = ?",
      [userId]
    ).catch(() => undefined);
    await dbPool.execute("DELETE FROM user_activity_logs WHERE user_id = ?", [userId]).catch(() => undefined);
    await dbPool.execute("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]).catch(() => undefined);
    await dbPool.execute("DELETE FROM users WHERE id = ?", [userId]).catch(() => undefined);
    env.jwtAccessSecret = previousJwtSecret;
  }
});

after(async () => {
  if (runDatabaseIntegration) {
    await dbPool.end();
  }
});
