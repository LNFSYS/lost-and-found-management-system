import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

interface PostContextRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: "LOST" | "FOUND";
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface TimelineRow extends RowDataPacket {
  event_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  state: string | null;
  created_at: string;
}

export interface RecoveryTimelineRawEvent {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  state: string | null;
  createdAt: string;
}

function mapEvent(row: TimelineRow): RecoveryTimelineRawEvent {
  return {
    id: row.event_id,
    type: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    state: row.state,
    createdAt: row.created_at
  };
}

export const recoveryTimelineRepository = {
  async postContext(postId: string) {
    const [rows] = await dbPool.query<PostContextRow[]>(
      `SELECT id, user_id, type, status, created_at, updated_at, resolved_at
       FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [postId]
    );
    return rows[0] ?? null;
  },

  async canParticipate(postId: string, userId: string) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total
       FROM claims c
       WHERE c.claimant_id = ?
         AND (
           c.post_id = ?
           OR c.post_id IN (
             SELECT mr.found_post_id FROM match_results mr WHERE mr.lost_post_id = ?
           )
         )`,
      [userId, postId, postId]
    );
    return Number(rows[0]?.total ?? 0) > 0;
  },

  async listClaimIds(postId: string, viewerId: string, includeAllDirectClaims: boolean) {
    const [rows] = await dbPool.query<Array<RowDataPacket & { id: string }>>(
      `SELECT DISTINCT c.id
       FROM claims c
       WHERE (c.post_id = ? AND (? = TRUE OR c.claimant_id = ?))
          OR (
            c.claimant_id = ?
            AND c.post_id IN (SELECT mr.found_post_id FROM match_results mr WHERE mr.lost_post_id = ?)
          )`,
      [postId, includeAllDirectClaims, viewerId, viewerId, postId]
    );
    return rows.map((row) => row.id);
  },

  async listEvents(post: PostContextRow, claimIds: string[]) {
    const events: RecoveryTimelineRawEvent[] = [{
      id: `post:${post.id}:created`,
      type: "POST_CREATED",
      entityType: "POST",
      entityId: post.id,
      actorId: post.user_id,
      state: "OPEN",
      createdAt: post.created_at
    }];

    const [matchRows, activityRows, storageRows] = await Promise.all([
      dbPool.query<TimelineRow[]>(
        `SELECT CONCAT('match:', mr.id) AS event_id, 'MATCH_CANDIDATE_DETECTED' AS event_type,
                'MATCH' AS entity_type, mr.id AS entity_id, NULL AS actor_id,
                mr.score_tier AS state, mr.created_at
         FROM match_results mr
         WHERE mr.lost_post_id = ? OR mr.found_post_id = ?`,
        [post.id, post.id]
      ),
      dbPool.query<TimelineRow[]>(
        `SELECT CONCAT('activity:', id) AS event_id, action AS event_type,
                COALESCE(entity_type, 'POST') AS entity_type, COALESCE(entity_id, ?) AS entity_id,
                user_id AS actor_id, NULL AS state, created_at
         FROM user_activity_logs
         WHERE entity_type = 'POST' AND entity_id = ?
           AND action IN ('SEARCH_COMPANION_ANSWERED', 'SEARCH_COMPANION_APPLIED')`,
        [post.id, post.id]
      ),
      dbPool.query<TimelineRow[]>(
        `SELECT CONCAT('storage:', id) AS event_id, CONCAT('STORAGE_', action) AS event_type,
                'STORAGE' AS entity_type, id AS entity_id, actor_id, action AS state, created_at
         FROM storage_logs WHERE post_id = ?`,
        [post.id]
      )
    ]);
    events.push(...matchRows[0].map(mapEvent), ...activityRows[0].map(mapEvent), ...storageRows[0].map(mapEvent));

    if (claimIds.length > 0) {
      const placeholders = claimIds.map(() => "?").join(", ");
      const [stateRows, evidenceRows, appointmentRows, feedbackRows] = await Promise.all([
        dbPool.query<TimelineRow[]>(
          `SELECT CONCAT('claim-state:', csl.id) AS event_id, CONCAT('CLAIM_', csl.to_status) AS event_type,
                  'CLAIM' AS entity_type, csl.claim_id AS entity_id, csl.actor_id,
                  csl.to_status AS state, csl.created_at
           FROM claim_state_logs csl WHERE csl.claim_id IN (${placeholders})`,
          claimIds
        ),
        dbPool.query<TimelineRow[]>(
          `SELECT CONCAT('evidence:', ce.id) AS event_id, 'CLAIM_EVIDENCE_ADDED' AS event_type,
                  'CLAIM' AS entity_type, ce.claim_id AS entity_id, c.claimant_id AS actor_id,
                  ce.evidence_type AS state, ce.created_at
           FROM claim_evidence ce INNER JOIN claims c ON c.id = ce.claim_id
           WHERE ce.claim_id IN (${placeholders})`,
          claimIds
        ),
        dbPool.query<TimelineRow[]>(
          `SELECT CONCAT('appointment:', ra.id, ':created') AS event_id, 'APPOINTMENT_CREATED' AS event_type,
                  'APPOINTMENT' AS entity_type, ra.id AS entity_id, ra.proposer_id AS actor_id,
                  ra.status AS state, ra.created_at
           FROM return_appointments ra WHERE ra.claim_id IN (${placeholders})
           UNION ALL
           SELECT CONCAT('appointment:', ra.id, ':state') AS event_id, CONCAT('APPOINTMENT_', ra.status) AS event_type,
                  'APPOINTMENT' AS entity_type, ra.id AS entity_id, NULL AS actor_id,
                  ra.status AS state, ra.updated_at AS created_at
           FROM return_appointments ra
           WHERE ra.claim_id IN (${placeholders}) AND ra.status <> 'PENDING'`,
          [...claimIds, ...claimIds]
        ),
        dbPool.query<TimelineRow[]>(
          `SELECT CONCAT('feedback:', rf.id) AS event_id, 'FEEDBACK_SUBMITTED' AS event_type,
                  'FEEDBACK' AS entity_type, rf.id AS entity_id, rf.reviewer_id AS actor_id,
                  CAST(rf.rating AS CHAR) AS state, rf.created_at
           FROM return_feedback rf WHERE rf.claim_id IN (${placeholders})`,
          claimIds
        )
      ]);
      events.push(...stateRows[0].map(mapEvent), ...evidenceRows[0].map(mapEvent), ...appointmentRows[0].map(mapEvent), ...feedbackRows[0].map(mapEvent));
    }

    if (post.resolved_at) {
      events.push({
        id: `post:${post.id}:resolved`,
        type: "POST_RESOLVED",
        entityType: "POST",
        entityId: post.id,
        actorId: null,
        state: "RESOLVED",
        createdAt: post.resolved_at
      });
    }
    return events;
  }
};
