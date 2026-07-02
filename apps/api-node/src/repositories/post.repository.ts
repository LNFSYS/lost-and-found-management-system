import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { dbPool } from "../config/db.js";
import { notificationRepository } from "./notification.repository.js";
import type { ListPostsQuery } from "../validators/post.validator.js";

export type PostType = "LOST" | "FOUND";
export type PostStatus = "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "EXPIRED" | "HIDDEN";

interface PostRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: PostType;
  status: PostStatus;
  title: string;
  description: string;
  category_id: string | null;
  category_name: string | null;
  area_id: string | null;
  area_name: string | null;
  building_id: string | null;
  building_name: string | null;
  room_text: string | null;
  room_name: string | null;
  custom_location: string | null;
  contact_info: string | null;
  lost_found_at: string | null;
  handover_point_id: string | null;
  handover_point_name: string | null;
  resolved_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  owner_name: string;
  cover_image_url: string | null;
}

interface MediaRow extends RowDataPacket {
  id: string;
  secure_url: string;
  public_id: string;
  resource_type: string;
  media_kind: "ITEM" | "EVIDENCE";
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  sort_order: number;
  created_at: string;
}

interface AiTagRow extends RowDataPacket {
  id: string;
  tag: string;
  confidence: number;
  source: "VISION_LABEL" | "VISION_OBJECT" | "OCR" | "MANUAL";
  created_at: string;
}

interface MatchRow extends RowDataPacket {
  id: string;
  lost_post_id: string;
  found_post_id: string;
  total_score: number;
  text_score: number;
  category_score: number;
  location_score: number;
  time_score: number;
  is_notified: number;
  created_at: string;
}

interface MatchPostRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: PostType;
  title: string;
  status: PostStatus;
  title_normalized: string;
  description_normalized: string;
  ai_tag_text: string | null;
  image_tag_text: string | null;
  ocr_tag_text: string | null;
  category_id: string | null;
  parent_category_id: string | null;
  area_id: string | null;
  building_id: string | null;
  room_text: string | null;
  lost_found_at: string | null;
}

interface CategorySuggestionRow extends RowDataPacket {
  id: string;
  name: string;
  name_normalized: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface MediaOwnerRow extends RowDataPacket {
  id: string;
  post_id: string;
  user_id: string;
  public_id: string;
}

interface ConfigNumberRow extends RowDataPacket {
  config_value: string;
}

interface ExpiringPostRow extends RowDataPacket {
  id: string;
  user_id: string;
  title: string;
}

export interface MatchCandidatePost {
  id: string;
  userId: string;
  type: PostType;
  title: string;
  status: PostStatus;
  text: string;
  imageText: string;
  ocrText: string;
  categoryId: string | null;
  parentCategoryId: string | null;
  areaId: string | null;
  buildingId: string | null;
  roomText: string | null;
  lostFoundAt: string | null;
}

type CreatePostRecord = {
  id: string;
  userId: string;
  type: PostType;
  title: string;
  titleNormalized: string;
  description: string;
  descriptionNormalized: string;
  categoryId: string;
  areaId?: string | null;
  buildingId?: string | null;
  roomText?: string | null;
  customLocation?: string | null;
  contactInfo?: string | null;
  lostFoundAt?: Date | null;
  handoverPointId?: string | null;
  secretVerificationHash?: string | null;
  expiresAt?: Date | null;
};

type UpdatePostRecord = Partial<Omit<CreatePostRecord, "id" | "userId">>;

function mapPost(row: PostRow) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name
        }
      : null,
    location: {
      areaId: row.area_id,
      areaName: row.area_name,
      buildingId: row.building_id,
      buildingName: row.building_name,
      roomText: row.room_text,
      roomName: row.room_name,
      customLocation: row.custom_location
    },
    contactInfo: row.contact_info,
    lostFoundAt: row.lost_found_at,
    handoverPoint: row.handover_point_id
      ? {
          id: row.handover_point_id,
          name: row.handover_point_name
        }
      : null,
    resolvedAt: row.resolved_at,
    viewCount: row.view_count,
    owner: {
      id: row.user_id,
      fullName: row.owner_name
    },
    coverImageUrl: row.cover_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function basePostSelect() {
  return `
    SELECT
      p.id, p.user_id, p.type, p.status, p.title, p.description,
      p.category_id, c.name AS category_name,
      p.area_id, a.name AS area_name,
      p.building_id, b.name AS building_name,
      p.room_text, p.room_text AS room_name,
      p.custom_location, p.contact_info, p.lost_found_at,
      p.handover_point_id, hp.name AS handover_point_name,
      p.resolved_at, p.view_count, p.created_at, p.updated_at,
      u.full_name AS owner_name,
      (
        SELECT pm.secure_url
        FROM post_media pm
        WHERE pm.post_id = p.id
        ORDER BY pm.sort_order ASC, pm.created_at ASC, pm.id ASC
        LIMIT 1
      ) AS cover_image_url
    FROM posts p
    INNER JOIN users u ON u.id = p.user_id
    LEFT JOIN item_categories c ON c.id = p.category_id
    LEFT JOIN campus_areas a ON a.id = p.area_id
    LEFT JOIN campus_buildings b ON b.id = p.building_id
    LEFT JOIN handover_points hp ON hp.id = p.handover_point_id
  `;
}

