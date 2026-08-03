import { z } from "zod";
import { createPostSchema } from "./post.validator.js";

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export const finderQuickScanSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(100),
  categoryId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  areaId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  maxResults: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(10).default(5)),
  source: z.preprocess(emptyToUndefined, z.enum(["CAMERA", "IMAGE", "SAMPLE"]).default("IMAGE"))
}).strict();

export const finderDraftSchema = z.object({
  selectedLostPostId: z.string().uuid().nullable().optional()
}).strict();

export const finderPublishSchema = createPostSchema.refine((input) => input.type === "FOUND", {
  message: "Finder Quick Scan can publish only FOUND posts",
  path: ["type"]
});

export type FinderQuickScanInput = z.infer<typeof finderQuickScanSchema>;
export type FinderPublishInput = z.infer<typeof finderPublishSchema>;
