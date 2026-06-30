import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { HttpError } from "../utils/http-error.js";

type ConfigValueType = "STRING" | "INTEGER" | "FLOAT" | "BOOLEAN" | "JSON";

interface ConfigEntryRow extends RowDataPacket {
  id: string;
  config_key: string;
  config_value: string;
  value_type: ConfigValueType;
  description: string | null;
  is_public: number;
  updated_by: string | null;
  updated_at: string;
}

interface ConfigHistoryRow extends RowDataPacket {
  id: string;
  config_key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  changed_by_name: string | null;
  changed_at: string;
}

function parseConfigValue(value: string, type: ConfigValueType): unknown {
  switch (type) {
    case "INTEGER":
      return Number.parseInt(value, 10);
    case "FLOAT":
      return Number.parseFloat(value);
    case "BOOLEAN":
      return value === "true" || value === "1";
    case "JSON":
      return JSON.parse(value);
    case "STRING":
      return value;
  }
}

function serializeConfigValue(value: unknown, type: ConfigValueType) {
  switch (type) {
    case "INTEGER": {
      const parsed = Number(value);
      if (!Number.isInteger(parsed)) {
        throw new HttpError(422, "Config value must be an integer");
      }
      return String(parsed);
    }
    case "FLOAT": {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        throw new HttpError(422, "Config value must be a number");
      }
      return String(parsed);
    }
    case "BOOLEAN":
      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }
      if (value === "true" || value === "false" || value === "1" || value === "0") {
        return String(value);
      }
      throw new HttpError(422, "Config value must be boolean");
    case "JSON":
      return JSON.stringify(value);
    case "STRING":
      return String(value);
  }
}

function mapEntry(row: ConfigEntryRow) {
  return {
    id: row.id,
    key: row.config_key,
    value: parseConfigValue(row.config_value, row.value_type),
    rawValue: row.config_value,
    valueType: row.value_type,
    description: row.description,
    isPublic: row.is_public === 1,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at
  };
}

function mapHistory(row: ConfigHistoryRow) {
  return {
    id: row.id,
    key: row.config_key,
    oldValue: row.old_value,
    newValue: row.new_value,
    changedBy: {
      id: row.changed_by,
      fullName: row.changed_by_name
    },
    changedAt: row.changed_at
  };
}

export const configRepository = {
  async listPublicConfig() {
    const [rows] = await dbPool.query<ConfigEntryRow[]>(
      `
        SELECT config_key, config_value, value_type, description
        FROM config_entries
        WHERE is_public = TRUE
        ORDER BY config_key
      `
    );

    return rows.map((row) => ({
      key: row.config_key,
      value: parseConfigValue(row.config_value, row.value_type),
      valueType: row.value_type,
      description: row.description
    }));
  },

  async listAllConfig() {
    const [rows] = await dbPool.query<ConfigEntryRow[]>(
      `
        SELECT id, config_key, config_value, value_type, description, is_public, updated_by, updated_at
        FROM config_entries
        ORDER BY config_key
      `
    );
    return rows.map(mapEntry);
  },

  async updateConfig(key: string, value: unknown, actorId: string) {
    const [rows] = await dbPool.query<ConfigEntryRow[]>(
      `
        SELECT id, config_key, config_value, value_type, description, is_public, updated_by, updated_at
        FROM config_entries
        WHERE config_key = ?
        LIMIT 1
      `,
      [key]
    );
    const current = rows[0];
    if (!current) {
      throw new HttpError(404, "Config entry not found");
    }

    const serialized = serializeConfigValue(value, current.value_type);
    await dbPool.execute(
      `
        UPDATE config_entries
        SET config_value = ?,
            updated_by = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE config_key = ?
      `,
      [serialized, actorId, key]
    );
    await dbPool.execute(
      `
        INSERT INTO config_history (id, config_key, old_value, new_value, changed_by)
        VALUES (?, ?, ?, ?, ?)
      `,
      [randomUUID(), key, current.config_value, serialized, actorId]
    );

    return { key, value: parseConfigValue(serialized, current.value_type), rawValue: serialized };
  },

  async history(limit = 50) {
    const [rows] = await dbPool.query<ConfigHistoryRow[]>(
      `
        SELECT ch.id, ch.config_key, ch.old_value, ch.new_value, ch.changed_by, u.full_name AS changed_by_name, ch.changed_at
        FROM config_history ch
        LEFT JOIN users u ON u.id = ch.changed_by
        ORDER BY ch.changed_at DESC
        LIMIT ?
      `,
      [limit]
    );
    return rows.map(mapHistory);
  }
};
