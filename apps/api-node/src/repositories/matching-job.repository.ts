import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

interface MatchingJobRow extends RowDataPacket {
  post_id: string;
  requested_version: number;
  attempts: number;
}

export const matchingJobRepository = {
  async enqueue(postId: string) {
    await dbPool.execute(
      `
        INSERT INTO matching_jobs (post_id, available_at)
        VALUES (?, UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE
          requested_version = requested_version + 1,
          status = IF(status = 'PROCESSING', 'PROCESSING', 'PENDING'),
          attempts = IF(status = 'PROCESSING', attempts, 0),
          available_at = UTC_TIMESTAMP(),
          last_error = NULL,
          updated_at = UTC_TIMESTAMP()
      `,
      [postId]
    );
  },

  async claimBatch(limit = 5) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          UPDATE matching_jobs
          SET status = 'PENDING', locked_at = NULL, available_at = UTC_TIMESTAMP()
          WHERE status = 'PROCESSING'
            AND locked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)
        `
      );
      const [rows] = await connection.query<MatchingJobRow[]>(
        `
          SELECT post_id, requested_version, attempts
          FROM matching_jobs
          WHERE status IN ('PENDING', 'FAILED')
            AND requested_version > processed_version
            AND available_at <= UTC_TIMESTAMP()
            AND attempts < 5
          ORDER BY available_at, updated_at
          LIMIT ?
          FOR UPDATE SKIP LOCKED
        `,
        [limit]
      );
      if (rows.length > 0) {
        const placeholders = rows.map(() => "?").join(", ");
        await connection.execute(
          `
            UPDATE matching_jobs
            SET status = 'PROCESSING', attempts = attempts + 1, locked_at = UTC_TIMESTAMP()
            WHERE post_id IN (${placeholders})
          `,
          rows.map((row) => row.post_id)
        );
      }
      await connection.commit();
      return rows.map((row) => ({
        postId: row.post_id,
        requestedVersion: Number(row.requested_version),
        attempt: Number(row.attempts) + 1
      }));
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    } finally {
      connection.release();
    }
  },

  async complete(postId: string, processedVersion: number) {
    await dbPool.execute(
      `
        UPDATE matching_jobs
        SET processed_version = GREATEST(processed_version, ?),
            status = IF(requested_version > ?, 'PENDING', 'COMPLETED'),
            attempts = IF(requested_version > ?, 0, attempts),
            available_at = IF(requested_version > ?, UTC_TIMESTAMP(), available_at),
            locked_at = NULL,
            last_error = NULL,
            updated_at = UTC_TIMESTAMP()
        WHERE post_id = ?
      `,
      [processedVersion, processedVersion, processedVersion, processedVersion, postId]
    );
  },

  async fail(postId: string, attempt: number, error: unknown) {
    const message = (error instanceof Error ? error.message : "Unknown matching worker error").slice(0, 1000);
    await dbPool.execute(
      `
        UPDATE matching_jobs
        SET status = IF(? >= 5, 'FAILED', 'PENDING'),
            available_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL LEAST(?, 5) MINUTE),
            locked_at = NULL,
            last_error = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE post_id = ?
      `,
      [attempt, attempt, message, postId]
    );
  }
};

async function rollbackQuietly(connection: PoolConnection) {
  try {
    await connection.rollback();
  } catch {
    // Preserve the original database error.
  }
}
