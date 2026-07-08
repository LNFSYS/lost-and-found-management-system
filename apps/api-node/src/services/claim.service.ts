import { randomUUID } from "node:crypto";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { claimRepository } from "../repositories/claim.repository.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { postRepository } from "../repositories/post.repository.js";
import { chatRepository } from "../repositories/chat.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeText } from "../utils/normalize-text.js";
import type { CreateClaimInput } from "../validators/claim.validator.js";
import { matchingService } from "./matching.service.js";

function canReviewClaims(auth: AccessTokenPayload, ownerId: string) {
  return auth.sub === ownerId || auth.roles.includes("STAFF") || auth.roles.includes("ADMIN");
}

function canCancelClaim(auth: AccessTokenPayload, claim: { claimant: { id: string }; postOwnerId: string }) {
  return auth.sub === claim.claimant.id || canReviewClaims(auth, claim.postOwnerId);
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

function isDuplicateEntry(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

function tokenSet(value: string | null | undefined) {
  return new Set(
    normalizeText(value ?? "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

function overlapScore(left: string | null | undefined, right: string | null | undefined) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return Math.min(1, overlap / Math.min(leftTokens.size, rightTokens.size));
}

function privateSignalScore(value: string) {
  const normalized = normalizeText(value);
  const patterns = [
    /\b(serial|imei|ma so|ma may|so seri|hoa don|receipt|bill|scratch|vet xuoc|phu kien|op lung|sticker)\b/,
    /\b[a-z]{2,}\d{3,}\b/,
    /\b\d{6,}\b/
  ];
  return patterns.some((pattern) => pattern.test(normalized)) ? 1 : 0;
}

function timeConfidence(claimTime: string | null | undefined, postTime: string | null | undefined) {
  if (!claimTime || !postTime) {
    return 0;
  }
  const left = new Date(claimTime).getTime();
  const right = new Date(postTime).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return 0;
  }
  const days = Math.abs(left - right) / (24 * 60 * 60 * 1000);
  if (days <= 1) {
    return 1;
  }
  return Math.max(0, 1 / (1 + days / 7));
}

async function notifyClaimUsers(
  claim: { id: string; claimant: { id: string }; postOwnerId: string },
  type: string,
  title: string,
  body: string
) {
  await notificationRepository.createMany([
    {
      userId: claim.claimant.id,
      type,
      title,
      body,
      entityType: "CLAIM",
      entityId: claim.id
    },
    {
      userId: claim.postOwnerId,
      type,
      title,
      body,
      entityType: "CLAIM",
      entityId: claim.id
    }
  ]);
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
    const existingClaim = await claimRepository.findByPostAndClaimant(input.postId, auth.sub);
    if (existingClaim) {
      throw new HttpError(409, "You already submitted a claim for this post");
    }

    let result;
    try {
      result = await claimRepository.create({
        id: randomUUID(),
        postId: input.postId,
        claimantId: auth.sub,
        description: input.description?.trim() ?? null,
        secretAnswer: input.secretAnswer.trim(),
        approximateLostAt: parseOptionalDate(input.approximateLostAt),
        approximateLocation: input.approximateLocation.trim()
      });
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new HttpError(409, "You already submitted a claim for this post");
      }
      throw error;
    }

    if (!result) {
      throw new HttpError(500, "Unable to create claim");
    }

    await notificationRepository.create({
      userId: post.user_id,
      type: "CLAIM_SUBMITTED",
      title: "Có yêu cầu nhận đồ mới",
      body: "Một người dùng vừa gửi claim cho bài FOUND của bạn. Hãy kiểm tra bằng chứng trước khi xử lý.",
      entityType: "CLAIM",
      entityId: result.claim.id
    });

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

    if (result.evidence.length > 0) {
      await userRepository.createActivityLog({
        userId: auth.sub,
        action: "CLAIM_EVIDENCE_VIEWED",
        entityType: "CLAIM",
        entityId: claimId,
        metadata: {
          evidenceCount: result.evidence.length,
          claimantId: result.claim.claimant.id,
          postOwnerId: result.claim.postOwnerId
        }
      });
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
  },

  async requestMoreInfo(auth: AccessTokenPayload, claimId: string, message: string) {
    const detail = await this.getClaim(auth, claimId);
    if (!canReviewClaims(auth, detail.claim.postOwnerId)) {
      throw new HttpError(403, "You do not have permission to request more claim info");
    }
    if (detail.claim.status !== "PENDING" && detail.claim.status !== "NEED_MORE_INFO") {
      throw new HttpError(409, "Only pending claims can request more info");
    }
    const result = await claimRepository.updateStatus({
      id: claimId,
      actorId: auth.sub,
      status: "NEED_MORE_INFO",
      allowedStatuses: ["PENDING", "NEED_MORE_INFO"],
      moreInfoRequest: message.trim(),
      note: message.trim()
    });
    if (!result) {
      throw new HttpError(409, "Claim status changed; refresh before continuing");
    }
    await notifyClaimUsers(
      detail.claim,
      "CLAIM_NEED_MORE_INFO",
      "Claim cần bổ sung thông tin",
      message.trim()
    );
    return result;
  },

  async accept(auth: AccessTokenPayload, claimId: string) {
    const detail = await this.getClaim(auth, claimId);
    if (!canReviewClaims(auth, detail.claim.postOwnerId)) {
      throw new HttpError(403, "You do not have permission to accept this claim");
    }
    if (detail.claim.status !== "PENDING" && detail.claim.status !== "NEED_MORE_INFO") {
      throw new HttpError(409, "Only pending claims can be accepted");
    }
    const result = await claimRepository.updateStatus({
      id: claimId,
      actorId: auth.sub,
      status: "ACCEPTED",
      allowedStatuses: ["PENDING", "NEED_MORE_INFO"],
      note: "Claim accepted"
    });
    if (!result) {
      throw new HttpError(409, "Claim status changed; refresh before continuing");
    }
    await notifyClaimUsers(
      detail.claim,
      "CLAIM_ACCEPTED",
      "Claim đã được chấp nhận",
      "Claim đã được chấp nhận. Hai bên có thể tạo lịch hẹn bàn giao."
    );
    await chatRepository.getOrCreateRoom(claimId);
    return result;
  },

  async reject(auth: AccessTokenPayload, claimId: string, reason: string) {
    const detail = await this.getClaim(auth, claimId);
    if (!canReviewClaims(auth, detail.claim.postOwnerId)) {
      throw new HttpError(403, "You do not have permission to reject this claim");
    }
    if (detail.claim.status === "ACCEPTED" || detail.claim.status === "CANCELLED" || detail.claim.status === "REJECTED") {
      throw new HttpError(409, "This claim can no longer be rejected");
    }
    const result = await claimRepository.updateStatus({
      id: claimId,
      actorId: auth.sub,
      status: "REJECTED",
      allowedStatuses: ["PENDING", "NEED_MORE_INFO"],
      rejectionReason: reason.trim(),
      note: reason.trim()
    });
    if (!result) {
      throw new HttpError(409, "Claim status changed; refresh before continuing");
    }
    await notifyClaimUsers(detail.claim, "CLAIM_REJECTED", "Claim bị từ chối", reason.trim());
    const rejectedCount = await claimRepository.countRejectedClaimsForUser(detail.claim.claimant.id);
    if (rejectedCount >= 3) {
      await userRepository.addReputation({
        userId: detail.claim.claimant.id,
        delta: -2,
        reason: "Multiple rejected claims",
        entityType: "CLAIM",
        entityId: claimId
      });
    }
    return result;
  },

  async cancel(auth: AccessTokenPayload, claimId: string, reason: string) {
    const detail = await this.getClaim(auth, claimId);
    if (!canCancelClaim(auth, detail.claim)) {
      throw new HttpError(403, "You do not have permission to cancel this claim");
    }
    if (detail.claim.status === "ACCEPTED" || detail.claim.status === "CANCELLED" || detail.claim.status === "REJECTED") {
      throw new HttpError(409, "This claim can no longer be cancelled");
    }
    const result = await claimRepository.updateStatus({
      id: claimId,
      actorId: auth.sub,
      status: "CANCELLED",
      allowedStatuses: ["PENDING", "NEED_MORE_INFO"],
      note: reason.trim()
    });
    if (!result) {
      throw new HttpError(409, "Claim status changed; refresh before continuing");
    }
    await notifyClaimUsers(detail.claim, "CLAIM_CANCELLED", "Claim đã bị hủy", reason.trim());
    return result;
  },

  async verifyClaimEvidence(auth: AccessTokenPayload, claimId: string) {
    const detail = await this.getClaim(auth, claimId);
    const post = await postRepository.findById(detail.claim.postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }

    const matches = await matchingService.listMatches(detail.claim.postId);
    const relatedPostIds = matches.map((match) =>
      match.lostPostId === detail.claim.postId ? match.foundPostId : match.lostPostId
    );
    const relatedPosts = await postRepository.findByIds(relatedPostIds);
    const claimantPostIds = new Set(relatedPosts.filter((item) => item.userId === detail.claim.claimant.id).map((item) => item.id));
    const claimantMatch = matches
      .filter((match) => claimantPostIds.has(match.lostPostId) || claimantPostIds.has(match.foundPostId))
      .sort((left, right) => right.totalScore - left.totalScore)[0];

    const evidenceText = detail.evidence.map((item) => item.description ?? "").join(" ");
    const claimText = [detail.claim.description, detail.claim.secretAnswer, evidenceText].filter(Boolean).join(" ");
    const postText = [post.title, post.description, post.category?.name].filter(Boolean).join(" ");
    const postLocation = [
      post.location.roomText,
      post.location.customLocation,
      post.location.buildingName,
      post.location.areaName
    ].filter(Boolean).join(" ");

    const textScore = overlapScore(claimText, postText);
    const privateSignal = privateSignalScore(claimText);
    const evidenceScore = evidenceText.trim()
      ? Math.max(privateSignal > 0 ? 0.35 : 0, overlapScore(evidenceText, postText), privateSignal)
      : 0;
    const locationScore = overlapScore(detail.claim.approximateLocation, postLocation);
    const timeScore = timeConfidence(detail.claim.approximateLostAt, post.lostFoundAt);
    const matchScore = claimantMatch?.totalScore ?? 0;
    const consistencyScore = Math.min(1, (textScore + locationScore + timeScore) / 3 + (privateSignal > 0 ? 0.15 : 0));

    const ownershipScore =
      0.25 * matchScore +
      0.2 * textScore +
      0.15 * locationScore +
      0.1 * timeScore +
      0.2 * evidenceScore +
      0.1 * consistencyScore;
    const cappedOwnershipScore =
      privateSignal === 0 && !claimantMatch ? Math.min(ownershipScore, 0.65) : ownershipScore;
    const ownershipConfidence = Math.round(Math.max(0, Math.min(1, cappedOwnershipScore)) * 100);
    const reviewConfidenceTier =
      ownershipConfidence >= 85
        ? "STRONG_REVIEW"
        : ownershipConfidence >= 70
          ? "HIGH_REVIEW"
          : ownershipConfidence >= 45
            ? "MEDIUM"
            : "LOW";

    return {
      claimId,
      ownershipConfidence,
      level: ownershipConfidence >= 70 ? "HIGH" : ownershipConfidence >= 45 ? "MEDIUM" : "LOW",
      reviewConfidenceTier,
      isSystemVerified: false,
      note: "Muc ho tro xac thuc chi la diem tham khao. Staff hoac chu bai FOUND phai doi chieu bang chung rieng truoc khi tra do.",
      breakdown: {
        matchScore: Math.round(matchScore * 100),
        textScore: Math.round(textScore * 100),
        locationScore: Math.round(locationScore * 100),
        timeScore: Math.round(timeScore * 100),
        evidenceScore: Math.round(evidenceScore * 100),
        privateSignalScore: Math.round(privateSignal * 100),
        consistencyScore: Math.round(consistencyScore * 100)
      },
      signals: {
        hasClaimantMatchedLostPost: Boolean(claimantMatch),
        evidenceCount: detail.evidence.length,
        hasEvidenceOcrText: detail.evidence.some((item) => item.description?.includes("OCR:")),
        hasPrivateSignal: privateSignal > 0,
        hasApproximateLostTime: Boolean(detail.claim.approximateLostAt),
        hasApproximateLocation: Boolean(detail.claim.approximateLocation)
      }
    };
  }
};
