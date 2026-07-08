import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { HttpError } from "../utils/http-error.js";
import { userRepository } from "./user.repository.js";

export type ReturnFeedbackStatus = "NEW" | "REVIEWED" | "FLAGGED" | "DISMISSED";

export interface AppointmentFeedbackContext extends RowDataPacket {
  id: string;
  claim_id: string;
  post_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED";
  claimant_id: string;
  post_owner_id: string;
}

interface FeedbackRow extends RowDataPacket {
  id: string;
  appointment_id: string;
  claim_id: string;
  post_id: string;
  post_title: string | null;
  reviewer_id: string;
  reviewer_name: string | null;
  reviewer_email: string | null;
  target_user_id: string;
  target_name: string | null;
  target_email: string | null;
  rating: number;
  comment: string | null;
  is_negative: number;
  status: ReturnFeedbackStatus;
  reviewed_by: string | null;
  reviewer_admin_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapFeedback(row: FeedbackRow) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    claimId: row.claim_id,
    postId: row.post_id,
    postTitle: row.post_title,
    reviewer: {
      id: row.reviewer_id,
      fullName: row.reviewer_name,
      email: row.reviewer_email
    },
    targetUser: {
      id: row.target_user_id,
      fullName: row.target_name,
      email: row.target_email
    },
    rating: Number(row.rating),
    comment: row.comment,
    isNegative: row.is_negative === 1,
    status: row.status,
    reviewedBy: row.reviewed_by
      ? {
          id: row.reviewed_by,
          fullName: row.reviewer_admin_name
        }
      : null,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const feedbackSelect = `
  SELECT
    rf.id, rf.appointment_id, rf.claim_id, rf.post_id, p.title AS post_title,
    rf.reviewer_id, reviewer.full_name AS reviewer_name, reviewer.email AS reviewer_email,
    rf.target_user_id, target_user.full_name AS target_name, target_user.email AS target_email,
    rf.rating, rf.comment, rf.is_negative, rf.status,
    rf.reviewed_by, reviewer_admin.full_name AS reviewer_admin_name,
    rf.reviewed_at, rf.created_at, rf.updated_at
  FROM return_feedback rf
  LEFT JOIN posts p ON p.id = rf.post_id
  LEFT JOIN users reviewer ON reviewer.id = rf.reviewer_id
  LEFT JOIN users target_user ON target_user.id = rf.target_user_id
  LEFT JOIN users reviewer_admin ON reviewer_admin.id = rf.reviewed_by
`;

export const feedbackRepository = {
  async findAppointmentContext(appointmentId: string) {
    const [rows] = await dbPool.query<AppointmentFeedbackContext[]>(
      `
        SELECT ra.id, ra.claim_id, ra.post_id, ra.status, c.claimant_id, p.user_id AS post_owner_id
        FROM return_appointments ra
        INNER JOIN claims c ON c.id = ra.claim_id
        INNER JOIN posts p ON p.id = ra.post_id
        WHERE ra.id = ?
        LIMIT 1
      `,
      [appointmentId]
    );
    return rows[0] ?? null;
  },

  async findByAppointmentAndReviewer(appointmentId: string, reviewerId: string) {
    const [rows] = await dbPool.query<FeedbackRow[]>(
      `${feedbackSelect} WHERE rf.appointment_id = ? AND rf.reviewer_id = ? LIMIT 1`,
      [appointmentId, reviewerId]
    );
    return rows[0] ? mapFeedback(rows[0]) : null;
  },

  async createReturnFeedback(input: {
    appointmentId: string;
    claimId: string;
    postId: string;
    reviewerId: string;
    targetUserId: string;
    rating: number;
    comment?: string | null;
  }) {
    const id = randomUUID();
    const isNegative = input.rating <= 2;
    await dbPool.execute(
      `
        INSERT INTO return_feedback (
          id, appointment_id, claim_id, post_id, reviewer_id, target_user_id,
          rating, comment, is_negative
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.appointmentId,
        input.claimId,
        input.postId,
        input.reviewerId,
        input.targetUserId,
        input.rating,
        input.comment?.trim() || null,
        isNegative
      ]
    );
    const [rows] = await dbPool.query<FeedbackRow[]>(`${feedbackSelect} WHERE rf.id = ? LIMIT 1`, [id]);
    return rows[0] ? mapFeedback(rows[0]) : { id };
  },

  async listReturnFeedback(limit = 100) {
    const [rows] = await dbPool.query<FeedbackRow[]>(
      `${feedbackSelect} ORDER BY rf.is_negative DESC, rf.created_at DESC LIMIT ?`,
      [limit]
    );
    return rows.map(mapFeedback);
  },

  async reviewReturnFeedback(id: string, actorId: string, input: { status: ReturnFeedbackStatus }) {
    const [previousRows] = await dbPool.query<FeedbackRow[]>(`${feedbackSelect} WHERE rf.id = ? LIMIT 1`, [id]);
    const previous = previousRows[0] ? mapFeedback(previousRows[0]) : null;
    if (!previous) {
      throw new HttpError(404, "Return feedback not found");
    }
    await dbPool.execute(
      `
        UPDATE return_feedback
        SET status = ?,
            reviewed_by = ?,
            reviewed_at = UTC_TIMESTAMP(),
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [input.status, actorId, id]
    );
    const [rows] = await dbPool.query<FeedbackRow[]>(`${feedbackSelect} WHERE rf.id = ? LIMIT 1`, [id]);
    const feedback = rows[0] ? mapFeedback(rows[0]) : null;
    if (feedback && input.status === "FLAGGED" && previous?.status !== "FLAGGED") {
      await userRepository.addReputation({
        userId: feedback.targetUser.id,
        delta: -5,
        reason: "Negative return feedback flagged by admin",
        entityType: "APPOINTMENT",
        entityId: feedback.appointmentId
      });
    }
    return feedback;
  }
};
