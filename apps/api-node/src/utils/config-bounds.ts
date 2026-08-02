import { HttpError } from "./http-error.js";

export interface NumericConfigBounds {
  min: number;
  max: number;
}

export const numericConfigBounds: Readonly<Record<string, NumericConfigBounds>> = Object.freeze({
  "ai.radar.minimum_observed_count": { min: 3, max: 50 },
  "ai.radar.minimum_z_score": { min: 1, max: 10 },
  "ai.radar.minimum_observed_ratio": { min: 1.1, max: 10 },
  "ai.visual_hunt.candidate_threshold": { min: 0, max: 1 }
});

export function assertConfigValueBounds(key: string, serializedValue: string) {
  const bounds = numericConfigBounds[key];
  if (!bounds) return;
  const value = Number(serializedValue);
  if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) {
    throw new HttpError(422, `Config ${key} must be between ${bounds.min} and ${bounds.max}`);
  }
}
