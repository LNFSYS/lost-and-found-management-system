import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

export interface FinderScanCandidateSnapshot {
  postId: string;
  score: number | null;
  tier: "WEAK" | "SUGGESTION" | "NOTIFY" | "HIGH_CONFIDENCE" | "FILTER_ONLY";
  title: string;
  category: { id: string; name: string | null } | null;
  area: { id: string; name: string | null } | null;
  building: { id: string; name: string | null } | null;
  lostFoundAt: string | null;
}

interface FinderScanRow extends RowDataPacket {
  id: string;
  actor_id: string;
  idempotency_key: string;
  status: "ANALYZED" | "DRAFT_READY" | "PUBLISHED" | "EXPIRED";
  draft_json: string | Buffer | Record<string, unknown>;
  candidates_json: string | Buffer | FinderScanCandidateSnapshot[];
  provider_status: "AVAILABLE" | "FALLBACK";
  provider_reason: string | null;
  selected_lost_post_id: string | null;
  created_post_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(value: string | Buffer | T, fallback: T): T {
  if (typeof value === "object" && !Buffer.isBuffer(value)) return value as T;
  try {
    const serialized = Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
    return JSON.parse(serialized) as T;
  } catch {
    return fallback;
  }
}

function mapSession(row: FinderScanRow) {
  return {
    id: row.id,
    actorId: row.actor_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    draft: parseJson<Record<string, unknown>>(row.draft_json, {}),
    candidates: parseJson<FinderScanCandidateSnapshot[]>(row.candidates_json, []),
    providerStatus: row.provider_status,
    providerReason: row.provider_reason,
    selectedLostPostId: row.selected_lost_post_id,
    createdPostId: row.created_post_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const selectSession = `SELECT id, actor_id, idempotency_key, status, draft_json, candidates_json,
  provider_status, provider_reason, selected_lost_post_id, created_post_id, expires_at, created_at, updated_at
  FROM finder_scan_sessions`;

async function findOnConnection(connection: PoolConnection, id: string, actorId: string, lock = false) {
  const [rows] = await connection.query<FinderScanRow[]>(
    `${selectSession} WHERE id = ? AND actor_id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [id, actorId]
  );
  return rows[0] ? mapSession(rows[0]) : null;
}

export const finderQuickScanRepository = {
  async findById(id: string, actorId: string) {
    const [rows] = await dbPool.query<FinderScanRow[]>(
      `${selectSession} WHERE id = ? AND actor_id = ? LIMIT 1`,
      [id, actorId]
    );
    return rows[0] ? mapSession(rows[0]) : null;
  },

  async findByIdempotencyKey(actorId: string, idempotencyKey: string) {
    const [rows] = await dbPool.query<FinderScanRow[]>(
      `${selectSession} WHERE actor_id = ? AND idempotency_key = ? LIMIT 1`,
      [actorId, idempotencyKey]
    );
    return rows[0] ? mapSession(rows[0]) : null;
  },

  async create(input: {
    actorId: string;
    idempotencyKey: string;
    draft: Record<string, unknown>;
    candidates: FinderScanCandidateSnapshot[];
    providerStatus: "AVAILABLE" | "FALLBACK";
    providerReason?: string | null;
  }) {
    const id = randomUUID();
    await dbPool.execute(
      `INSERT IGNORE INTO finder_scan_sessions (
         id, actor_id, idempotency_key, draft_json, candidates_json, provider_status, provider_reason, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR))`,
      [id, input.actorId, input.idempotencyKey, JSON.stringify(input.draft), JSON.stringify(input.candidates), input.providerStatus, input.providerReason ?? null]
    );
    return this.findByIdempotencyKey(input.actorId, input.idempotencyKey);
  },

  async markDraftReady(id: string, actorId: string, selectedLostPostId: string | null) {
    await dbPool.execute(
      `UPDATE finder_scan_sessions
       SET status = 'DRAFT_READY', selected_lost_post_id = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ? AND actor_id = ? AND status IN ('ANALYZED', 'DRAFT_READY') AND expires_at > UTC_TIMESTAMP()`,
      [selectedLostPostId, id, actorId]
    );
    return this.findById(id, actorId);
  },

  async withLockedSession<T>(id: string, actorId: string, work: (connection: PoolConnection, session: NonNullable<Awaited<ReturnType<typeof findOnConnection>>>) => Promise<T>) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const session = await findOnConnection(connection, id, actorId, true);
      if (!session) {
        await connection.rollback();
        return null;
      }
      const result = await work(connection, session);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async markPublishedOnConnection(connection: PoolConnection, id: string, postId: string) {
    await connection.execute(
      `UPDATE finder_scan_sessions
       SET status = 'PUBLISHED', created_post_id = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [postId, id]
    );
  }
};

export type FinderScanSession = NonNullable<Awaited<ReturnType<typeof finderQuickScanRepository.findById>>>;
