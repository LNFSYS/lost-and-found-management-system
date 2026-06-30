import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { dbPool } from "../config/db.js";
import type { User, UserRole, UserStatus } from "../models/user.model.js";

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  normalized_email: string;
  password_hash: string | null;
  full_name: string;
  student_code: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  avatar_public_id: string | null;
  status: UserStatus;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RoleRow extends RowDataPacket {
  code: UserRole;
}

interface IdRow extends RowDataPacket {
  id: string;
}

interface OAuthAccountRow extends RowDataPacket {
  user_id: string;
}

interface OtpRow extends RowDataPacket {
  id: string;
  user_id: string | null;
  email: string;
  normalized_email: string;
  otp_hash: string;
  attempt_count: number;
  max_attempts: number;
  expires_at: string;
}

type OtpPurpose = "REGISTER" | "LOGIN" | "CHANGE_EMAIL" | "PASSWORD_RESET";

interface RefreshTokenRow extends RowDataPacket {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
}

interface ActivityLogRow extends RowDataPacket {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: string | null;
  created_at: string;
}

interface ReputationRow extends RowDataPacket {
  total_points: number;
  level: "NEW" | "TRUSTED" | "RELIABLE" | "EXCELLENT";
}

interface ReputationLogRow extends RowDataPacket {
  id: string;
  delta: number;
  reason: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

type Queryable = typeof dbPool | PoolConnection;

function toOptional(value: string | null): string | undefined {
  return value ?? undefined;
}

function mapUser(row: UserRow, roles: UserRole[]): User {
  return {
    id: row.id,
    email: row.email,
    normalizedEmail: row.normalized_email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    studentCode: toOptional(row.student_code),
    phoneNumber: toOptional(row.phone_number),
    avatarUrl: toOptional(row.avatar_url),
    avatarPublicId: toOptional(row.avatar_public_id),
    roles,
    status: row.status,
    emailVerifiedAt: toOptional(row.email_verified_at),
    lastLoginAt: toOptional(row.last_login_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getRoles(queryable: Queryable, userId: string): Promise<UserRole[]> {
  const [rows] = await queryable.query<RoleRow[]>(
    `
      SELECT r.code
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.code
    `,
    [userId]
  );

  return rows.map((row) => row.code);
}

async function findRoleId(queryable: Queryable, role: UserRole) {
  const [rows] = await queryable.query<IdRow[]>("SELECT id FROM roles WHERE code = ?", [role]);
  return rows[0]?.id;
}

export const userRepository = {
  async create(user: User): Promise<User> {
    await dbPool.execute(
      `
        INSERT INTO users (
          id, email, normalized_email, password_hash, full_name, student_code,
          phone_number, avatar_url, avatar_public_id, status, email_verified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        user.email,
        user.normalizedEmail,
        user.passwordHash,
        user.fullName,
        user.studentCode ?? null,
        user.phoneNumber ?? null,
        user.avatarUrl ?? null,
        user.avatarPublicId ?? null,
        user.status,
        user.emailVerifiedAt ?? null
      ]
    );

    return user;
  },

  async assignRole(userId: string, role: UserRole): Promise<void> {
    const roleId = await findRoleId(dbPool, role);
    if (!roleId) {
      throw new Error(`Role not found: ${role}`);
    }

    await dbPool.execute(
      `
        INSERT IGNORE INTO user_roles (user_id, role_id)
        VALUES (?, ?)
      `,
      [userId, roleId]
    );
  },

  async findById(id: string): Promise<User | null> {
    const [rows] = await dbPool.query<UserRow[]>(
      "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [id]
    );
    const row = rows[0];
    if (!row) {
      return null;
    }

    return mapUser(row, await getRoles(dbPool, row.id));
  },

  async findByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    const [rows] = await dbPool.query<UserRow[]>(
      "SELECT * FROM users WHERE normalized_email = ? AND deleted_at IS NULL LIMIT 1",
      [normalizedEmail]
    );
    const row = rows[0];
    if (!row) {
      return null;
    }

    return mapUser(row, await getRoles(dbPool, row.id));
  },

  async findOAuthUserId(provider: string, providerUserId: string): Promise<string | null> {
    const [rows] = await dbPool.query<OAuthAccountRow[]>(
      "SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ? LIMIT 1",
      [provider, providerUserId]
    );
    return rows[0]?.user_id ?? null;
  },

  async upsertOAuthAccount(input: {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail: string;
  }): Promise<void> {
    await dbPool.execute(
      `
        INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email, last_used_at)
        VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE
          user_id = VALUES(user_id),
          provider_email = VALUES(provider_email),
          last_used_at = UTC_TIMESTAMP()
      `,
      [randomUUID(), input.userId, input.provider, input.providerUserId, input.providerEmail]
    );
  },

  async markEmailVerified(userId: string): Promise<void> {
    await dbPool.execute(
      `
        UPDATE users
        SET status = 'ACTIVE', email_verified_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND deleted_at IS NULL
      `,
      [userId]
    );
  },

  async updateProfile(
    userId: string,
    input: { fullName?: string; studentCode?: string | null; phoneNumber?: string | null }
  ): Promise<User | null> {
    const updates: string[] = [];
    const values: Array<string | null> = [];

    if (input.fullName !== undefined) {
      updates.push("full_name = ?");
      values.push(input.fullName);
    }
    if (input.studentCode !== undefined) {
      updates.push("student_code = ?");
      values.push(input.studentCode);
    }
    if (input.phoneNumber !== undefined) {
      updates.push("phone_number = ?");
      values.push(input.phoneNumber);
    }

    if (updates.length > 0) {
      values.push(userId);
      await dbPool.execute(
        `UPDATE users SET ${updates.join(", ")}, updated_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL`,
        values
      );
    }

    return this.findById(userId);
  },

  async updateAvatar(userId: string, avatarUrl: string, avatarPublicId: string): Promise<User | null> {
    await dbPool.execute(
      `
        UPDATE users
        SET avatar_url = ?, avatar_public_id = ?, updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND deleted_at IS NULL
      `,
      [avatarUrl, avatarPublicId, userId]
    );

    return this.findById(userId);
  },

  async updatePendingRegistration(
    userId: string,
    input: {
      email: string;
      normalizedEmail: string;
      passwordHash: string;
      fullName: string;
      studentCode?: string | null;
      phoneNumber?: string | null;
    }
  ): Promise<User | null> {
    await dbPool.execute(
      `
        UPDATE users
        SET email = ?,
            normalized_email = ?,
            password_hash = ?,
            full_name = ?,
            student_code = ?,
            phone_number = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND status = 'PENDING_EMAIL_VERIFICATION' AND deleted_at IS NULL
      `,
      [
        input.email,
        input.normalizedEmail,
        input.passwordHash,
        input.fullName,
        input.studentCode ?? null,
        input.phoneNumber ?? null,
        userId
      ]
    );

    return this.findById(userId);
  },

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await dbPool.execute(
      `
        UPDATE users
        SET password_hash = ?, failed_login_count = 0, updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND deleted_at IS NULL
      `,
      [passwordHash, userId]
    );
  },

  async updateLastLogin(userId: string): Promise<void> {
    await dbPool.execute(
      "UPDATE users SET last_login_at = UTC_TIMESTAMP(), failed_login_count = 0 WHERE id = ?",
      [userId]
    );
  },

  async createOtp(input: {
    id: string;
    userId: string | null;
    email: string;
    normalizedEmail: string;
    otpHash: string;
    purpose?: OtpPurpose;
    expiresAt: Date;
  }): Promise<void> {
    await dbPool.execute(
      `
        INSERT INTO email_verification_otps (
          id, user_id, email, normalized_email, otp_hash, purpose, status, expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `,
      [
        input.id,
        input.userId,
        input.email,
        input.normalizedEmail,
        input.otpHash,
        input.purpose ?? "REGISTER",
        input.expiresAt
      ]
    );
  },

  async findLatestPendingOtp(normalizedEmail: string, purpose: OtpPurpose): Promise<OtpRow | null> {
    const [rows] = await dbPool.query<OtpRow[]>(
      `
        SELECT *
        FROM email_verification_otps
        WHERE normalized_email = ? AND purpose = ? AND status = 'PENDING'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [normalizedEmail, purpose]
    );

    return rows[0] ?? null;
  },

  async findLatestPendingRegisterOtp(normalizedEmail: string): Promise<OtpRow | null> {
    return this.findLatestPendingOtp(normalizedEmail, "REGISTER");
  },

  async cancelPendingOtps(normalizedEmail: string, purpose: OtpPurpose): Promise<void> {
    await dbPool.execute(
      `
        UPDATE email_verification_otps
        SET status = 'CANCELLED'
        WHERE normalized_email = ? AND purpose = ? AND status = 'PENDING'
      `,
      [normalizedEmail, purpose]
    );
  },

  async incrementOtpAttempt(otpId: string): Promise<void> {
    await dbPool.execute(
      "UPDATE email_verification_otps SET attempt_count = attempt_count + 1 WHERE id = ?",
      [otpId]
    );
  },

  async markOtpStatus(otpId: string, status: "VERIFIED" | "EXPIRED" | "CANCELLED"): Promise<void> {
    await dbPool.execute(
      `
        UPDATE email_verification_otps
        SET status = ?, verified_at = CASE WHEN ? = 'VERIFIED' THEN UTC_TIMESTAMP() ELSE verified_at END
        WHERE id = ?
      `,
      [status, status, otpId]
    );
  },

  async createRefreshToken(input: {
    id: string;
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<void> {
    await dbPool.execute(
      `
        INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip_address, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.userId,
        input.tokenHash,
        input.userAgent ?? null,
        input.ipAddress ?? null,
        input.expiresAt
      ]
    );
  },

  async findActiveRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const [rows] = await dbPool.query<RefreshTokenRow[]>(
      `
        SELECT *
        FROM refresh_tokens
        WHERE token_hash = ?
          AND revoked_at IS NULL
          AND expires_at > UTC_TIMESTAMP()
        LIMIT 1
      `,
      [tokenHash]
    );

    return rows[0] ?? null;
  },

  async revokeRefreshToken(
    tokenId: string,
    reason: "LOGOUT" | "ROTATED" | "ADMIN_LOCK" | "SECURITY_RISK",
    replacementTokenId?: string
  ): Promise<void> {
    await dbPool.execute(
      `
        UPDATE refresh_tokens
        SET revoked_at = UTC_TIMESTAMP(), revoked_reason = ?, replaced_by_token_id = ?
        WHERE id = ? AND revoked_at IS NULL
      `,
      [reason, replacementTokenId ?? null, tokenId]
    );
  },

  async revokeActiveRefreshTokensByUser(userId: string): Promise<void> {
    await dbPool.execute(
      `
        UPDATE refresh_tokens
        SET revoked_at = UTC_TIMESTAMP(), revoked_reason = 'SECURITY_RISK'
        WHERE user_id = ? AND revoked_at IS NULL
      `,
      [userId]
    );
  },

  async rotateRefreshToken(input: {
    oldTokenId: string;
    newTokenId: string;
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<void> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip_address, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          input.newTokenId,
          input.userId,
          input.tokenHash,
          input.userAgent ?? null,
          input.ipAddress ?? null,
          input.expiresAt
        ]
      );
      await connection.execute(
        `
          UPDATE refresh_tokens
          SET revoked_at = UTC_TIMESTAMP(), revoked_reason = 'ROTATED', replaced_by_token_id = ?
          WHERE id = ? AND revoked_at IS NULL
        `,
        [input.newTokenId, input.oldTokenId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async createLoginAudit(input: {
    userId?: string;
    normalizedEmail?: string;
    eventType: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await dbPool.execute(
      `
        INSERT INTO login_audit_logs (
          id, user_id, normalized_email, event_type, success, failure_reason, ip_address, user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        input.userId ?? null,
        input.normalizedEmail ?? null,
        input.eventType,
        input.success,
        input.failureReason ?? null,
        input.ipAddress ?? null,
        input.userAgent ?? null
      ]
    );
  },

  async createActivityLog(input: {
    userId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await dbPool.execute(
      `
        INSERT INTO user_activity_logs (id, user_id, action, entity_type, entity_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        input.userId,
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );
  },

  async listActivityLogs(userId: string, limit: number) {
    const [rows] = await dbPool.query<ActivityLogRow[]>(
      `
        SELECT id, action, entity_type, entity_id, metadata, created_at
        FROM user_activity_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [userId, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
      createdAt: row.created_at
    }));
  },

  async ensureReputationScore(userId: string): Promise<void> {
    const [result] = await dbPool.execute<ResultSetHeader>(
      `
        INSERT IGNORE INTO reputation_scores (id, user_id)
        VALUES (?, ?)
      `,
      [randomUUID(), userId]
    );

    if (result.affectedRows > 0) {
      await this.createActivityLog({
        userId,
        action: "REPUTATION_SCORE_CREATED",
        entityType: "USER",
        entityId: userId
      });
    }
  },

  async getReputation(userId: string) {
    await this.ensureReputationScore(userId);

    const [scoreRows] = await dbPool.query<ReputationRow[]>(
      "SELECT total_points, level FROM reputation_scores WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const [logRows] = await dbPool.query<ReputationLogRow[]>(
      `
        SELECT id, delta, reason, entity_type, entity_id, created_at
        FROM reputation_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [userId]
    );

    const score = scoreRows[0] ?? { total_points: 0, level: "NEW" };
    return {
      totalPoints: score.total_points,
      level: score.level,
      recentLogs: logRows.map((row) => ({
        id: row.id,
        delta: row.delta,
        reason: row.reason,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at
      }))
    };
  },

  async addReputation(input: {
    userId: string;
    delta: number;
    reason: string;
    entityType?: string | null;
    entityId?: string | null;
  }) {
    await this.ensureReputationScore(input.userId);
    await dbPool.execute(
      `
        INSERT INTO reputation_logs (id, user_id, delta, reason, entity_type, entity_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        input.userId,
        input.delta,
        input.reason,
        input.entityType ?? null,
        input.entityId ?? null
      ]
    );
    await dbPool.execute(
      `
        UPDATE reputation_scores
        SET total_points = GREATEST(0, total_points + ?),
            level = CASE
              WHEN GREATEST(0, total_points + ?) >= 100 THEN 'EXCELLENT'
              WHEN GREATEST(0, total_points + ?) >= 50 THEN 'RELIABLE'
              WHEN GREATEST(0, total_points + ?) >= 20 THEN 'TRUSTED'
              ELSE 'NEW'
            END,
            updated_at = UTC_TIMESTAMP()
        WHERE user_id = ?
      `,
      [input.delta, input.delta, input.delta, input.delta, input.userId]
    );

    await this.createActivityLog({
      userId: input.userId,
      action: "REPUTATION_UPDATED",
      entityType: input.entityType ?? "USER",
      entityId: input.entityId ?? input.userId,
      metadata: {
        delta: input.delta,
        reason: input.reason
      }
    });
  }
};
