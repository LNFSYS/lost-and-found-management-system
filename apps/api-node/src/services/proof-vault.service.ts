import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { proofVaultRepository } from "../repositories/proof-vault.repository.js";
import { claimRepository } from "../repositories/claim.repository.js";
import { HttpError } from "../utils/http-error.js";
import type { CreatePrivateProofInput, UpdatePrivateProofInput } from "../validators/proof-vault.validator.js";
import { cloudinaryService } from "./cloudinary.service.js";
import { assertImageFile, requireImageFile } from "./media.service.js";

function nullableTrim(value: string | null | undefined) {
  return value?.trim() || null;
}

function maskValue(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.length <= 4) return "••••";
  return `${"•".repeat(Math.min(8, normalized.length - 4))}${normalized.slice(-4)}`;
}

function canReviewAttached(auth: AccessTokenPayload, row: { claimant_id: string; post_owner_id: string }) {
  return auth.sub === row.claimant_id || auth.sub === row.post_owner_id || auth.roles.includes("STAFF") || auth.roles.includes("ADMIN");
}

export const proofVaultService = {
  list(auth: AccessTokenPayload) {
    return proofVaultRepository.listForOwner(auth.sub);
  },

  async create(auth: AccessTokenPayload, input: CreatePrivateProofInput) {
    const secretValueHash = input.secretValue ? await bcrypt.hash(input.secretValue, env.bcryptSaltRounds) : null;
    const proof = await proofVaultRepository.create({
      id: randomUUID(),
      ownerId: auth.sub,
      itemName: input.itemName.trim(),
      proofType: input.proofType,
      privateDescription: nullableTrim(input.privateDescription),
      maskedValue: maskValue(input.displayValue ?? input.secretValue),
      secretValueHash
    });
    if (!proof) throw new HttpError(500, "Unable to create private proof");
    return proof;
  },

  async update(auth: AccessTokenPayload, proofId: string, input: UpdatePrivateProofInput) {
    const current = await proofVaultRepository.findOwned(proofId, auth.sub);
    if (!current) throw new HttpError(404, "Private proof not found");
    if (current.status !== "ACTIVE") throw new HttpError(409, "Archived proof cannot be edited");
    const updates: Record<string, string | null> = {};
    if (input.itemName !== undefined) updates.itemName = input.itemName.trim();
    if (input.proofType !== undefined) updates.proofType = input.proofType;
    if (input.privateDescription !== undefined) updates.privateDescription = nullableTrim(input.privateDescription);
    if (input.displayValue !== undefined) updates.maskedValue = maskValue(input.displayValue);
    if (input.secretValue !== undefined) {
      updates.secretValueHash = input.secretValue ? await bcrypt.hash(input.secretValue, env.bcryptSaltRounds) : null;
      if (input.displayValue === undefined) updates.maskedValue = maskValue(input.secretValue);
    }
    const proof = await proofVaultRepository.update(proofId, auth.sub, updates);
    if (!proof) throw new HttpError(409, "Private proof changed; refresh before continuing");
    return proof;
  },

  async archive(auth: AccessTokenPayload, proofId: string) {
    if (!(await proofVaultRepository.archive(proofId, auth.sub))) throw new HttpError(404, "Active private proof not found");
    return { archived: true };
  },

  async uploadMedia(auth: AccessTokenPayload, proofId: string, file: Express.Multer.File | undefined) {
    const proof = await proofVaultRepository.findOwned(proofId, auth.sub);
    if (!proof || proof.status !== "ACTIVE") throw new HttpError(404, "Active private proof not found");
    const image = requireImageFile(file, "media");
    await assertImageFile(image);
    const uploaded = await cloudinaryService.uploadImage(image.buffer, `lnfs/private/proof-vault/${auth.sub}/${proofId}`);
    const updated = await proofVaultRepository.setMedia(proofId, auth.sub, {
      secureUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      format: uploaded.format ?? null
    });
    if (!updated) {
      await cloudinaryService.deleteAsset(uploaded.publicId);
      throw new HttpError(409, "Private proof changed; refresh before continuing");
    }
    if (proof.media_public_id) await cloudinaryService.deleteAsset(proof.media_public_id);
    return updated;
  },

  async ownMedia(auth: AccessTokenPayload, proofId: string) {
    const proof = await proofVaultRepository.findOwned(proofId, auth.sub);
    if (!proof?.media_secure_url) throw new HttpError(404, "Private proof media not found");
    return proof.media_secure_url;
  },

  async attach(auth: AccessTokenPayload, claimId: string, proofId: string) {
    const result = await proofVaultRepository.attachToClaim({ claimId, proofId, userId: auth.sub });
    if (result.outcome === "FORBIDDEN") throw new HttpError(403, "Only the claimant can attach a private proof");
    if (result.outcome === "CLAIM_NOT_FOUND" || result.outcome === "PROOF_NOT_FOUND") throw new HttpError(404, "Claim or private proof not found");
    if (result.outcome === "CLAIM_CLOSED" || result.outcome === "PROOF_ARCHIVED") throw new HttpError(409, "Claim or private proof is no longer editable");
    return { attached: true };
  },

  async detach(auth: AccessTokenPayload, claimId: string, proofId: string) {
    if (!(await proofVaultRepository.detachFromClaim(claimId, proofId, auth.sub))) {
      throw new HttpError(404, "Attached private proof not found or claim is no longer editable");
    }
    return { detached: true };
  },

  async listAttached(auth: AccessTokenPayload, claimId: string) {
    const claimDetail = await claimRepository.findById(claimId);
    if (!claimDetail) throw new HttpError(404, "Claim not found");
    if (!canReviewAttached(auth, {
      claimant_id: claimDetail.claim.claimant.id,
      post_owner_id: claimDetail.claim.postOwnerId
    })) {
      throw new HttpError(403, "You cannot view private proofs for this claim");
    }
    const rows = await proofVaultRepository.listAttached(claimId);
    if (rows.length === 0) return [];
    return rows.map((row) => ({
      id: row.proof_id,
      itemName: row.item_name_snapshot,
      proofType: row.proof_type_snapshot,
      privateDescription: row.private_description_snapshot,
      maskedValue: row.masked_value_snapshot,
      hasMedia: Boolean(row.media_public_id),
      mediaPath: row.media_public_id ? `/api/claims/${claimId}/proof-vault/${row.proof_id}/media` : null,
      attachedAt: row.attached_at
    }));
  },

  async attachedMedia(auth: AccessTokenPayload, claimId: string, proofId: string) {
    const rows = await proofVaultRepository.listAttached(claimId);
    const row = rows.find((item) => item.proof_id === proofId);
    if (!row?.media_secure_url) throw new HttpError(404, "Attached private proof media not found");
    if (!canReviewAttached(auth, row)) throw new HttpError(403, "You cannot view this private proof media");
    return row.media_secure_url;
  }
};