function buildListWhere(query: ListPostsQuery, userId?: string) {
  const where = ["p.deleted_at IS NULL"];
  const values: unknown[] = [];

  if (!query.status) {
    where.push("p.status <> 'HIDDEN'");
  }
  if (userId) {
    where.push("p.user_id = ?");
    values.push(userId);
  }
  if (query.q) {
    where.push("(p.title_normalized LIKE ? OR p.description_normalized LIKE ?)");
    values.push(`%${query.q}%`, `%${query.q}%`);
  }
  if (query.type) {
    where.push("p.type = ?");
    values.push(query.type);
  }
  if (query.status) {
    where.push("p.status = ?");
    values.push(query.status);
  }
  if (query.categoryId) {
    where.push("(p.category_id = ? OR p.category_id IN (SELECT id FROM item_categories WHERE parent_id = ?))");
    values.push(query.categoryId, query.categoryId);
  }
  if (query.areaId) {
    where.push("p.area_id = ?");
    values.push(query.areaId);
  }
  if (query.buildingId) {
    where.push("p.building_id = ?");
    values.push(query.buildingId);
  }
  if (query.from) {
    where.push("p.lost_found_at >= ?");
    values.push(new Date(query.from));
  }
  if (query.to) {
    where.push("p.lost_found_at <= ?");
    values.push(new Date(query.to));
  }

  return { clause: where.join(" AND "), values };
}

function mapMatchPost(row: MatchPostRow): MatchCandidatePost {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    status: row.status,
    text: `${row.title_normalized} ${row.description_normalized} ${row.room_text ?? ""}`.trim(),
    imageText: row.image_tag_text ?? "",
    ocrText: row.ocr_tag_text ?? "",
    categoryId: row.category_id,
    parentCategoryId: row.parent_category_id,
    areaId: row.area_id,
    buildingId: row.building_id,
    roomText: row.room_text,
    lostFoundAt: row.lost_found_at
  };
}

function mapMatch(row: MatchRow) {
  return {
    id: row.id,
    lostPostId: row.lost_post_id,
    foundPostId: row.found_post_id,
    totalScore: row.total_score,
    textScore: row.text_score,
    categoryScore: row.category_score,
    locationScore: row.location_score,
    timeScore: row.time_score,
    isNotified: row.is_notified === 1,
    createdAt: row.created_at
  };
}

