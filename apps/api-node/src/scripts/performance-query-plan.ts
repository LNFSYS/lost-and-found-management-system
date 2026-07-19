import fs from "node:fs/promises";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

const outputPath = process.env.PERF_QUERY_PLAN_OUTPUT ?? "performance-query-plan.json";

async function explain(sql: string, values: unknown[] = []) {
  const [rows] = await dbPool.query<RowDataPacket[]>(`EXPLAIN ANALYZE ${sql}`, values);
  return rows.map((row) => Object.values(row).join(" "));
}

async function main() {
  const [sourceRows] = await dbPool.query<Array<RowDataPacket & {
    id: string;
    category_id: string | null;
    area_id: string | null;
    building_id: string | null;
    lost_found_at: string | null;
  }>>(
    `
      SELECT id, category_id, area_id, building_id, lost_found_at
      FROM posts
      WHERE title LIKE 'PERF-LOST-%'
      ORDER BY created_at DESC
      LIMIT 1
    `
  );
  const source = sourceRows[0];
  if (!source) {
    throw new Error("Performance dataset is missing.");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    feed: await explain(
      `
        SELECT id, type, status, title, category_id, area_id, building_id, created_at
        FROM posts
        WHERE deleted_at IS NULL AND status IN ('OPEN', 'MATCHED')
        ORDER BY created_at DESC
        LIMIT 12
      `
    ),
    matchingCandidates: await explain(
      `
        SELECT p.id
        FROM posts p
        LEFT JOIN item_categories c ON c.id = p.category_id
        WHERE p.type = 'FOUND'
          AND p.id <> ?
          AND p.status IN ('OPEN', 'MATCHED')
          AND p.deleted_at IS NULL
          AND (
            p.category_id = ?
            OR p.area_id = ?
            OR p.building_id = ?
            OR ABS(DATEDIFF(p.lost_found_at, ?)) <= 120
          )
        ORDER BY
          (p.category_id = ?) DESC,
          (p.building_id = ?) DESC,
          COALESCE(ABS(TIMESTAMPDIFF(HOUR, p.lost_found_at, ?)), 999999999) ASC,
          p.created_at DESC
        LIMIT 500
      `,
      [
        source.id,
        source.category_id,
        source.area_id,
        source.building_id,
        source.lost_found_at,
        source.category_id,
        source.building_id,
        source.lost_found_at
      ]
    )
  };

  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Saved query-plan evidence to ${outputPath}`);
}

main()
  .finally(() => dbPool.end())
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
