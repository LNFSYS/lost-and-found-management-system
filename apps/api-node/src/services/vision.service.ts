import { env } from "../config/env.js";
import { isConfigured } from "../utils/configured.js";
import { normalizeText } from "../utils/normalize-text.js";

type VisionSource = "VISION_LABEL" | "VISION_OBJECT" | "OCR";
type VisionLikelihood = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";

export interface VisionTag {
  tag: string;
  confidence: number;
  source: VisionSource;
}

export interface VisionResult {
  tags: VisionTag[];
  ocrText: string;
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

function fallback(): VisionResult {
  return {
    tags: [],
    ocrText: ""
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

export const visionService = {
  async analyzeImageUrl(imageUrl: string): Promise<VisionResult> {
    if (!isConfigured(env.google.visionApiKey)) {
      console.warn("Google Vision API key is not configured; returning empty AI tags.");
      return fallback();
    }

    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(env.google.visionApiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  source: {
                    imageUri: imageUrl
                  }
                },
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
        console.warn(`Google Vision API request failed with HTTP ${response.status}`);
        return fallback();
      }

      const payload = (await response.json()) as VisionAnnotateResponse;
      const result = payload.responses?.[0];
      if (!result || result.error) {
        console.warn(`Google Vision API returned an error: ${result?.error?.message ?? "unknown"}`);
        return fallback();
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
        safeSearch: result.safeSearchAnnotation
      };
    } catch (error) {
      console.warn(
        `Google Vision API failed; using fallback. ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return fallback();
    }
  }
};
