import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { dbPool } from "../config/db.js";

interface NotificationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

function mapNotification(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read === 1,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

export const notificationRepository = {
  async create(input: CreateNotificationInput) {
    const id = randomUUID();
    await dbPool.execute(
      `
        INSERT INTO notifications (id, user_id, type, title, body, entity_type, entity_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.userId,
        input.type,
        input.title,
        input.body ?? null,
        input.entityType ?? null,
        input.entityId ?? null
      ]
    );
    return { id };
  },

  async createMany(inputs: CreateNotificationInput[]) {
    const seen = new Set<string>();
    for (const input of inputs) {
      const key = `${input.userId}:${input.type}:${input.entityType ?? ""}:${input.entityId ?? ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      await this.create(input);
    }
  },

  async listForUser(userId: string, limit: number) {
    const [rows] = await dbPool.query<NotificationRow[]>(
      `
        SELECT id, user_id, type, title, body, entity_type, entity_id, is_read, read_at, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [userId, limit]
    );
    const [countRows] = await dbPool.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userId]
    );

    return {
      items: rows.map(mapNotification),
      unreadCount: countRows[0]?.total ?? 0
    };
  },

  async markRead(userId: string, notificationId: string) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      `
        UPDATE notifications
        SET is_read = TRUE,
            read_at = COALESCE(read_at, UTC_TIMESTAMP())
        WHERE id = ? AND user_id = ?
      `,
      [notificationId, userId]
    );
    return { updated: result.affectedRows > 0 };
  },

  async markAllRead(userId: string) {
    await dbPool.execute(
      `
        UPDATE notifications
        SET is_read = TRUE,
            read_at = COALESCE(read_at, UTC_TIMESTAMP())
        WHERE user_id = ? AND is_read = FALSE
      `,
      [userId]
    );
    return { updated: true };
  }
};
