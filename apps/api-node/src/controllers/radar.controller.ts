import type { Request, Response } from "express";
import { radarService } from "../services/radar.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import {
  createRadarEventSchema,
  radarAlertListQuerySchema,
  radarAlertStatusSchema,
  radarEventListQuerySchema
} from "../validators/radar.validator.js";

function requireStringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }
  return value;
}

function requestId(response: Response) {
  return typeof response.locals.requestId === "string" ? response.locals.requestId : null;
}

export const radarController = {
  async createEvent(request: Request, response: Response) {
    const input = createRadarEventSchema.parse(request.body);
    const result = await radarService.createEvent(request.auth!, input, requestId(response));
    response.status(201).json(created(result, "Campus radar event created"));
  },

  async listEvents(request: Request, response: Response) {
    const query = radarEventListQuerySchema.parse(request.query);
    response.json(ok(await radarService.listEvents(request.auth!, query)));
  },

  async analyzeEvent(request: Request, response: Response) {
    const eventId = requireStringParam(request.params.id, "id");
    response.json(ok(await radarService.analyzeEvent(request.auth!, eventId, requestId(response))));
  },

  async listAlerts(request: Request, response: Response) {
    const query = radarAlertListQuerySchema.parse(request.query);
    response.json(ok(await radarService.listAlerts(request.auth!, query)));
  },

  async relatedPosts(request: Request, response: Response) {
    const alertId = requireStringParam(request.params.id, "id");
    const { limit } = radarEventListQuerySchema.pick({ limit: true }).parse(request.query);
    response.json(ok(await radarService.listRelatedPosts(request.auth!, alertId, limit)));
  },

  async updateAlertStatus(request: Request, response: Response) {
    const alertId = requireStringParam(request.params.id, "id");
    const input = radarAlertStatusSchema.parse(request.body);
    response.json(ok(await radarService.transitionAlert(request.auth!, alertId, input, requestId(response))));
  },

  async audit(request: Request, response: Response) {
    const { limit } = radarEventListQuerySchema.pick({ limit: true }).parse(request.query);
    response.json(ok(await radarService.listAudit(request.auth!, limit)));
  }
};
