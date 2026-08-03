import type { Request, Response } from "express";
import { finderQuickScanService } from "../services/finder-quick-scan.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { finderDraftSchema, finderPublishSchema, finderQuickScanSchema } from "../validators/finder-quick-scan.validator.js";

function sessionId(request: Request) {
  const value = request.params.sessionId;
  if (typeof value !== "string" || !value) throw new HttpError(400, "Missing route parameter: sessionId");
  return value;
}

export const finderQuickScanController = {
  async scan(request: Request, response: Response) {
    const input = finderQuickScanSchema.parse(request.body);
    response.json(ok(await finderQuickScanService.scan(request.auth!, input, request.file), "Finder Quick Scan completed"));
  },
  async createDraft(request: Request, response: Response) {
    const input = finderDraftSchema.parse(request.body);
    response.json(ok(await finderQuickScanService.createDraft(request.auth!, sessionId(request), input.selectedLostPostId ?? null), "FOUND draft is ready for review"));
  },
  async publish(request: Request, response: Response) {
    const result = await finderQuickScanService.publish(request.auth!, sessionId(request), finderPublishSchema.parse(request.body));
    response.status(result.reused ? 200 : 201).json(result.reused ? ok(result, "Existing FOUND post returned") : created(result, "FOUND post published"));
  }
};
