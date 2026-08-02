import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export const visualHuntSearchSchema = z.object({
  targetType: z.preprocess(emptyToUndefined, z.enum(["LOST", "FOUND"]).optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  areaId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  maxResults: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(20).default(20))
});

export const visualHuntFeedbackSchema = z.object({
  postId: z.string().uuid(),
  decision: z.enum(["CANDIDATE", "NOT_RELEVANT"]),
  similarityScore: z.number().min(0).max(1).nullable().optional(),
  source: z.enum(["CAMERA", "IMAGE", "VIDEO_FRAMES", "BATCH_IMAGES"])
}).strict();

export type VisualHuntSearchInput = z.infer<typeof visualHuntSearchSchema>;
export type VisualHuntFeedbackInput = z.infer<typeof visualHuntFeedbackSchema>;
