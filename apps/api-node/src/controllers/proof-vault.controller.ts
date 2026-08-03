import type { Request, Response } from "express";
import { cloudinaryService } from "../services/cloudinary.service.js";
import { proofVaultService } from "../services/proof-vault.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { createPrivateProofSchema, updatePrivateProofSchema } from "../validators/proof-vault.validator.js";

function param(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `Missing route parameter: ${name}`);
  return value;
}

async function sendPrivateImage(response: Response, imageUrl: string) {
  const { bytes, contentType } = await cloudinaryService.downloadTrustedImage(imageUrl);
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", "private, no-store");
  response.send(bytes);
}

export const proofVaultController = {
  async list(request: Request, response: Response) {
    response.setHeader("Cache-Control", "private, no-store");
    response.json(ok({ proofs: await proofVaultService.list(request.auth!) }));
  },
  async create(request: Request, response: Response) {
    const proof = await proofVaultService.create(request.auth!, createPrivateProofSchema.parse(request.body));
    response.status(201).json(created({ proof }, "Private proof created"));
  },
  async update(request: Request, response: Response) {
    const proof = await proofVaultService.update(request.auth!, param(request.params.id, "id"), updatePrivateProofSchema.parse(request.body));
    response.json(ok({ proof }, "Private proof updated"));
  },
  async archive(request: Request, response: Response) {
    response.json(ok(await proofVaultService.archive(request.auth!, param(request.params.id, "id")), "Private proof archived"));
  },
  async uploadMedia(request: Request, response: Response) {
    const proof = await proofVaultService.uploadMedia(request.auth!, param(request.params.id, "id"), request.file);
    response.status(201).json(created({ proof }, "Private proof media uploaded"));
  },
  async media(request: Request, response: Response) {
    await sendPrivateImage(response, await proofVaultService.ownMedia(request.auth!, param(request.params.id, "id")));
  },
  async attach(request: Request, response: Response) {
    response.status(201).json(created(await proofVaultService.attach(request.auth!, param(request.params.id, "id"), param(request.params.proofId, "proofId")), "Private proof attached"));
  },
  async detach(request: Request, response: Response) {
    response.json(ok(await proofVaultService.detach(request.auth!, param(request.params.id, "id"), param(request.params.proofId, "proofId")), "Private proof detached"));
  },
  async listAttached(request: Request, response: Response) {
    response.setHeader("Cache-Control", "private, no-store");
    response.json(ok({ proofs: await proofVaultService.listAttached(request.auth!, param(request.params.id, "id")) }));
  },
  async attachedMedia(request: Request, response: Response) {
    await sendPrivateImage(response, await proofVaultService.attachedMedia(request.auth!, param(request.params.id, "id"), param(request.params.proofId, "proofId")));
  }
};
