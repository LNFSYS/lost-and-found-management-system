import type { Request, Response } from "express";
import { claimService } from "../services/claim.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { createClaimSchema } from "../validators/claim.validator.js";

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

  async listForPost(request: Request, response: Response) {
    const claims = await claimService.listPostClaims(request.auth!, requireStringParam(request.params.id, "id"));
    response.json(ok({ claims }));
  }
};
