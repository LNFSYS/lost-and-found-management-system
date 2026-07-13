import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { postRepository } from "../repositories/post.repository.js";
import { normalizeText } from "../utils/normalize-text.js";
import { HttpError } from "../utils/http-error.js";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { canReadPostMatches } from "../policies/post-match.policy.js";
import { assertPostStatusTransition } from "../policies/post-state.policy.js";
import { finalPostStateSchema } from "../validators/post.validator.js";
import type {
  CreatePostInput,
  ListPostsQuery,
  MatchFeedbackInput,
  ReportPostInput,
  UpdatePostInput
} from "../validators/post.validator.js";
import { matchingService } from "./matching.service.js";
import { matchingWorkerService } from "./matching-worker.service.js";

function assertPostOwnerOrAdmin(auth: AccessTokenPayload, ownerId: string) {
  if (auth.sub !== ownerId && !auth.roles.includes("ADMIN")) {
    throw new HttpError(403, "You do not have permission to modify this post");
  }
}

function canViewContactInfo(auth: AccessTokenPayload | undefined, ownerId: string) {
  return Boolean(auth && (auth.sub === ownerId || auth.roles.includes("ADMIN") || auth.roles.includes("STAFF")));
}

function canViewHiddenPosts(auth: AccessTokenPayload | undefined) {
  return Boolean(auth && (auth.roles.includes("ADMIN") || auth.roles.includes("STAFF")));
}

function feedbackSource(auth: AccessTokenPayload): "USER" | "STAFF" | "ADMIN" {
  if (auth.roles.includes("ADMIN")) {
    return "ADMIN";
  }
  if (auth.roles.includes("STAFF")) {
    return "STAFF";
  }
  return "USER";
}

