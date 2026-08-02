import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { claimRepository } from "../repositories/claim.repository.js";
import {
  verificationQuestionRepository,
  type VerificationQuestionType
} from "../repositories/verification-question.repository.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeText } from "../utils/normalize-text.js";
import { userRepository } from "../repositories/user.repository.js";
import { metricsService } from "./metrics.service.js";

export interface VerificationQuestionSuggestion {
  prompt: string;
  questionType: VerificationQuestionType;
  sourceSignal: string;
  privacyLevel: "PRIVATE" | "HIGHLY_PRIVATE";
  reason: string;
}

function canReview(auth: AccessTokenPayload, ownerId: string) {
  return auth.sub === ownerId || auth.roles.includes("STAFF") || auth.roles.includes("ADMIN");
}

function categoryHints(context: { title: string; description: string; categoryName: string | null; tags: Array<{ tag: string }> }) {
  return normalizeText([context.title, context.description, context.categoryName, ...context.tags.map((tag) => tag.tag)].filter(Boolean).join(" "));
}

export function buildVerificationQuestionSuggestions(context: {
  title: string;
  description: string;
  categoryName: string | null;
  tags: Array<{ tag: string; source?: string }>;
}): VerificationQuestionSuggestion[] {
  const hints = categoryHints(context);
  const suggestions: VerificationQuestionSuggestion[] = [
    {
      prompt: "Vật phẩm có vết xước, vết nứt hoặc dấu hiệu sử dụng riêng ở vị trí nào?",
      questionType: "VISUAL_DETAIL",
      sourceSignal: "distinctive_mark",
      privacyLevel: "PRIVATE",
      reason: "Đặc điểm hao mòn riêng thường khó suy đoán từ thông tin công khai."
    },
    {
      prompt: "Vật phẩm có phụ kiện hoặc đồ đi kèm nào không được nêu trong bài đăng?",
      questionType: "TEXT",
      sourceSignal: "hidden_accessory",
      privacyLevel: "PRIVATE",
      reason: "Phụ kiện riêng là tín hiệu hỗ trợ xác minh tốt khi được giữ kín."
    }
  ];

  if (/(dien thoai|laptop|may tinh|tai nghe|airpod|dong ho|thiet bi|electronics)/.test(hints)) {
    suggestions.push(
      {
        prompt: "Bốn ký tự cuối của số serial hoặc mã thiết bị là gì?",
        questionType: "MASKED_SERIAL",
        sourceSignal: "serial_suffix",
        privacyLevel: "HIGHLY_PRIVATE",
        reason: "Chỉ đối chiếu phần cuối của serial và không công khai đáp án."
      },
      {
        prompt: "Thiết bị có hình nền, tên Bluetooth hoặc nội dung màn hình đặc trưng nào?",
        questionType: "TEXT",
        sourceSignal: "device_private_content",
        privacyLevel: "HIGHLY_PRIVATE",
        reason: "Thông tin cấu hình riêng giúp phân biệt các thiết bị cùng mẫu."
      }
    );
  }

  if (/(vi|bop|tui|wallet|bag)/.test(hints)) {
    suggestions.push({
      prompt: "Bên trong vật phẩm có loại giấy tờ, ngăn hoặc đồ vật riêng nào?",
      questionType: "TEXT",
      sourceSignal: "hidden_contents",
      privacyLevel: "HIGHLY_PRIVATE",
      reason: "Nội dung bên trong không nên xuất hiện ở bài đăng công khai."
    });
  }

  if (/(chia khoa|key|moc khoa)/.test(hints)) {
    suggestions.push({
      prompt: "Chùm chìa khóa có bao nhiêu chìa và móc khóa có đặc điểm gì?",
      questionType: "VISUAL_DETAIL",
      sourceSignal: "key_configuration",
      privacyLevel: "PRIVATE",
      reason: "Cấu hình chìa và móc khóa giúp nhận diện đúng vật thể cụ thể."
    });
  }

  return suggestions.slice(0, 5);
}

