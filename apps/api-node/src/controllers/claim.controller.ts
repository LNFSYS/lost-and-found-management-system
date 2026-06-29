import type { Request, Response } from "express";
import { claimService } from "../services/claim.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { createClaimSchema } from "../validators/claim.validator.js";
import { z } from "zod";

const claimReasonSchema = z.object({
  reason: z.string().trim().min(2).max(1000)
});

const claimMoreInfoSchema = z.object({
  message: z.string().trim().min(2).max(1000)
});

function requireStringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }

  return value;
}

export const claimController = {
  async create(request: Request, response: Response) {
    const input = createClaimSchema.parse(request.body);
    const result = await claimService.createClaim(request.auth!, input);
    response.status(201).json(created(result, "Claim submitted"));
  },

  async detail(request: Request, response: Response) {
    const result = await claimService.getClaim(request.auth!, requireStringParam(request.params.id, "id"));
    response.json(ok(result));
  },

  async verification(request: Request, response: Response) {
    const result = await claimService.verifyClaimEvidence(request.auth!, requireStringParam(request.params.id, "id"));
    response.json(ok({ verification: result }));
  },

  async listForPost(request: Request, response: Response) {
    const claims = await claimService.listPostClaims(request.auth!, requireStringParam(request.params.id, "id"));
    response.json(ok({ claims }));
  },

  async requestMoreInfo(request: Request, response: Response) {
    const input = claimMoreInfoSchema.parse(request.body);
    const result = await claimService.requestMoreInfo(request.auth!, requireStringParam(request.params.id, "id"), input.message);
    response.json(ok(result));
  },

  async accept(request: Request, response: Response) {
    const result = await claimService.accept(request.auth!, requireStringParam(request.params.id, "id"));
    response.json(ok(result));
  },

  async reject(request: Request, response: Response) {
    const input = claimReasonSchema.parse(request.body);
    const result = await claimService.reject(request.auth!, requireStringParam(request.params.id, "id"), input.reason);
    response.json(ok(result));
  },

  async cancel(request: Request, response: Response) {
    const input = claimReasonSchema.parse(request.body);
    const result = await claimService.cancel(request.auth!, requireStringParam(request.params.id, "id"), input.reason);
    response.json(ok(result));
  }
};
