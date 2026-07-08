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
  },

  async claimEvidenceImage(request: Request, response: Response) {
    const claimId = requireStringParam(request.params.id, "id");
    const evidenceId = requireStringParam(request.params.evidenceId, "evidenceId");
    const { imageUrl } = await mediaService.getClaimEvidenceImageUrl(request.auth!, claimId, evidenceId);
    const upstream = await fetch(imageUrl);
    if (!upstream.ok) {
      throw new HttpError(502, "Unable to load claim evidence image");
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const bytes = Buffer.from(await upstream.arrayBuffer());
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(bytes);
  },

  async claimChatImage(request: Request, response: Response) {
    const claimId = requireStringParam(request.params.id, "id");
    const result = await mediaService.uploadClaimChatImage(request.auth!, claimId, request.file);
    response.status(201).json(created(result, "Claim chat image uploaded"));
  },

  async claimChatImageFile(request: Request, response: Response) {
    const claimId = requireStringParam(request.params.id, "id");
    const mediaPublicId = requireStringParam(request.query.publicId as string | undefined, "publicId");
    const { imageUrl } = await mediaService.getClaimChatImageUrl(request.auth!, claimId, mediaPublicId);
    const upstream = await fetch(imageUrl);
    if (!upstream.ok) {
      throw new HttpError(502, "Unable to load claim chat image");
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const bytes = Buffer.from(await upstream.arrayBuffer());
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(bytes);
  }
};