export const postRepository = {
  async getConfigNumber(key: string, fallback: number) {
    const [rows] = await dbPool.query<ConfigNumberRow[]>(
      "SELECT config_value FROM config_entries WHERE config_key = ? LIMIT 1",
      [key]
    );
    const parsed = Number(rows[0]?.config_value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },

  async getConfigString(key: string, fallback: string) {
    const [rows] = await dbPool.query<ConfigNumberRow[]>(
      "SELECT config_value FROM config_entries WHERE config_key = ? LIMIT 1",
      [key]
    );
    return rows[0]?.config_value ?? fallback;
  },

  async activeRecordExists(
    table: "item_categories" | "campus_areas" | "campus_buildings" | "handover_points",
    id: string
  ) {
    const [rows] = await dbPool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM ${table} WHERE id = ? AND is_active = TRUE`,
      [id]
    );
    return rows[0]?.total > 0;
  },

  async buildingBelongsToArea(buildingId: string, areaId: string) {
    const [rows] = await dbPool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM campus_buildings WHERE id = ? AND area_id = ? AND is_active = TRUE",
      [buildingId, areaId]
    );
    return rows[0]?.total > 0;
  },

  async create(input: CreatePostRecord) {
    await dbPool.execute(
      `
        INSERT INTO posts (
          id, user_id, type, title, title_normalized, description, description_normalized,
          category_id, area_id, building_id, room_text, custom_location, contact_info, lost_found_at,
          handover_point_id, secret_verification_hash, expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.userId,
        input.type,
        input.title,
        input.titleNormalized,
        input.description,
        input.descriptionNormalized,
        input.categoryId,
        input.areaId ?? null,
        input.buildingId ?? null,
        input.roomText ?? null,
        input.customLocation ?? null,
        input.contactInfo ?? null,
        input.lostFoundAt ?? null,
        input.handoverPointId ?? null,
        input.secretVerificationHash ?? null,
        input.expiresAt ?? null
      ]
    );

    return this.findById(input.id);
  },

  async findById(id: string) {
    const [rows] = await dbPool.query<PostRow[]>(
      `${basePostSelect()} WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1`,
      [id]
    );
    const row = rows[0];
    return row ? mapPost(row) : null;
  },

  async findOwnerAndStatus(id: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { user_id: string; type: PostType; status: PostStatus }>>(
      "SELECT user_id, type, status FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  },

  async incrementViewCount(id: string) {
    await dbPool.execute("UPDATE posts SET view_count = view_count + 1 WHERE id = ?", [id]);
  },

  async getDetail(id: string) {
    const post = await this.findById(id);
    if (!post) {
      return null;
    }

    const [mediaRows] = await dbPool.query<MediaRow[]>(
      `
        SELECT id, secure_url, public_id, resource_type, media_kind, format, width, height, bytes, sort_order, created_at
        FROM post_media
        WHERE post_id = ?
        ORDER BY sort_order, created_at
      `,
      [id]
    );
    const [tagRows] = await dbPool.query<AiTagRow[]>(
      `
        SELECT id, tag, confidence, source, created_at
        FROM ai_tags
        WHERE post_id = ?
        ORDER BY confidence DESC, tag
      `,
      [id]
    );
    const [matchRows] = await dbPool.query<MatchRow[]>(
      `
        SELECT id, lost_post_id, found_post_id, total_score, text_score, category_score,
               location_score, time_score, is_notified, created_at
        FROM match_results
        WHERE lost_post_id = ? OR found_post_id = ?
        ORDER BY total_score DESC
      `,
      [id, id]
    );

    return {
      post,
      media: mediaRows.map((row) => ({
        id: row.id,
        secureUrl: row.secure_url,
        publicId: row.public_id,
        resourceType: row.resource_type,
        mediaKind: row.media_kind,
        format: row.format,
        width: row.width,
        height: row.height,
        bytes: row.bytes,
        sortOrder: row.sort_order,
        createdAt: row.created_at
      })),
      tags: tagRows.map((row) => ({
        id: row.id,
        tag: row.tag,
        confidence: row.confidence,
        source: row.source,
        createdAt: row.created_at
      })),
      matches: matchRows.map(mapMatch)
    };
  },

  async countMedia(postId: string) {
    const [rows] = await dbPool.query<CountRow[]>("SELECT COUNT(*) AS total FROM post_media WHERE post_id = ?", [
      postId
    ]);
    return rows[0]?.total ?? 0;
  },

  async createMedia(input: {
    id: string;
    postId: string;
    secureUrl: string;
    publicId: string;
    resourceType: string;
    mediaKind?: "ITEM" | "EVIDENCE";
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
    sortOrder: number;
  }) {
    await dbPool.execute(
      `
        INSERT INTO post_media (
          id, post_id, secure_url, public_id, resource_type, media_kind, format, width, height, bytes, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.postId,
        input.secureUrl,
        input.publicId,
        input.resourceType,
        input.mediaKind ?? "ITEM",
        input.format ?? null,
        input.width ?? null,
        input.height ?? null,
        input.bytes ?? null,
        input.sortOrder
      ]
    );
  },

  async findMediaOwner(postId: string, mediaId: string) {
    const [rows] = await dbPool.query<MediaOwnerRow[]>(
      `
        SELECT pm.id, pm.post_id, p.user_id, pm.public_id
        FROM post_media pm
        INNER JOIN posts p ON p.id = pm.post_id
        WHERE pm.id = ? AND pm.post_id = ? AND p.deleted_at IS NULL
        LIMIT 1
      `,
      [mediaId, postId]
    );

    return rows[0] ?? null;
  },

  async deleteMedia(mediaId: string) {
    const [result] = await dbPool.execute<ResultSetHeader>("DELETE FROM post_media WHERE id = ?", [mediaId]);
    return result.affectedRows > 0;
  },

  async deleteAiTagsForPost(postId: string) {
    await dbPool.execute("DELETE FROM ai_tags WHERE post_id = ?", [postId]);
  },

  async createAiTags(
    postId: string,
    tags: Array<{ tag: string; confidence: number; source: "VISION_LABEL" | "VISION_OBJECT" | "OCR" | "MANUAL" }>
  ) {
    for (const tag of tags) {
      await dbPool.execute(
        `
          INSERT INTO ai_tags (id, post_id, tag, confidence, source)
          VALUES (UUID(), ?, ?, ?, ?)
        `,
        [postId, tag.tag.slice(0, 100), tag.confidence, tag.source]
      );
    }
  },

  async suggestCategoriesFromTags(tags: string[]) {
    if (tags.length === 0) {
      return [];
    }

    const normalizedTags = tags.map((tag) => tag.toLowerCase());
    const [rows] = await dbPool.query<CategorySuggestionRow[]>(
      `
        SELECT id, name, name_normalized
        FROM item_categories
        WHERE is_active = TRUE
        ORDER BY sort_order, name
      `
    );

    return rows
      .map((row) => {
        const score = normalizedTags.reduce((total, tag) => {
          if (row.name_normalized.includes(tag) || tag.includes(row.name_normalized)) {
            return total + 1;
          }
          return total;
        }, 0);

        return {
          id: row.id,
          name: row.name,
          score
        };
      })
      .filter((category) => category.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  },

  async findMatchPostById(postId: string) {
    const [rows] = await dbPool.query<MatchPostRow[]>(
      `
        SELECT
          p.id, p.user_id, p.type, p.status, p.title, p.title_normalized, p.description_normalized,
          tags.ai_tag_text, tags.image_tag_text, tags.ocr_tag_text,
          p.category_id, c.parent_id AS parent_category_id,
          p.area_id, p.building_id, p.room_text, p.lost_found_at
        FROM posts p
        LEFT JOIN item_categories c ON c.id = p.category_id
        LEFT JOIN (
          SELECT
            post_id,
            GROUP_CONCAT(tag SEPARATOR ' ') AS ai_tag_text,
            GROUP_CONCAT(CASE WHEN source IN ('VISION_LABEL', 'VISION_OBJECT', 'MANUAL') THEN tag END SEPARATOR ' ') AS image_tag_text,
            GROUP_CONCAT(CASE WHEN source = 'OCR' THEN tag END SEPARATOR ' ') AS ocr_tag_text
          FROM ai_tags
          GROUP BY post_id
        ) tags ON tags.post_id = p.id
        WHERE p.id = ?
          AND p.deleted_at IS NULL
          AND p.status IN ('OPEN', 'MATCHED')
        LIMIT 1
      `,
      [postId]
    );

    const row = rows[0];
    return row ? mapMatchPost(row) : null;
  },

  async listOppositeOpenPosts(type: PostType, excludePostId: string) {
    const oppositeType: PostType = type === "LOST" ? "FOUND" : "LOST";
    const [rows] = await dbPool.query<MatchPostRow[]>(
      `
        SELECT
          p.id, p.user_id, p.type, p.status, p.title, p.title_normalized, p.description_normalized,
          tags.ai_tag_text, tags.image_tag_text, tags.ocr_tag_text,
          p.category_id, c.parent_id AS parent_category_id,
          p.area_id, p.building_id, p.room_text, p.lost_found_at
        FROM posts p
        LEFT JOIN item_categories c ON c.id = p.category_id
        LEFT JOIN (
          SELECT
            post_id,
            GROUP_CONCAT(tag SEPARATOR ' ') AS ai_tag_text,
            GROUP_CONCAT(CASE WHEN source IN ('VISION_LABEL', 'VISION_OBJECT', 'MANUAL') THEN tag END SEPARATOR ' ') AS image_tag_text,
            GROUP_CONCAT(CASE WHEN source = 'OCR' THEN tag END SEPARATOR ' ') AS ocr_tag_text
          FROM ai_tags
          GROUP BY post_id
        ) tags ON tags.post_id = p.id
        WHERE p.type = ?
          AND p.id <> ?
          AND p.status IN ('OPEN', 'MATCHED')
          AND p.deleted_at IS NULL
      `,
      [oppositeType, excludePostId]
    );

    return rows.map(mapMatchPost);
  },

  async upsertMatchResult(input: {
    lostPostId: string;
    foundPostId: string;
    totalScore: number;
    textScore: number;
    categoryScore: number;
    locationScore: number;
    timeScore: number;
  }) {
    await dbPool.execute(
      `
        INSERT INTO match_results (
          id, lost_post_id, found_post_id, total_score, text_score,
          category_score, location_score, time_score
        )
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          total_score = VALUES(total_score),
          text_score = VALUES(text_score),
          category_score = VALUES(category_score),
          location_score = VALUES(location_score),
          time_score = VALUES(time_score),
          updated_at = UTC_TIMESTAMP()
      `,
      [
        input.lostPostId,
        input.foundPostId,
        input.totalScore,
        input.textScore,
        input.categoryScore,
        input.locationScore,
        input.timeScore
      ]
    );

    const [rows] = await dbPool.query<MatchRow[]>(
      `
        SELECT id, lost_post_id, found_post_id, total_score, text_score, category_score,
               location_score, time_score, is_notified, created_at
        FROM match_results
        WHERE lost_post_id = ? AND found_post_id = ?
        LIMIT 1
      `,
      [input.lostPostId, input.foundPostId]
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Unable to load saved match result");
    }

    return mapMatch(row);
  },

  async markMatchNotified(matchId: string) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      "UPDATE match_results SET is_notified = TRUE WHERE id = ? AND is_notified = FALSE",
      [matchId]
    );
    return result.affectedRows > 0;
  },

  async deleteMatchPair(lostPostId: string, foundPostId: string) {
    await dbPool.execute("DELETE FROM match_results WHERE lost_post_id = ? AND found_post_id = ?", [
      lostPostId,
      foundPostId
    ]);
  },

  async markPairMatched(lostPostId: string, foundPostId: string) {
    await dbPool.execute(
      `
        UPDATE posts
        SET status = 'MATCHED',
            updated_at = UTC_TIMESTAMP()
        WHERE id IN (?, ?)
          AND status = 'OPEN'
          AND deleted_at IS NULL
      `,
      [lostPostId, foundPostId]
    );
  },

  async findByIds(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) {
      return [];
    }

    const placeholders = uniqueIds.map(() => "?").join(", ");
    const [rows] = await dbPool.query<PostRow[]>(
      `${basePostSelect()} WHERE p.id IN (${placeholders}) AND p.deleted_at IS NULL`,
      uniqueIds
    );

    const order = new Map(uniqueIds.map((id, index) => [id, index]));
    return rows.map(mapPost).sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
  },

  async listMatchesForPost(postId: string) {
    const [rows] = await dbPool.query<MatchRow[]>(
      `
        SELECT id, lost_post_id, found_post_id, total_score, text_score, category_score,
               location_score, time_score, is_notified, created_at
        FROM match_results
        WHERE lost_post_id = ? OR found_post_id = ?
        ORDER BY total_score DESC, created_at DESC
      `,
      [postId, postId]
    );

    return rows.map(mapMatch);
  },

  async listActiveLostPostIdsByUser(userId: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { id: string }>>(
      `
        SELECT id
        FROM posts
        WHERE user_id = ?
          AND type = 'LOST'
          AND status IN ('OPEN', 'MATCHED')
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [userId]
    );

    return rows.map((row) => row.id);
  },

  async list(query: ListPostsQuery, userId?: string) {
    const { clause, values } = buildListWhere(query, userId);
    const offset = (query.page - 1) * query.pageSize;
    const matchScoreJoin =
      query.sort === "highest_match"
        ? `
          LEFT JOIN (
            SELECT post_id, MAX(total_score) AS max_score
            FROM (
              SELECT lost_post_id AS post_id, total_score FROM match_results
              UNION ALL
              SELECT found_post_id AS post_id, total_score FROM match_results
            ) match_scores
            GROUP BY post_id
          ) ms ON ms.post_id = p.id
        `
        : "";
    const orderBy =
      query.sort === "highest_match"
        ? "COALESCE(ms.max_score, 0) DESC, p.created_at DESC"
        : `p.created_at ${query.sort === "oldest" ? "ASC" : "DESC"}`;

    const [countRows] = await dbPool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM posts p WHERE ${clause}`,
      values
    );
    const [rows] = await dbPool.query<PostRow[]>(
      `
        ${basePostSelect()}
        ${matchScoreJoin}
        WHERE ${clause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
      [...values, query.pageSize, offset]
    );

    return {
      items: rows.map(mapPost),
      page: query.page,
      pageSize: query.pageSize,
      total: countRows[0]?.total ?? 0
    };
  },

  async update(id: string, input: UpdatePostRecord) {
    const updates: string[] = [];
    const values: Array<string | Date | null> = [];

    const fields: Array<[keyof UpdatePostRecord, string]> = [
      ["type", "type"],
      ["title", "title"],
      ["titleNormalized", "title_normalized"],
      ["description", "description"],
      ["descriptionNormalized", "description_normalized"],
      ["categoryId", "category_id"],
      ["areaId", "area_id"],
      ["buildingId", "building_id"],
      ["roomText", "room_text"],
      ["customLocation", "custom_location"],
      ["contactInfo", "contact_info"],
      ["lostFoundAt", "lost_found_at"],
      ["handoverPointId", "handover_point_id"],
      ["secretVerificationHash", "secret_verification_hash"]
    ];

    for (const [key, column] of fields) {
      if (input[key] !== undefined) {
        updates.push(`${column} = ?`);
        values.push(input[key]);
      }
    }

    if (updates.length > 0) {
      values.push(id);
      await dbPool.execute(
        `UPDATE posts SET ${updates.join(", ")}, updated_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL`,
        values
      );
    }

    return this.findById(id);
  },

  async updateStatus(id: string, status: "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "HIDDEN") {
    await dbPool.execute(
      `
        UPDATE posts
        SET status = ?,
            resolved_at = CASE WHEN ? = 'RESOLVED' THEN UTC_TIMESTAMP() ELSE resolved_at END,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND deleted_at IS NULL
      `,
      [status, status, id]
    );
    return this.findById(id);
  },

  async expireOverduePosts() {
    const [rows] = await dbPool.query<ExpiringPostRow[]>(
      `
        SELECT id, user_id, title
        FROM posts
        WHERE deleted_at IS NULL
          AND expires_at IS NOT NULL
          AND expires_at <= UTC_TIMESTAMP()
          AND status IN ('OPEN', 'MATCHED')
      `
    );
    if (rows.length === 0) {
      return { expired: 0 };
    }

    await dbPool.execute(
      `
        UPDATE posts
        SET status = 'EXPIRED',
            updated_at = UTC_TIMESTAMP()
        WHERE deleted_at IS NULL
          AND expires_at IS NOT NULL
          AND expires_at <= UTC_TIMESTAMP()
          AND status IN ('OPEN', 'MATCHED')
      `
    );

    await notificationRepository.createMany(
      rows.map((post) => ({
        userId: post.user_id,
        type: "POST_EXPIRED",
        title: "Bài đăng đã hết hạn",
        body: `"${post.title}" đã được chuyển sang trạng thái hết hạn.`,
        entityType: "POST",
        entityId: post.id
      }))
    );

    return { expired: rows.length };
  },

  async createReport(input: { reporterId: string; postId: string; reason: string; details?: string | null }) {
    const id = randomUUID();
    const [result] = await dbPool.execute<ResultSetHeader>(
      `
        INSERT INTO reports (id, reporter_id, entity_type, entity_id, reason, details)
        SELECT ?, ?, 'POST', p.id, ?, ?
        FROM posts p
        WHERE p.id = ?
          AND p.deleted_at IS NULL
      `,
      [id, input.reporterId, input.reason.trim(), input.details?.trim() || null, input.postId]
    );
    if (result.affectedRows === 0) {
      return null;
    }
    return { id };
  },

  async softDelete(id: string) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      "UPDATE posts SET deleted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
    return result.affectedRows > 0;
  }
};
