import type { Request, Response } from "express";
import { mediaService, type PostMediaUpload } from "../services/media.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { claimEvidenceBodySchema } from "../validators/media.validator.js";

function requireStringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }

  return value;
}

function getPostMediaUploads(request: Request): PostMediaUpload[] {
  if (!request.files) {
    return [];
  }

  if (Array.isArray(request.files)) {
    return request.files.map((file) => ({ file, mediaKind: "ITEM" }));
  }

  return Object.entries(request.files).flatMap(([fieldName, files]) =>
    files.map((file) => ({
      file,
      mediaKind: fieldName === "evidenceImages" ? "EVIDENCE" : "ITEM"
    }))
  );
}

export const mediaController = {
  async avatar(request: Request, response: Response) {
    const result = await mediaService.uploadAvatar(request.auth!, request.file);
    response.json(ok(result, "Avatar uploaded"));
  },

  async postMedia(request: Request, response: Response) {
    const postId = requireStringParam(request.params.id, "id");
    const result = await mediaService.uploadPostMedia(request.auth!, postId, getPostMediaUploads(request));
    response.status(201).json(created(result, "Post media uploaded"));
  },

  async deletePostMedia(request: Request, response: Response) {
    const postId = requireStringParam(request.params.id, "id");
    const mediaId = requireStringParam(request.params.mediaId, "mediaId");
    const result = await mediaService.deletePostMedia(request.auth!, postId, mediaId);
    response.json(ok(result, "Post media deleted"));
  },

  async claimEvidence(request: Request, response: Response) {
    const claimId = requireStringParam(request.params.id, "id");
    const body = claimEvidenceBodySchema.parse(request.body);
    const result = await mediaService.uploadClaimEvidence(request.auth!, claimId, request.file, body);
    response.status(201).json(created(result, "Claim evidence uploaded"));
  }
};
