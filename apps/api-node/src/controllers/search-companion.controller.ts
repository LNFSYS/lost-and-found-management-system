import type { Request, Response } from "express";
import { searchCompanionService } from "../services/search-companion.service.js";
import { ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { searchCompanionAnswerSchema, searchCompanionSkipSchema } from "../validators/search-companion.validator.js";

function postId(request: Request) {
  const value = request.params.id;
  if (typeof value !== "string" || !value) throw new HttpError(400, "Missing route parameter: id");
  return value;
}

export const searchCompanionController = {
  async get(request: Request, response: Response) {
    response.json(ok(await searchCompanionService.get(request.auth!, postId(request))));
  },
  async answer(request: Request, response: Response) {
    response.json(ok(await searchCompanionService.answer(request.auth!, postId(request), searchCompanionAnswerSchema.parse(request.body)), "Search profile updated"));
  },
  async skip(request: Request, response: Response) {
    const input = searchCompanionSkipSchema.parse(request.body);
    response.json(ok(await searchCompanionService.skip(request.auth!, postId(request), input.field), "Question skipped"));
  },
  async undo(request: Request, response: Response) {
    response.json(ok(await searchCompanionService.undo(request.auth!, postId(request)), "Last answer removed"));
  },
  async recalculate(request: Request, response: Response) {
    response.json(ok(await searchCompanionService.recalculate(request.auth!, postId(request)), "Matching preview recalculated"));
  },
  async apply(request: Request, response: Response) {
    response.json(ok(await searchCompanionService.apply(request.auth!, postId(request)), "Safe Search Companion fields applied"));
  }
};
