import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import type { SearchCompanionField } from "../validators/search-companion.validator.js";

type SearchAnswers = Partial<Record<SearchCompanionField, string | string[]>>;

interface SearchProfileRow extends RowDataPacket {
  id: string;
  post_id: string;
  owner_id: string;
  answers_json: string | Buffer | SearchAnswers;
  skipped_fields_json: string | Buffer | SearchCompanionField[] | null;
  revision: number;
  applied_revision: number;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(value: string | Buffer | T | null, fallback: T): T {
  if (value === null) return fallback;
  if (typeof value === "object" && !Buffer.isBuffer(value)) return value as T;
  try {
    const serialized = Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
    return JSON.parse(serialized) as T;
  } catch {
    return fallback;
  }
}

function mapProfile(row: SearchProfileRow) {
  return {
    id: row.id,
    postId: row.post_id,
    ownerId: row.owner_id,
    answers: parseJson<SearchAnswers>(row.answers_json, {}),
    skippedFields: parseJson<SearchCompanionField[]>(row.skipped_fields_json, []),
    revision: Number(row.revision),
    appliedRevision: Number(row.applied_revision),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const searchCompanionRepository = {
  async findByPost(postId: string) {
    const [rows] = await dbPool.query<SearchProfileRow[]>(
      `SELECT id, post_id, owner_id, answers_json, skipped_fields_json, revision, applied_revision, created_at, updated_at
       FROM lost_search_profiles WHERE post_id = ? LIMIT 1`,
      [postId]
    );
    return rows[0] ? mapProfile(rows[0]) : null;
  },

  async saveAnswer(input: {
    postId: string;
    ownerId: string;
    answers: SearchAnswers;
    skippedFields: SearchCompanionField[];
  }) {
    await dbPool.execute(
      `INSERT INTO lost_search_profiles (id, post_id, owner_id, answers_json, skipped_fields_json)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         answers_json = VALUES(answers_json),
         skipped_fields_json = VALUES(skipped_fields_json),
         revision = revision + 1,
         updated_at = UTC_TIMESTAMP()`,
      [randomUUID(), input.postId, input.ownerId, JSON.stringify(input.answers), JSON.stringify(input.skippedFields)]
    );
    return this.findByPost(input.postId);
  },

  async markApplied(postId: string, revision: number) {
    await dbPool.execute(
      `UPDATE lost_search_profiles
       SET applied_revision = GREATEST(applied_revision, ?), updated_at = UTC_TIMESTAMP()
       WHERE post_id = ?`,
      [revision, postId]
    );
    return this.findByPost(postId);
  }
};

export type LostSearchProfile = NonNullable<Awaited<ReturnType<typeof searchCompanionRepository.findByPost>>>;
