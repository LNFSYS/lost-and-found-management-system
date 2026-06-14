import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { postRepository } from "../repositories/post.repository.js";
import { normalizeText } from "../utils/normalize-text.js";
import { HttpError } from "../utils/http-error.js";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from "../validators/post.validator.js";
import { matchingService } from "./matching.service.js";

function assertPostOwnerOrAdmin(auth: AccessTokenPayload, ownerId: string) {
  if (auth.sub !== ownerId && !auth.roles.includes("ADMIN")) {
    throw new HttpError(403, "You do not have permission to modify this post");
  }
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (date.getTime() > Date.now()) {
    throw new HttpError(422, "Lost/found time cannot be in the future");
  }

  return date;
}

async function validateReferences(input: {
  categoryId?: string | null;
  areaId?: string | null;
  buildingId?: string | null;
  roomText?: string | null;
  handoverPointId?: string | null;
}) {
  if (input.categoryId) {
    const exists = await postRepository.activeRecordExists("item_categories", input.categoryId);
    if (!exists) {
      throw new HttpError(422, "Category does not exist or is inactive");
    }
  }

  if (input.areaId) {
    const exists = await postRepository.activeRecordExists("campus_areas", input.areaId);
    if (!exists) {
      throw new HttpError(422, "Campus area does not exist or is inactive");
    }
  }

  if (input.buildingId) {
    const exists = await postRepository.activeRecordExists("campus_buildings", input.buildingId);
    if (!exists) {
      throw new HttpError(422, "Campus building does not exist or is inactive");
    }
    if (input.areaId && !(await postRepository.buildingBelongsToArea(input.buildingId, input.areaId))) {
      throw new HttpError(422, "Campus building does not belong to the selected area");
    }
  }

  if (input.handoverPointId) {
    const exists = await postRepository.activeRecordExists("handover_points", input.handoverPointId);
    if (!exists) {
      throw new HttpError(422, "Handover point does not exist or is inactive");
    }
  }
}

function normalizeQuery(query: ListPostsQuery): ListPostsQuery {
  return {
    ...query,
    q: query.q ? normalizeText(query.q) : undefined
  };
}

export const postService = {
  async createPost(auth: AccessTokenPayload, input: CreatePostInput) {
    await validateReferences(input);

    const lostFoundAt = parseOptionalDate(input.lostFoundAt);
    const expirationDays = await postRepository.getConfigNumber("post.expiration_days", 30);
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
    const secretVerificationHash =
      input.type === "LOST" && input.secretVerification
        ? await bcrypt.hash(input.secretVerification, env.bcryptSaltRounds)
        : null;

    const post = await postRepository.create({
      id: randomUUID(),
      userId: auth.sub,
      type: input.type,
      title: input.title.trim(),
      titleNormalized: normalizeText(input.title),
      description: input.description.trim(),
      descriptionNormalized: normalizeText(input.description),
      categoryId: input.categoryId,
      areaId: input.areaId ?? null,
      buildingId: input.buildingId ?? null,
      roomText: input.roomText?.trim() || null,
      customLocation: input.customLocation?.trim() ?? null,
      contactInfo: input.contactInfo?.trim() || null,
      lostFoundAt,
      handoverPointId: input.handoverPointId ?? null,
      secretVerificationHash,
      expiresAt
    });

    if (!post) {
      throw new HttpError(500, "Unable to create post");
    }

    try {
      const matches = await matchingService.runForPost(post.id);
      const matchSuggestions = input.type === "LOST" ? await matchingService.buildSuggestions(post.id, matches) : [];
      return { post, matchSuggestions };
    } catch (error: unknown) {
      console.warn(`Post matching failed after create: ${error instanceof Error ? error.message : "unknown error"}`);
      return { post, matchSuggestions: [] };
    }
  },

  async listPublicPosts(query: ListPostsQuery) {
    return postRepository.list(normalizeQuery(query));
  },

  async listMyPosts(auth: AccessTokenPayload, query: ListPostsQuery) {
    return postRepository.list(normalizeQuery(query), auth.sub);
  },

  async getPostDetail(postId: string) {
    await postRepository.incrementViewCount(postId);
    const detail = await postRepository.getDetail(postId);
    if (!detail) {
      throw new HttpError(404, "Post not found");
    }

    return detail;
  },

  async updatePost(auth: AccessTokenPayload, postId: string, input: UpdatePostInput) {
    const current = await postRepository.findOwnerAndStatus(postId);
    if (!current) {
      throw new HttpError(404, "Post not found");
    }
    assertPostOwnerOrAdmin(auth, current.user_id);

    await validateReferences(input);

    const nextType = input.type ?? current.type;
    const secretVerificationHash =
      nextType === "LOST" && input.secretVerification
        ? await bcrypt.hash(input.secretVerification, env.bcryptSaltRounds)
        : undefined;
    const post = await postRepository.update(postId, {
      type: input.type,
      title: input.title?.trim(),
      titleNormalized: input.title ? normalizeText(input.title) : undefined,
      description: input.description?.trim(),
      descriptionNormalized: input.description ? normalizeText(input.description) : undefined,
      categoryId: input.categoryId,
      areaId: input.areaId,
      buildingId: input.buildingId,
      roomText: input.roomText === undefined ? undefined : input.roomText?.trim() || null,
      customLocation: input.customLocation,
      contactInfo: input.contactInfo === undefined ? undefined : input.contactInfo?.trim() || null,
      lostFoundAt: input.lostFoundAt === undefined ? undefined : parseOptionalDate(input.lostFoundAt),
      handoverPointId: input.handoverPointId,
      secretVerificationHash
    });

    if (!post) {
      throw new HttpError(404, "Post not found");
    }

    void matchingService.runForPost(post.id).catch((error: unknown) => {
      console.warn(`Post matching failed after update: ${error instanceof Error ? error.message : "unknown error"}`);
    });

    return post;
  },

  async updateStatus(auth: AccessTokenPayload, postId: string, status: "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "HIDDEN") {
    const current = await postRepository.findOwnerAndStatus(postId);
    if (!current) {
      throw new HttpError(404, "Post not found");
    }
    assertPostOwnerOrAdmin(auth, current.user_id);

    const post = await postRepository.updateStatus(postId, status);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }

    return post;
  },

  async deletePost(auth: AccessTokenPayload, postId: string) {
    const current = await postRepository.findOwnerAndStatus(postId);
    if (!current) {
      throw new HttpError(404, "Post not found");
    }
    assertPostOwnerOrAdmin(auth, current.user_id);

    const deleted = await postRepository.softDelete(postId);
    if (!deleted) {
      throw new HttpError(404, "Post not found");
    }

    return { deleted: true };
  }
};
