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
    ["chat_messages", "is_read"]
  ] as const) {
    await assertColumn(tableName, columnName);
  }

  const migrationCount = await count("SELECT COUNT(*) AS total FROM schema_migrations", []);
  if (migrationCount < 14) {
    throw new Error(`Expected at least 14 applied migrations, got ${migrationCount}`);
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
