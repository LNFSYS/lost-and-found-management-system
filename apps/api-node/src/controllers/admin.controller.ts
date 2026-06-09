import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { adminRepository } from "../repositories/admin.repository.js";
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
  sortOrder: z.coerce.number().int().min(0).default(0)
});
const areaSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(255).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0)
});
const buildingSchema = z.object({
  areaId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.coerce.number().int().min(0).default(0)
});
const roomSchema = z.object({
  buildingId: z.string().uuid(),
  name: z.string().trim().min(1).max(100)
});
const handoverSchema = z.object({
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().min(2).max(255),
  areaId: z.string().uuid().nullable().optional(),
  buildingId: z.string().uuid().nullable().optional(),
  roomId: z.string().uuid().nullable().optional(),
  openingHours: z.string().trim().max(255).nullable().optional(),
  contactInfo: z.string().trim().max(255).nullable().optional()
});
const reportHandleSchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED"]),
  note: z.string().trim().max(500).nullable().optional(),
  actionType: z.enum(["WARN_USER", "HIDE_POST", "DELETE_POST", "BAN_USER", "UNBAN_USER"]).nullable().optional()
});

function idParam(request: Request) {
  const { id } = request.params;
  if (typeof id !== "string" || id.trim() === "") {
    throw new HttpError(400, "Missing id");
  }
  return id;
}

export const adminController = {
  async overview(_request: Request, response: Response) {
    response.json(ok({ overview: await adminRepository.overview() }));
  },

  async users(_request: Request, response: Response) {
    response.json(ok({ users: await adminRepository.users() }));
  },

  async updateUserStatus(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateUserStatus(idParam(request), userStatusSchema.parse(request.body).status)));
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
        })
      )
    );
  },

  async updateUserRoles(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateUserRoles(idParam(request), userRolesSchema.parse(request.body).roles)));
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

  async rooms(_request: Request, response: Response) {
    response.json(ok({ rooms: await adminRepository.rooms() }));
  },

  async createRoom(request: Request, response: Response) {
    response.status(201).json(ok(await adminRepository.createRoom(roomSchema.parse(request.body))));
  },

  async updateRoom(request: Request, response: Response) {
    response.json(ok(await adminRepository.updateRoom(idParam(request), roomSchema.parse(request.body))));
  },

  async setRoomActive(request: Request, response: Response) {
    response.json(ok(await adminRepository.setRoomActive(idParam(request), activeSchema.parse(request.body).isActive)));
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

  async reports(_request: Request, response: Response) {
    response.json(ok({ reports: await adminRepository.reports() }));
  },

  async handleReport(request: Request, response: Response) {
    response.json(ok(await adminRepository.handleReport(idParam(request), request.auth!.sub, reportHandleSchema.parse(request.body))));
  }
};
