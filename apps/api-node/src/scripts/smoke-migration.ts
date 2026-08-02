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

async function assertIndex(tableName: string, indexName: string) {
  const total = await count(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = ? AND index_name = ?
    `,
    [env.db.name, tableName, indexName]
  );
  if (total === 0) {
    throw new Error(`Missing index: ${tableName}.${indexName}`);
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
    "config_history",
    "item_verification_questions",
    "claim_verification_answers",
    "claim_verification_assignments",
    "visual_hunt_feedback",
    "campus_radar_events",
    "campus_radar_alerts",
    "campus_radar_audit_logs"
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
    ["return_appointments", "active_claim_id"],
    ["users", "session_version"],
    ["schema_migrations", "checksum_sha256"],
    ["schema_migrations", "status"],
    ["notifications", "dedupe_key"],
    ["item_verification_questions", "expected_answer_hash"],
    ["item_verification_questions", "active_post_id"],
    ["claim_verification_answers", "is_match"],
    ["claim_verification_answers", "attempt_count"],
    ["item_verification_questions", "options_json"],
    ["visual_hunt_feedback", "decision"],
    ["visual_hunt_feedback", "similarity_score"],
    ["campus_radar_events", "source_reference"],
    ["campus_radar_alerts", "fingerprint"],
    ["campus_radar_alerts", "cooldown_until"],
    ["campus_radar_alerts", "observed_count"],
    ["campus_radar_alerts", "z_score"],
    ["campus_radar_audit_logs", "metadata"]
  ] as const) {
    await assertColumn(tableName, columnName);
  }

  await assertMissingColumn("claims", "secret_answer");
  await assertUniqueIndex("claims", "uq_claims_one_accepted_per_post");
  await assertUniqueIndex("return_appointments", "uq_return_appointments_one_active_claim");
  await assertUniqueIndex("notifications", "uq_notifications_dedupe_key");
  await assertUniqueIndex("item_verification_questions", "uq_item_verification_active_post");
  await assertUniqueIndex("claim_verification_answers", "uq_claim_verification_answer");
  await assertUniqueIndex("campus_radar_alerts", "uq_campus_radar_alert_fingerprint");
  await assertIndex("claims", "idx_claims_post_status");
  await assertIndex("return_appointments", "idx_return_appointments_post_status");
  await assertIndex("campus_radar_events", "idx_campus_radar_events_location_time");
  await assertIndex("campus_radar_alerts", "idx_campus_radar_alerts_status_severity");
  await assertIndex("campus_radar_audit_logs", "idx_campus_radar_audit_event_created");

  const migrationCount = await count("SELECT COUNT(*) AS total FROM schema_migrations", []);
  if (migrationCount < 33) {
    throw new Error(`Expected at least 33 applied migrations, got ${migrationCount}`);
  }

  const aiFeatureFlags = await count(
    "SELECT COUNT(*) AS total FROM config_entries WHERE config_key IN (?, ?, ?)",
    ["ai.verification_questions_enabled", "ai.campus_radar_enabled", "ai.visual_hunt_enabled"]
  );
  if (aiFeatureFlags !== 3) {
    throw new Error(`Expected 3 AI feature flags, got ${aiFeatureFlags}`);
  }

  const aiThresholds = await count(
    "SELECT COUNT(*) AS total FROM config_entries WHERE config_key IN (?, ?, ?, ?)",
    [
      "ai.radar.minimum_observed_count",
      "ai.radar.minimum_z_score",
      "ai.radar.minimum_observed_ratio",
      "ai.visual_hunt.candidate_threshold"
    ]
  );
  if (aiThresholds !== 4) {
    throw new Error(`Expected 4 AI operational thresholds, got ${aiThresholds}`);
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
