import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

interface ChatRoomRow extends RowDataPacket {
  id: string;
  claim_id: string;
}

interface ChatMessageRow extends RowDataPacket {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string | null;
  media_url: string | null;
  media_public_id: string | null;
  message_type: "TEXT" | "IMAGE" | "SYSTEM";
  is_read: number;
  read_at: string | null;
  created_at: string;
}

interface ChatImageRow extends RowDataPacket {
  media_url: string;
  media_public_id: string;
}

function mapMessage(row: ChatMessageRow) {
  return {
    id: row.id,
    roomId: row.room_id,
    sender: {
      id: row.sender_id,
      fullName: row.sender_name
    },
    content: row.content,
    mediaUrl: row.media_url,
    mediaPublicId: row.media_public_id,
    messageType: row.message_type,
    isRead: row.is_read === 1,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

export const chatRepository = {
  async canAccessClaim(claimId: string, userId: string, roles: string[]) {
    if (roles.includes("ADMIN") || roles.includes("STAFF")) {
      return true;
    }
    const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      `
        SELECT COUNT(*) AS total
        FROM claims c
        INNER JOIN posts p ON p.id = c.post_id
        WHERE c.id = ?
          AND (c.claimant_id = ? OR p.user_id = ?)
      `,
      [claimId, userId, userId]
    );
    return Number(rows[0]?.total ?? 0) > 0;
  },

  async getOrCreateRoom(claimId: string) {
    await dbPool.execute("INSERT IGNORE INTO chat_rooms (id, claim_id) VALUES (?, ?)", [randomUUID(), claimId]);
    const [rows] = await dbPool.query<ChatRoomRow[]>("SELECT id, claim_id FROM chat_rooms WHERE claim_id = ? LIMIT 1", [
      claimId
    ]);
    return rows[0] ?? null;
  },

  async createMessage(input: {
    roomId: string;
    senderId: string;
    content?: string | null;
    mediaUrl?: string | null;
    mediaPublicId?: string | null;
    messageType: "TEXT" | "IMAGE" | "SYSTEM";
  }) {
    const id = randomUUID();
    await dbPool.execute(
      `
        INSERT INTO chat_messages (id, room_id, sender_id, content, media_url, media_public_id, message_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.roomId,
        input.senderId,
        input.content ?? null,
        input.mediaUrl ?? null,
        input.mediaPublicId ?? null,
        input.messageType
      ]
    );
    const [rows] = await dbPool.query<ChatMessageRow[]>(
      `
        SELECT cm.id, cm.room_id, cm.sender_id, u.full_name AS sender_name,
               cm.content, cm.media_url, cm.media_public_id, cm.message_type,
               cm.is_read, cm.read_at, cm.created_at
        FROM chat_messages cm
        INNER JOIN users u ON u.id = cm.sender_id
        WHERE cm.id = ?
        LIMIT 1
      `,
      [id]
    );
    return rows[0] ? mapMessage(rows[0]) : null;
  },

  async listMessages(roomId: string, limit = 50) {
    const [rows] = await dbPool.query<ChatMessageRow[]>(
      `
        SELECT cm.id, cm.room_id, cm.sender_id, u.full_name AS sender_name,
               cm.content, cm.media_url, cm.media_public_id, cm.message_type,
               cm.is_read, cm.read_at, cm.created_at
        FROM chat_messages cm
        INNER JOIN users u ON u.id = cm.sender_id
        WHERE cm.room_id = ?
        ORDER BY cm.created_at DESC
        LIMIT ?
      `,
      [roomId, limit]
    );
    return rows.map(mapMessage).reverse();
  },

  async markRoomRead(roomId: string, readerId: string) {
    await dbPool.execute(
      `
        UPDATE chat_messages
        SET is_read = TRUE,
            read_at = COALESCE(read_at, UTC_TIMESTAMP())
        WHERE room_id = ?
          AND sender_id <> ?
          AND is_read = FALSE
      `,
      [roomId, readerId]
    );
    return { updated: true };
  },

  async findImageForClaim(claimId: string, mediaPublicId: string) {
    const [rows] = await dbPool.query<ChatImageRow[]>(
      `
        SELECT cm.media_url, cm.media_public_id
        FROM chat_messages cm
        INNER JOIN chat_rooms cr ON cr.id = cm.room_id
        WHERE cr.claim_id = ?
          AND cm.media_public_id = ?
          AND cm.message_type = 'IMAGE'
        LIMIT 1
      `,
      [claimId, mediaPublicId]
    );
    const row = rows[0];
    return row
      ? {
          mediaUrl: row.media_url,
          mediaPublicId: row.media_public_id
        }
      : null;
  }
};
