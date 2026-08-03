import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { postRepository } from "../repositories/post.repository.js";
import { searchCompanionRepository, type LostSearchProfile } from "../repositories/search-companion.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { HttpError } from "../utils/http-error.js";
import type { SearchCompanionAnswerInput, SearchCompanionField } from "../validators/search-companion.validator.js";
import { matchingService } from "./matching.service.js";
import { postService, redactPrivateFound } from "./post.service.js";

const questionDefinitions: Array<{
  field: SearchCompanionField;
  prompt: string;
  help: string;
  sensitive?: boolean;
}> = [
  { field: "primaryColor", prompt: "Vật phẩm có màu chính là gì?", help: "Ví dụ: đen, trắng, xanh đậm." },
  { field: "secondaryColor", prompt: "Vật phẩm có màu phụ hoặc họa tiết nào không?", help: "Có thể bỏ qua nếu chỉ có một màu." },
  { field: "brand", prompt: "Bạn có nhớ thương hiệu hoặc dòng sản phẩm không?", help: "Chỉ nhập thông tin bạn chắc chắn." },
  { field: "distinguishingMarks", prompt: "Có vết xước hoặc dấu hiệu riêng nào không?", help: "Thông tin này được giữ riêng để hỗ trợ đối chiếu.", sensitive: true },
  { field: "accessories", prompt: "Có phụ kiện nào đi kèm không?", help: "Ví dụ: ốp, móc khóa, dây đeo hoặc hộp." },
  { field: "lastSeenAt", prompt: "Bạn nhớ lần cuối nhìn thấy vật phẩm lúc nào?", help: "Nhập thời gian gần đúng nếu không nhớ chính xác." },
  { field: "routeAreas", prompt: "Trước khi phát hiện mất, bạn đã đi qua khu vực nào?", help: "Có thể nhập tối đa 10 khu vực theo thứ tự." },
  { field: "partialSerial", prompt: "Bạn có nhớ bốn ký tự cuối serial hoặc mã riêng không?", help: "Chỉ lưu tối đa bốn ký tự cuối và không công khai.", sensitive: true }
];

type Answers = LostSearchProfile["answers"];

function normalizeAnswer(input: SearchCompanionAnswerInput) {
  if (input.field === "routeAreas") {
    const values = Array.isArray(input.value) ? input.value : input.value.split(/[,;>]/);
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, 10);
  }
  const value = Array.isArray(input.value) ? input.value.join(", ") : input.value.trim();
  if (input.field === "partialSerial") {
    return value.replace(/[^a-zA-Z0-9]/g, "").slice(-4);
  }
  return value.slice(0, input.field === "distinguishingMarks" ? 300 : 500);
}

