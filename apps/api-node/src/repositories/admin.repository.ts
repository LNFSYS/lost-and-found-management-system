import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { dbPool } from "../config/db.js";
import type { UserRole } from "../models/user.model.js";
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

interface RoomAdminRow extends RowDataPacket {
  id: string;
  building_id: string;
  building_name: string | null;
  name: string;
  is_active: number;
}

interface HandoverAdminRow extends RowDataPacket {
  id: string;
  name: string;
  address: string;
  area_id: string | null;
  building_id: string | null;
  room_id: string | null;
  opening_hours: string | null;
  contact_info: string | null;
  is_active: number;
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

function uniqueRoles(roles: UserRole[]) {
  return Array.from(new Set<UserRole>(["USER", ...roles]));
}

function reportTargetText(row: ReportAdminRow) {
  return row.target_title ?? row.target_name ?? row.entity_id;
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
      rooms: await count("campus_rooms", "is_active = TRUE"),
      handoverPoints: await count("handover_points", "is_active = TRUE"),
      postsByStatus: statusRows,
      postsByType: typeRows
    };
  },

  async users() {
    const [rows] = await dbPool.query<UserAdminRow[]>(
      `
        SELECT u.id, u.email, u.full_name, u.student_code, u.status, u.created_at,
               GROUP_CONCAT(r.code ORDER BY r.code SEPARATOR ',') AS roles
        FROM users u
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

  async createCategory(input: { name: string; icon?: string | null; parentId?: string | null; sortOrder?: number }) {
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

  async updateCategory(id: string, input: { name: string; icon?: string | null; parentId?: string | null; sortOrder?: number }) {
    await dbPool.execute(
      `
        UPDATE item_categories
        SET name = ?, name_normalized = ?, icon = ?, parent_id = ?, sort_order = ?
        WHERE id = ?
      `,
      [input.name.trim(), normalizeText(input.name), input.icon ?? null, input.parentId ?? null, input.sortOrder ?? 0, id]
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

  async createArea(input: { name: string; description?: string | null; sortOrder?: number }) {
    const id = randomUUID();
    await dbPool.execute(
      "INSERT INTO campus_areas (id, name, description, sort_order) VALUES (?, ?, ?, ?)",
      [id, input.name.trim(), input.description ?? null, input.sortOrder ?? 0]
    );
    return { id };
  },

  async updateArea(id: string, input: { name: string; description?: string | null; sortOrder?: number }) {
    await dbPool.execute(
      "UPDATE campus_areas SET name = ?, description = ?, sort_order = ? WHERE id = ?",
      [input.name.trim(), input.description ?? null, input.sortOrder ?? 0, id]
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

  async createBuilding(input: { areaId: string; name: string; sortOrder?: number }) {
    const id = randomUUID();
    await dbPool.execute("INSERT INTO campus_buildings (id, area_id, name, sort_order) VALUES (?, ?, ?, ?)", [
      id,
      input.areaId,
      input.name.trim(),
      input.sortOrder ?? 0
    ]);
    return { id };
  },

  async updateBuilding(id: string, input: { areaId: string; name: string; sortOrder?: number }) {
    await dbPool.execute("UPDATE campus_buildings SET area_id = ?, name = ?, sort_order = ? WHERE id = ?", [
      input.areaId,
      input.name.trim(),
      input.sortOrder ?? 0,
      id
    ]);
    return { updated: true };
  },

  async setBuildingActive(id: string, isActive: boolean) {
    await dbPool.execute("UPDATE campus_buildings SET is_active = ? WHERE id = ?", [isActive, id]);
    return { updated: true };
  },

  async rooms() {
    const [rows] = await dbPool.query<RoomAdminRow[]>(
      `
        SELECT r.id, r.building_id, b.name AS building_name, r.name, r.is_active
        FROM campus_rooms r
        LEFT JOIN campus_buildings b ON b.id = r.building_id
        ORDER BY b.name, r.name
      `
    );
    return rows.map((row) => ({
      id: row.id,
      buildingId: row.building_id,
      buildingName: row.building_name,
      name: row.name,
      isActive: activeFlag(row.is_active)
    }));
  },

  async createRoom(input: { buildingId: string; name: string }) {
    const id = randomUUID();
    await dbPool.execute("INSERT INTO campus_rooms (id, building_id, name) VALUES (?, ?, ?)", [
      id,
      input.buildingId,
      input.name.trim()
    ]);
    return { id };
  },

  async updateRoom(id: string, input: { buildingId: string; name: string }) {
    await dbPool.execute("UPDATE campus_rooms SET building_id = ?, name = ? WHERE id = ?", [
      input.buildingId,
      input.name.trim(),
      id
    ]);
    return { updated: true };
  },

  async setRoomActive(id: string, isActive: boolean) {
    await dbPool.execute("UPDATE campus_rooms SET is_active = ? WHERE id = ?", [isActive, id]);
    return { updated: true };
  },

  async handoverPoints() {
    const [rows] = await dbPool.query<HandoverAdminRow[]>(
      `
        SELECT id, name, address, area_id, building_id, room_id, opening_hours, contact_info, is_active
        FROM handover_points
        ORDER BY name
      `
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      areaId: row.area_id,
      buildingId: row.building_id,
      roomId: row.room_id,
      openingHours: row.opening_hours,
      contactInfo: row.contact_info,
      isActive: activeFlag(row.is_active)
    }));
  },

  async createHandoverPoint(
    input: {
      name: string;
      address: string;
      areaId?: string | null;
      buildingId?: string | null;
      roomId?: string | null;
      openingHours?: string | null;
      contactInfo?: string | null;
    },
    actorId: string
  ) {
    const id = randomUUID();
    await dbPool.execute(
      `
        INSERT INTO handover_points (
          id, name, address, area_id, building_id, room_id, opening_hours, contact_info, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.name.trim(),
        input.address.trim(),
        input.areaId ?? null,
        input.buildingId ?? null,
        input.roomId ?? null,
        input.openingHours ?? null,
        input.contactInfo ?? null,
        actorId
      ]
    );
    return { id };
  },

  async updateHandoverPoint(id: string, input: {
    name: string;
    address: string;
    areaId?: string | null;
    buildingId?: string | null;
    roomId?: string | null;
    openingHours?: string | null;
    contactInfo?: string | null;
  }) {
    await dbPool.execute(
      `
        UPDATE handover_points
        SET name = ?, address = ?, area_id = ?, building_id = ?, room_id = ?, opening_hours = ?, contact_info = ?
        WHERE id = ?
      `,
      [
        input.name.trim(),
        input.address.trim(),
        input.areaId ?? null,
        input.buildingId ?? null,
        input.roomId ?? null,
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
        }
        if (input.actionType === "DELETE_POST") {
          await connection.execute("UPDATE posts SET deleted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?", [
            targetId
          ]);
        }
        if (input.actionType === "BAN_USER") {
          await connection.execute("UPDATE users SET status = 'LOCKED', updated_at = UTC_TIMESTAMP() WHERE id = ?", [targetId]);
        }
        if (input.actionType === "UNBAN_USER") {
          await connection.execute("UPDATE users SET status = 'ACTIVE', updated_at = UTC_TIMESTAMP() WHERE id = ?", [targetId]);
        }
      }

      await connection.commit();
      return { updated: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};
