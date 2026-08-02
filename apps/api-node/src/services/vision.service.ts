import { env } from "../config/env.js";
import { isConfigured } from "../utils/configured.js";
import { normalizeText } from "../utils/normalize-text.js";

type VisionSource = "VISION_LABEL" | "VISION_OBJECT" | "OCR";
type VisionLikelihood = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";
export type VisionFailureReason =
  | "NOT_CONFIGURED"
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "PROVIDER_ERROR"
  | "NETWORK_ERROR";

export interface VisionTag {
  tag: string;
  confidence: number;
  source: VisionSource;
}

export interface VisionResult {
  tags: VisionTag[];
  ocrText: string;
  providerAvailable: boolean;
  failureReason?: VisionFailureReason;
  safeSearch?: {
    adult?: VisionLikelihood;
    spoof?: VisionLikelihood;
    medical?: VisionLikelihood;
    violence?: VisionLikelihood;
    racy?: VisionLikelihood;
  };
}

interface VisionLabelAnnotation {
  description?: string;
  score?: number;
}

interface VisionObjectAnnotation {
  name?: string;
  score?: number;
}

interface VisionTextAnnotation {
  description?: string;
}

interface VisionSafeSearchAnnotation {
  adult?: VisionLikelihood;
  spoof?: VisionLikelihood;
  medical?: VisionLikelihood;
  violence?: VisionLikelihood;
  racy?: VisionLikelihood;
}

interface VisionAnnotateResponse {
  responses?: Array<{
    labelAnnotations?: VisionLabelAnnotation[];
    localizedObjectAnnotations?: VisionObjectAnnotation[];
    textAnnotations?: VisionTextAnnotation[];
    safeSearchAnnotation?: VisionSafeSearchAnnotation;
    error?: {
      message?: string;
    };
  }>;
}

const VISION_REQUEST_TIMEOUT_MS = 8_000;

function fallback(failureReason: VisionFailureReason): VisionResult {
  return {
    tags: [],
    ocrText: "",
    providerAvailable: false,
    failureReason
  };
}

function uniqueTags(tags: VisionTag[]) {
  const seen = new Set<string>();
  const result: VisionTag[] = [];

  for (const tag of tags) {
    const key = `${tag.source}:${tag.tag}`;
    if (seen.has(key) || tag.tag.length === 0) {
      continue;
    }
    seen.add(key);
    result.push(tag);
  }

  return result;
}

function ocrTags(ocrText: string): VisionTag[] {
  return normalizeText(ocrText)
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .slice(0, 20)
    .map((tag) => ({
      tag,
      confidence: 0.7,
      source: "OCR" as const
    }));
}

type VisionImage =
  | { source: { imageUri: string } }
  | { content: string };

interface VisionHttpErrorPayload {
  error?: {
    status?: unknown;
    message?: unknown;
    details?: Array<{ reason?: unknown }>;
  };
}

async function visionHttpErrorSummary(response: Response) {
  const payload = await response.json().catch(() => null) as VisionHttpErrorPayload | null;
  const providerStatus = typeof payload?.error?.status === "string" ? payload.error.status : "UNKNOWN";
  const reason = payload?.error?.details
    ?.map((detail) => detail.reason)
    .find((value): value is string => typeof value === "string") ?? "UNKNOWN";
  const rawMessage = typeof payload?.error?.message === "string" ? payload.error.message : "No provider message";
  const message = (env.google.visionApiKey
    ? rawMessage.replaceAll(env.google.visionApiKey, "[REDACTED]")
    : rawMessage).replace(/\s+/g, " ").slice(0, 300);
  return { providerStatus, reason, message };
}

async function analyzeImage(image: VisionImage): Promise<VisionResult> {
  if (!isConfigured(env.google.visionApiKey)) {
    console.warn("Google Vision API key is not configured; returning empty AI tags.");
    return fallback("NOT_CONFIGURED");
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), VISION_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(env.google.visionApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: abortController.signal,
        body: JSON.stringify({
          requests: [
            {
              image,
              features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "OBJECT_LOCALIZATION", maxResults: 10 },
                { type: "TEXT_DETECTION", maxResults: 5 },
                { type: "SAFE_SEARCH_DETECTION", maxResults: 1 }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const error = await visionHttpErrorSummary(response);
      console.warn(
        `Google Vision API request failed with HTTP ${response.status}; status=${error.providerStatus}; reason=${error.reason}; message=${error.message}`
      );
      return fallback("HTTP_ERROR");
    }

    const payload = (await response.json()) as VisionAnnotateResponse;
    const result = payload.responses?.[0];
    if (!result || result.error) {
      console.warn(`Google Vision API returned an error: ${result?.error?.message ?? "unknown"}`);
      return fallback("PROVIDER_ERROR");
    }

    const ocrText = result.textAnnotations?.[0]?.description ?? "";
    const labelTags =
      result.labelAnnotations?.map((label) => ({
        tag: normalizeText(label.description ?? ""),
        confidence: label.score ?? 0,
        source: "VISION_LABEL" as const
      })) ?? [];
    const objectTags =
      result.localizedObjectAnnotations?.map((object) => ({
        tag: normalizeText(object.name ?? ""),
        confidence: object.score ?? 0,
        source: "VISION_OBJECT" as const
      })) ?? [];

    return {
      tags: uniqueTags([...labelTags, ...objectTags, ...ocrTags(ocrText)]),
      ocrText,
      providerAvailable: true,
      safeSearch: result.safeSearchAnnotation
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    console.warn(
      `Google Vision API failed; using fallback. ${timedOut ? "Request timed out" : error instanceof Error ? error.message : "Unknown error"}`
    );
    return fallback(timedOut ? "TIMEOUT" : "NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}

export const visionService = {
  analyzeImageUrl(imageUrl: string) {
    return analyzeImage({ source: { imageUri: imageUrl } });
  },

  analyzeImageBuffer(imageBuffer: Buffer) {
    return analyzeImage({ content: imageBuffer.toString("base64") });
  }
};