function supplementalText(answers: Answers) {
  return Object.entries(answers)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(" ") : value}`)
    .join(" ");
}

function publicSupplement(answers: Answers) {
  const labels: Partial<Record<SearchCompanionField, string>> = {
    primaryColor: "Màu chính",
    secondaryColor: "Màu phụ/họa tiết",
    brand: "Thương hiệu",
    routeAreas: "Tuyến đã đi qua"
  };
  return Object.entries(labels).flatMap(([field, label]) => {
    const value = answers[field as SearchCompanionField];
    return value ? [`${label}: ${Array.isArray(value) ? value.join(", ") : value}`] : [];
  });
}

function profileState(post: Awaited<ReturnType<typeof postRepository.findById>>, profile: LostSearchProfile | null) {
  const answers = profile?.answers ?? {};
  const skippedFields = profile?.skippedFields ?? [];
  const completed = new Set<SearchCompanionField>([
    ...Object.keys(answers) as SearchCompanionField[],
    ...skippedFields,
    ...(post?.lostFoundAt ? ["lastSeenAt" as const] : [])
  ]);
  const questions = questionDefinitions.map((question) => ({
    ...question,
    answered: Object.prototype.hasOwnProperty.call(answers, question.field),
    skipped: skippedFields.includes(question.field)
  }));
  return {
    profile: {
      answers,
      skippedFields,
      revision: profile?.revision ?? 0,
      appliedRevision: profile?.appliedRevision ?? 0,
      updatedAt: profile?.updatedAt ?? null
    },
    questions,
    nextQuestion: questions.find((question) => !completed.has(question.field)) ?? null,
    completionPercent: Math.round((completed.size / questionDefinitions.length) * 100)
  };
}

async function requireOwnedActiveLost(auth: AccessTokenPayload, postId: string) {
  const post = await postRepository.findById(postId);
  if (!post || post.type !== "LOST") throw new HttpError(404, "Active LOST post not found");
  if (post.userId !== auth.sub) throw new HttpError(403, "Only the LOST post owner can use Search Companion");
  if (!(["OPEN", "MATCHED"] as string[]).includes(post.status)) {
    throw new HttpError(409, "Search Companion is available only while the LOST post is active");
  }
  return post;
}

export const searchCompanionService = {
  async get(auth: AccessTokenPayload, postId: string) {
    const post = await requireOwnedActiveLost(auth, postId);
    const profile = await searchCompanionRepository.findByPost(postId);
    return profileState(post, profile);
  },

  async answer(auth: AccessTokenPayload, postId: string, input: SearchCompanionAnswerInput) {
    const post = await requireOwnedActiveLost(auth, postId);
    const current = await searchCompanionRepository.findByPost(postId);
    const value = normalizeAnswer(input);
    if ((typeof value === "string" && !value) || (Array.isArray(value) && value.length === 0)) {
      throw new HttpError(422, "Search Companion answer cannot be empty");
    }
    const answers = { ...(current?.answers ?? {}), [input.field]: value };
    const skippedFields = (current?.skippedFields ?? []).filter((field) => field !== input.field);
    const profile = await searchCompanionRepository.saveAnswer({ postId, ownerId: auth.sub, answers, skippedFields });
    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "SEARCH_COMPANION_ANSWERED",
      entityType: "POST",
      entityId: postId,
      metadata: { field: input.field, revision: profile?.revision ?? null }
    });
    return profileState(post, profile);
  },

  async skip(auth: AccessTokenPayload, postId: string, field: SearchCompanionField) {
    const post = await requireOwnedActiveLost(auth, postId);
    const current = await searchCompanionRepository.findByPost(postId);
    const answers = { ...(current?.answers ?? {}) };
    delete answers[field];
    const skippedFields = Array.from(new Set([...(current?.skippedFields ?? []), field]));
    const profile = await searchCompanionRepository.saveAnswer({ postId, ownerId: auth.sub, answers, skippedFields });
    return profileState(post, profile);
  },

  async undo(auth: AccessTokenPayload, postId: string) {
    const post = await requireOwnedActiveLost(auth, postId);
    const current = await searchCompanionRepository.findByPost(postId);
    const fields = Object.keys(current?.answers ?? {}) as SearchCompanionField[];
    const field = fields.at(-1);
    if (!current || !field) throw new HttpError(409, "There is no Search Companion answer to undo");
    const answers = { ...current.answers };
    delete answers[field];
    const profile = await searchCompanionRepository.saveAnswer({
      postId,
      ownerId: auth.sub,
      answers,
      skippedFields: current.skippedFields.filter((item) => item !== field)
    });
    return profileState(post, profile);
  },

  async recalculate(auth: AccessTokenPayload, postId: string) {
    await requireOwnedActiveLost(auth, postId);
    const profile = await searchCompanionRepository.findByPost(postId);
    const previews = await matchingService.previewForLostPost(postId, supplementalText(profile?.answers ?? {}));
    const candidates = await postRepository.findByIds(previews.map((preview) => preview.candidateId));
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, redactPrivateFound(candidate, auth)]));
    return {
      advisory: "Điểm chỉ hỗ trợ sắp xếp ứng viên; human review required và không có trạng thái nào được tự động thay đổi.",
      candidates: previews.flatMap((preview) => {
        const candidate = candidateById.get(preview.candidateId);
        return candidate ? [{ ...preview, candidate }] : [];
      })
    };
  },

  async apply(auth: AccessTokenPayload, postId: string) {
    const post = await requireOwnedActiveLost(auth, postId);
    const profile = await searchCompanionRepository.findByPost(postId);
    if (!profile || profile.revision <= profile.appliedRevision) {
      throw new HttpError(409, "There is no new Search Companion information to apply");
    }
    const lines = publicSupplement(profile.answers);
    if (lines.length === 0) {
      throw new HttpError(422, "Only private answers are available; nothing safe can be applied publicly");
    }
    const marker = "[Thông tin bổ sung từ Search Companion]";
    const baseDescription = post.description.split(marker)[0].trimEnd();
    const updated = await postService.updatePost(auth, postId, {
      description: `${baseDescription}\n\n${marker}\n${lines.join("\n")}`
    });
    await searchCompanionRepository.markApplied(postId, profile.revision);
    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "SEARCH_COMPANION_APPLIED",
      entityType: "POST",
      entityId: postId,
      metadata: { revision: profile.revision, publicFieldCount: lines.length }
    });
    return { post: updated, privateAnswersRemainPrivate: true };
  }
};

export const searchCompanionInternals = { normalizeAnswer, supplementalText, publicSupplement, profileState };
