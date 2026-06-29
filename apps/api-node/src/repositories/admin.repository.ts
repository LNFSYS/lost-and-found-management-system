import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { dbPool } from "../config/db.js";
import type { UserRole } from "../models/user.model.js";
import { notificationRepository } from "./notification.repository.js";
import { postRepository } from "./post.repository.js";
import { userRepository } from "./user.repository.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeText } from "../utils/normalize-text.js";

interface CountRow extends RowDataPacket {
  total: number;
}

interface UserAdminRow extends RowDataPacket {
  id: string;
  email: string;
  full_name: string;
  student_code: string | null;
  status: string;
  roles: string | null;
  reputation_points: number | null;
  reputation_level: string | null;
  created_at: string;
}

interface CategoryAdminRow extends RowDataPacket {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  is_active: number;
  sort_order: number;
}

interface CategoryParentRow extends RowDataPacket {
  parent_id: string | null;
}

interface CategoryInput {
  name: string;
  icon?: string | null;
  parentId?: string | null;
  sortOrder?: number;
}

interface AreaInput {
  name: string;
  description?: string | null;
  sortOrder?: number;
}

interface BuildingInput {
  areaId: string;
  name: string;
  sortOrder?: number;
}

interface AreaAdminRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
  sort_order: number;
}

interface BuildingAdminRow extends RowDataPacket {
  id: string;
  area_id: string;
  area_name: string | null;
  name: string;
  is_active: number;
  sort_order: number;
}

interface HandoverAdminRow extends RowDataPacket {
  id: string;
  name: string;
  address: string;
  area_id: string | null;
  building_id: string | null;
  opening_hours: string | null;
  contact_info: string | null;
  map_image_url: string | null;
  map_position_x: string | number | null;
  map_position_y: string | number | null;
  stored_items: number | null;
  is_active: number;
}

interface HandoverInput {
  name: string;
  address: string;
  areaId?: string | null;
  buildingId?: string | null;
  openingHours?: string | null;
  contactInfo?: string | null;
  mapImageUrl?: string | null;
  mapPositionX?: number | null;
  mapPositionY?: number | null;
}

type WarehouseStatus =
  | "PENDING_APPROVAL"
  | "RECEIVED"
  | "STORED"
  | "CLAIMED"
  | "RETURNED"
  | "EXPIRED"
  | "DISPOSED"
  | "DONATED"
  | "TRANSFERRED";

interface WarehouseAdminRow extends RowDataPacket {
  id: string;
  post_id: string | null;
  post_title: string | null;
  handover_point_id: string | null;
  handover_point_name: string | null;
  item_name: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  area_id: string | null;
  area_name: string | null;
  building_id: string | null;
  building_name: string | null;
  room_text: string | null;
  finder_user_id: string | null;
  finder_full_name: string | null;
  finder_name: string | null;
  finder_contact: string | null;
  status: WarehouseStatus;
  condition_notes: string | null;
  storage_code: string | null;
  received_at: string;
  returned_at: string | null;
  retention_deadline: string | null;
  created_at: string;
  updated_at: string;
}

interface WarehouseInput {
  postId?: string | null;
  handoverPointId?: string | null;
  itemName: string;
  description?: string | null;
  categoryId?: string | null;
  areaId?: string | null;
  buildingId?: string | null;
  roomText?: string | null;
  finderUserId?: string | null;
  finderName?: string | null;
  finderContact?: string | null;
  status?: WarehouseStatus;
  conditionNotes?: string | null;
  storageCode?: string | null;
  receivedAt?: string | null;
  returnedAt?: string | null;
  retentionDeadline?: string | null;
}

interface ReportAdminRow extends RowDataPacket {
  id: string;
  entity_type: "POST" | "USER" | "CLAIM";
  entity_id: string;
  reason: string;
  details: string | null;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  reporter_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  target_title: string | null;
  target_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}

let handoverMapColumnsAvailableCache: boolean | null = null;

async function handoverMapColumnsAvailable() {
  if (handoverMapColumnsAvailableCache !== null) {
    return handoverMapColumnsAvailableCache;
  }
  const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'handover_points'
        AND column_name IN ('map_image_url', 'map_position_x', 'map_position_y')
    `
  );
  handoverMapColumnsAvailableCache = Number(rows[0]?.total ?? 0) === 3;
  return handoverMapColumnsAvailableCache;
}

interface ReportLookupRow extends RowDataPacket {
  id: string;
  entity_type: "POST" | "USER" | "CLAIM";
  entity_id: string;
}

interface OwnerRow extends RowDataPacket {
  user_id: string;
}

async function count(table: string, where = "1 = 1") {
  const [rows] = await dbPool.query<CountRow[]>(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`);
  return rows[0]?.total ?? 0;
}

function activeFlag(value: number) {
  return value === 1;
}

