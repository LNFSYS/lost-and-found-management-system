import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller.js";
import { requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";

export const appointmentRoutes = Router();
const appointmentUploadLimit = rateLimit({ keyPrefix: "appointment-upload", windowMs: 10 * 60 * 1000, max: 15 });

appointmentRoutes.post("/", requireAuth, (request, response, next) => {
  appointmentController.create(request, response).catch(next);
});

appointmentRoutes.get("/claim/:claimId", requireAuth, (request, response, next) => {
  appointmentController.listByClaim(request, response).catch(next);
});

appointmentRoutes.patch("/:id/accept", requireAuth, (request, response, next) => {
  appointmentController.accept(request, response).catch(next);
});

appointmentRoutes.patch("/:id/reject", requireAuth, (request, response, next) => {
  appointmentController.reject(request, response).catch(next);
});

appointmentRoutes.patch("/:id/cancel", requireAuth, (request, response, next) => {
  appointmentController.cancel(request, response).catch(next);
});

appointmentRoutes.patch("/:id/reschedule", requireAuth, (request, response, next) => {
  appointmentController.reschedule(request, response).catch(next);
});

appointmentRoutes.patch("/:id/complete", requireAuth, (request, response, next) => {
  appointmentController.complete(request, response).catch(next);
});

appointmentRoutes.post("/:id/feedback", requireAuth, (request, response, next) => {
  appointmentController.feedback(request, response).catch(next);
});

appointmentRoutes.post("/:id/proof", requireAuth, appointmentUploadLimit, memoryUpload.single("proof"), (request, response, next) => {
  appointmentController.proof(request, response).catch(next);
});

appointmentRoutes.get("/:id/proof-image", requireAuth, (request, response, next) => {
  appointmentController.proofImage(request, response).catch(next);
});

appointmentRoutes.post("/jobs/send-reminders", requireAuth, requireAnyRole(["ADMIN", "STAFF"]), (request, response, next) => {
  appointmentController.remind(request, response).catch(next);
});