function normalizeAnswer(value: string) {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

export const verificationQuestionService = {
  async suggest(auth: AccessTokenPayload, postId: string) {
    const context = await verificationQuestionRepository.getPostContext(postId);
    if (!context) throw new HttpError(404, "Post not found");
    if (context.type !== "FOUND") throw new HttpError(422, "Verification questions are only available for FOUND posts");
    if (!canReview(auth, context.ownerId)) throw new HttpError(403, "You cannot manage verification questions for this post");
    return buildVerificationQuestionSuggestions(context);
  },

  async create(auth: AccessTokenPayload, postId: string, input: {
    prompt: string;
    questionType: VerificationQuestionType;
    sourceSignal: string;
    expectedAnswer: string;
    options?: string[];
    weight: number;
    privacyLevel: "PRIVATE" | "HIGHLY_PRIVATE";
    approved: boolean;
  }) {
    const context = await verificationQuestionRepository.getPostContext(postId);
    if (!context) throw new HttpError(404, "Post not found");
    if (context.type !== "FOUND") throw new HttpError(422, "Verification questions are only available for FOUND posts");
    if (!canReview(auth, context.ownerId)) throw new HttpError(403, "You cannot manage verification questions for this post");
    const expectedAnswer = normalizeAnswer(input.expectedAnswer);
    const publicText = normalizeText(`${context.title} ${context.description}`);
    if (expectedAnswer.length < 2) throw new HttpError(422, "Expected answer is too short");
    if (expectedAnswer.length >= 4 && publicText.includes(expectedAnswer)) {
      throw new HttpError(422, "Expected answer is already visible in the public post");
    }
    if (normalizeText(input.prompt).includes(expectedAnswer)) {
      throw new HttpError(422, "The question prompt must not contain the expected answer");
    }
    const options = input.questionType === "MULTIPLE_CHOICE"
      ? Array.from(new Set((input.options ?? []).map((option) => option.trim()).filter(Boolean)))
      : null;
    if (input.questionType === "MULTIPLE_CHOICE") {
      if (!options || options.length < 2 || options.length > 8) {
        throw new HttpError(422, "Multiple-choice questions require between 2 and 8 unique options");
      }
      if (!options.some((option) => normalizeAnswer(option) === expectedAnswer)) {
        throw new HttpError(422, "Expected answer must match one of the multiple-choice options");
      }
    }
    const question = await verificationQuestionRepository.create({
      id: randomUUID(),
      postId,
      prompt: input.prompt.trim(),
      questionType: input.questionType,
      sourceSignal: input.sourceSignal.trim(),
      expectedAnswerHash: await bcrypt.hash(expectedAnswer, 12),
      options,
      weight: input.weight,
      privacyLevel: input.privacyLevel,
      status: input.approved ? "APPROVED" : "DRAFT",
      actorId: auth.sub
    });
    await userRepository.createActivityLog({
      userId: auth.sub,
      action: input.approved ? "VERIFICATION_QUESTION_APPROVED" : "VERIFICATION_QUESTION_CREATED",
      entityType: "POST",
      entityId: postId,
      metadata: { questionId: question?.id, questionType: input.questionType, sourceSignal: input.sourceSignal }
    });
    metricsService.increment("lnfs_verification_questions_total", {
      status: input.approved ? "approved" : "draft",
      type: input.questionType.toLowerCase()
    });
    return question;
  },

  async listForPost(auth: AccessTokenPayload, postId: string) {
    const context = await verificationQuestionRepository.getPostContext(postId);
    if (!context) throw new HttpError(404, "Post not found");
    const questions = await verificationQuestionRepository.listForPost(postId);
    if (canReview(auth, context.ownerId)) return questions;
    return questions
      .filter((question) => question.status === "APPROVED")
      .map((question) => ({
        id: question.id,
        postId: question.postId,
        prompt: question.prompt,
        questionType: question.questionType,
        privacyLevel: question.privacyLevel,
        status: question.status,
        answered: false,
        approvedAt: question.approvedAt,
        createdAt: question.createdAt
      }));
  },

  async setStatus(auth: AccessTokenPayload, postId: string, questionId: string, status: "APPROVED" | "DISABLED") {
    const context = await verificationQuestionRepository.getPostContext(postId);
    if (!context) throw new HttpError(404, "Post not found");
    if (!canReview(auth, context.ownerId)) throw new HttpError(403, "You cannot manage verification questions for this post");
    const question = await verificationQuestionRepository.findById(questionId, false);
    if (!question || question.postId !== postId) throw new HttpError(404, "Verification question not found");
    const updated = await verificationQuestionRepository.setStatus(questionId, status, auth.sub);
    await userRepository.createActivityLog({
      userId: auth.sub,
      action: status === "APPROVED" ? "VERIFICATION_QUESTION_APPROVED" : "VERIFICATION_QUESTION_DISABLED",
      entityType: "POST",
      entityId: postId,
      metadata: { questionId }
    });
    metricsService.increment("lnfs_verification_question_status_total", { status: status.toLowerCase() });
    return updated;
  },

  async listForClaim(auth: AccessTokenPayload, claimId: string) {
    const detail = await claimRepository.findById(claimId);
    if (!detail) throw new HttpError(404, "Claim not found");
    const isClaimant = auth.sub === detail.claim.claimant.id;
    const isReviewer = canReview(auth, detail.claim.postOwnerId);
    if (!isClaimant && !isReviewer) throw new HttpError(403, "You cannot view verification questions for this claim");
    const questions = await verificationQuestionRepository.listForClaim(claimId);
    return questions.map((question) => ({
      ...question,
      answerMatches: isReviewer ? question.answerMatches : undefined
    }));
  },

  async answer(auth: AccessTokenPayload, claimId: string, questionId: string, answer: string) {
    const detail = await claimRepository.findById(claimId);
    if (!detail) throw new HttpError(404, "Claim not found");
    if (auth.sub !== detail.claim.claimant.id) throw new HttpError(403, "Only the claimant can answer verification questions");
    if (detail.claim.status !== "PENDING" && detail.claim.status !== "NEED_MORE_INFO") {
      throw new HttpError(409, "Verification answers are locked for this claim status");
    }
    const question = await verificationQuestionRepository.findAssignedQuestion(claimId, questionId, true);
    const expectedAnswerHash = question && "expectedAnswerHash" in question && typeof question.expectedAnswerHash === "string"
      ? question.expectedAnswerHash
      : null;
    if (!question || question.postId !== detail.claim.postId || !expectedAnswerHash) {
      throw new HttpError(404, "Assigned verification question not found");
    }
    const isMatch = await bcrypt.compare(normalizeAnswer(answer), expectedAnswerHash);
    const saveOutcome = await verificationQuestionRepository.saveAnswer({
      id: randomUUID(),
      claimId,
      questionId,
      answeredBy: auth.sub,
      isMatch
    });
    if (saveOutcome === "NOT_FOUND" || saveOutcome === "NOT_ASSIGNED") {
      throw new HttpError(404, "Assigned verification question not found");
    }
    if (saveOutcome === "NOT_ALLOWED") {
      throw new HttpError(403, "Only the claimant can answer verification questions");
    }
    if (saveOutcome === "CLAIM_LOCKED") {
      throw new HttpError(409, "Verification answers are locked for this claim status");
    }
    if (saveOutcome === "ATTEMPT_LIMIT") {
      throw new HttpError(429, "Verification answer attempt limit reached; Staff review is required");
    }
    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "CLAIM_VERIFICATION_ANSWERED",
      entityType: "CLAIM",
      entityId: claimId,
      metadata: { questionId }
    });
    metricsService.increment("lnfs_verification_question_answers_total", { result: isMatch ? "matched" : "not_matched" });
    return { submitted: true };
  },

  scoreForClaim(claimId: string) {
    return verificationQuestionRepository.scoreForClaim(claimId);
  },

  completionForClaim(claimId: string) {
    return verificationQuestionRepository.hasCompleteRequiredVerification(claimId);
  }
};