async function assertValidCategoryParent(parentId: string | null | undefined, categoryId?: string) {
  if (!parentId) {
    return;
  }

  if (parentId === categoryId) {
    throw new HttpError(400, "A category cannot be its own parent");
  }

  const [parentRows] = await dbPool.query<CategoryParentRow[]>(
    "SELECT parent_id FROM item_categories WHERE id = ? LIMIT 1",
    [parentId]
  );
  if (parentRows.length === 0) {
    throw new HttpError(400, "Parent category does not exist");
  }
  if (parentRows[0].parent_id) {
    throw new HttpError(400, "Child categories can only be placed under a parent category");
  }

  if (categoryId) {
    const [childRows] = await dbPool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM item_categories WHERE parent_id = ?",
      [categoryId]
    );
    if ((childRows[0]?.total ?? 0) > 0) {
      throw new HttpError(400, "A parent category with child categories cannot become a child category");
    }
  }
}

function uniqueRoles(roles: UserRole[]) {
  return Array.from(new Set<UserRole>(["USER", ...roles]));
}

function reportTargetText(row: ReportAdminRow) {
  return row.target_title ?? row.target_name ?? row.entity_id;
}

function optionalDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function isTerminalWarehouseStatus(status: WarehouseStatus) {
  return ["RETURNED", "DISPOSED", "DONATED", "TRANSFERRED"].includes(status);
}

function isActiveWarehouseStatus(status: WarehouseStatus) {
  return !isTerminalWarehouseStatus(status) && status !== "EXPIRED";
}

