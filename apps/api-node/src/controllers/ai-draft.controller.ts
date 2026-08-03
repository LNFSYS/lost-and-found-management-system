import type { Request, Response } from "express";
import { aiDraftService } from "../services/ai-draft.service.js";
import { ok } from "../utils/api-response.js";
import { aiDraftSchema } from "../validators/ai-draft.validator.js";

export const aiDraftController = {
  async create(request: Request, response: Response) {
    response.setHeader("Cache-Control", "private, no-store");
    const result = await aiDraftService.create(aiDraftSchema.parse(request.body), request.file);
    response.json(ok(result, "AI-assisted draft created; review is required before publishing"));
  }
};
