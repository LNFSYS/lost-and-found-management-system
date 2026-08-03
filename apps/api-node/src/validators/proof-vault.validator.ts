import { z } from "zod";

export const proofTypeSchema = z.enum([
  "PURCHASE_RECEIPT",
  "PRE_LOSS_IMAGE",
  "SERIAL_SUFFIX",
  "UNIQUE_MARK",
  "ACCESSORY",
  "OWNERSHIP_NOTE"
]);

export const createPrivateProofSchema = z.object({
  itemName: z.string().trim().min(2).max(255),
  proofType: proofTypeSchema,
  privateDescription: z.string().trim().max(2000).nullable().optional(),
  displayValue: z.string().trim().max(255).nullable().optional(),
  secretValue: z.string().trim().min(3).max(500).nullable().optional()
});

export const updatePrivateProofSchema = createPrivateProofSchema.partial();

export type CreatePrivateProofInput = z.infer<typeof createPrivateProofSchema>;
export type UpdatePrivateProofInput = z.infer<typeof updatePrivateProofSchema>;