async function activeWarehouseCount(excludeId?: string) {
  if (!excludeId) {
    return count(
      "warehouse_items",
      "deleted_at IS NULL AND status IN ('PENDING_APPROVAL', 'RECEIVED', 'STORED', 'CLAIMED')"
    );
  }
  const [rows] = await dbPool.query<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM warehouse_items
      WHERE deleted_at IS NULL
        AND status IN ('PENDING_APPROVAL', 'RECEIVED', 'STORED', 'CLAIMED')
        AND id <> ?
    `,
    [excludeId]
  );
  return rows[0]?.total ?? 0;
}

async function warehouseCapacitySnapshot(excludeId?: string) {
  const capacity = await postRepository.getConfigNumber("warehouse.capacity_total", 200);
  const warningRatio = await postRepository.getConfigNumber("warehouse.capacity_warning_ratio", 0.8);
  const activeItems = await activeWarehouseCount(excludeId);
  return {
    activeItems,
    capacity,
    warningAt: Math.ceil(capacity * warningRatio),
    usageRatio: capacity > 0 ? Number((activeItems / capacity).toFixed(4)) : 1,
    isFull: capacity > 0 && activeItems >= capacity,
    isNearFull: capacity > 0 && activeItems >= Math.ceil(capacity * warningRatio)
  };
}

async function assertWarehouseCapacityAllows(status: WarehouseStatus, excludeId?: string) {
  if (!isActiveWarehouseStatus(status)) {
    return;
  }
  const snapshot = await warehouseCapacitySnapshot(excludeId);
  if (snapshot.isFull) {
    throw new HttpError(409, "Warehouse capacity is full. Process or transfer existing items before adding more.");
  }
}

async function userExists(userId: string) {
  const [rows] = await dbPool.query<CountRow[]>(
    "SELECT COUNT(*) AS total FROM users WHERE id = ? AND deleted_at IS NULL",
    [userId]
  );
  return (rows[0]?.total ?? 0) > 0;
}

async function validateWarehouseInput(input: WarehouseInput) {
  if (input.postId) {
    const post = await postRepository.findOwnerAndStatus(input.postId);
    if (!post) {
      throw new HttpError(422, "Post does not exist");
    }
    if (post.type !== "FOUND") {
      throw new HttpError(422, "Warehouse items can only link to FOUND posts");
    }
  }

  if (input.categoryId && !(await postRepository.activeRecordExists("item_categories", input.categoryId))) {
    throw new HttpError(422, "Category does not exist or is inactive");
  }
  if (input.areaId && !(await postRepository.activeRecordExists("campus_areas", input.areaId))) {
    throw new HttpError(422, "Campus area does not exist or is inactive");
  }
  if (input.buildingId) {
    if (!(await postRepository.activeRecordExists("campus_buildings", input.buildingId))) {
      throw new HttpError(422, "Campus building does not exist or is inactive");
    }
    if (input.areaId && !(await postRepository.buildingBelongsToArea(input.buildingId, input.areaId))) {
      throw new HttpError(422, "Campus building does not belong to the selected area");
    }
  }
  if (input.handoverPointId && !(await postRepository.activeRecordExists("handover_points", input.handoverPointId))) {
    throw new HttpError(422, "Handover point does not exist or is inactive");
  }
  if (input.finderUserId && !(await userExists(input.finderUserId))) {
    throw new HttpError(422, "Finder user does not exist");
  }
}

function mapWarehouseItem(row: WarehouseAdminRow) {
  return {
    id: row.id,
    post: row.post_id ? { id: row.post_id, title: row.post_title } : null,
    handoverPoint: row.handover_point_id ? { id: row.handover_point_id, name: row.handover_point_name } : null,
    itemName: row.item_name,
    description: row.description,
    category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
    location: {
      areaId: row.area_id,
      areaName: row.area_name,
      buildingId: row.building_id,
      buildingName: row.building_name,
      roomText: row.room_text
    },
    finder: {
      userId: row.finder_user_id,
      fullName: row.finder_full_name,
      name: row.finder_name,
      contact: row.finder_contact
    },
    status: row.status,
    conditionNotes: row.condition_notes,
    storageCode: row.storage_code,
    receivedAt: row.received_at,
    returnedAt: row.returned_at,
    retentionDeadline: row.retention_deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const adminRepository = {
  async overview() {
    const [statusRows] = await dbPool.query<Array<RowDataPacket & { status: string; total: number }>>(
      "SELECT status, COUNT(*) AS total FROM posts WHERE deleted_at IS NULL GROUP BY status"
    );
    const [typeRows] = await dbPool.query<Array<RowDataPacket & { type: string; total: number }>>(
      "SELECT type, COUNT(*) AS total FROM posts WHERE deleted_at IS NULL GROUP BY type"
    );

    return {
      users: await count("users", "deleted_at IS NULL"),
      posts: await count("posts", "deleted_at IS NULL"),
      claims: await count("claims"),
      reports: await count("reports"),
      categories: await count("item_categories", "is_active = TRUE"),
      areas: await count("campus_areas", "is_active = TRUE"),
      handoverPoints: await count("handover_points", "is_active = TRUE"),
      warehouseItems: await count("warehouse_items", "deleted_at IS NULL"),
      postsByStatus: statusRows,
      postsByType: typeRows
    };
  },

  async users() {
    const [rows] = await dbPool.query<UserAdminRow[]>(
      `
        SELECT u.id, u.email, u.full_name, u.student_code, u.status, u.created_at,
               rs.total_points AS reputation_points, rs.level AS reputation_level,
               GROUP_CONCAT(r.code ORDER BY r.code SEPARATOR ',') AS roles
        FROM users u
        LEFT JOIN reputation_scores rs ON rs.user_id = u.id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT 100
      `
    );

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      studentCode: row.student_code,
      status: row.status,
      roles: row.roles ? row.roles.split(",") : [],
      reputationPoints: Number(row.reputation_points ?? 0),
      reputationLevel: row.reputation_level ?? "NEW",
      createdAt: row.created_at
    }));
  },

  async updateUserStatus(userId: string, status: "ACTIVE" | "LOCKED" | "DISABLED") {
    await dbPool.execute("UPDATE users SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [status, userId]);
    return { updated: true };
  },

  async createUser(input: {
    id: string;
    email: string;
    normalizedEmail: string;
    passwordHash: string;
    fullName: string;
    studentCode?: string | null;
    phoneNumber?: string | null;
    status: "ACTIVE" | "LOCKED" | "DISABLED";
    roles: UserRole[];
  }) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          INSERT INTO users (
            id, email, normalized_email, password_hash, full_name, student_code,
            phone_number, status, email_verified_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'ACTIVE' THEN UTC_TIMESTAMP() ELSE NULL END)
        `,
        [
          input.id,
          input.email,
          input.normalizedEmail,
          input.passwordHash,
          input.fullName,
          input.studentCode ?? null,
          input.phoneNumber ?? null,
          input.status,
          input.status
        ]
      );

      for (const role of uniqueRoles(input.roles)) {
        await connection.execute(
          "INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE code = ?",
          [input.id, role]
        );
      }

      await connection.execute(
        "INSERT IGNORE INTO reputation_scores (user_id, total_points, level) VALUES (?, 0, 'NEW')",
        [input.id]
      );
      await connection.commit();
      return { id: input.id };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateUserRoles(userId: string, roles: UserRole[]) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("DELETE FROM user_roles WHERE user_id = ?", [userId]);
      for (const role of uniqueRoles(roles)) {
        await connection.execute(
          "INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE code = ?",
          [userId, role]
        );
      }
      await connection.commit();
      return { updated: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async categories() {
    const [rows] = await dbPool.query<CategoryAdminRow[]>(
      "SELECT id, name, icon, parent_id, is_active, sort_order FROM item_categories ORDER BY sort_order, name"
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      parentId: row.parent_id,
      isActive: activeFlag(row.is_active),
      sortOrder: row.sort_order
    }));
  },

  async createCategory(input: CategoryInput) {
    await assertValidCategoryParent(input.parentId);
    const id = randomUUID();
    await dbPool.execute(
      `
        INSERT INTO item_categories (id, name, name_normalized, icon, parent_id, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, input.name.trim(), normalizeText(input.name), input.icon ?? null, input.parentId ?? null, input.sortOrder ?? 0]
    );
    return { id };
  },

  async updateCategory(id: string, input: CategoryInput) {
    await assertValidCategoryParent(input.parentId, id);

    const assignments = ["name = ?", "name_normalized = ?", "parent_id = ?"];
    const params: Array<string | number | null> = [input.name.trim(), normalizeText(input.name), input.parentId ?? null];
    if (input.icon !== undefined) {
      assignments.push("icon = ?");
      params.push(input.icon);
    }
    if (input.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      params.push(input.sortOrder);
    }
    params.push(id);

    await dbPool.execute(
      `UPDATE item_categories SET ${assignments.join(", ")} WHERE id = ?`,
      params
    );
    return { updated: true };
  },

  async setCategoryActive(id: string, isActive: boolean) {
    await dbPool.execute("UPDATE item_categories SET is_active = ? WHERE id = ?", [isActive, id]);
    return { updated: true };
  },

  async areas() {
    const [rows] = await dbPool.query<AreaAdminRow[]>(
      "SELECT id, name, description, is_active, sort_order FROM campus_areas ORDER BY sort_order, name"
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: activeFlag(row.is_active),
      sortOrder: row.sort_order
    }));
  },

  async createArea(input: AreaInput) {
    const id = randomUUID();
    await dbPool.execute(
      "INSERT INTO campus_areas (id, name, description, sort_order) VALUES (?, ?, ?, ?)",
      [id, input.name.trim(), input.description ?? null, input.sortOrder ?? 0]
    );
    return { id };
  },

  async updateArea(id: string, input: AreaInput) {
    const assignments = ["name = ?", "description = ?"];
    const params: Array<string | number | null> = [input.name.trim(), input.description ?? null];
    if (input.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      params.push(input.sortOrder);
    }
    params.push(id);

    await dbPool.execute(
      `UPDATE campus_areas SET ${assignments.join(", ")} WHERE id = ?`,
      params
    );
    return { updated: true };
  },

  async setAreaActive(id: string, isActive: boolean) {
    await dbPool.execute("UPDATE campus_areas SET is_active = ? WHERE id = ?", [isActive, id]);
    return { updated: true };
  },

  async buildings() {
    const [rows] = await dbPool.query<BuildingAdminRow[]>(
      `
        SELECT b.id, b.area_id, a.name AS area_name, b.name, b.is_active, b.sort_order
        FROM campus_buildings b
        LEFT JOIN campus_areas a ON a.id = b.area_id
        ORDER BY a.name, b.sort_order, b.name
      `
    );
    return rows.map((row) => ({
      id: row.id,
      areaId: row.area_id,
      areaName: row.area_name,
      name: row.name,
      isActive: activeFlag(row.is_active),
      sortOrder: row.sort_order
    }));
  },

  async createBuilding(input: BuildingInput) {
    const id = randomUUID();
    await dbPool.execute("INSERT INTO campus_buildings (id, area_id, name, sort_order) VALUES (?, ?, ?, ?)", [
      id,
      input.areaId,
      input.name.trim(),
      input.sortOrder ?? 0
    ]);
    return { id };
  },

  async updateBuilding(id: string, input: BuildingInput) {
    const assignments = ["area_id = ?", "name = ?"];
    const params: Array<string | number | null> = [input.areaId, input.name.trim()];
    if (input.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      params.push(input.sortOrder);
    }
    params.push(id);

    await dbPool.execute(
      `UPDATE campus_buildings SET ${assignments.join(", ")} WHERE id = ?`,
      params
    );
    return { updated: true };
  },

  async setBuildingActive(id: string, isActive: boolean) {
    await dbPool.execute("UPDATE campus_buildings SET is_active = ? WHERE id = ?", [isActive, id]);
    return { updated: true };
  },

  async handoverPoints() {
    const hasMapColumns = await handoverMapColumnsAvailable();
    const [rows] = await dbPool.query<HandoverAdminRow[]>(
      `
        SELECT
          hp.id, hp.name, hp.address, hp.area_id, hp.building_id, hp.opening_hours, hp.contact_info,
          ${hasMapColumns ? "hp.map_image_url, hp.map_position_x, hp.map_position_y," : "NULL AS map_image_url, NULL AS map_position_x, NULL AS map_position_y,"}
          hp.is_active,
          COALESCE(wi_counts.total, 0) AS stored_items
        FROM handover_points hp
        LEFT JOIN (
          SELECT handover_point_id, COUNT(*) AS total
          FROM warehouse_items
          WHERE deleted_at IS NULL
            AND status IN ('PENDING_APPROVAL', 'RECEIVED', 'STORED', 'CLAIMED')
          GROUP BY handover_point_id
        ) wi_counts ON wi_counts.handover_point_id = hp.id
        ORDER BY hp.name
      `
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      areaId: row.area_id,
      buildingId: row.building_id,
      openingHours: row.opening_hours,
      contactInfo: row.contact_info,
      mapImageUrl: row.map_image_url,
      mapPositionX: row.map_position_x === null ? null : Number(row.map_position_x),
      mapPositionY: row.map_position_y === null ? null : Number(row.map_position_y),
      storedItems: Number(row.stored_items ?? 0),
      isActive: activeFlag(row.is_active)
    }));
  },

  async createHandoverPoint(
    input: HandoverInput,
    actorId: string
  ) {
    // Validate areaId exists
    if (input.areaId) {
      const exists = await postRepository.activeRecordExists("campus_areas", input.areaId);
      if (!exists) {
        throw new Error(`Area with id ${input.areaId} not found`);
      }
    }

    // Validate buildingId exists and belongs to areaId if provided
    if (input.buildingId) {
      const exists = await postRepository.activeRecordExists("campus_buildings", input.buildingId);
      if (!exists) {
        throw new Error(`Building with id ${input.buildingId} not found`);
      }

      if (input.areaId) {
        const belongs = await postRepository.buildingBelongsToArea(input.buildingId, input.areaId);
        if (!belongs) {
          throw new Error(`Building ${input.buildingId} does not belong to area ${input.areaId}`);
        }
      }
    }

    const id = randomUUID();
    if (await handoverMapColumnsAvailable()) {
      await dbPool.execute(
        `
          INSERT INTO handover_points (
            id, name, address, area_id, building_id, opening_hours, contact_info,
            map_image_url, map_position_x, map_position_y, created_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          input.name.trim(),
          input.address.trim(),
          input.areaId ?? null,
          input.buildingId ?? null,
          input.openingHours ?? null,
          input.contactInfo ?? null,
          input.mapImageUrl ?? null,
          input.mapPositionX ?? null,
          input.mapPositionY ?? null,
          actorId
        ]
      );
      return { id };
    }

    await dbPool.execute(
      `
        INSERT INTO handover_points (
          id, name, address, area_id, building_id, opening_hours, contact_info, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.name.trim(),
        input.address.trim(),
        input.areaId ?? null,
        input.buildingId ?? null,
        input.openingHours ?? null,
        input.contactInfo ?? null,
        actorId
      ]
    );
    await this.alertWarehouseCapacityIfNeeded();
    return { id };
  },

  async updateHandoverPoint(id: string, input: HandoverInput) {
    // Validate areaId exists
    if (input.areaId) {
      const exists = await postRepository.activeRecordExists("campus_areas", input.areaId);
      if (!exists) {
        throw new Error(`Area with id ${input.areaId} not found`);
      }
    }

    // Validate buildingId exists and belongs to areaId if provided
    if (input.buildingId) {
      const exists = await postRepository.activeRecordExists("campus_buildings", input.buildingId);
      if (!exists) {
        throw new Error(`Building with id ${input.buildingId} not found`);
      }

      if (input.areaId) {
        const belongs = await postRepository.buildingBelongsToArea(input.buildingId, input.areaId);
        if (!belongs) {
          throw new Error(`Building ${input.buildingId} does not belong to area ${input.areaId}`);
        }
      }
    }

    if (await handoverMapColumnsAvailable()) {
      await dbPool.execute(
        `
          UPDATE handover_points
          SET
            name = ?, address = ?, area_id = ?, building_id = ?, opening_hours = ?, contact_info = ?,
            map_image_url = ?, map_position_x = ?, map_position_y = ?
          WHERE id = ?
        `,
        [
          input.name.trim(),
          input.address.trim(),
          input.areaId ?? null,
          input.buildingId ?? null,
          input.openingHours ?? null,
          input.contactInfo ?? null,
          input.mapImageUrl ?? null,
          input.mapPositionX ?? null,
          input.mapPositionY ?? null,
          id
        ]
      );
      return { updated: true };
    }

    await dbPool.execute(
      `
        UPDATE handover_points
        SET name = ?, address = ?, area_id = ?, building_id = ?, opening_hours = ?, contact_info = ?
        WHERE id = ?
      `,
      [
        input.name.trim(),
        input.address.trim(),
        input.areaId ?? null,
        input.buildingId ?? null,
        input.openingHours ?? null,
        input.contactInfo ?? null,
        id
      ]
    );
    return { updated: true };
  },

  async setHandoverPointActive(id: string, isActive: boolean) {
    await dbPool.execute("UPDATE handover_points SET is_active = ? WHERE id = ?", [isActive, id]);
    return { updated: true };
  },

  async warehouseItems() {
    const [rows] = await dbPool.query<WarehouseAdminRow[]>(
      `
        SELECT
          wi.id, wi.post_id, p.title AS post_title,
          wi.handover_point_id, hp.name AS handover_point_name,
          wi.item_name, wi.description,
          wi.category_id, c.name AS category_name,
          wi.area_id, a.name AS area_name,
          wi.building_id, b.name AS building_name,
          wi.room_text,
          wi.finder_user_id, finder.full_name AS finder_full_name,
          wi.finder_name, wi.finder_contact,
          wi.status, wi.condition_notes, wi.storage_code,
          wi.received_at, wi.returned_at, wi.retention_deadline, wi.created_at, wi.updated_at
        FROM warehouse_items wi
        LEFT JOIN posts p ON p.id = wi.post_id
        LEFT JOIN handover_points hp ON hp.id = wi.handover_point_id
        LEFT JOIN item_categories c ON c.id = wi.category_id
        LEFT JOIN campus_areas a ON a.id = wi.area_id
        LEFT JOIN campus_buildings b ON b.id = wi.building_id
        LEFT JOIN users finder ON finder.id = wi.finder_user_id
        WHERE wi.deleted_at IS NULL
        ORDER BY wi.received_at DESC, wi.created_at DESC
        LIMIT 200
      `
    );

    return rows.map(mapWarehouseItem);
  },

  async warehouseCapacity() {
    return warehouseCapacitySnapshot();
  },

  async alertWarehouseCapacityIfNeeded() {
    const snapshot = await warehouseCapacitySnapshot();
    if (!snapshot.isNearFull) {
      return { alerted: false, capacity: snapshot };
    }
    const [existing] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      `
        SELECT COUNT(*) AS total
        FROM notifications
        WHERE type = 'WAREHOUSE_CAPACITY_WARNING'
          AND entity_type = 'WAREHOUSE'
          AND entity_id = 'capacity'
          AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)
      `
    );
    if (Number(existing[0]?.total ?? 0) > 0) {
      return { alerted: false, capacity: snapshot };
    }

    const [users] = await dbPool.query<Array<RowDataPacket & { user_id: string }>>(
      `
        SELECT DISTINCT ur.user_id
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        INNER JOIN users u ON u.id = ur.user_id
        WHERE r.code IN ('ADMIN', 'STAFF')
          AND u.status = 'ACTIVE'
          AND u.deleted_at IS NULL
      `
    );
    await notificationRepository.createMany(
      users.map((user) => ({
        userId: user.user_id,
        type: "WAREHOUSE_CAPACITY_WARNING",
        title: "Kho sap day",
        body: `Kho dang luu ${snapshot.activeItems}/${snapshot.capacity} vat pham. Hay xu ly, chuyen giao hoac mo rong suc chua.`,
        entityType: "WAREHOUSE",
        entityId: "capacity"
      }))
    );
    return { alerted: true, capacity: snapshot };
  },

  async alertWarehouseItemsNearExpiry(daysAhead = 7) {
    const [items] = await dbPool.query<Array<RowDataPacket & { id: string; item_name: string; retention_deadline: string }>>(
      `
        SELECT id, item_name, retention_deadline
        FROM warehouse_items wi
        WHERE wi.deleted_at IS NULL
          AND wi.retention_deadline IS NOT NULL
          AND wi.retention_deadline > UTC_TIMESTAMP()
          AND wi.retention_deadline <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)
          AND wi.status IN ('PENDING_APPROVAL', 'RECEIVED', 'STORED', 'CLAIMED')
          AND NOT EXISTS (
            SELECT 1
            FROM notifications n
            WHERE n.type = 'WAREHOUSE_NEAR_EXPIRY'
              AND n.entity_type = 'WAREHOUSE_ITEM'
              AND n.entity_id = wi.id
          )
      `,
      [daysAhead]
    );
    if (items.length === 0) {
      return { alertedItems: 0 };
    }

    const [users] = await dbPool.query<Array<RowDataPacket & { user_id: string }>>(
      `
        SELECT DISTINCT ur.user_id
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        INNER JOIN users u ON u.id = ur.user_id
        WHERE r.code IN ('ADMIN', 'STAFF')
          AND u.status = 'ACTIVE'
          AND u.deleted_at IS NULL
      `
    );

    await notificationRepository.createMany(
      users.flatMap((user) =>
        items.map((item) => ({
          userId: user.user_id,
          type: "WAREHOUSE_NEAR_EXPIRY",
          title: "Vat pham sap het han luu kho",
          body: `"${item.item_name}" se het han luu kho vao ${item.retention_deadline}.`,
          entityType: "WAREHOUSE_ITEM",
          entityId: item.id
        }))
      )
    );

    return { alertedItems: items.length };
  },

  async createWarehouseItem(input: WarehouseInput, actorId: string) {
    await validateWarehouseInput(input);
    const id = randomUUID();
    const status = input.status ?? "RECEIVED";
    await assertWarehouseCapacityAllows(status);
    const receivedAt = optionalDate(input.receivedAt) ?? new Date();
    const returnedAt = optionalDate(input.returnedAt);
    const retentionDeadline = optionalDate(input.retentionDeadline) ?? new Date(receivedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
    await dbPool.execute(
      `
        INSERT INTO warehouse_items (
          id, post_id, handover_point_id, item_name, description,
          category_id, area_id, building_id, room_text,
          finder_user_id, finder_name, finder_contact,
          status, condition_notes, storage_code, received_at, returned_at, retention_deadline, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.postId ?? null,
        input.handoverPointId ?? null,
        input.itemName.trim(),
        input.description ?? null,
        input.categoryId ?? null,
        input.areaId ?? null,
        input.buildingId ?? null,
        input.roomText?.trim() || null,
        input.finderUserId ?? null,
        input.finderName?.trim() || null,
        input.finderContact?.trim() || null,
        status,
        input.conditionNotes ?? null,
        input.storageCode?.trim() || null,
        receivedAt,
        isTerminalWarehouseStatus(status) ? returnedAt ?? new Date() : returnedAt,
        retentionDeadline,
        actorId
      ]
    );
    return { id };
  },

  async updateWarehouseItem(id: string, input: WarehouseInput) {
    await validateWarehouseInput(input);
    const status = input.status ?? "RECEIVED";
    await assertWarehouseCapacityAllows(status, id);
    const receivedAt = optionalDate(input.receivedAt) ?? new Date();
    const returnedAt = optionalDate(input.returnedAt);
    const retentionDeadline = optionalDate(input.retentionDeadline) ?? new Date(receivedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
    await dbPool.execute(
      `
        UPDATE warehouse_items
        SET post_id = ?,
            handover_point_id = ?,
            item_name = ?,
            description = ?,
            category_id = ?,
            area_id = ?,
            building_id = ?,
            room_text = ?,
            finder_user_id = ?,
            finder_name = ?,
            finder_contact = ?,
            status = ?,
            condition_notes = ?,
            storage_code = ?,
            received_at = ?,
            returned_at = ?,
            retention_deadline = ?
        WHERE id = ? AND deleted_at IS NULL
      `,
      [
        input.postId ?? null,
        input.handoverPointId ?? null,
        input.itemName.trim(),
        input.description ?? null,
        input.categoryId ?? null,
        input.areaId ?? null,
        input.buildingId ?? null,
        input.roomText?.trim() || null,
        input.finderUserId ?? null,
        input.finderName?.trim() || null,
        input.finderContact?.trim() || null,
        status,
        input.conditionNotes ?? null,
        input.storageCode?.trim() || null,
        receivedAt,
        isTerminalWarehouseStatus(status) ? returnedAt ?? new Date() : returnedAt,
        retentionDeadline,
        id
      ]
    );
    return { updated: true };
  },

  async updateWarehouseItemStatus(id: string, status: WarehouseStatus) {
    await dbPool.execute(
      `
        UPDATE warehouse_items
        SET status = ?,
            returned_at = CASE WHEN ? IN ('RETURNED', 'DISPOSED', 'DONATED', 'TRANSFERRED') THEN COALESCE(returned_at, UTC_TIMESTAMP()) ELSE returned_at END
        WHERE id = ? AND deleted_at IS NULL
      `,
      [status, status, id]
    );
    return { updated: true };
  },

  async expireOverdueWarehouseItems(actorId: string) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      `
        UPDATE warehouse_items
        SET status = 'EXPIRED',
            condition_notes = CONCAT(COALESCE(condition_notes, ''), CASE WHEN condition_notes IS NULL OR condition_notes = '' THEN '' ELSE '\n' END, 'System marked item as overdue.'),
            updated_at = UTC_TIMESTAMP()
        WHERE deleted_at IS NULL
          AND retention_deadline IS NOT NULL
          AND retention_deadline <= UTC_TIMESTAMP()
          AND status IN ('PENDING_APPROVAL', 'RECEIVED', 'STORED', 'CLAIMED')
      `
    );

    if (result.affectedRows > 0) {
      const [users] = await dbPool.query<Array<RowDataPacket & { user_id: string }>>(
        `
          SELECT DISTINCT ur.user_id
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          INNER JOIN users u ON u.id = ur.user_id
          WHERE r.code IN ('ADMIN', 'STAFF')
            AND u.status = 'ACTIVE'
            AND u.deleted_at IS NULL
        `
      );
      await notificationRepository.createMany(
        users.map((user) => ({
          userId: user.user_id,
          type: "WAREHOUSE_OVERDUE",
          title: "Có vật phẩm trong kho đã quá hạn",
          body: `${result.affectedRows} vật phẩm đã được chuyển sang trạng thái EXPIRED. Vui lòng xử lý thanh lý, quyên góp hoặc chuyển giao.`,
          entityType: "USER",
          entityId: actorId
        }))
      );
    }

    return { expired: result.affectedRows };
  },

  async processOverdueWarehouseItem(id: string, status: Extract<WarehouseStatus, "DISPOSED" | "DONATED" | "TRANSFERRED">, note: string) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      `
        UPDATE warehouse_items
        SET status = ?,
            returned_at = COALESCE(returned_at, UTC_TIMESTAMP()),
            condition_notes = CONCAT(COALESCE(condition_notes, ''), CASE WHEN condition_notes IS NULL OR condition_notes = '' THEN '' ELSE '\n' END, ?),
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
          AND deleted_at IS NULL
          AND status = 'EXPIRED'
      `,
      [status, note.trim(), id]
    );
    if (result.affectedRows === 0) {
      throw new HttpError(409, "Only expired warehouse items can be processed");
    }
    return { updated: true, status };
  },

  async deleteWarehouseItem(id: string) {
    await dbPool.execute(
      "UPDATE warehouse_items SET deleted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
    return { deleted: true };
  },

  async reports() {
    const [rows] = await dbPool.query<ReportAdminRow[]>(
      `
        SELECT r.id, r.entity_type, r.entity_id, r.reason, r.details, r.status,
               r.reporter_id, reporter.full_name AS reporter_name, reporter.email AS reporter_email,
               r.reviewed_by AS reviewer_id, reviewer.full_name AS reviewer_name,
               p.title AS target_title, target_user.full_name AS target_name,
               r.reviewed_at, r.created_at
        FROM reports r
        LEFT JOIN users reporter ON reporter.id = r.reporter_id
        LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
        LEFT JOIN posts p ON r.entity_type = 'POST' AND p.id = r.entity_id
        LEFT JOIN users target_user ON r.entity_type = 'USER' AND target_user.id = r.entity_id
        ORDER BY r.created_at DESC
        LIMIT 100
      `
    );

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      targetText: reportTargetText(row),
      reason: row.reason,
      details: row.details,
      status: row.status,
      reporter: {
        id: row.reporter_id,
        fullName: row.reporter_name,
        email: row.reporter_email
      },
      reviewer: row.reviewer_id
        ? {
            id: row.reviewer_id,
            fullName: row.reviewer_name
          }
        : null,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at
    }));
  },

  async handleReport(
    reportId: string,
    actorId: string,
    input: {
      status: "REVIEWED" | "DISMISSED";
      note?: string | null;
      actionType?: "WARN_USER" | "HIDE_POST" | "DELETE_POST" | "BAN_USER" | "UNBAN_USER" | null;
    }
  ) {
    const connection = await dbPool.getConnection();
    let moderationPenalty: { userId: string; entityType: string; entityId: string; reason: string } | null = null;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<ReportLookupRow[]>(
        "SELECT id, entity_type, entity_id FROM reports WHERE id = ? FOR UPDATE",
        [reportId]
      );
      const report = rows[0];
      if (!report) {
        throw new Error("Report not found");
      }

      await connection.execute(
        "UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?",
        [input.status, actorId, reportId]
      );

      if (input.actionType) {
        const targetType = input.actionType === "HIDE_POST" || input.actionType === "DELETE_POST" ? "POST" : "USER";
        let targetId: string | null = null;

        if (targetType === report.entity_type) {
          targetId = report.entity_id;
        } else if (targetType === "USER" && report.entity_type === "POST") {
          const [ownerRows] = await connection.query<OwnerRow[]>("SELECT user_id FROM posts WHERE id = ? LIMIT 1", [
            report.entity_id
          ]);
          targetId = ownerRows[0]?.user_id ?? null;
        }

        if (!targetId) {
          throw new Error("Unable to determine moderation target");
        }

        await connection.execute(
          `
            INSERT INTO moderation_actions (id, admin_id, report_id, action_type, target_type, target_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [randomUUID(), actorId, reportId, input.actionType, targetType, targetId, input.note ?? null]
        );

        if (input.actionType === "HIDE_POST") {
          await connection.execute("UPDATE posts SET status = 'HIDDEN', updated_at = UTC_TIMESTAMP() WHERE id = ?", [targetId]);
          const [ownerRows] = await connection.query<OwnerRow[]>("SELECT user_id FROM posts WHERE id = ? LIMIT 1", [targetId]);
          if (ownerRows[0]?.user_id) {
            moderationPenalty = {
              userId: ownerRows[0].user_id,
              entityType: "POST",
              entityId: targetId,
              reason: "Post hidden after moderation report"
            };
          }
        }
        if (input.actionType === "DELETE_POST") {
          await connection.execute("UPDATE posts SET deleted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?", [
            targetId
          ]);
          const [ownerRows] = await connection.query<OwnerRow[]>("SELECT user_id FROM posts WHERE id = ? LIMIT 1", [targetId]);
          if (ownerRows[0]?.user_id) {
            moderationPenalty = {
              userId: ownerRows[0].user_id,
              entityType: "POST",
              entityId: targetId,
              reason: "Post deleted after moderation report"
            };
          }
        }
        if (input.actionType === "BAN_USER") {
          await connection.execute("UPDATE users SET status = 'LOCKED', updated_at = UTC_TIMESTAMP() WHERE id = ?", [targetId]);
        }
        if (input.actionType === "UNBAN_USER") {
          await connection.execute("UPDATE users SET status = 'ACTIVE', updated_at = UTC_TIMESTAMP() WHERE id = ?", [targetId]);
        }
      }

      await connection.commit();
      if (moderationPenalty) {
        await userRepository.addReputation({
          userId: moderationPenalty.userId,
          delta: -5,
          reason: moderationPenalty.reason,
          entityType: moderationPenalty.entityType,
          entityId: moderationPenalty.entityId
        });
      }
      return { updated: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};
