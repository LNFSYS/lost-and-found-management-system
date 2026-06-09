import { z } from "zod";

export const createClaimSchema = z.object({
  postId: z.string().uuid(),
  description: z.string().trim().max(2000).nullable().optional(),
  secretAnswer: z.string().trim().min(3).max(2000),
  approximateLostAt: z.string().datetime().nullable().optional(),
  approximateLocation: z.string().trim().min(2).max(255)
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
