import { randomUUID } from "node:crypto";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { claimRepository } from "../repositories/claim.repository.js";
import { HttpError } from "../utils/http-error.js";
import type { CreateClaimInput } from "../validators/claim.validator.js";

function canReviewClaims(auth: AccessTokenPayload, ownerId: string) {
  return auth.sub === ownerId || auth.roles.includes("STAFF") || auth.roles.includes("ADMIN");
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (date.getTime() > Date.now()) {
    throw new HttpError(422, "Approximate lost time cannot be in the future");
  }

  return date;
}

export const claimService = {
  async createClaim(auth: AccessTokenPayload, input: CreateClaimInput) {
    const post = await claimRepository.findPostForClaim(input.postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }
    if (post.type !== "FOUND") {
      throw new HttpError(422, "Claims can only be submitted for FOUND posts");
    }
    if (post.status !== "OPEN" && post.status !== "MATCHED") {
      throw new HttpError(409, "Post is not open for claims");
    }
    if (post.user_id === auth.sub) {
      throw new HttpError(409, "Post owner cannot claim their own found item");
    }

    const result = await claimRepository.create({
      id: randomUUID(),
      postId: input.postId,
      claimantId: auth.sub,
      description: input.description?.trim() ?? null,
      secretAnswer: input.secretAnswer.trim(),
      approximateLostAt: parseOptionalDate(input.approximateLostAt),
      approximateLocation: input.approximateLocation.trim()
    });

    if (!result) {
      throw new HttpError(500, "Unable to create claim");
    }

    return result;
  },

  async getClaim(auth: AccessTokenPayload, claimId: string) {
    const result = await claimRepository.findById(claimId);
    if (!result) {
      throw new HttpError(404, "Claim not found");
    }

    if (auth.sub !== result.claim.claimant.id && !canReviewClaims(auth, result.claim.postOwnerId)) {
      throw new HttpError(403, "You do not have permission to view this claim");
    }

    return result;
  },

  async listPostClaims(auth: AccessTokenPayload, postId: string) {
    const post = await claimRepository.findPostForClaim(postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }
    if (!canReviewClaims(auth, post.user_id)) {
      throw new HttpError(403, "You do not have permission to view claims for this post");
    }

    return claimRepository.listByPostId(postId);
  }
};
