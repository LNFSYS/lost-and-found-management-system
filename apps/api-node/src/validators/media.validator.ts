import { z } from "zod";

export const claimEvidenceBodySchema = z.object({
  evidenceType: z.enum(["OWNERSHIP_PROOF", "ADDITIONAL_DOC", "PHOTO"]).default("OWNERSHIP_PROOF"),
  description: z.string().trim().max(255).nullable().optional()
});

export type ClaimEvidenceBody = z.infer<typeof claimEvidenceBodySchema>;
