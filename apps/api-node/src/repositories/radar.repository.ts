import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { HttpError } from "../utils/http-error.js";
import { parseJsonObjectColumn } from "../utils/json-column.js";
import type {
  CreateRadarEventInput,
  RadarAlertListQuery,
  RadarAlertStatusInput,
  RadarEventListQuery
} from "../validators/radar.validator.js";

export type RadarSeverity = "WATCH" | "WARNING" | "CRITICAL";
export type RadarAlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

export interface RadarAggregateBucket {
  categoryId: string | null;
  bucketStart: string;
  count: number;
}

export interface RadarAlertCandidate {
  eventId: string;
  fingerprint: string;
  detectorVersion: string;
  categoryId: string | null;
  windowStart: Date;
  windowEnd: Date;
  windowMinutes: number;
  stepMinutes: number;
  baselineStart: Date;
  baselineEnd: Date;
  baselineWindowCount: number;
  observedCount: number;
  expectedMean: number;
  standardDeviation: number;
  zScore: number;
  observedRatio: number;
  severity: RadarSeverity;
  detectedAt: Date;
  cooldownMinutes: number;
}

interface RadarEventRow extends RowDataPacket {
  id: string;
  event_type: CreateRadarEventInput["eventType"];
  source_type: CreateRadarEventInput["sourceType"];
  source_reference: string;
  area_id: string | null;
  area_name: string | null;
  building_id: string | null;
  building_name: string | null;
  starts_at: string;
  ends_at: string;
  status: "ACTIVE" | "CANCELLED";
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface RadarAlertRow extends RowDataPacket {
  id: string;
  event_id: string;
  fingerprint: string;
  detector_version: string;
  category_id: string | null;
  category_name: string | null;
  window_start: string;
  window_end: string;
  window_minutes: number;
  step_minutes: number;
  baseline_start: string;
  baseline_end: string;
  baseline_window_count: number;
  observed_count: number;
  expected_mean: string | number;
  standard_deviation: string | number;
  z_score: string | number;
  observed_ratio: string | number;
  severity: RadarSeverity;
  status: RadarAlertStatus;
  occurrence_count: number;
  emission_count: number;
  last_detected_at: string;
  last_emitted_at: string;
  cooldown_until: string;
  disposition_reason: RadarAlertStatusInput["reason"] | null;
  disposition_by: string | null;
  disposition_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LockedAlertRow extends RowDataPacket {
  id: string;
  severity: RadarSeverity;
  status: RadarAlertStatus;
  cooldown_until: string;
  window_end: string;
}

interface RadarAuditRow extends RowDataPacket {
  id: string;
  event_id: string | null;
  alert_id: string | null;
  actor_id: string;
  action: string;
  metadata: unknown;
  request_id: string | null;
  created_at: string;
}

interface RadarRelatedPostRow extends RowDataPacket {
  id: string;
  type: "LOST";
  status: string;
  title: string;
  lost_found_at: string;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
  area_id: string | null;
  area_name: string | null;
  building_id: string | null;
  building_name: string | null;
}

const eventSelect = `
  SELECT
    cre.id, cre.event_type, cre.source_type, cre.source_reference,
    cre.area_id, ca.name AS area_name, cre.building_id, cb.name AS building_name,
    cre.starts_at, cre.ends_at, cre.status, cre.created_by, cre.created_at, cre.updated_at
  FROM campus_radar_events cre
  LEFT JOIN campus_areas ca ON ca.id = cre.area_id
  LEFT JOIN campus_buildings cb ON cb.id = cre.building_id
`;

const alertSelect = `
  SELECT
    cra.id, cra.event_id, cra.fingerprint, cra.detector_version,
    cra.category_id, ic.name AS category_name,
    cra.window_start, cra.window_end, cra.window_minutes, cra.step_minutes,
    cra.baseline_start, cra.baseline_end, cra.baseline_window_count,
    cra.observed_count, cra.expected_mean, cra.standard_deviation,
    cra.z_score, cra.observed_ratio, cra.severity, cra.status,
    cra.occurrence_count, cra.emission_count, cra.last_detected_at,
    cra.last_emitted_at, cra.cooldown_until, cra.disposition_reason,
    cra.disposition_by, cra.disposition_at, cra.created_at, cra.updated_at
  FROM campus_radar_alerts cra
  LEFT JOIN item_categories ic ON ic.id = cra.category_id
`;

function mapEvent(row: RadarEventRow) {
  return {
    id: row.id,
    eventType: row.event_type,
    source: { type: row.source_type, reference: row.source_reference },
    area: row.area_id ? { id: row.area_id, name: row.area_name } : null,
    building: row.building_id ? { id: row.building_id, name: row.building_name } : null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAlert(row: RadarAlertRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    fingerprint: row.fingerprint,
    detectorVersion: row.detector_version,
    category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
    scope: row.category_id ? "CATEGORY" as const : "ALL_CATEGORIES" as const,
    window: {
      startsAt: row.window_start,
      endsAt: row.window_end,
      minutes: Number(row.window_minutes),
      stepMinutes: Number(row.step_minutes)
    },
    baseline: {
      startsAt: row.baseline_start,
      endsAt: row.baseline_end,
      windowCount: Number(row.baseline_window_count),
      expectedMean: Number(row.expected_mean),
      standardDeviation: Number(row.standard_deviation)
    },
    observedCount: Number(row.observed_count),
    zScore: Number(row.z_score),
    observedRatio: Number(row.observed_ratio),
    severity: row.severity,
    status: row.status,
    occurrenceCount: Number(row.occurrence_count),
    emissionCount: Number(row.emission_count),
    lastDetectedAt: row.last_detected_at,
    lastEmittedAt: row.last_emitted_at,
    cooldownUntil: row.cooldown_until,
    disposition: row.disposition_reason
      ? { reason: row.disposition_reason, by: row.disposition_by, at: row.disposition_at }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function severityRank(severity: RadarSeverity) {
  return severity === "CRITICAL" ? 3 : severity === "WARNING" ? 2 : 1;
}

function utcDate(value: string) {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

export function shouldEmitRadarAlert(input: {
  status: RadarAlertStatus;
  currentSeverity: RadarSeverity;
  nextSeverity: RadarSeverity;
  cooldownUntil: string;
  detectedAt: Date;
}) {
  const active = input.status === "OPEN" || input.status === "ACKNOWLEDGED";
  const severityEscalated = severityRank(input.nextSeverity) > severityRank(input.currentSeverity);
  return active && (input.detectedAt >= utcDate(input.cooldownUntil) || severityEscalated);
}

async function rollbackQuietly(connection: PoolConnection) {
  try {
    await connection.rollback();
  } catch {
    // Preserve the original database error.
  }
}

async function insertAudit(
  connection: PoolConnection,
  input: {
    eventId?: string | null;
    alertId?: string | null;
    actorId: string;
    action: "EVENT_CREATED" | "EVENT_ANALYZED" | "ALERT_EMITTED" | "ALERT_REFRESHED" | "ALERT_STATUS_CHANGED";
    metadata?: Record<string, unknown>;
    requestId?: string | null;
  }
) {
  await connection.execute(
    `
      INSERT INTO campus_radar_audit_logs (
        id, event_id, alert_id, actor_id, action, metadata, request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      input.eventId ?? null,
      input.alertId ?? null,
      input.actorId,
      input.action,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.requestId ?? null
    ]
  );
}

async function insertActivity(
  connection: PoolConnection,
  input: { actorId: string; action: string; entityType: "RADAR_EVENT" | "RADAR_ALERT"; entityId: string; metadata?: Record<string, unknown> }
) {
  await connection.execute(
    `
      INSERT INTO user_activity_logs (id, user_id, action, entity_type, entity_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [randomUUID(), input.actorId, input.action, input.entityType, input.entityId, input.metadata ? JSON.stringify(input.metadata) : null]
  );
}

const validAlertTransitions: Record<RadarAlertStatus, RadarAlertStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "RESOLVED", "DISMISSED"],
  ACKNOWLEDGED: ["RESOLVED", "DISMISSED"],
  RESOLVED: [],
  DISMISSED: []
};

export function canTransitionRadarAlert(from: RadarAlertStatus, to: RadarAlertStatus) {
  return from === to || validAlertTransitions[from].includes(to);
}

async function acquireFingerprintLock(connection: PoolConnection, fingerprint: string) {
  const lockName = `lnfs:radar:${fingerprint.slice(0, 40)}`;
  const [rows] = await connection.query<Array<RowDataPacket & { acquired: number | null }>>(
    "SELECT GET_LOCK(?, 5) AS acquired",
    [lockName]
  );
  if (Number(rows[0]?.acquired ?? 0) !== 1) {
    throw new HttpError(503, "Campus radar alert is busy; retry the analysis");
  }
  return lockName;
}

async function releaseFingerprintLock(connection: PoolConnection, lockName: string | null) {
  if (lockName) {
    await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
  }
}

export const radarRepository = {
  async listOperationalReviewerIds() {
    const [rows] = await dbPool.query<Array<RowDataPacket & { user_id: string }>>(
      `SELECT DISTINCT ur.user_id
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       INNER JOIN users u ON u.id = ur.user_id
       WHERE r.code IN ('STAFF', 'ADMIN')
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL`
    );
    return rows.map((row) => row.user_id);
  },

  async activeLocationExists(areaId: string | null, buildingId: string | null) {
    if (!areaId) {
      return buildingId === null;
    }
    const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      `
        SELECT COUNT(*) AS total
        FROM campus_areas ca
        LEFT JOIN campus_buildings cb
          ON cb.id = ? AND cb.area_id = ca.id AND cb.is_active = TRUE
        WHERE ca.id = ? AND ca.is_active = TRUE
          AND (? IS NULL OR cb.id IS NOT NULL)
      `,
      [buildingId, areaId, buildingId]
    );
    return Number(rows[0]?.total ?? 0) === 1;
  },

  async createEvent(input: CreateRadarEventInput, actorId: string, requestId?: string | null) {
    const connection = await dbPool.getConnection();
    const id = randomUUID();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `
          INSERT INTO campus_radar_events (
            id, event_type, source_type, source_reference, area_id, building_id,
            starts_at, ends_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          input.eventType,
          input.sourceType,
          input.sourceReference,
          input.areaId ?? null,
          input.buildingId ?? null,
          new Date(input.startsAt),
          new Date(input.endsAt),
          actorId
        ]
      );
      await insertAudit(connection, {
        eventId: id,
        actorId,
        action: "EVENT_CREATED",
        metadata: {
          eventType: input.eventType,
          sourceType: input.sourceType,
          areaScoped: Boolean(input.areaId),
          buildingScoped: Boolean(input.buildingId)
        },
        requestId
      });
      await insertActivity(connection, {
        actorId,
        action: "RADAR_EVENT_CREATED",
        entityType: "RADAR_EVENT",
        entityId: id,
        metadata: { eventType: input.eventType, sourceType: input.sourceType }
      });
      await connection.commit();
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    } finally {
      connection.release();
    }
    return this.findEventById(id);
  },

  async findEventById(id: string) {
    const [rows] = await dbPool.query<RadarEventRow[]>(`${eventSelect} WHERE cre.id = ? LIMIT 1`, [id]);
    return rows[0] ? mapEvent(rows[0]) : null;
  },

  async listEvents(query: RadarEventListQuery) {
    const params: unknown[] = [];
    const statusSql = query.status ? "WHERE cre.status = ?" : "";
    if (query.status) {
      params.push(query.status);
    }
    params.push(query.limit);
    const [rows] = await dbPool.query<RadarEventRow[]>(
      `${eventSelect} ${statusSql} ORDER BY cre.starts_at DESC, cre.id DESC LIMIT ?`,
      params
    );
    return rows.map(mapEvent);
  },

  async listLostPostBuckets(input: {
    from: Date;
    to: Date;
    areaId: string | null;
    buildingId: string | null;
    bucketMinutes: number;
  }): Promise<RadarAggregateBucket[]> {
    const [rows] = await dbPool.query<Array<RowDataPacket & {
      category_id: string | null;
      bucket_start: string;
      lost_count: number;
    }>>(
      `
        SELECT
          p.category_id,
          DATE_FORMAT(
            FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(p.lost_found_at) / (? * 60)) * (? * 60)),
            '%Y-%m-%d %H:%i:%s'
          ) AS bucket_start,
          COUNT(*) AS lost_count
        FROM posts p
        WHERE p.type = 'LOST'
          AND p.status <> 'HIDDEN'
          AND p.deleted_at IS NULL
          AND p.lost_found_at >= ?
          AND p.lost_found_at < ?
          AND (? IS NULL OR p.area_id = ?)
          AND (? IS NULL OR p.building_id = ?)
        GROUP BY p.category_id, bucket_start
        ORDER BY bucket_start, p.category_id
      `,
      [
        input.bucketMinutes,
        input.bucketMinutes,
        input.from,
        input.to,
        input.areaId,
        input.areaId,
        input.buildingId,
        input.buildingId
      ]
    );
    return rows.map((row) => ({
      categoryId: row.category_id,
      bucketStart: row.bucket_start,
      count: Number(row.lost_count)
    }));
  },

  async upsertAlert(candidate: RadarAlertCandidate, actorId: string, requestId?: string | null) {
    const connection = await dbPool.getConnection();
    let alertId: string = randomUUID();
    let emitted = true;
    let lockName: string | null = null;
    try {
      lockName = await acquireFingerprintLock(connection, candidate.fingerprint);
      await connection.beginTransaction();
      const [existingRows] = await connection.query<LockedAlertRow[]>(
        `
          SELECT id, severity, status, cooldown_until, window_end
          FROM campus_radar_alerts
          WHERE fingerprint = ?
          LIMIT 1
          FOR UPDATE
        `,
        [candidate.fingerprint]
      );
      const existing = existingRows[0];
      const cooldownUntil = new Date(candidate.detectedAt.getTime() + candidate.cooldownMinutes * 60 * 1000);

      if (!existing) {
        await connection.execute(
          `
            INSERT INTO campus_radar_alerts (
              id, event_id, fingerprint, detector_version, category_id,
              window_start, window_end, window_minutes, step_minutes,
              baseline_start, baseline_end, baseline_window_count,
              observed_count, expected_mean, standard_deviation, z_score, observed_ratio,
              severity, last_detected_at, last_emitted_at, cooldown_until
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            alertId,
            candidate.eventId,
            candidate.fingerprint,
            candidate.detectorVersion,
            candidate.categoryId,
            candidate.windowStart,
            candidate.windowEnd,
            candidate.windowMinutes,
            candidate.stepMinutes,
            candidate.baselineStart,
            candidate.baselineEnd,
            candidate.baselineWindowCount,
            candidate.observedCount,
            candidate.expectedMean,
            candidate.standardDeviation,
            candidate.zScore,
            candidate.observedRatio,
            candidate.severity,
            candidate.detectedAt,
            candidate.detectedAt,
            cooldownUntil
          ]
        );
      } else {
        alertId = existing.id;
        const terminalEpisodeCanReopen =
          (existing.status === "RESOLVED" || existing.status === "DISMISSED") &&
          candidate.detectedAt >= utcDate(existing.cooldown_until) &&
          candidate.windowEnd > utcDate(existing.window_end);
        emitted = terminalEpisodeCanReopen || shouldEmitRadarAlert({
          status: existing.status,
          currentSeverity: existing.severity,
          nextSeverity: candidate.severity,
          cooldownUntil: existing.cooldown_until,
          detectedAt: candidate.detectedAt
        });
        await connection.execute(
          `
            UPDATE campus_radar_alerts
            SET detector_version = ?, category_id = ?,
                window_start = ?, window_end = ?, window_minutes = ?, step_minutes = ?,
                baseline_start = ?, baseline_end = ?, baseline_window_count = ?,
                observed_count = ?, expected_mean = ?, standard_deviation = ?,
                z_score = ?, observed_ratio = ?, severity = ?,
                status = IF(?, 'OPEN', status),
                disposition_reason = IF(?, NULL, disposition_reason),
                disposition_by = IF(?, NULL, disposition_by),
                disposition_at = IF(?, NULL, disposition_at),
                occurrence_count = occurrence_count + 1,
                emission_count = emission_count + ?,
                last_detected_at = ?,
                last_emitted_at = IF(?, ?, last_emitted_at),
                cooldown_until = IF(?, ?, cooldown_until),
                updated_at = UTC_TIMESTAMP()
            WHERE id = ?
          `,
          [
            candidate.detectorVersion,
            candidate.categoryId,
            candidate.windowStart,
            candidate.windowEnd,
            candidate.windowMinutes,
            candidate.stepMinutes,
            candidate.baselineStart,
            candidate.baselineEnd,
            candidate.baselineWindowCount,
            candidate.observedCount,
            candidate.expectedMean,
            candidate.standardDeviation,
            candidate.zScore,
            candidate.observedRatio,
            candidate.severity,
            terminalEpisodeCanReopen,
            terminalEpisodeCanReopen,
            terminalEpisodeCanReopen,
            terminalEpisodeCanReopen,
            emitted ? 1 : 0,
            candidate.detectedAt,
            emitted,
            candidate.detectedAt,
            emitted,
            cooldownUntil,
            alertId
          ]
        );
      }

      await insertAudit(connection, {
        eventId: candidate.eventId,
        alertId,
        actorId,
        action: emitted ? "ALERT_EMITTED" : "ALERT_REFRESHED",
        metadata: {
          detectorVersion: candidate.detectorVersion,
          categoryScoped: candidate.categoryId !== null,
          observedCount: candidate.observedCount,
          severity: candidate.severity,
          cooldownSuppressed: !emitted
        },
        requestId
      });
      await insertActivity(connection, {
        actorId,
        action: emitted ? "RADAR_ALERT_EMITTED" : "RADAR_ALERT_REFRESHED",
        entityType: "RADAR_ALERT",
        entityId: alertId,
        metadata: { severity: candidate.severity, cooldownSuppressed: !emitted }
      });
      await connection.commit();
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    } finally {
      try {
        await releaseFingerprintLock(connection, lockName);
        connection.release();
      } catch {
        connection.destroy();
      }
    }

