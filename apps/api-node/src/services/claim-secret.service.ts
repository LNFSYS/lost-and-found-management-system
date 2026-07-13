import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { normalizeText } from "../utils/normalize-text.js";

export function containsPrivateOwnershipSignal(value: string) {
  const normalized = normalizeText(value);
  const patterns = [
    /\b(serial|imei|ma so|ma may|so seri|hoa don|receipt|bill|scratch|vet xuoc|phu kien|op lung|sticker)\b/,
    /\b[a-z]{2,}\d{3,}\b/,
    /\b\d{6,}\b/
  ];
  return patterns.some((pattern) => pattern.test(normalized));
}

export async function protectClaimSecret(secretAnswer: string) {
  const normalized = secretAnswer.trim();
  return {
    secretAnswerHash: await bcrypt.hash(normalized, env.bcryptSaltRounds),
    hasPrivateSignal: containsPrivateOwnershipSignal(normalized)
  };
}
