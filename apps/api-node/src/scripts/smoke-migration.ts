import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { env } from "../config/env.js";

interface CountRow extends RowDataPacket {
  total: number;
}

async function count(query: string, params: unknown[]) {
  const [rows] = await dbPool.query<CountRow[]>(query, params);
  return Number(rows[0]?.total ?? 0);
}

async function assertTable(tableName: string) {
  const total = await count(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
    `,
    [env.db.name, tableName]
  );
  if (total === 0) {
    throw new Error(`Missing table: ${tableName}`);
  }
}

async function assertColumn(tableName: string, columnName: string) {
  const total = await count(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
    `,
    [env.db.name, tableName, columnName]
  );
  if (total === 0) {
    throw new Error(`Missing column: ${tableName}.${columnName}`);
  }
}

async function assertMissingColumn(tableName: string, columnName: string) {
  const total = await count(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
    `,
    [env.db.name, tableName, columnName]
  );
  if (total !== 0) {
    throw new Error(`Sensitive legacy column must be removed: ${tableName}.${columnName}`);
  }
}

async function assertUniqueIndex(tableName: string, indexName: string) {
  const total = await count(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = ? AND index_name = ? AND non_unique = 0
    `,
    [env.db.name, tableName, indexName]
  );
  if (total === 0) {
    throw new Error(`Missing unique index: ${tableName}.${indexName}`);
  }
}

async function main() {
  for (const table of [
    "users",
    "roles",
    "posts",
    "match_results",
    "claims",
    "claim_evidence",
    "return_appointments",
    "handover_points",
    "warehouse_items",
    "notifications",
    "chat_rooms",
    "chat_messages",
    "match_feedback",
    "match_suggestion_impressions",
    "matching_jobs",
    "return_feedback",
    "config_entries",
    "config_history"
  ]) {
    await assertTable(table);
  }

  for (const [tableName, columnName] of [
    ["handover_points", "map_position_x"],
    ["handover_points", "map_position_y"],
    ["warehouse_items", "retention_deadline"],
    ["post_media", "media_kind"],
    ["post_media", "thumbnail_url"],
    ["post_media", "optimized_url"],
    ["chat_messages", "is_read"],
    ["match_results", "image_score"],
    ["match_results", "ocr_score"],
    ["match_results", "score_tier"],
    ["match_results", "matcher_version"],
    ["match_results", "explanation_json"],
    ["return_feedback", "rating"],
    ["return_feedback", "status"],
    ["return_appointments", "proof_image_url"],
    ["return_appointments", "proof_uploaded_by"],
    ["return_appointments", "proof_uploaded_at"],
    ["return_appointments", "proof_note"],
    ["claims", "secret_answer_hash"],
    ["claims", "has_private_signal"],
    ["claims", "accepted_post_id"],
    ["return_appointments", "active_claim_id"]
  ] as const) {
    await assertColumn(tableName, columnName);
  }

  await assertMissingColumn("claims", "secret_answer");
  await assertUniqueIndex("claims", "uq_claims_one_accepted_per_post");
  await assertUniqueIndex("return_appointments", "uq_return_appointments_one_active_claim");

  const migrationCount = await count("SELECT COUNT(*) AS total FROM schema_migrations", []);
  if (migrationCount < 25) {
    throw new Error(`Expected at least 25 applied migrations, got ${migrationCount}`);
  }

  console.log(`Migration smoke passed on database ${env.db.name}. Applied migrations: ${migrationCount}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void dbPool.end();
  });
