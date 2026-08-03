import { z } from "zod";

export const searchCompanionFieldSchema = z.enum([
  "primaryColor",
  "secondaryColor",
  "brand",
  "distinguishingMarks",
  "accessories",
  "lastSeenAt",
  "routeAreas",
  "partialSerial"
]);

export const searchCompanionAnswerSchema = z.object({
  field: searchCompanionFieldSchema,
  value: z.union([
    z.string().trim().min(1).max(500),
    z.array(z.string().trim().min(1).max(120)).min(1).max(10)
  ])
}).strict();

export const searchCompanionSkipSchema = z.object({
  field: searchCompanionFieldSchema
}).strict();

export type SearchCompanionField = z.infer<typeof searchCompanionFieldSchema>;
export type SearchCompanionAnswerInput = z.infer<typeof searchCompanionAnswerSchema>;
