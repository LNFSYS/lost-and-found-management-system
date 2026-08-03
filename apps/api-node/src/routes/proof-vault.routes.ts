import { Router } from "express";
import { proofVaultController } from "../controllers/proof-vault.controller.js";
import { requireFeatureFlag } from "../middlewares/feature-flag.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";

export const proofVaultRoutes = Router();
const enabled = requireFeatureFlag("evidence.private_proof_vault_enabled");
const writeLimit = rateLimit({ keyPrefix: "proof-vault-write", windowMs: 10 * 60 * 1000, max: 30 });

proofVaultRoutes.use(requireAuth, enabled);
proofVaultRoutes.get("/", (request, response, next) => proofVaultController.list(request, response).catch(next));
proofVaultRoutes.post("/", writeLimit, (request, response, next) => proofVaultController.create(request, response).catch(next));
proofVaultRoutes.patch("/:id", writeLimit, (request, response, next) => proofVaultController.update(request, response).catch(next));
proofVaultRoutes.delete("/:id", writeLimit, (request, response, next) => proofVaultController.archive(request, response).catch(next));
proofVaultRoutes.post("/:id/media", writeLimit, memoryUpload.single("media"), (request, response, next) => proofVaultController.uploadMedia(request, response).catch(next));
proofVaultRoutes.get("/:id/media", (request, response, next) => proofVaultController.media(request, response).catch(next));
