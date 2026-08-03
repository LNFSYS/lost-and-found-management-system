import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

interface ProofRow extends RowDataPacket {
  id: string;
  owner_id: string;
  item_name: string;
  proof_type: string;
  private_description: string | null;
  masked_value: string | null;
  secret_value_hash: string | null;
  media_secure_url: string | null;
  media_public_id: string | null;
  media_format: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  updated_at: string;
}

interface AttachedProofRow extends RowDataPacket {
  claim_id: string;
  proof_id: string;
  owner_id: string;
  claimant_id: string;
  post_owner_id: string;
  item_name_snapshot: string;
  proof_type_snapshot: string;
  private_description_snapshot: string | null;
  masked_value_snapshot: string | null;
  media_secure_url: string | null;
  media_public_id: string | null;
  media_format: string | null;
  attached_at: string;
}

function mapProof(row: ProofRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    itemName: row.item_name,
    proofType: row.proof_type,
    privateDescription: row.private_description,
    maskedValue: row.masked_value,
    hasSecretValue: Boolean(row.secret_value_hash),
    hasMedia: Boolean(row.media_public_id),
    mediaPath: row.media_public_id ? `/api/proof-vault/${row.id}/media` : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const proofColumns = `id, owner_id, item_name, proof_type, private_description, masked_value,
  secret_value_hash, media_secure_url, media_public_id, media_format, status, created_at, updated_at`;

export const proofVaultRepository = {
  async listForOwner(ownerId: string) {
    const [rows] = await dbPool.query<ProofRow[]>(
      `SELECT ${proofColumns} FROM private_proofs WHERE owner_id = ? ORDER BY status, updated_at DESC`,
      [ownerId]
    );
    return rows.map(mapProof);
  },

  async findOwned(id: string, ownerId: string) {
    const [rows] = await dbPool.query<ProofRow[]>(
      `SELECT ${proofColumns} FROM private_proofs WHERE id = ? AND owner_id = ? LIMIT 1`,
      [id, ownerId]
    );
    return rows[0] ?? null;
  },

  async create(input: {
    id: string;
    ownerId: string;
    itemName: string;
    proofType: string;
    privateDescription: string | null;
    maskedValue: string | null;
    secretValueHash: string | null;
  }) {
    await dbPool.execute(
      `INSERT INTO private_proofs
       (id, owner_id, item_name, proof_type, private_description, masked_value, secret_value_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.ownerId, input.itemName, input.proofType, input.privateDescription, input.maskedValue, input.secretValueHash]
    );
    return this.findOwned(input.id, input.ownerId);
  },

  async update(id: string, ownerId: string, updates: Record<string, string | null>) {
    const columnMap: Record<string, string> = {
      itemName: "item_name",
      proofType: "proof_type",
      privateDescription: "private_description",
      maskedValue: "masked_value",
      secretValueHash: "secret_value_hash"
    };
    const entries = Object.entries(updates).filter(([key]) => columnMap[key]);
    if (entries.length === 0) return this.findOwned(id, ownerId);
    const [result] = await dbPool.execute<ResultSetHeader>(
      `UPDATE private_proofs SET ${entries.map(([key]) => `${columnMap[key]} = ?`).join(", ")}
       WHERE id = ? AND owner_id = ? AND status = 'ACTIVE'`,
      [...entries.map(([, value]) => value), id, ownerId]
    );
    return result.affectedRows > 0 ? this.findOwned(id, ownerId) : null;
  },

  async archive(id: string, ownerId: string) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      "UPDATE private_proofs SET status = 'ARCHIVED' WHERE id = ? AND owner_id = ? AND status = 'ACTIVE'",
      [id, ownerId]
    );
    return result.affectedRows > 0;
  },

  async setMedia(id: string, ownerId: string, media: { secureUrl: string; publicId: string; format: string | null }) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      `UPDATE private_proofs SET media_secure_url = ?, media_public_id = ?, media_format = ?
       WHERE id = ? AND owner_id = ? AND status = 'ACTIVE'`,
      [media.secureUrl, media.publicId, media.format, id, ownerId]
    );
    return result.affectedRows > 0 ? this.findOwned(id, ownerId) : null;
  },

  async attachToClaim(input: { claimId: string; proofId: string; userId: string }) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const [claimRows] = await connection.query<Array<RowDataPacket & { claimant_id: string; status: string }>>(
        "SELECT claimant_id, status FROM claims WHERE id = ? FOR UPDATE",
        [input.claimId]
      );
      const claim = claimRows[0];
      if (!claim) {
        await connection.rollback();
        return { outcome: "CLAIM_NOT_FOUND" as const };
      }
      if (claim.claimant_id !== input.userId) {
        await connection.rollback();
        return { outcome: "FORBIDDEN" as const };
      }
      if (!["PENDING", "NEED_MORE_INFO"].includes(claim.status)) {
        await connection.rollback();
        return { outcome: "CLAIM_CLOSED" as const };
      }
      const [proofRows] = await connection.query<ProofRow[]>(
        `SELECT ${proofColumns} FROM private_proofs WHERE id = ? FOR UPDATE`,
        [input.proofId]
      );
      const proof = proofRows[0];
      if (!proof || proof.owner_id !== input.userId) {
        await connection.rollback();
        return { outcome: "PROOF_NOT_FOUND" as const };
      }
      if (proof.status !== "ACTIVE") {
        await connection.rollback();
        return { outcome: "PROOF_ARCHIVED" as const };
      }
      await connection.execute(
        `INSERT INTO claim_private_proofs
         (claim_id, proof_id, attached_by, item_name_snapshot, proof_type_snapshot,
          private_description_snapshot, masked_value_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE claim_id = VALUES(claim_id)`,
        [input.claimId, input.proofId, input.userId, proof.item_name, proof.proof_type, proof.private_description, proof.masked_value]
      );
      await connection.commit();
      return { outcome: "ATTACHED" as const };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async detachFromClaim(claimId: string, proofId: string, userId: string) {
    const [result] = await dbPool.execute<ResultSetHeader>(
      `DELETE cpp FROM claim_private_proofs cpp
       INNER JOIN claims c ON c.id = cpp.claim_id
       WHERE cpp.claim_id = ? AND cpp.proof_id = ? AND c.claimant_id = ? AND c.status IN ('PENDING', 'NEED_MORE_INFO')`,
      [claimId, proofId, userId]
    );
    return result.affectedRows > 0;
  },

  async listAttached(claimId: string) {
    const [rows] = await dbPool.query<AttachedProofRow[]>(
      `SELECT cpp.claim_id, cpp.proof_id, pp.owner_id, c.claimant_id, p.user_id AS post_owner_id,
              cpp.item_name_snapshot, cpp.proof_type_snapshot, cpp.private_description_snapshot,
              cpp.masked_value_snapshot, pp.media_secure_url, pp.media_public_id, pp.media_format, cpp.attached_at
       FROM claim_private_proofs cpp
       INNER JOIN private_proofs pp ON pp.id = cpp.proof_id
       INNER JOIN claims c ON c.id = cpp.claim_id
       INNER JOIN posts p ON p.id = c.post_id
       WHERE cpp.claim_id = ? ORDER BY cpp.attached_at`,
      [claimId]
    );
    return rows;
  }
};
