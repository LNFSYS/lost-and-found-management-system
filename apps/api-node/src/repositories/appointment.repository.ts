import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { dbPool } from "../config/db.js";

export interface AppointmentInput {
  claimId: string;
  proposedAt: string;
  handoverPointId?: string | null;
  customLocation?: string | null;
}

interface ClaimForAppointmentRow extends RowDataPacket {
  id: string;
  post_id: string;
  post_owner_id: string;
  claimant_id: string;
  status: "PENDING" | "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";
}

interface AppointmentRow extends RowDataPacket {
  id: string;
  claim_id: string;
  post_id: string;
  proposer_id: string;
  proposer_name: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED";
  proposed_at: string;
  handover_point_id: string | null;
  handover_point_name: string | null;
  custom_location: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  proof_image_url: string | null;
  proof_public_id: string | null;
  proof_uploaded_by: string | null;
  proof_uploader_name: string | null;
  proof_uploaded_at: string | null;
  proof_note: string | null;
  created_at: string;
  updated_at: string;
}

interface AppointmentForActionRow extends RowDataPacket {
  id: string;
  claim_id: string;
  post_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED";
  post_owner_id: string;
  claimant_id: string;
  proof_image_url: string | null;
  proof_public_id: string | null;
}

interface ReminderAppointmentRow extends RowDataPacket {
  id: string;
  claimant_id: string;
  post_owner_id: string;
  proposed_at: string;
}

