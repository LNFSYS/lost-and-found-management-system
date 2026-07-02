import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { configService } from "../services/config.service.js";
import { postService } from "../services/post.service.js";
import { ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeEmail } from "../utils/normalize-email.js";

const activeSchema = z.object({ isActive: z.boolean() });
const userStatusSchema = z.object({ status: z.enum(["ACTIVE", "LOCKED", "DISABLED"]) });
const adminRoleSchema = z.enum(["USER", "STUDENT", "LECTURER", "STAFF", "ADMIN"]);
const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(150),
  studentCode: z.string().trim().max(30).nullable().optional(),
  phoneNumber: z.string().trim().max(20).nullable().optional(),
  status: z.enum(["ACTIVE", "LOCKED", "DISABLED"]).default("ACTIVE"),
  roles: z.array(adminRoleSchema).min(1).default(["STUDENT"])
});
const userRolesSchema = z.object({
  roles: z.array(adminRoleSchema).min(1)
});
const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  icon: z.string().trim().max(100).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional()
});
const areaSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(255).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional()
});
const buildingSchema = z.object({
  areaId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.coerce.number().int().min(0).optional()
});
const handoverSchema = z.object({
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().min(2).max(255),
  areaId: z.string().uuid().nullable().optional(),
  buildingId: z.string().uuid().nullable().optional(),
  openingHours: z.string().trim().max(255).nullable().optional(),
  contactInfo: z.string().trim().max(255).nullable().optional(),
  mapImageUrl: z.string().trim().max(5_000_000).nullable().optional(),
  mapPositionX: z.coerce.number().min(0).max(100).nullable().optional(),
  mapPositionY: z.coerce.number().min(0).max(100).nullable().optional()
});
const warehouseStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "RECEIVED",
  "STORED",
  "CLAIMED",
  "RETURNED",
  "EXPIRED",
  "DISPOSED",
  "DONATED",
  "TRANSFERRED"
]);
const optionalDateTimeSchema = z.string().datetime().nullable().optional();
const warehouseSchema = z.object({
  postId: z.string().uuid().nullable().optional(),
  handoverPointId: z.string().uuid().nullable().optional(),
  itemName: z.string().trim().min(2).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
  buildingId: z.string().uuid().nullable().optional(),
  roomText: z.string().trim().max(100).nullable().optional(),
  finderUserId: z.string().uuid().nullable().optional(),
  finderName: z.string().trim().max(150).nullable().optional(),
  finderContact: z.string().trim().max(255).nullable().optional(),
  status: warehouseStatusSchema.optional(),
  conditionNotes: z.string().trim().max(2000).nullable().optional(),
  storageCode: z.string().trim().max(60).nullable().optional(),
  receivedAt: optionalDateTimeSchema,
  returnedAt: optionalDateTimeSchema,
  retentionDeadline: optionalDateTimeSchema
});
const warehouseStatusUpdateSchema = z.object({
  status: warehouseStatusSchema
});
const warehouseProcessSchema = z.object({
  status: z.enum(["DISPOSED", "DONATED", "TRANSFERRED"]),
  note: z.string().trim().min(2).max(1000)
});
const nearExpirySchema = z.object({
  daysAhead: z.coerce.number().int().min(1).max(90).default(7)
});
const reportHandleSchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED"]),
  note: z.string().trim().max(500).nullable().optional(),
  actionType: z.enum(["WARN_USER", "HIDE_POST", "DELETE_POST", "BAN_USER", "UNBAN_USER"]).nullable().optional()
});
const configUpdateSchema = z.object({
  value: z.unknown()
});
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

function idParam(request: Request) {
  const { id } = request.params;
  if (typeof id !== "string" || id.trim() === "") {
    throw new HttpError(400, "Missing id");
  }
  return id;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(",");
}

