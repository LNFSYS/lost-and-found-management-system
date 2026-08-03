import type { Request, Response } from "express";
import { recoveryTimelineService } from "../services/recovery-timeline.service.js";
import { ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";

export const recoveryTimelineController = {
  async get(request: Request, response: Response) {
    const postId = request.params.id;
    if (typeof postId !== "string" || !postId) throw new HttpError(400, "Missing route parameter: id");
    response.json(ok(await recoveryTimelineService.get(request.auth!, postId)));
  }
};
