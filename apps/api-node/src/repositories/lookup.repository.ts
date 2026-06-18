import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  name_normalized: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
}

interface AreaRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface BuildingRow extends RowDataPacket {
  id: string;
  area_id: string;
  name: string;
  sort_order: number;
}

interface HandoverPointRow extends RowDataPacket {
  id: string;
  name: string;
  address: string;
  area_id: string | null;
  building_id: string | null;
  opening_hours: string | null;
  contact_info: string | null;
  map_image_url: string | null;
  map_position_x: string | number | null;
  map_position_y: string | number | null;
  stored_items: number | null;
}

let handoverMapColumnsAvailableCache: boolean | null = null;

async function handoverMapColumnsAvailable() {
  if (handoverMapColumnsAvailableCache !== null) {
    return handoverMapColumnsAvailableCache;
  }
  const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'handover_points'
        AND column_name IN ('map_image_url', 'map_position_x', 'map_position_y')
    `
  );
  handoverMapColumnsAvailableCache = Number(rows[0]?.total ?? 0) === 3;
  return handoverMapColumnsAvailableCache;
}

export const lookupRepository = {
  async listCategories() {
    const [rows] = await dbPool.query<CategoryRow[]>(
      `
        SELECT id, name, name_normalized, icon, parent_id, sort_order
        FROM item_categories
        WHERE is_active = TRUE
        ORDER BY sort_order, name
      `
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      nameNormalized: row.name_normalized,
      icon: row.icon,
      parentId: row.parent_id,
      sortOrder: row.sort_order
    }));
  },

  async listAreas() {
    const [rows] = await dbPool.query<AreaRow[]>(
      `
        SELECT id, name, description, sort_order
        FROM campus_areas
        WHERE is_active = TRUE
        ORDER BY sort_order, name
      `
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order
    }));
  },

  async listBuildingsByArea(areaId: string) {
    const [rows] = await dbPool.query<BuildingRow[]>(
      `
        SELECT id, area_id, name, sort_order
        FROM campus_buildings
        WHERE area_id = ? AND is_active = TRUE
        ORDER BY sort_order, name
      `,
      [areaId]
    );

    return rows.map((row) => ({
      id: row.id,
      areaId: row.area_id,
      name: row.name,
      sortOrder: row.sort_order
    }));
  },

  async listHandoverPoints() {
    const hasMapColumns = await handoverMapColumnsAvailable();
    const [rows] = await dbPool.query<HandoverPointRow[]>(
      `
        SELECT
          hp.id, hp.name, hp.address, hp.area_id, hp.building_id, hp.opening_hours, hp.contact_info,
          ${hasMapColumns ? "hp.map_image_url, hp.map_position_x, hp.map_position_y," : "NULL AS map_image_url, NULL AS map_position_x, NULL AS map_position_y,"}
          COALESCE(wi_counts.total, 0) AS stored_items
        FROM handover_points hp
        LEFT JOIN (
          SELECT handover_point_id, COUNT(*) AS total
          FROM warehouse_items
          WHERE deleted_at IS NULL
            AND status IN ('PENDING_APPROVAL', 'RECEIVED', 'STORED', 'CLAIMED')
          GROUP BY handover_point_id
        ) wi_counts ON wi_counts.handover_point_id = hp.id
        WHERE hp.is_active = TRUE
        ORDER BY hp.name
      `
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      areaId: row.area_id,
      buildingId: row.building_id,
      openingHours: row.opening_hours,
      contactInfo: row.contact_info,
      mapImageUrl: row.map_image_url,
      mapPositionX: row.map_position_x === null ? null : Number(row.map_position_x),
      mapPositionY: row.map_position_y === null ? null : Number(row.map_position_y),
      storedItems: Number(row.stored_items ?? 0)
    }));
  },

  async findHandoverPointById(id: string) {
    const hasMapColumns = await handoverMapColumnsAvailable();
    const [rows] = await dbPool.query<HandoverPointRow[]>(
      `
        SELECT
          hp.id, hp.name, hp.address, hp.area_id, hp.building_id, hp.opening_hours, hp.contact_info,
          ${hasMapColumns ? "hp.map_image_url, hp.map_position_x, hp.map_position_y," : "NULL AS map_image_url, NULL AS map_position_x, NULL AS map_position_y,"}
          COALESCE(wi_counts.total, 0) AS stored_items
        FROM handover_points hp
        LEFT JOIN (
          SELECT handover_point_id, COUNT(*) AS total
          FROM warehouse_items
          WHERE deleted_at IS NULL
            AND status IN ('PENDING_APPROVAL', 'RECEIVED', 'STORED', 'CLAIMED')
          GROUP BY handover_point_id
        ) wi_counts ON wi_counts.handover_point_id = hp.id
        WHERE hp.id = ? AND hp.is_active = TRUE
        LIMIT 1
      `,
      [id]
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      address: row.address,
      areaId: row.area_id,
      buildingId: row.building_id,
      openingHours: row.opening_hours,
      contactInfo: row.contact_info,
      mapImageUrl: row.map_image_url,
      mapPositionX: row.map_position_x === null ? null : Number(row.map_position_x),
      mapPositionY: row.map_position_y === null ? null : Number(row.map_position_y),
      storedItems: Number(row.stored_items ?? 0)
    };
  }
};
