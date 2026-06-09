import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

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
  secret_answer: string | null;
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
  secure_url: string;
  public_id: string;
  evidence_type: "OWNERSHIP_PROOF" | "ADDITIONAL_DOC" | "PHOTO";
  description: string | null;
  created_at: string;
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
    secretAnswer: row.secret_answer,
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
    c.description, c.secret_answer, c.approximate_lost_at, c.approximate_location,
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

  async create(input: {
    id: string;
    postId: string;
    claimantId: string;
    description?: string | null;
    secretAnswer: string;
    approximateLostAt?: Date | null;
    approximateLocation: string;
  }) {
    await dbPool.execute(
      `
        INSERT INTO claims (
          id, post_id, claimant_id, description, secret_answer,
          approximate_lost_at, approximate_location
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.postId,
        input.claimantId,
        input.description ?? null,
        input.secretAnswer,
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
        SELECT id, secure_url, public_id, evidence_type, description, created_at
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
        secureUrl: evidence.secure_url,
        publicId: evidence.public_id,
        evidenceType: evidence.evidence_type,
        description: evidence.description,
        createdAt: evidence.created_at
      }))
    };
  },

  async listByPostId(postId: string) {
    const [rows] = await dbPool.query<ClaimRow[]>(
      `${claimSelect} WHERE c.post_id = ? ORDER BY c.created_at DESC`,
      [postId]
    );

    return rows.map(mapClaim);
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
