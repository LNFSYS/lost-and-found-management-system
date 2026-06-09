import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

type ConfigValueType = "STRING" | "INTEGER" | "FLOAT" | "BOOLEAN" | "JSON";

interface ConfigEntryRow extends RowDataPacket {
  config_key: string;
  config_value: string;
  value_type: ConfigValueType;
  description: string | null;
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
  }
};
