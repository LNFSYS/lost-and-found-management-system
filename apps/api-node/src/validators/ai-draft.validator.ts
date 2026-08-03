import { z } from "zod";

const emptyToUndefined = (value: unknown) => typeof value === "string" && value.trim() === "" ? undefined : value;

export const aiDraftSchema = z.object({
  text: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  voiceTranscript: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  type: z.preprocess(emptyToUndefined, z.enum(["LOST", "FOUND"]).optional()),
  areaContext: z.preprocess(emptyToUndefined, z.string().trim().max(255).optional()),
  timeContext: z.preprocess(emptyToUndefined, z.string().datetime().optional())
});

export type AiDraftInput = z.infer<typeof aiDraftSchema>;
