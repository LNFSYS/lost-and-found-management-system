import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

type ClaimStatus = "PENDING" | "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";

interface ClaimPostRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: "LOST" | "FOUND";
  status: "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "EXPIRED" | "HIDDEN";
}

interface ClaimRow extends RowDataPacket {
  id: string;
  post_id: string;
  claimant_id: string;
  post_owner_id: string;
  status: "PENDING" | "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  description: string | null;
  approximate_lost_at: string | null;
  approximate_location: string | null;
  rejection_reason: string | null;
  more_info_request: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  claimant_name: string;
}

interface EvidenceRow extends RowDataPacket {
  id: string;
  evidence_type: "OWNERSHIP_PROOF" | "ADDITIONAL_DOC" | "PHOTO";
  description: string | null;
  created_at: string;
}

interface EvidenceStorageRow extends RowDataPacket {
  secure_url: string;
}

interface ExistingClaimRow extends RowDataPacket {
  id: string;
  status: "PENDING" | "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";
}

interface ClaimPostIdRow extends RowDataPacket {
  post_id: string;
}

interface LockedClaimRow extends RowDataPacket {
  status: ClaimStatus;
}

interface AcceptedClaimRow extends RowDataPacket {
  id: string;
}

function mapClaim(row: ClaimRow) {
  return {
    id: row.id,
    postId: row.post_id,
    postOwnerId: row.post_owner_id,
    claimant: {
      id: row.claimant_id,
      fullName: row.claimant_name
    },
    status: row.status,
    description: row.description,
    approximateLostAt: row.approximate_lost_at,
    approximateLocation: row.approximate_location,
    rejectionReason: row.rejection_reason,
    moreInfoRequest: row.more_info_request,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const claimSelect = `
  SELECT
    c.id, c.post_id, c.claimant_id, p.user_id AS post_owner_id, c.status,
    c.description, c.approximate_lost_at, c.approximate_location,
    c.rejection_reason, c.more_info_request, c.accepted_at, c.rejected_at,
    c.cancelled_at, c.created_at, c.updated_at,
    u.full_name AS claimant_name
  FROM claims c
  INNER JOIN posts p ON p.id = c.post_id
  INNER JOIN users u ON u.id = c.claimant_id
`;

export const claimRepository = {
  async findPostForClaim(postId: string) {
    const [rows] = await dbPool.query<ClaimPostRow[]>(
      "SELECT id, user_id, type, status FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [postId]
    );
    return rows[0] ?? null;
  },

  async findByPostAndClaimant(postId: string, claimantId: string) {
    const [rows] = await dbPool.query<ExistingClaimRow[]>(
      "SELECT id, status FROM claims WHERE post_id = ? AND claimant_id = ? LIMIT 1",
      [postId, claimantId]
    );
    return rows[0] ?? null;
  },

  async countRejectedClaimsForUser(claimantId: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      "SELECT COUNT(*) AS total FROM claims WHERE claimant_id = ? AND status = 'REJECTED'",
      [claimantId]
    );
    return Number(rows[0]?.total ?? 0);
  },

  async hasPrivateSignal(claimId: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { has_private_signal: number }>>(
      "SELECT has_private_signal FROM claims WHERE id = ? LIMIT 1",
      [claimId]
    );
    return rows[0]?.has_private_signal === 1;
  },

  async create(input: {
    id: string;
    postId: string;
    claimantId: string;
    description?: string | null;
    secretAnswerHash: string;
    hasPrivateSignal: boolean;
    approximateLostAt?: Date | null;
    approximateLocation: string;
  }) {
    await dbPool.execute(
      `
        INSERT INTO claims (
          id, post_id, claimant_id, description, secret_answer_hash, has_private_signal,
          approximate_lost_at, approximate_location
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.postId,
        input.claimantId,
        input.description ?? null,
        input.secretAnswerHash,
        input.hasPrivateSignal,
        input.approximateLostAt ?? null,
        input.approximateLocation
      ]
    );
    await dbPool.execute(
      `
        INSERT INTO claim_state_logs (id, claim_id, from_status, to_status, actor_id, note)
        VALUES (UUID(), ?, NULL, 'PENDING', ?, 'Claim submitted')
      `,
      [input.id, input.claimantId]
    );

    return this.findById(input.id);
  },

  async findById(id: string) {
    const [rows] = await dbPool.query<ClaimRow[]>(`${claimSelect} WHERE c.id = ? LIMIT 1`, [id]);
    const row = rows[0];
    if (!row) {
      return null;
    }

    const [evidenceRows] = await dbPool.query<EvidenceRow[]>(
      `
        SELECT id, evidence_type, description, created_at
        FROM claim_evidence
        WHERE claim_id = ?
        ORDER BY created_at
      `,
      [id]
    );

    return {
      claim: mapClaim(row),
      evidence: evidenceRows.map((evidence) => ({
        id: evidence.id,
        imagePath: `/api/claims/${id}/evidence/${evidence.id}/image`,
        evidenceType: evidence.evidence_type,
        description: evidence.description,
        createdAt: evidence.created_at
      }))
    };
  },

  async findEvidenceStorage(claimId: string, evidenceId: string) {
    const [rows] = await dbPool.query<EvidenceStorageRow[]>(
      "SELECT secure_url FROM claim_evidence WHERE claim_id = ? AND id = ? LIMIT 1",
      [claimId, evidenceId]
    );
    return rows[0] ?? null;
  },

  async listByPostId(postId: string) {
    const [rows] = await dbPool.query<ClaimRow[]>(
      `${claimSelect} WHERE c.post_id = ? ORDER BY c.created_at DESC`,
      [postId]
    );

    return rows.map(mapClaim);
  },

  async updateStatus(input: {
    id: string;
    actorId: string;
    status: "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";
    allowedStatuses?: ClaimStatus[];
    rejectionReason?: string | null;
    moreInfoRequest?: string | null;
    note?: string | null;
  }) {
    const existing = await this.findById(input.id);
    if (!existing) {
      return null;
    }

    const allowedStatuses = input.allowedStatuses?.length ? input.allowedStatuses : undefined;
    const statusGuardSql = allowedStatuses ? ` AND status IN (${allowedStatuses.map(() => "?").join(", ")})` : "";
    const [result] = await dbPool.execute<ResultSetHeader>(
      `
        UPDATE claims
        SET status = ?,
            rejection_reason = CASE WHEN ? = 'REJECTED' THEN ? ELSE rejection_reason END,
            more_info_request = CASE WHEN ? = 'NEED_MORE_INFO' THEN ? ELSE more_info_request END,
            accepted_at = CASE WHEN ? = 'ACCEPTED' THEN COALESCE(accepted_at, UTC_TIMESTAMP()) ELSE accepted_at END,
            rejected_at = CASE WHEN ? = 'REJECTED' THEN COALESCE(rejected_at, UTC_TIMESTAMP()) ELSE rejected_at END,
            cancelled_at = CASE WHEN ? = 'CANCELLED' THEN COALESCE(cancelled_at, UTC_TIMESTAMP()) ELSE cancelled_at END,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?${statusGuardSql}
      `,
      [
        input.status,
        input.status,
        input.rejectionReason ?? null,
        input.status,
        input.moreInfoRequest ?? null,
        input.status,
        input.status,
        input.status,
        input.id,
        ...(allowedStatuses ?? [])
      ]
    );
    if (result.affectedRows === 0) {
      return null;
    }

    await dbPool.execute(
      `
        INSERT INTO claim_state_logs (id, claim_id, from_status, to_status, actor_id, note)
        VALUES (UUID(), ?, ?, ?, ?, ?)
      `,
      [input.id, existing.claim.status, input.status, input.actorId, input.note ?? null]
    );

    return this.findById(input.id);
  },

  async acceptClaim(input: { id: string; actorId: string }) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [claimPostRows] = await connection.query<ClaimPostIdRow[]>(
        "SELECT post_id FROM claims WHERE id = ? LIMIT 1",
        [input.id]
      );
      const postId = claimPostRows[0]?.post_id;
      if (!postId) {
        await connection.rollback();
        return { outcome: "NOT_FOUND" as const };
      }

      // Every accept for the same item takes this lock first, which serializes reviewers.
      const [postRows] = await connection.query<ClaimPostRow[]>(
        "SELECT id, user_id, type, status FROM posts WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
        [postId]
      );
      const post = postRows[0];
      if (!post || post.type !== "FOUND" || (post.status !== "OPEN" && post.status !== "MATCHED")) {
        await connection.rollback();
        return { outcome: "POST_NOT_OPEN" as const };
      }

      const [claimRows] = await connection.query<LockedClaimRow[]>(
        "SELECT status FROM claims WHERE id = ? AND post_id = ? FOR UPDATE",
        [input.id, postId]
      );
      const currentStatus = claimRows[0]?.status;
      if (!currentStatus) {
        await connection.rollback();
        return { outcome: "NOT_FOUND" as const };
      }
      if (currentStatus !== "PENDING" && currentStatus !== "NEED_MORE_INFO") {
        await connection.rollback();
        return { outcome: "INVALID_STATUS" as const };
      }

      const [acceptedRows] = await connection.query<AcceptedClaimRow[]>(
        "SELECT id FROM claims WHERE post_id = ? AND status = 'ACCEPTED' LIMIT 1",
        [postId]
      );
      if (acceptedRows.length > 0) {
        await connection.rollback();
        return { outcome: "POST_ALREADY_ACCEPTED" as const };
      }

      await connection.execute(
        `
          UPDATE claims
          SET status = 'ACCEPTED',
              accepted_at = COALESCE(accepted_at, UTC_TIMESTAMP()),
              updated_at = UTC_TIMESTAMP()
          WHERE id = ?
        `,
        [input.id]
      );
      await connection.execute(
        `
          INSERT INTO claim_state_logs (id, claim_id, from_status, to_status, actor_id, note)
          VALUES (UUID(), ?, ?, 'ACCEPTED', ?, 'Claim accepted')
        `,
        [input.id, currentStatus, input.actorId]
      );

      await connection.commit();
      const detail = await this.findById(input.id);
      return detail ? { outcome: "ACCEPTED" as const, detail } : { outcome: "NOT_FOUND" as const };
    } catch (error) {
      await connection.rollback();
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "ER_DUP_ENTRY"
      ) {
        return { outcome: "POST_ALREADY_ACCEPTED" as const };
      }
      throw error;
    } finally {
      connection.release();
    }
  },

  async createEvidence(input: {
    id: string;
    claimId: string;
    secureUrl: string;
    publicId: string;
    evidenceType: "OWNERSHIP_PROOF" | "ADDITIONAL_DOC" | "PHOTO";
    description?: string | null;
  }) {
    await dbPool.execute(
      `
        INSERT INTO claim_evidence (id, claim_id, secure_url, public_id, evidence_type, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [input.id, input.claimId, input.secureUrl, input.publicId, input.evidenceType, input.description ?? null]
    );

    return this.findById(input.claimId);
  }
};
