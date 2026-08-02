import { normalizeText } from "./normalize-text.js";

const REDACTION_MARKER = "[redacted]";

export function redactPii(value: string) {
  return value
    .replace(/https?:\/\/\S+|www\.\S+/gi, REDACTION_MARKER)
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, REDACTION_MARKER)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, REDACTION_MARKER)
    .replace(/(?:\+?84|0)(?:[\s.-]?\d){8,10}\b/g, REDACTION_MARKER)
    .replace(/\b[a-z]{2,5}[\s._-]?\d{4,12}\b/gi, REDACTION_MARKER)
    .replace(/\b\d{6,}\b/g, REDACTION_MARKER);
}

export function redactedOcrTokens(value: string, limit = 40) {
  return Array.from(
    new Set(
      normalizeText(redactPii(value))
        .split(/\s+/)
        .map((token) => token.replace(/[^a-z0-9]/g, ""))
        .filter((token) => token.length >= 3 && token !== "redacted")
    )
  ).slice(0, Math.max(0, limit));
}
