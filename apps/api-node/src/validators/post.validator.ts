import { z } from "zod";

const optionalUuid = z.string().uuid().nullable().optional();

export const postTypeSchema = z.enum(["LOST", "FOUND"]);
export const postStatusSchema = z.enum(["OPEN", "MATCHED", "RESOLVED", "CLOSED", "HIDDEN"]);

const postBaseSchema = z.object({
  type: postTypeSchema,
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10),
  categoryId: z.string().uuid(),
  areaId: optionalUuid,
  buildingId: optionalUuid,
  roomText: z.string().trim().max(100).nullable().optional(),
  customLocation: z.string().trim().max(255).nullable().optional(),
  contactInfo: z.string().trim().min(3).max(255).nullable().optional(),
  lostFoundAt: z.string().datetime().nullable().optional(),
  handoverPointId: optionalUuid,
  secretVerification: z.string().trim().min(3).max(2000).nullable().optional()
});

type BusinessRuleInput = {
  type: z.infer<typeof postTypeSchema>;
  areaId?: string | null;
  buildingId?: string | null;
  roomText?: string | null;
  customLocation?: string | null;
  contactInfo?: string | null;
  handoverPointId?: string | null;
  hasSecretVerification: boolean;
};

function applyPostBusinessRules(input: BusinessRuleInput, context: z.RefinementCtx) {
  const hasHoldingLocation = Boolean(
    input.handoverPointId ||
      input.roomText?.trim() ||
      input.buildingId ||
      input.areaId ||
      input.customLocation?.trim()
  );

  if (input.type === "FOUND" && !hasHoldingLocation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["handoverPointId"],
      message: "FOUND posts require a handover point or current holding location"
    });
  }

  if (!input.contactInfo?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contactInfo"],
      message: "Posts require contact information"
    });
  }

  if (input.type === "LOST" && !input.hasSecretVerification) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["secretVerification"],
      message: "LOST posts require secret verification information"
    });
  }
}

export const createPostSchema = postBaseSchema
  .superRefine((input, context) => {
    applyPostBusinessRules(
      { ...input, hasSecretVerification: Boolean(input.secretVerification?.trim()) },
      context
    );
  });

export const finalPostStateSchema = postBaseSchema
  .omit({ secretVerification: true })
  .extend({ hasSecretVerification: z.boolean() })
  .superRefine(applyPostBusinessRules);

export const updatePostSchema = postBaseSchema.partial();

export const updatePostStatusSchema = z.object({
  status: postStatusSchema
});

export const reportPostSchema = z.object({
  reason: z.string().trim().min(3).max(255),
  details: z.string().trim().max(2000).nullable().optional()
});

export const matchFeedbackSchema = z.object({
  label: z.enum(["TRUE_MATCH", "FALSE_MATCH", "UNCERTAIN", "DUPLICATE", "INSUFFICIENT_EVIDENCE"]),
  note: z.string().trim().max(500).nullable().optional()
});

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(255).optional(),
  type: postTypeSchema.optional(),
  status: z.enum(["OPEN", "MATCHED", "RESOLVED", "CLOSED", "EXPIRED", "HIDDEN"]).optional(),
  categoryId: z.string().uuid().optional(),
  categoryIds: z.preprocess(
    (value) => (typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value),
    z.array(z.string().uuid()).min(1).max(10).optional()
  ),
  areaId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(["latest", "oldest", "highest_match"]).default("latest")
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type FinalPostState = z.infer<typeof finalPostStateSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type UpdatePostStatusInput = z.infer<typeof updatePostStatusSchema>;
export type ReportPostInput = z.infer<typeof reportPostSchema>;
export type MatchFeedbackInput = z.infer<typeof matchFeedbackSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
