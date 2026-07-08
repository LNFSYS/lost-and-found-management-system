import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { env } from "../config/env.js";

interface MatchTrainingRow extends RowDataPacket {
  match_id: string;
  lost_post_id: string;
  found_post_id: string;
  total_score: number;
  text_score: number;
  category_score: number;
  location_score: number;
  time_score: number;
  image_score: number;
  ocr_score: number;
  score_tier: string;
  matcher_version: string;
  explanation_json: string | null;
  lost_title: string;
  lost_description: string;
  lost_category_id: string | null;
  lost_area_id: string | null;
  lost_building_id: string | null;
  lost_room_text: string | null;
  lost_found_at: string | null;
  found_title: string;
  found_description: string;
  found_category_id: string | null;
  found_area_id: string | null;
  found_building_id: string | null;
  found_room_text: string | null;
  found_found_at: string | null;
  lost_tags: string | null;
  found_tags: string | null;
  feedback_labels: string | null;
  impression_count: number;
  click_count: number;
  claim_started_count: number;
}

function exportSecret() {
  const secret = process.env.TRAINING_EXPORT_SECRET ?? env.jwtAccessSecret;
  if (!secret || secret === "YOUR_VALUE_HERE") {
    throw new Error("Set TRAINING_EXPORT_SECRET or JWT_ACCESS_SECRET before exporting training data.");
  }
  return secret;
}

function hashId(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 24);
}

function redactText(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/(\+?84|0)\d{8,10}/g, "[phone]")
    .replace(/\b[a-z]{2}\d{6,12}\b/gi, "[student_or_serial]")
    .slice(0, 2000);
}

function parseExplanation(value: unknown) {
  if (!value) {
    return null;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function main() {
  const secret = exportSecret();
  const [rows] = await dbPool.query<MatchTrainingRow[]>(`
    SELECT
      m.id AS match_id,
      m.lost_post_id,
      m.found_post_id,
      m.total_score,
      m.text_score,
      m.category_score,
      m.location_score,
      m.time_score,
      m.image_score,
      m.ocr_score,
      m.score_tier,
      m.matcher_version,
      m.explanation_json,
      lost.title_normalized AS lost_title,
      lost.description_normalized AS lost_description,
      lost.category_id AS lost_category_id,
      lost.area_id AS lost_area_id,
      lost.building_id AS lost_building_id,
      lost.room_text AS lost_room_text,
      lost.lost_found_at AS lost_found_at,
      found.title_normalized AS found_title,
      found.description_normalized AS found_description,
      found.category_id AS found_category_id,
      found.area_id AS found_area_id,
      found.building_id AS found_building_id,
      found.room_text AS found_room_text,
      found.lost_found_at AS found_found_at,
      lost_tags.tags AS lost_tags,
      found_tags.tags AS found_tags,
      feedback.labels AS feedback_labels,
      COALESCE(impressions.impression_count, 0) AS impression_count,
      COALESCE(impressions.click_count, 0) AS click_count,
      COALESCE(impressions.claim_started_count, 0) AS claim_started_count
    FROM match_results m
    INNER JOIN posts lost ON lost.id = m.lost_post_id
    INNER JOIN posts found ON found.id = m.found_post_id
    LEFT JOIN (
      SELECT post_id, GROUP_CONCAT(CONCAT(source, ':', tag) ORDER BY source, confidence DESC SEPARATOR ' ') AS tags
      FROM ai_tags
      GROUP BY post_id
    ) lost_tags ON lost_tags.post_id = lost.id
    LEFT JOIN (
      SELECT post_id, GROUP_CONCAT(CONCAT(source, ':', tag) ORDER BY source, confidence DESC SEPARATOR ' ') AS tags
      FROM ai_tags
      GROUP BY post_id
    ) found_tags ON found_tags.post_id = found.id
    LEFT JOIN (
      SELECT match_id, GROUP_CONCAT(CONCAT(label, ':', source) ORDER BY updated_at DESC SEPARATOR ',') AS labels
      FROM match_feedback
      GROUP BY match_id
    ) feedback ON feedback.match_id = m.id
    LEFT JOIN (
      SELECT
        match_id,
        COUNT(*) AS impression_count,
        SUM(CASE WHEN action = 'CLICKED' THEN 1 ELSE 0 END) AS click_count,
        SUM(CASE WHEN action = 'CLAIM_STARTED' THEN 1 ELSE 0 END) AS claim_started_count
      FROM match_suggestion_impressions
      GROUP BY match_id
    ) impressions ON impressions.match_id = m.id
    WHERE lost.deleted_at IS NULL
      AND found.deleted_at IS NULL
    ORDER BY m.updated_at DESC, m.created_at DESC
  `);

  const jsonl = rows
    .map((row) =>
      JSON.stringify({
        schemaVersion: 1,
        matchId: hashId(row.match_id, secret),
        lostPostId: hashId(row.lost_post_id, secret),
        foundPostId: hashId(row.found_post_id, secret),
        scores: {
          total: row.total_score,
          text: row.text_score,
          category: row.category_score,
          location: row.location_score,
          time: row.time_score,
          image: row.image_score,
          ocr: row.ocr_score,
          tier: row.score_tier,
          matcherVersion: row.matcher_version
        },
        lost: {
          title: redactText(row.lost_title),
          description: redactText(row.lost_description),
          categoryId: row.lost_category_id ? hashId(row.lost_category_id, secret) : null,
          areaId: row.lost_area_id ? hashId(row.lost_area_id, secret) : null,
          buildingId: row.lost_building_id ? hashId(row.lost_building_id, secret) : null,
          roomText: redactText(row.lost_room_text),
          lostFoundAt: row.lost_found_at,
          tags: redactText(row.lost_tags)
        },
        found: {
          title: redactText(row.found_title),
          description: redactText(row.found_description),
          categoryId: row.found_category_id ? hashId(row.found_category_id, secret) : null,
          areaId: row.found_area_id ? hashId(row.found_area_id, secret) : null,
          buildingId: row.found_building_id ? hashId(row.found_building_id, secret) : null,
          roomText: redactText(row.found_room_text),
          lostFoundAt: row.found_found_at,
          tags: redactText(row.found_tags)
        },
        explanation: parseExplanation(row.explanation_json),
        labels: row.feedback_labels?.split(",").filter(Boolean) ?? [],
        behavior: {
          impressions: row.impression_count,
          clicks: row.click_count,
          claimStarts: row.claim_started_count
        }
      })
    )
    .join("\n");

  const outputDirectory = path.resolve(process.cwd(), "training-exports");
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `match-training-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  await writeFile(outputPath, `${jsonl}\n`, "utf8");
  console.log(`Exported ${rows.length} match rows to ${outputPath}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void dbPool.end();
  });
