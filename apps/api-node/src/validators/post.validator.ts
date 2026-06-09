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

export const createPostSchema = postBaseSchema
  .superRefine((input, context) => {
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

    if (input.type === "LOST" && !input.secretVerification) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secretVerification"],
        message: "LOST posts require secret verification information"
      });
    }
  });

export const updatePostSchema = postBaseSchema.partial();

export const updatePostStatusSchema = z.object({
  status: postStatusSchema
});

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(255).optional(),
  type: postTypeSchema.optional(),
  status: z.enum(["OPEN", "MATCHED", "RESOLVED", "CLOSED", "EXPIRED", "HIDDEN"]).optional(),
  categoryId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(["latest", "oldest", "highest_match"]).default("latest")
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type UpdatePostStatusInput = z.infer<typeof updatePostStatusSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
