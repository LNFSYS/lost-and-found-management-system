import { randomUUID } from "node:crypto";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { toPublicUser } from "../models/user.model.js";
import { claimRepository } from "../repositories/claim.repository.js";
import { postRepository } from "../repositories/post.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { HttpError } from "../utils/http-error.js";
import type { ClaimEvidenceBody } from "../validators/media.validator.js";
import { cloudinaryService } from "./cloudinary.service.js";
import { matchingService } from "./matching.service.js";
import { visionService } from "./vision.service.js";

const mimeToFormat = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function assertPostOwnerOrAdmin(auth: AccessTokenPayload, ownerId: string) {
  if (auth.sub !== ownerId && !auth.roles.includes("ADMIN")) {
    throw new HttpError(403, "You do not have permission to manage this post media");
  }
}

function canViewClaim(auth: AccessTokenPayload, claim: { claimant: { id: string }; postOwnerId: string }) {
  return (
    auth.sub === claim.claimant.id ||
    auth.sub === claim.postOwnerId ||
    auth.roles.includes("STAFF") ||
    auth.roles.includes("ADMIN")
  );
}

async function assertImageFile(file: Express.Multer.File) {
  const format = mimeToFormat.get(file.mimetype);
  if (!format) {
    throw new HttpError(422, "Only JPG, PNG and WEBP images are allowed");
  }

  const allowedFormats = (await postRepository.getConfigString("post.allowed_image_formats", "jpg,png,webp"))
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedFormats.includes(format)) {
    throw new HttpError(422, `Image format ${format} is not allowed by current config`);
  }

  const maxImageSizeMb = await postRepository.getConfigNumber("post.max_image_size_mb", 10);
  const maxBytes = maxImageSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new HttpError(422, `Image size exceeds ${maxImageSizeMb} MB`);
  }
}

function requireFile(file: Express.Multer.File | undefined, fieldName: string) {
  if (!file) {
    throw new HttpError(400, `Missing uploaded file field: ${fieldName}`);
  }

  return file;
}

export interface PostMediaUpload {
  file: Express.Multer.File;
  mediaKind: "ITEM" | "EVIDENCE";
}

export const mediaService = {
  async uploadAvatar(auth: AccessTokenPayload, file: Express.Multer.File | undefined) {
    const image = requireFile(file, "avatar");
    await assertImageFile(image);

    const currentUser = await userRepository.findById(auth.sub);
    if (!currentUser) {
      throw new HttpError(401, "Invalid token user");
    }

    const uploaded = await cloudinaryService.uploadImage(image.buffer, `lnfs/avatars/${auth.sub}`);
    const user = await userRepository.updateAvatar(auth.sub, uploaded.secureUrl, uploaded.publicId);

    if (currentUser.avatarPublicId) {
      await cloudinaryService.deleteAsset(currentUser.avatarPublicId);
    }
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "AVATAR_UPLOADED",
      entityType: "USER",
      entityId: auth.sub
    });

    return { user: toPublicUser(user) };
  },

  async uploadPostMedia(auth: AccessTokenPayload, postId: string, uploads: PostMediaUpload[]) {
    if (uploads.length === 0) {
      throw new HttpError(400, "Missing uploaded image files");
    }

    const post = await postRepository.findOwnerAndStatus(postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }
    assertPostOwnerOrAdmin(auth, post.user_id);

    const maxImages = await postRepository.getConfigNumber("post.max_images", 5);
    const existingCount = await postRepository.countMedia(postId);
    if (existingCount + uploads.length > maxImages) {
      throw new HttpError(422, `A post can have at most ${maxImages} images`);
    }

    const uploadedMedia = [];
    const ai = [];
    for (const [index, upload] of uploads.entries()) {
      const file = upload.file;
      await assertImageFile(file);
      const uploaded = await cloudinaryService.uploadImage(file.buffer, `lnfs/posts/${postId}`);
      const mediaId = randomUUID();
      await postRepository.createMedia({
        id: mediaId,
        postId,
        secureUrl: uploaded.secureUrl,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
        mediaKind: upload.mediaKind,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        sortOrder: existingCount + index
      });
      uploadedMedia.push({ id: mediaId, mediaKind: upload.mediaKind, ...uploaded });

      if (upload.mediaKind === "ITEM") {
        const vision = await visionService.analyzeImageUrl(uploaded.secureUrl);
        if (vision.tags.length > 0) {
          await postRepository.createAiTags(postId, vision.tags);
        }
        const suggestedCategories = await postRepository.suggestCategoriesFromTags(vision.tags.map((tag) => tag.tag));
        ai.push({
          mediaId,
          tags: vision.tags,
          ocrText: vision.ocrText,
          safeSearch: vision.safeSearch,
          suggestedCategories
        });
      }
    }

    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "POST_MEDIA_UPLOADED",
      entityType: "POST",
      entityId: postId,
      metadata: {
        count: uploadedMedia.length,
        itemImages: uploads.filter((upload) => upload.mediaKind === "ITEM").length,
        evidenceImages: uploads.filter((upload) => upload.mediaKind === "EVIDENCE").length
      }
    });

    try {
      const matches = await matchingService.runForPost(postId);
      const matchSuggestions = post.type === "LOST" ? await matchingService.buildSuggestions(postId, matches) : [];
      return { media: uploadedMedia, ai, matchSuggestions };
    } catch (error: unknown) {
      console.warn(`Post matching failed after media upload: ${error instanceof Error ? error.message : "unknown error"}`);
      return { media: uploadedMedia, ai, matchSuggestions: [] };
    }
  },

  async deletePostMedia(auth: AccessTokenPayload, postId: string, mediaId: string) {
    const media = await postRepository.findMediaOwner(postId, mediaId);
    if (!media) {
      throw new HttpError(404, "Post media not found");
    }
    assertPostOwnerOrAdmin(auth, media.user_id);

    await cloudinaryService.deleteAsset(media.public_id);
    await postRepository.deleteMedia(mediaId);

    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "POST_MEDIA_DELETED",
      entityType: "POST",
      entityId: postId
    });

    return { deleted: true };
  },

  async uploadClaimEvidence(
    auth: AccessTokenPayload,
    claimId: string,
    file: Express.Multer.File | undefined,
    body: ClaimEvidenceBody
  ) {
    const image = requireFile(file, "evidence");
    await assertImageFile(image);

    const currentClaim = await claimRepository.findById(claimId);
    if (!currentClaim) {
      throw new HttpError(404, "Claim not found");
    }
    if (!canViewClaim(auth, currentClaim.claim)) {
      throw new HttpError(403, "You do not have permission to upload evidence for this claim");
    }

    const uploaded = await cloudinaryService.uploadImage(image.buffer, `lnfs/private/claims/${claimId}`);
    const result = await claimRepository.createEvidence({
      id: randomUUID(),
      claimId,
      secureUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      evidenceType: body.evidenceType,
      description: body.description?.trim() ?? null
    });

    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "CLAIM_EVIDENCE_UPLOADED",
      entityType: "CLAIM",
      entityId: claimId
    });

    return result;
  }
};
