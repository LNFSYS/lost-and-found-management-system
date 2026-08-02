import type { Request, Response } from "express";
import { visualHuntService } from "../services/visual-hunt.service.js";
import { ok } from "../utils/api-response.js";
import { visualHuntFeedbackSchema, visualHuntSearchSchema } from "../validators/visual-hunt.validator.js";

export const visualHuntController = {
  async search(request: Request, response: Response) {
    const input = visualHuntSearchSchema.parse(request.body);
    const result = await visualHuntService.search(request.file, input);
    response.json(ok(result));
  },

  async feedback(request: Request, response: Response) {
    const input = visualHuntFeedbackSchema.parse(request.body);
    response.json(ok(await visualHuntService.recordFeedback(request.auth!.sub, input), "Visual Hunt feedback recorded"));
  }
};