function mapAppointment(row: AppointmentRow) {
  return {
    id: row.id,
    claimId: row.claim_id,
    postId: row.post_id,
    proposer: { id: row.proposer_id, fullName: row.proposer_name },
    status: row.status,
    proposedAt: row.proposed_at,
    handoverPoint: row.handover_point_id ? { id: row.handover_point_id, name: row.handover_point_name } : null,
    customLocation: row.custom_location,
    rejectionReason: row.rejection_reason,
    cancellationReason: row.cancellation_reason,
    acceptedAt: row.accepted_at,
    completedAt: row.completed_at,
    proof: row.proof_image_url
      ? {
          imageUrl: `/api/appointments/${row.id}/proof-image`,
          publicId: row.proof_public_id,
          uploadedBy: row.proof_uploaded_by ? { id: row.proof_uploaded_by, fullName: row.proof_uploader_name } : null,
          uploadedAt: row.proof_uploaded_at,
          note: row.proof_note
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isDuplicateEntry(error: unknown) {
  return typeof error === "object" && error !== null && "errno" in error && error.errno === 1062;
}

const appointmentSelect = `
  SELECT
    ra.id, ra.claim_id, ra.post_id, ra.proposer_id, proposer.full_name AS proposer_name,
    ra.status, ra.proposed_at, ra.handover_point_id, hp.name AS handover_point_name,
    ra.custom_location, ra.rejection_reason, ra.cancellation_reason,
    ra.accepted_at, ra.completed_at, ra.proof_image_url, ra.proof_public_id,
    ra.proof_uploaded_by, proof_uploader.full_name AS proof_uploader_name,
    ra.proof_uploaded_at, ra.proof_note, ra.created_at, ra.updated_at
  FROM return_appointments ra
  LEFT JOIN users proposer ON proposer.id = ra.proposer_id
  LEFT JOIN users proof_uploader ON proof_uploader.id = ra.proof_uploaded_by
  LEFT JOIN handover_points hp ON hp.id = ra.handover_point_id
`;

export const appointmentRepository = {
  async findClaimForAppointment(claimId: string) {
    const [rows] = await dbPool.query<ClaimForAppointmentRow[]>(
      `
        SELECT c.id, c.post_id, p.user_id AS post_owner_id, c.claimant_id, c.status
        FROM claims c
        INNER JOIN posts p ON p.id = c.post_id
        WHERE c.id = ?
        LIMIT 1
      `,
      [claimId]
    );
    return rows[0] ?? null;
  },

  async activeHandoverPointExists(handoverPointId: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      "SELECT COUNT(*) AS total FROM handover_points WHERE id = ? AND is_active = TRUE",
      [handoverPointId]
    );
    return Number(rows[0]?.total ?? 0) > 0;
  },

  async create(input: AppointmentInput, proposerId: string) {
    const connection = await dbPool.getConnection();
    const id = randomUUID();
    try {
      await connection.beginTransaction();
      const [claimRows] = await connection.query<ClaimForAppointmentRow[]>(
        `
          SELECT c.id, c.post_id, p.user_id AS post_owner_id, c.claimant_id, c.status
          FROM claims c
          INNER JOIN posts p ON p.id = c.post_id
          WHERE c.id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [input.claimId]
      );
      const claim = claimRows[0];
      if (!claim) {
        await connection.rollback();
        return { status: "CLAIM_NOT_FOUND" as const };
      }
      if (claim.status !== "ACCEPTED") {
        await connection.rollback();
        return { status: "CLAIM_NOT_ACCEPTED" as const };
      }

      const [activeRows] = await connection.query<Array<RowDataPacket & { id: string }>>(
        `
          SELECT id
          FROM return_appointments
          WHERE claim_id = ?
            AND status IN ('PENDING', 'ACCEPTED', 'RESCHEDULED')
          LIMIT 1
          FOR UPDATE
        `,
        [input.claimId]
      );
      if (activeRows[0]) {
        await connection.rollback();
        return { status: "ACTIVE_APPOINTMENT_EXISTS" as const, appointmentId: activeRows[0].id };
      }

      await connection.execute(
        `
          INSERT INTO return_appointments (
            id, claim_id, post_id, proposer_id, proposed_at, handover_point_id, custom_location
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          input.claimId,
          claim.post_id,
          proposerId,
          new Date(input.proposedAt),
          input.handoverPointId ?? null,
          input.customLocation?.trim() || null
        ]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (isDuplicateEntry(error)) {
        return { status: "ACTIVE_APPOINTMENT_EXISTS" as const };
      }
      throw error;
    } finally {
      connection.release();
    }
    return { status: "CREATED" as const, appointment: await this.findById(id) };
  },

  async hasScheduleConflict(input: { appointmentId?: string; proposedAt: string; handoverPointId?: string | null }) {
    if (!input.handoverPointId) {
      return false;
    }
    const proposedAt = new Date(input.proposedAt);
    const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      `
        SELECT COUNT(*) AS total
        FROM return_appointments
        WHERE handover_point_id = ?
          AND status IN ('PENDING', 'ACCEPTED', 'RESCHEDULED')
          AND proposed_at BETWEEN DATE_SUB(?, INTERVAL 30 MINUTE) AND DATE_ADD(?, INTERVAL 30 MINUTE)
          AND (? IS NULL OR id <> ?)
      `,
      [input.handoverPointId, proposedAt, proposedAt, input.appointmentId ?? null, input.appointmentId ?? null]
    );
    return Number(rows[0]?.total ?? 0) > 0;
  },

  async findById(id: string) {
    const [rows] = await dbPool.query<AppointmentRow[]>(`${appointmentSelect} WHERE ra.id = ? LIMIT 1`, [id]);
    return rows[0] ? mapAppointment(rows[0]) : null;
  },

  async findForAction(id: string) {
    const [rows] = await dbPool.query<AppointmentForActionRow[]>(
      `
        SELECT ra.id, ra.claim_id, ra.post_id, ra.status, p.user_id AS post_owner_id, c.claimant_id,
               ra.proof_image_url, ra.proof_public_id
        FROM return_appointments ra
        INNER JOIN claims c ON c.id = ra.claim_id
        INNER JOIN posts p ON p.id = ra.post_id
        WHERE ra.id = ?
        LIMIT 1
      `,
      [id]
    );
    return rows[0] ?? null;
  },

  async saveProof(
    id: string,
    input: { imageUrl: string; publicId: string; uploadedBy: string; note?: string | null }
  ) {
    await dbPool.execute(
      `
        UPDATE return_appointments
        SET proof_image_url = ?,
            proof_public_id = ?,
            proof_uploaded_by = ?,
            proof_uploaded_at = UTC_TIMESTAMP(),
            proof_note = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [input.imageUrl, input.publicId, input.uploadedBy, input.note?.trim() || null, id]
    );
    return this.findById(id);
  },

  async accept(id: string) {
    await dbPool.execute(
      `
        UPDATE return_appointments
        SET status = 'ACCEPTED',
            accepted_at = COALESCE(accepted_at, UTC_TIMESTAMP()),
            rejection_reason = NULL,
            cancellation_reason = NULL,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [id]
    );
    return this.findById(id);
  },

  async reject(id: string, reason: string) {
    await dbPool.execute(
      `
        UPDATE return_appointments
        SET status = 'REJECTED',
            rejection_reason = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [reason, id]
    );
    return this.findById(id);
  },

  async cancel(id: string, reason: string) {
    await dbPool.execute(
      `
        UPDATE return_appointments
        SET status = 'CANCELLED',
            cancellation_reason = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [reason, id]
    );
    return this.findById(id);
  },

  async reschedule(id: string, input: { proposedAt: string; handoverPointId?: string | null; customLocation?: string | null }) {
    await dbPool.execute(
      `
        UPDATE return_appointments
        SET status = 'RESCHEDULED',
            proposed_at = ?,
            handover_point_id = ?,
            custom_location = ?,
            accepted_at = NULL,
            rejection_reason = NULL,
            cancellation_reason = NULL,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [new Date(input.proposedAt), input.handoverPointId ?? null, input.customLocation?.trim() || null, id]
    );
    return this.findById(id);
  },

  async complete(id: string, actorId: string) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<Array<RowDataPacket & { status: AppointmentForActionRow["status"] }>>(
        "SELECT status FROM return_appointments WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      if (rows[0]?.status !== "ACCEPTED") {
        await connection.rollback();
        return { status: "NOT_ACCEPTED" as const };
      }
      await connection.execute(
        `
          UPDATE return_appointments
          SET status = 'COMPLETED',
              completed_at = COALESCE(completed_at, UTC_TIMESTAMP()),
              updated_at = UTC_TIMESTAMP()
          WHERE id = ?
        `,
        [id]
      );
      await connection.execute(
        `
          UPDATE posts p
          INNER JOIN return_appointments ra ON ra.post_id = p.id
          SET p.status = 'RESOLVED',
              p.resolved_at = COALESCE(p.resolved_at, UTC_TIMESTAMP()),
              p.updated_at = UTC_TIMESTAMP()
          WHERE ra.id = ?
            AND p.deleted_at IS NULL
        `,
        [id]
      );
      await connection.execute(
        `
          INSERT INTO storage_logs (id, post_id, handover_point_id, actor_id, action, condition_notes)
          SELECT UUID(), wi.post_id, wi.handover_point_id, ?, 'RETURNED', 'Returned through completed appointment'
          FROM warehouse_items wi
          INNER JOIN return_appointments ra ON ra.post_id = wi.post_id
          WHERE ra.id = ?
            AND wi.deleted_at IS NULL
            AND wi.handover_point_id IS NOT NULL
            AND wi.status NOT IN ('RETURNED', 'DISPOSED', 'DONATED', 'TRANSFERRED')
        `,
        [actorId, id]
      );
      await connection.execute(
        `
          UPDATE warehouse_items wi
          INNER JOIN return_appointments ra ON ra.post_id = wi.post_id
          SET wi.status = 'RETURNED',
              wi.returned_at = COALESCE(wi.returned_at, UTC_TIMESTAMP()),
              wi.updated_at = UTC_TIMESTAMP()
          WHERE ra.id = ?
            AND wi.deleted_at IS NULL
            AND wi.status NOT IN ('RETURNED', 'DISPOSED', 'DONATED', 'TRANSFERRED')
        `,
        [id]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return { status: "COMPLETED" as const, appointment: await this.findById(id) };
  },

  async listByClaim(claimId: string) {
    const [rows] = await dbPool.query<AppointmentRow[]>(
      `${appointmentSelect} WHERE ra.claim_id = ? ORDER BY ra.proposed_at DESC, ra.created_at DESC`,
      [claimId]
    );
    return rows.map(mapAppointment);
  },

  async listUpcomingReminderTargets(hoursAhead: number) {
    const [rows] = await dbPool.query<ReminderAppointmentRow[]>(
      `
        SELECT ra.id, c.claimant_id, p.user_id AS post_owner_id, ra.proposed_at
        FROM return_appointments ra
        INNER JOIN claims c ON c.id = ra.claim_id
        INNER JOIN posts p ON p.id = ra.post_id
        WHERE ra.status = 'ACCEPTED'
          AND ra.proposed_at BETWEEN UTC_TIMESTAMP() AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR)
          AND NOT EXISTS (
            SELECT 1
            FROM notifications n
            WHERE n.type = 'APPOINTMENT_REMINDER'
              AND n.entity_type = 'APPOINTMENT'
              AND n.entity_id = ra.id
          )
      `,
      [hoursAhead]
    );
    return rows;
  }
};
