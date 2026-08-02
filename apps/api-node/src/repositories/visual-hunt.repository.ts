import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { dbPool } from "../config/db.js";
import type { VisualHuntFeedbackInput } from "../validators/visual-hunt.validator.js";
import { HttpError } from "../utils/http-error.js";

export type VisualHuntPostType = "LOST" | "FOUND";
export type VisualHuntTagSource = "VISION_LABEL" | "VISION_OBJECT" | "OCR";

export interface VisualHuntCandidateTag {
  tag: string;
  confidence: number;
  source: VisualHuntTagSource;
}

export interface VisualHuntCandidate {
  id: string;
  type: VisualHuntPostType;
  status: "OPEN" | "MATCHED";
  title: string;
  category: { id: string; name: string | null } | null;
  area: { id: string; name: string | null } | null;
  building: { id: string; name: string | null } | null;
  lostFoundAt: string | null;
  createdAt: string;
  tags: VisualHuntCandidateTag[];
}

export interface VisualHuntCandidateQuery {
  targetType?: VisualHuntPostType;
  categoryId?: string;
  areaId?: string;
  priorityTerms: string[];
  candidateLimit: number;
}

interface CandidateIdRow extends RowDataPacket {
  id: string;
}

interface CandidateRow extends RowDataPacket {
  id: string;
  type: VisualHuntPostType;
  status: "OPEN" | "MATCHED";
  title: string;
  category_id: string | null;
  category_name: string | null;
  area_id: string | null;
  area_name: string | null;
  building_id: string | null;
  building_name: string | null;
  lost_found_at: string | null;
  created_at: string;
  tag: string | null;
  confidence: number | null;
  source: VisualHuntTagSource | null;
}

function boundedTerms(terms: string[]) {
  return Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean))).slice(0, 60);
}

export const visualHuntRepository = {
  async recordFeedback(actorId: string, input: VisualHuntFeedbackInput) {
    const [posts] = await dbPool.query<Array<RowDataPacket & { id: string }>>(
      `SELECT id FROM posts
       WHERE id = ? AND deleted_at IS NULL AND status IN ('OPEN', 'MATCHED')
       LIMIT 1`,
      [input.postId]
    );
    if (!posts[0]) throw new HttpError(404, "Visual Hunt candidate post not found");
    const id = randomUUID();
    await dbPool.execute<ResultSetHeader>(
      `INSERT INTO visual_hunt_feedback (id, actor_id, post_id, decision, similarity_score, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, actorId, input.postId, input.decision, input.similarityScore ?? null, input.source]
    );
    return { id, ...input };
  },

  async listCandidates(input: VisualHuntCandidateQuery): Promise<VisualHuntCandidate[]> {
    const where = [
      "p.status IN ('OPEN', 'MATCHED')",
      "p.deleted_at IS NULL"
    ];
    const whereValues: Array<string> = [];
    if (input.targetType) {
      where.push("p.type = ?");
      whereValues.push(input.targetType);
    }
    if (input.categoryId) {
      where.push("p.category_id = ?");
      whereValues.push(input.categoryId);
    }
    if (input.areaId) {
      where.push("p.area_id = ?");
      whereValues.push(input.areaId);
    }

    const priorityTerms = boundedTerms(input.priorityTerms);
    const priorityExpression = priorityTerms.length > 0
      ? `MAX(CASE WHEN tags.tag IN (${priorityTerms.map(() => "?").join(", ")}) THEN tags.confidence ELSE 0 END)`
      : "0";
    const candidateLimit = Math.max(1, Math.min(200, Math.trunc(input.candidateLimit)));
    const [idRows] = await dbPool.query<CandidateIdRow[]>(
      `
        SELECT p.id
        FROM posts p
        LEFT JOIN ai_tags tags
          ON tags.post_id = p.id
          AND tags.source IN ('VISION_LABEL', 'VISION_OBJECT', 'OCR')
        WHERE ${where.join(" AND ")}
        GROUP BY p.id
        ORDER BY ${priorityExpression} DESC, MAX(p.created_at) DESC
        LIMIT ?
      `,
      [...whereValues, ...priorityTerms, candidateLimit]
    );

    const candidateIds = idRows.map((row) => row.id);
    if (candidateIds.length === 0) {
      return [];
    }

    const placeholders = candidateIds.map(() => "?").join(", ");
    const [rows] = await dbPool.query<CandidateRow[]>(
      `
        SELECT
          p.id, p.type, p.status, p.title,
          p.category_id, category.name AS category_name,
          p.area_id, area.name AS area_name,
          p.building_id, building.name AS building_name,
          p.lost_found_at, p.created_at,
          tags.tag, tags.confidence, tags.source
        FROM posts p
        LEFT JOIN item_categories category ON category.id = p.category_id
        LEFT JOIN campus_areas area ON area.id = p.area_id
        LEFT JOIN campus_buildings building ON building.id = p.building_id
        LEFT JOIN ai_tags tags
          ON tags.post_id = p.id
          AND tags.source IN ('VISION_LABEL', 'VISION_OBJECT', 'OCR')
        WHERE p.id IN (${placeholders})
          AND p.status IN ('OPEN', 'MATCHED')
          AND p.deleted_at IS NULL
        ORDER BY FIELD(p.id, ${placeholders}), tags.confidence DESC, tags.tag
      `,
      [...candidateIds, ...candidateIds]
    );

    const candidates = new Map<string, VisualHuntCandidate>();
    for (const row of rows) {
      let candidate = candidates.get(row.id);
      if (!candidate) {
        candidate = {
          id: row.id,
          type: row.type,
          status: row.status,
          title: row.title,
          category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
          area: row.area_id ? { id: row.area_id, name: row.area_name } : null,
          building: row.building_id ? { id: row.building_id, name: row.building_name } : null,
          lostFoundAt: row.lost_found_at,
          createdAt: row.created_at,
          tags: []
        };
        candidates.set(row.id, candidate);
      }
      if (row.tag && row.source && row.confidence !== null) {
        candidate.tags.push({
          tag: row.tag,
          confidence: Number(row.confidence),
          source: row.source
        });
      }
    }

    return candidateIds.flatMap((id) => {
      const candidate = candidates.get(id);
      return candidate ? [candidate] : [];
    });
  }
};