function redactContactInfo<T extends { userId: string; contactInfo?: string | null }>(
  post: T,
  auth?: AccessTokenPayload
): T & { contactInfoHidden: boolean } {
  if (canViewContactInfo(auth, post.userId)) {
    return { ...post, contactInfoHidden: false };
  }

  return { ...post, contactInfo: null, contactInfoHidden: Boolean(post.contactInfo) };
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

function databaseDateToIso(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

async function recordSuggestionImpressions(
  auth: AccessTokenPayload,
  sourcePostId: string,
  suggestions: Array<{ match: { id: string; totalScore: number }; post: { id: string } }>,
  surface: "CREATE_POST" | "SUGGESTION_LIST"
) {
  try {
    await postRepository.recordMatchSuggestionImpressions(
      suggestions.map((suggestion) => ({
        matchId: suggestion.match.id,
        userId: auth.sub,
        sourcePostId,
        suggestedPostId: suggestion.post.id,
        surface,
        scoreSnapshot: suggestion.match.totalScore
      }))
    );
  } catch (error: unknown) {
    console.warn(`Match impression logging failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function redactMatchSuggestions<
  Suggestion extends {
    post: { userId: string; contactInfo?: string | null };
  }
>(suggestions: Suggestion[], auth: AccessTokenPayload) {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    post: redactContactInfo(suggestion.post, auth)
  }));
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

    await matchingWorkerService.enqueue(post.id);
    return { post, matchSuggestions: [] };
  },

  async listPublicPosts(query: ListPostsQuery, auth?: AccessTokenPayload) {
    const result = await postRepository.list(normalizeQuery(query), undefined, {
      includeHidden: canViewHiddenPosts(auth)
    });
    return {
      ...result,
      items: result.items.map((post) => redactContactInfo(post, auth))
    };
  },

  async listMyPosts(auth: AccessTokenPayload, query: ListPostsQuery) {
    return postRepository.list(normalizeQuery(query), auth.sub, { includeHidden: true });
  },

  async listMyMatchSuggestions(auth: AccessTokenPayload) {
    const lostPostIds = await postRepository.listActiveLostPostIdsByUser(auth.sub);
    const suggestions = [];

    for (const postId of lostPostIds) {
      const matches = await matchingService.listMatches(postId);
      const postSuggestions = await matchingService.buildSuggestions(postId, matches);
      const safePostSuggestions = redactMatchSuggestions(postSuggestions, auth);
      await recordSuggestionImpressions(auth, postId, postSuggestions, "SUGGESTION_LIST");
      suggestions.push(...safePostSuggestions.map((suggestion) => ({ ...suggestion, sourcePostId: postId })));
    }

    const unique = new Map<string, (typeof suggestions)[number]>();
    for (const suggestion of suggestions) {
      const key = `${suggestion.sourcePostId}:${suggestion.post.id}`;
      if (!unique.has(key)) {
        unique.set(key, suggestion);
      }
    }

    return {
      suggestions: Array.from(unique.values()).sort((left, right) => right.match.totalScore - left.match.totalScore)
    };
  },

  async getPostDetail(postId: string, auth?: AccessTokenPayload) {
    await postRepository.incrementViewCount(postId);
    const detail = await postRepository.getDetail(postId);
    if (!detail) {
      throw new HttpError(404, "Post not found");
    }

    if (detail.post.status === "HIDDEN" && !canViewContactInfo(auth, detail.post.userId)) {
      throw new HttpError(404, "Post not found");
    }

    const canViewPrivateMedia = canViewContactInfo(auth, detail.post.userId);
    return {
      ...detail,
      post: redactContactInfo(detail.post, auth),
      media: detail.media.filter((media) => media.mediaKind !== "EVIDENCE" || canViewPrivateMedia)
    };
  },

  async listPostMatches(auth: AccessTokenPayload, postId: string) {
    const post = await postRepository.findOwnerAndStatus(postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }
    if (!canReadPostMatches(auth, post.user_id)) {
      throw new HttpError(403, "You do not have permission to view matches for this post");
    }
    return matchingService.listMatches(postId);
  },

  async explainPostMatches(auth: AccessTokenPayload, postId: string) {
    const post = await postRepository.findOwnerAndStatus(postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }
    if (!canReadPostMatches(auth, post.user_id)) {
      throw new HttpError(403, "You do not have permission to view match explanations for this post");
    }
    return matchingService.explainMatches(postId);
  },

  async recordMatchFeedback(auth: AccessTokenPayload, postId: string, matchId: string, input: MatchFeedbackInput) {
    const access = await postRepository.findMatchAccess(matchId, postId);
    if (!access) {
      throw new HttpError(404, "Match not found");
    }

    const canReview =
      access.lost_owner_id === auth.sub ||
      access.found_owner_id === auth.sub ||
      auth.roles.includes("STAFF") ||
      auth.roles.includes("ADMIN");
    if (!canReview) {
      throw new HttpError(403, "You do not have permission to review this match");
    }

    return postRepository.upsertMatchFeedback({
      matchId,
      userId: auth.sub,
      label: input.label,
      note: input.note?.trim() || null,
      source: feedbackSource(auth)
    });
  },

  async updatePost(auth: AccessTokenPayload, postId: string, input: UpdatePostInput) {
    const current = await postRepository.findEditableState(postId);
    if (!current) {
      throw new HttpError(404, "Post not found");
    }
    assertPostOwnerOrAdmin(auth, current.user_id);

    if (input.type !== undefined && input.type !== current.type) {
      throw new HttpError(409, "Post type cannot be changed after creation");
    }

    const nextType = current.type;
    const finalState = finalPostStateSchema.parse({
      type: nextType,
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      categoryId: input.categoryId ?? current.category_id,
      areaId: input.areaId === undefined ? current.area_id : input.areaId,
      buildingId: input.buildingId === undefined ? current.building_id : input.buildingId,
      roomText: input.roomText === undefined ? current.room_text : input.roomText,
      customLocation: input.customLocation === undefined ? current.custom_location : input.customLocation,
      contactInfo: input.contactInfo === undefined ? current.contact_info : input.contactInfo,
      lostFoundAt: input.lostFoundAt === undefined ? databaseDateToIso(current.lost_found_at) : input.lostFoundAt,
      handoverPointId: input.handoverPointId === undefined ? current.handover_point_id : input.handoverPointId,
      hasSecretVerification: Boolean(input.secretVerification?.trim()) || current.has_secret_verification === 1
    });
    await validateReferences(finalState);

    const secretVerificationHash =
      nextType === "LOST" && input.secretVerification
        ? await bcrypt.hash(input.secretVerification, env.bcryptSaltRounds)
        : undefined;
    const post = await postRepository.update(postId, {
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

    await matchingWorkerService.enqueue(post.id);

    return post;
  },

  async updateStatus(auth: AccessTokenPayload, postId: string, status: "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "HIDDEN") {
    const current = await postRepository.findOwnerAndStatus(postId);
    if (!current) {
      throw new HttpError(404, "Post not found");
    }
    assertPostStatusTransition({
      auth,
      ownerId: current.user_id,
      from: current.status,
      to: status
    });

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
  },

  async expireOverduePosts() {
    return postRepository.expireOverduePosts();
  },

  async reportPost(auth: AccessTokenPayload, postId: string, input: ReportPostInput) {
    const report = await postRepository.createReport({
      reporterId: auth.sub,
      postId,
      reason: input.reason,
      details: input.details ?? null
    });
    if (!report) {
      throw new HttpError(404, "Post not found");
    }
    return report;
  }
};
