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
    const [rows] = await dbPool.query<HandoverPointRow[]>(
      `
        SELECT id, name, address, area_id, building_id, opening_hours, contact_info
        FROM handover_points
        WHERE is_active = TRUE
        ORDER BY name
      `
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      areaId: row.area_id,
      buildingId: row.building_id,
      openingHours: row.opening_hours,
      contactInfo: row.contact_info
    }));
  },

  async findHandoverPointById(id: string) {
    const [rows] = await dbPool.query<HandoverPointRow[]>(
      `
        SELECT id, name, address, area_id, building_id, opening_hours, contact_info
        FROM handover_points
        WHERE id = ? AND is_active = TRUE
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
      contactInfo: row.contact_info
    };
  }
};
