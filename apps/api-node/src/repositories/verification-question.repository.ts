import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

export type VerificationQuestionType = "TEXT" | "MASKED_SERIAL" | "MULTIPLE_CHOICE" | "VISUAL_DETAIL";
export type VerificationQuestionStatus = "DRAFT" | "APPROVED" | "DISABLED";

interface QuestionRow extends RowDataPacket {
  id: string;
  post_id: string;
  prompt: string;
  question_type: VerificationQuestionType;
  source_signal: string;
  expected_answer_hash: string;
  options_json: unknown;
  weight: string | number;
  privacy_level: "PRIVATE" | "HIGHLY_PRIVATE";
  status: VerificationQuestionStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface QuestionViewRow extends QuestionRow {
  is_match: number | null;
  answered_at: string | null;
}

interface PostContextRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  category_name: string | null;
}

interface TagRow extends RowDataPacket {
  tag: string;
  source: string;
}

function mapQuestion(row: QuestionRow | QuestionViewRow, includeExpectedHash = false) {
  let options: string[] | null = null;
  try {
    const parsed = typeof row.options_json === "string" ? JSON.parse(row.options_json) : row.options_json;
    options = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null;
  } catch {
    options = null;
  }
  const question = {
    id: row.id,
    postId: row.post_id,
    prompt: row.prompt,
    questionType: row.question_type,
    options,
    sourceSignal: row.source_signal,
    weight: Number(row.weight),
    privacyLevel: row.privacy_level,
    status: row.status,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    answered: "answered_at" in row && Boolean(row.answered_at),
    answerMatches: "is_match" in row && row.is_match !== null ? row.is_match === 1 : null
  };
  return includeExpectedHash ? { ...question, expectedAnswerHash: row.expected_answer_hash } : question;
}

