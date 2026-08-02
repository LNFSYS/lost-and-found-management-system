import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import type { UserStatus } from "../models/user.model.js";

interface SessionStateRow extends RowDataPacket {
  status: UserStatus;
  session_version: number;
}

export const sessionRepository = {
  async findState(userId: string) {
    const [rows] = await dbPool.query<SessionStateRow[]>(
      `
        SELECT status, session_version
        FROM users
        WHERE id = ? AND deleted_at IS NULL
        LIMIT 1
      `,
      [userId]
    );
    const row = rows[0];
    return row
      ? {
          status: row.status,
          sessionVersion: Number(row.session_version)
        }
      : null;
  }
};