export const adminController = {
  async overview(_request: Request, response: Response) {
    response.json(ok({ overview: await adminRepository.overview() }));
  },

  async expireOverduePosts(_request: Request, response: Response) {
    response.json(ok(await postService.expireOverduePosts()));
  },

  async exportOverview(_request: Request, response: Response) {
    const overview = await adminRepository.overview();
    const rows: unknown[][] = [
      ["section", "key", "value"],
      ["summary", "users", overview.users],
      ["summary", "posts", overview.posts],
      ["summary", "claims", overview.claims],
      ["summary", "reports", overview.reports],
      ["summary", "categories", overview.categories],
      ["summary", "areas", overview.areas],
      ["summary", "handoverPoints", overview.handoverPoints],
      ["summary", "warehouseItems", overview.warehouseItems]
    ];

    for (const item of overview.postsByStatus) {
      rows.push(["postsByStatus", item.status, item.total]);
    }
    for (const item of overview.postsByType) {
      rows.push(["postsByType", item.type, item.total]);
    }

    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="lost-found-dashboard-${Date.now()}.csv"`);
    response.send(rows.map(csvRow).join("\n"));
  },

  async users(_request: Request, response: Response) {
    response.json(ok({ users: await adminRepository.users() }));
  },

  async updateUserStatus(request: Request, response: Response) {
    response.json(
      ok(await adminRepository.updateUserStatus(idParam(request), userStatusSchema.parse(request.body).status, request.auth!.sub))
    );
  },

  async createUser(request: Request, response: Response) {
    const input = userCreateSchema.parse(request.body);
    const email = input.email.trim();
    const id = randomUUID();
    response.status(201).json(
      ok(
        await adminRepository.createUser({
          id,
          email,
          normalizedEmail: normalizeEmail(email),
          passwordHash: await bcrypt.hash(input.password, env.bcryptSaltRounds),
          fullName: input.fullName.trim(),
          studentCode: input.studentCode?.trim() || null,
          phoneNumber: input.phoneNumber?.trim() || null,
          status: input.status,
          roles: input.roles
        }, request.auth!.sub)
      )
    );
  },

  async updateUserRoles(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateUserRoles(idParam(request), userRolesSchema.parse(request.body).roles, request.auth!.sub)));
  },

  async categories(_request: Request, response: Response) {
    response.json(ok({ categories: await adminRepository.categories() }));
  },

  async createCategory(request: Request, response: Response) {
    response.status(201).json(ok(await adminRepository.createCategory(categorySchema.parse(request.body))));
  },

  async updateCategory(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateCategory(idParam(request), categorySchema.parse(request.body))));
  },

  async setCategoryActive(request: Request, response: Response) {
    response.json(ok(await adminRepository.setCategoryActive(idParam(request), activeSchema.parse(request.body).isActive)));
  },

  async areas(_request: Request, response: Response) {
    response.json(ok({ areas: await adminRepository.areas() }));
  },

  async createArea(request: Request, response: Response) {
    response.status(201).json(ok(await adminRepository.createArea(areaSchema.parse(request.body))));
  },

  async updateArea(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateArea(idParam(request), areaSchema.parse(request.body))));
  },

  async setAreaActive(request: Request, response: Response) {
    response.json(ok(await adminRepository.setAreaActive(idParam(request), activeSchema.parse(request.body).isActive)));
  },

  async buildings(_request: Request, response: Response) {
    response.json(ok({ buildings: await adminRepository.buildings() }));
  },

  async createBuilding(request: Request, response: Response) {
    response.status(201).json(ok(await adminRepository.createBuilding(buildingSchema.parse(request.body))));
  },

  async updateBuilding(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateBuilding(idParam(request), buildingSchema.parse(request.body))));
  },

  async setBuildingActive(request: Request, response: Response) {
    response.json(ok(await adminRepository.setBuildingActive(idParam(request), activeSchema.parse(request.body).isActive)));
  },

  async handoverPoints(_request: Request, response: Response) {
    response.json(ok({ handoverPoints: await adminRepository.handoverPoints() }));
  },

  async createHandoverPoint(request: Request, response: Response) {
    response
      .status(201)
      .json(ok(await adminRepository.createHandoverPoint(handoverSchema.parse(request.body), request.auth!.sub)));
  },

  async updateHandoverPoint(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateHandoverPoint(idParam(request), handoverSchema.parse(request.body))));
  },

  async setHandoverPointActive(request: Request, response: Response) {
    response.json(ok(await adminRepository.setHandoverPointActive(idParam(request), activeSchema.parse(request.body).isActive)));
  },

  async warehouseItems(_request: Request, response: Response) {
    response.json(ok({ warehouseItems: await adminRepository.warehouseItems() }));
  },

  async warehouseCapacity(_request: Request, response: Response) {
    response.json(ok({ capacity: await adminRepository.warehouseCapacity() }));
  },

  async createWarehouseItem(request: Request, response: Response) {
    response
      .status(201)
      .json(ok(await adminRepository.createWarehouseItem(warehouseSchema.parse(request.body), request.auth!.sub)));
  },

  async updateWarehouseItem(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateWarehouseItem(idParam(request), warehouseSchema.parse(request.body), request.auth!.sub)));
  },

  async updateWarehouseItemStatus(request: Request, response: Response) {
    response.json(
      ok(
        await adminRepository.updateWarehouseItemStatus(
          idParam(request),
          warehouseStatusUpdateSchema.parse(request.body).status,
          request.auth!.sub
        )
      )
    );
  },

  async expireOverdueWarehouseItems(request: Request, response: Response) {
    response.json(ok(await adminRepository.expireOverdueWarehouseItems(request.auth!.sub)));
  },

  async alertWarehouseNearExpiry(request: Request, response: Response) {
    const input = nearExpirySchema.parse(request.body);
    response.json(ok(await adminRepository.alertWarehouseItemsNearExpiry(input.daysAhead)));
  },

  async alertWarehouseCapacity(_request: Request, response: Response) {
    response.json(ok(await adminRepository.alertWarehouseCapacityIfNeeded()));
  },

  async processOverdueWarehouseItem(request: Request, response: Response) {
    const input = warehouseProcessSchema.parse(request.body);
    response.json(ok(await adminRepository.processOverdueWarehouseItem(idParam(request), input.status, input.note, request.auth!.sub)));
  },

  async deleteWarehouseItem(request: Request, response: Response) {
    response.json(ok(await adminRepository.deleteWarehouseItem(idParam(request), request.auth!.sub)));
  },

  async reports(_request: Request, response: Response) {
    response.json(ok({ reports: await adminRepository.reports() }));
  },

  async handleReport(request: Request, response: Response) {
    response.json(ok(await adminRepository.handleReport(idParam(request), request.auth!.sub, reportHandleSchema.parse(request.body))));
  },

  async config(_request: Request, response: Response) {
    response.json(ok({ entries: await configService.getAllConfig() }));
  },

  async updateConfig(request: Request, response: Response) {
    const input = configUpdateSchema.parse(request.body);
    response.json(ok(await configService.updateConfig(String(request.params.key), input.value, request.auth!.sub)));
  },

  async configHistory(request: Request, response: Response) {
    const input = historyQuerySchema.parse(request.query);
    response.json(ok({ history: await configService.history(input.limit) }));
  }
};