export const verificationQuestionRepository = {
  async getPostContext(postId: string) {
    const [posts] = await dbPool.query<PostContextRow[]>(
      `SELECT p.id, p.user_id, p.type, p.title, p.description, c.name AS category_name
       FROM posts p
       LEFT JOIN item_categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.deleted_at IS NULL
       LIMIT 1`,
      [postId]
    );
    const post = posts[0];
    if (!post) return null;
    const [tags] = await dbPool.query<TagRow[]>(
      "SELECT tag, source FROM ai_tags WHERE post_id = ? ORDER BY confidence DESC LIMIT 30",
      [postId]
    );
    return {
      id: post.id,
      ownerId: post.user_id,
      type: post.type,
      title: post.title,
      description: post.description,
      categoryName: post.category_name,
      tags: tags.map((tag) => ({ tag: tag.tag, source: tag.source }))
    };
  },

  async create(input: {
    id: string;
    postId: string;
    prompt: string;
    questionType: VerificationQuestionType;
    sourceSignal: string;
    expectedAnswerHash: string;
    options: string[] | null;
    weight: number;
    privacyLevel: "PRIVATE" | "HIGHLY_PRIVATE";
    status: VerificationQuestionStatus;
    actorId: string;
  }) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      if (input.status === "APPROVED") {
        await connection.query("SELECT id FROM posts WHERE id = ? FOR UPDATE", [input.postId]);
        await connection.execute(
          `UPDATE item_verification_questions
           SET status = 'DISABLED', approved_by = NULL, approved_at = NULL
           WHERE post_id = ? AND status = 'APPROVED'`,
          [input.postId]
        );
      }
      await connection.execute(
        `INSERT INTO item_verification_questions (
           id, post_id, prompt, question_type, source_signal, expected_answer_hash, options_json,
           weight, privacy_level, status, created_by, approved_by, approved_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          input.postId,
          input.prompt,
          input.questionType,
          input.sourceSignal,
          input.expectedAnswerHash,
          input.options ? JSON.stringify(input.options) : null,
          input.weight,
          input.privacyLevel,
          input.status,
          input.actorId,
          input.status === "APPROVED" ? input.actorId : null,
          input.status === "APPROVED" ? new Date() : null
        ]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.findById(input.id, false);
  },

  async findById(questionId: string, includeExpectedHash: boolean) {
    const [rows] = await dbPool.query<QuestionRow[]>(
      "SELECT * FROM item_verification_questions WHERE id = ? LIMIT 1",
      [questionId]
    );
    return rows[0] ? mapQuestion(rows[0], includeExpectedHash) : null;
  },

  async listForPost(postId: string) {
    const [rows] = await dbPool.query<QuestionRow[]>(
      `SELECT * FROM item_verification_questions
       WHERE post_id = ?
       ORDER BY status = 'APPROVED' DESC, created_at ASC`,
      [postId]
    );
    return rows.map((row) => mapQuestion(row));
  },

  async listForClaim(claimId: string) {
    const [rows] = await dbPool.query<QuestionViewRow[]>(
      `SELECT q.*, a.is_match, a.answered_at
       FROM claims c
       INNER JOIN claim_verification_assignments assignment ON assignment.claim_id = c.id
       INNER JOIN item_verification_questions q ON q.id = assignment.question_id
       LEFT JOIN claim_verification_answers a ON a.claim_id = c.id AND a.question_id = q.id
       WHERE c.id = ?
       ORDER BY q.created_at ASC`,
      [claimId]
    );
    return rows.map((row) => mapQuestion(row));
  },

  async findAssignedQuestion(claimId: string, questionId: string, includeExpectedHash: boolean) {
    const [rows] = await dbPool.query<QuestionRow[]>(
      `SELECT q.*
       FROM claim_verification_assignments assignment
       INNER JOIN item_verification_questions q ON q.id = assignment.question_id
       WHERE assignment.claim_id = ? AND assignment.question_id = ?
       LIMIT 1`,
      [claimId, questionId]
    );
    return rows[0] ? mapQuestion(rows[0], includeExpectedHash) : null;
  },

  async setStatus(questionId: string, status: VerificationQuestionStatus, actorId: string) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const [questions] = await connection.query<Array<RowDataPacket & { post_id: string }>>(
        "SELECT post_id FROM item_verification_questions WHERE id = ?",
        [questionId]
      );
      const postId = questions[0]?.post_id;
      if (!postId) {
        await connection.rollback();
        return null;
      }
      await connection.query("SELECT id FROM posts WHERE id = ? FOR UPDATE", [postId]);
      await connection.query("SELECT id FROM item_verification_questions WHERE id = ? FOR UPDATE", [questionId]);
      if (status === "APPROVED") {
        await connection.execute(
          `UPDATE item_verification_questions
           SET status = 'DISABLED', approved_by = NULL, approved_at = NULL
           WHERE post_id = ? AND status = 'APPROVED' AND id <> ?`,
          [postId, questionId]
        );
      }
      await connection.execute<ResultSetHeader>(
        `UPDATE item_verification_questions
         SET status = ?, approved_by = ?, approved_at = ?
         WHERE id = ?`,
        [status, status === "APPROVED" ? actorId : null, status === "APPROVED" ? new Date() : null, questionId]
      );
      await connection.commit();
      return this.findById(questionId, false);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async saveAnswer(input: { id: string; claimId: string; questionId: string; answeredBy: string; isMatch: boolean }) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const [claims] = await connection.query<Array<RowDataPacket & { claimant_id: string; status: string }>>(
        "SELECT claimant_id, status FROM claims WHERE id = ? FOR UPDATE",
        [input.claimId]
      );
      const claim = claims[0];
      if (!claim) {
        await connection.rollback();
        return "NOT_FOUND" as const;
      }
      if (claim.claimant_id !== input.answeredBy) {
        await connection.rollback();
        return "NOT_ALLOWED" as const;
      }
      if (claim.status !== "PENDING" && claim.status !== "NEED_MORE_INFO") {
        await connection.rollback();
        return "CLAIM_LOCKED" as const;
      }
      const [assignments] = await connection.query<RowDataPacket[]>(
        `SELECT question_id FROM claim_verification_assignments
         WHERE claim_id = ? AND question_id = ? LIMIT 1`,
        [input.claimId, input.questionId]
      );
      if (!assignments[0]) {
        await connection.rollback();
        return "NOT_ASSIGNED" as const;
      }
      const [existing] = await connection.query<Array<RowDataPacket & { attempt_count: number }>>(
        `SELECT attempt_count FROM claim_verification_answers
         WHERE claim_id = ? AND question_id = ? FOR UPDATE`,
        [input.claimId, input.questionId]
      );
      if (Number(existing[0]?.attempt_count ?? 0) >= 5) {
        await connection.rollback();
        return "ATTEMPT_LIMIT" as const;
      }
      if (existing[0]) {
        await connection.execute(
          `UPDATE claim_verification_answers
           SET is_match = (is_match OR ?), answered_by = ?, attempt_count = attempt_count + 1,
               last_attempt_at = CURRENT_TIMESTAMP, answered_at = CURRENT_TIMESTAMP
           WHERE claim_id = ? AND question_id = ?`,
          [input.isMatch, input.answeredBy, input.claimId, input.questionId]
        );
      } else {
        await connection.execute(
          `INSERT INTO claim_verification_answers (
             id, claim_id, question_id, answered_by, is_match, attempt_count, last_attempt_at
           ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
          [input.id, input.claimId, input.questionId, input.answeredBy, input.isMatch]
        );
      }
      await connection.commit();
      return "SAVED" as const;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async scoreForClaim(claimId: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { matched_weight: string | number; answered_weight: string | number; total_weight: string | number }>>(
      `SELECT
         COALESCE(SUM(CASE WHEN a.is_match = 1 THEN q.weight ELSE 0 END), 0) AS matched_weight,
         COALESCE(SUM(CASE WHEN a.id IS NOT NULL THEN q.weight ELSE 0 END), 0) AS answered_weight,
         COALESCE(SUM(q.weight), 0) AS total_weight
       FROM claims c
       INNER JOIN claim_verification_assignments assignment ON assignment.claim_id = c.id
       INNER JOIN item_verification_questions q ON q.id = assignment.question_id
       LEFT JOIN claim_verification_answers a ON a.claim_id = c.id AND a.question_id = q.id
       WHERE c.id = ?`,
      [claimId]
    );
    const row = rows[0];
    const answeredWeight = Number(row?.answered_weight ?? 0);
    const totalWeight = Number(row?.total_weight ?? 0);
    return {
      score: answeredWeight > 0 ? Number(row?.matched_weight ?? 0) / answeredWeight : null,
      completeness: totalWeight > 0 ? answeredWeight / totalWeight : 0,
      hasQuestions: totalWeight > 0
    };
  },

  async hasCompleteRequiredVerification(claimId: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { required_count: number; answered_count: number }>>(
      `SELECT COUNT(*) AS required_count, COUNT(answer.id) AS answered_count
       FROM claim_verification_assignments assignment
       LEFT JOIN claim_verification_answers answer
         ON answer.claim_id = assignment.claim_id AND answer.question_id = assignment.question_id
       WHERE assignment.claim_id = ?`,
      [claimId]
    );
    const required = Number(rows[0]?.required_count ?? 0);
    return { required, complete: required === Number(rows[0]?.answered_count ?? 0) };
  }
};
