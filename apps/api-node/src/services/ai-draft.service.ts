import { postRepository } from "../repositories/post.repository.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeText } from "../utils/normalize-text.js";
import type { AiDraftInput } from "../validators/ai-draft.validator.js";
import { assertImageFile, requireImageFile } from "./media.service.js";
import { visionService, type VisionResult } from "./vision.service.js";

const unsafeLikelihoods = new Set(["LIKELY", "VERY_LIKELY"]);

export function redactSensitiveOcr(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL REDACTED]")
    .replace(/(?:\+?84|0)(?:[ .-]?\d){8,10}/g, "[PHONE REDACTED]")
    .replace(/\b(?:SE|SS|DE|HE|IA|CE|GD|MC)\d{6,}\b/gi, "[STUDENT ID REDACTED]")
    .replace(/\b[A-Z0-9]+-[A-Z0-9-]{5,}\b/gi, "[CODE REDACTED]")
    .replace(/\b(?=[A-Z0-9-]{10,}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]{10,}\b/gi, "[CODE REDACTED]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function isUnsafe(result: VisionResult) {
  return Object.values(result.safeSearch ?? {}).some((value) => value && unsafeLikelihoods.has(value));
}

function humanTag(tag: string) {
  return tag.replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferredType(input: AiDraftInput) {
  if (input.type) return { value: input.type, reason: "Loại bài do người dùng chọn." };
  const text = normalizeText(`${input.text ?? ""} ${input.voiceTranscript ?? ""}`);
  if (/\b(mat|that lac|danh roi|lost)\b/.test(text)) return { value: "LOST" as const, reason: "Nội dung có tín hiệu báo mất." };
  if (/\b(nhat duoc|tim thay|found)\b/.test(text)) return { value: "FOUND" as const, reason: "Nội dung có tín hiệu đã nhặt được." };
  return { value: "FOUND" as const, reason: "Chưa đủ tín hiệu; chọn FOUND làm giá trị gợi ý và yêu cầu người dùng kiểm tra." };
}

export const aiDraftService = {
  async create(input: AiDraftInput, file: Express.Multer.File | undefined) {
    const image = requireImageFile(file, "image");
    await assertImageFile(image);
    try {
      const vision = await visionService.analyzeImageBuffer(image.buffer);
      if (vision.providerAvailable && isUnsafe(vision)) {
        throw new HttpError(422, "Image was rejected by Safe Search. Please choose a clear item photo.");
      }

      const type = inferredType(input);
      const visualTags = vision.tags
        .filter((tag) => tag.source !== "OCR" && tag.confidence >= 0.45)
        .slice(0, 8);
      const categoryCandidates = await postRepository.suggestCategoriesFromTags(
        vision.tags.map((tag) => tag.tag)
      );
      const objectLabel = visualTags[0]?.tag ? humanTag(visualTags[0].tag) : "vật phẩm";
      const userContext = [input.text, input.voiceTranscript].filter(Boolean).join(" ").trim();
      const redactedOcr = redactSensitiveOcr(vision.ocrText);
      const privacyWarnings: string[] = [];
      if (redactedOcr.includes("REDACTED")) privacyWarnings.push("OCR có dữ liệu định danh hoặc mã dài đã được che.");
      if (/qr|barcode|serial|student|email|phone/i.test(vision.ocrText)) {
        privacyWarnings.push("Hãy che QR, barcode, serial, email, số điện thoại và mã sinh viên trước khi công khai ảnh.");
      }

      const providerAvailable = vision.providerAvailable;
      return {
        draft: {
          type: type.value,
          title: `${type.value === "LOST" ? "Mất" : "Nhặt được"} ${objectLabel}`.slice(0, 255),
          description: (userContext || `Ghi nhận ${objectLabel.toLowerCase()}; cần người dùng bổ sung đặc điểm nhận dạng.`).slice(0, 2000),
          categoryCandidates,
          tags: visualTags,
          ocrText: redactedOcr,
          areaContext: input.areaContext ?? null,
          timeContext: input.timeContext ?? null,
          privacyWarnings,
          missingFields: [
            ...(categoryCandidates.length === 0 ? ["categoryId"] : []),
            ...(!input.areaContext ? ["areaId hoặc vị trí"] : []),
            ...(!input.timeContext ? ["lostFoundAt"] : []),
            "contactInfo",
            ...(type.value === "LOST" ? ["secretVerification"] : ["handoverPointId hoặc vị trí đang giữ"])
          ]
        },
        provider: {
          name: "Google Vision assisted OCR/tags",
          status: providerAvailable ? "AVAILABLE" : "FALLBACK",
          reason: vision.failureReason ?? null
        },
        explanations: [
          type.reason,
          providerAvailable
            ? `Tiêu đề dựa trên tag hình ảnh nổi bật: ${visualTags[0]?.tag ?? "không có tag đủ mạnh"}.`
            : "Google Vision không khả dụng; draft chỉ dùng nội dung người dùng và cần điền thủ công.",
          "OCR chỉ được trả về sau khi che mẫu dữ liệu nhạy cảm; OCR không tự được đưa vào mô tả công khai.",
          "Đây là AI-assisted draft. Người dùng phải sửa và xác nhận trước khi tạo bài."
        ]
      };
    } finally {
      image.buffer.fill(0);
    }
  }
};
