import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { env } from "../config/env.js";

const requestedCount = Number(process.env.PERF_DATASET_SIZE ?? 10_000);
const batchSize = 500;

function assertSafeTarget() {
  if (process.env.ALLOW_PERF_SEED !== "true") {
    throw new Error("Set ALLOW_PERF_SEED=true to generate synthetic performance data.");
  }
  if (!/(^|_)(ci|test|perf)(_|$)/i.test(env.db.name)) {
    throw new Error(`Refusing to seed performance data into non-test database: ${env.db.name}`);
  }
  if (!Number.isInteger(requestedCount) || requestedCount < 1_000 || requestedCount > 100_000) {
    throw new Error("PERF_DATASET_SIZE must be an integer between 1000 and 100000.");
  }
}

async function requiredReference(query: string, label: string) {
  const [rows] = await dbPool.query<Array<RowDataPacket & { id: string }>>(query);
  const id = rows[0]?.id;
  if (!id) {
    throw new Error(`Missing ${label}; run the demo seed first.`);
  }
  return id;
}

async function main() {
  assertSafeTarget();
  const [userId, categoryId, areaId, buildingId] = await Promise.all([
    requiredReference("SELECT id FROM users WHERE status = 'ACTIVE' ORDER BY created_at LIMIT 1", "active user"),
    requiredReference("SELECT id FROM item_categories WHERE is_active = TRUE AND parent_id IS NOT NULL ORDER BY sort_order, name LIMIT 1", "category"),
    requiredReference("SELECT id FROM campus_areas WHERE is_active = TRUE ORDER BY name LIMIT 1", "campus area"),
    requiredReference("SELECT id FROM campus_buildings WHERE is_active = TRUE ORDER BY name LIMIT 1", "campus building")
  ]);

  await dbPool.execute(
    `
      DELETE mr
      FROM match_results mr
      INNER JOIN posts p ON p.id = mr.lost_post_id OR p.id = mr.found_post_id
      WHERE p.title LIKE 'PERF-%'
    `
  );
  await dbPool.execute(
    `
      DELETE mj
      FROM matching_jobs mj
      INNER JOIN posts p ON p.id = mj.post_id
      WHERE p.title LIKE 'PERF-%'
    `
  );
  await dbPool.execute("DELETE FROM posts WHERE title LIKE 'PERF-%'");
  const startedAt = Date.now();
  let firstLostPostId: string | null = null;

  for (let offset = 0; offset < requestedCount; offset += batchSize) {
    const size = Math.min(batchSize, requestedCount - offset);
    const placeholders = Array.from({ length: size }, () => "(?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values: Array<string | Date> = [];
    for (let index = 0; index < size; index += 1) {
      const sequence = offset + index;
      const id = randomUUID();
      const type = sequence % 2 === 0 ? "LOST" : "FOUND";
      if (!firstLostPostId && type === "LOST") {
        firstLostPostId = id;
      }
      const family = sequence % 20;
      const title = `PERF-${type}-${sequence}-item-${family}`;
      const description = `Synthetic campus performance item family ${family} color blue serial PERF${sequence}`;
      const occurredAt = new Date(Date.now() - (sequence % 120) * 60 * 60 * 1000);
      values.push(
        id,
        userId,
        type,
        title,
        title.toLowerCase(),
        description,
        description.toLowerCase(),
        categoryId,
        areaId,
        buildingId,
        `PERF-${sequence % 50}`,
        "performance@example.invalid",
        occurredAt,
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - sequence * 1000)
      );
    }
    await dbPool.execute(
      `
        INSERT INTO posts (
          id, user_id, type, status, title, title_normalized, description, description_normalized,
          category_id, area_id, building_id, room_text, contact_info, lost_found_at, expires_at, created_at
        )
        VALUES ${placeholders}
      `,
      values
    );
  }

  if (firstLostPostId) {
    await dbPool.execute(
      `
        INSERT INTO matching_jobs (post_id, available_at)
        VALUES (?, UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE requested_version = requested_version + 1, status = 'PENDING', available_at = UTC_TIMESTAMP()
      `,
      [firstLostPostId]
    );
  }

  console.log(JSON.stringify({
    database: env.db.name,
    insertedPosts: requestedCount,
    matchingProbePostId: firstLostPostId,
    durationMs: Date.now() - startedAt
  }, null, 2));
}

main()
  .finally(() => dbPool.end())
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