    const alert = await this.findAlertById(alertId);
    if (!alert) {
      throw new Error("Unable to load saved radar alert");
    }
    return { alert, emitted };
  },

  async recordEventAnalysis(input: {
    eventId: string;
    actorId: string;
    detectedAlerts: number;
    emittedAlerts: number;
    evaluatedScopes: number;
    requestId?: string | null;
  }) {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const metadata = {
        detectedAlerts: input.detectedAlerts,
        emittedAlerts: input.emittedAlerts,
        evaluatedScopes: input.evaluatedScopes
      };
      await insertAudit(connection, {
        eventId: input.eventId,
        actorId: input.actorId,
        action: "EVENT_ANALYZED",
        metadata,
        requestId: input.requestId
      });
      await insertActivity(connection, {
        actorId: input.actorId,
        action: "RADAR_EVENT_ANALYZED",
        entityType: "RADAR_EVENT",
        entityId: input.eventId,
        metadata
      });
      await connection.commit();
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    } finally {
      connection.release();
    }
  },

  async findAlertById(id: string) {
    const [rows] = await dbPool.query<RadarAlertRow[]>(`${alertSelect} WHERE cra.id = ? LIMIT 1`, [id]);
    return rows[0] ? mapAlert(rows[0]) : null;
  },

  async listAlerts(query: RadarAlertListQuery) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.eventId) {
      conditions.push("cra.event_id = ?");
      params.push(query.eventId);
    }
    if (query.status) {
      conditions.push("cra.status = ?");
      params.push(query.status);
    }
    if (query.severity) {
      conditions.push("cra.severity = ?");
      params.push(query.severity);
    }
    params.push(query.limit);
    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await dbPool.query<RadarAlertRow[]>(
      `${alertSelect} ${whereSql} ORDER BY cra.last_detected_at DESC, cra.id DESC LIMIT ?`,
      params
    );
    return rows.map(mapAlert);
  },

  async listRelatedPosts(alertId: string, limit: number) {
    const [rows] = await dbPool.query<RadarRelatedPostRow[]>(
      `SELECT
         p.id, p.type, p.status, p.title, p.lost_found_at, p.created_at,
         p.category_id, category.name AS category_name,
         p.area_id, area.name AS area_name,
         p.building_id, building.name AS building_name
       FROM campus_radar_alerts alert
       INNER JOIN campus_radar_events event ON event.id = alert.event_id
       INNER JOIN posts p
         ON p.type = 'LOST'
        AND p.status <> 'HIDDEN'
        AND p.deleted_at IS NULL
        AND p.lost_found_at >= alert.window_start
        AND p.lost_found_at < alert.window_end
        AND (alert.category_id IS NULL OR p.category_id = alert.category_id)
        AND (event.area_id IS NULL OR p.area_id = event.area_id)
        AND (event.building_id IS NULL OR p.building_id = event.building_id)
       LEFT JOIN item_categories category ON category.id = p.category_id
       LEFT JOIN campus_areas area ON area.id = p.area_id
       LEFT JOIN campus_buildings building ON building.id = p.building_id
       WHERE alert.id = ?
       ORDER BY p.lost_found_at DESC, p.id DESC
       LIMIT ?`,
      [alertId, limit]
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      title: row.title,
      lostFoundAt: row.lost_found_at,
      createdAt: row.created_at,
      category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
      area: row.area_id ? { id: row.area_id, name: row.area_name } : null,
      building: row.building_id ? { id: row.building_id, name: row.building_name } : null
    }));
  },

  async transitionAlert(
    id: string,
    input: RadarAlertStatusInput,
    actorId: string,
    requestId?: string | null
  ) {
    const connection = await dbPool.getConnection();
    let updated = false;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<LockedAlertRow[]>(
        "SELECT id, severity, status, cooldown_until FROM campus_radar_alerts WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      const current = rows[0];
      if (!current) {
        throw new HttpError(404, "Radar alert not found");
      }
      if (current.status === input.status) {
        await connection.commit();
      } else {
        if (!canTransitionRadarAlert(current.status, input.status)) {
          throw new HttpError(409, `Radar alert cannot transition from ${current.status} to ${input.status}`);
        }
        await connection.execute(
          `
            UPDATE campus_radar_alerts
            SET status = ?, disposition_reason = ?, disposition_by = ?,
                disposition_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
            WHERE id = ?
          `,
          [input.status, input.reason, actorId, id]
        );
        await insertAudit(connection, {
          alertId: id,
          actorId,
          action: "ALERT_STATUS_CHANGED",
          metadata: { fromStatus: current.status, toStatus: input.status, reason: input.reason },
          requestId
        });
        await insertActivity(connection, {
          actorId,
          action: "RADAR_ALERT_STATUS_CHANGED",
          entityType: "RADAR_ALERT",
          entityId: id,
          metadata: { fromStatus: current.status, toStatus: input.status, reason: input.reason }
        });
        await connection.commit();
        updated = true;
      }
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    } finally {
      connection.release();
    }
    return { alert: await this.findAlertById(id), updated };
  },

  async listAudit(limit: number) {
    const [rows] = await dbPool.query<RadarAuditRow[]>(
      `
        SELECT id, event_id, alert_id, actor_id, action, metadata, request_id, created_at
        FROM campus_radar_audit_logs
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `,
      [limit]
    );
    return rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      alertId: row.alert_id,
      actorId: row.actor_id,
      action: row.action,
      metadata: parseJsonObjectColumn(row.metadata),
      requestId: row.request_id,
      createdAt: row.created_at
    }));
  }
};
