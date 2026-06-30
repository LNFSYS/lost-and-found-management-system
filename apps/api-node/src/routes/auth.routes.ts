import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { mediaController } from "../controllers/media.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { memoryUpload } from "../middlewares/upload.middleware.js";

export const authRoutes = Router();

authRoutes.get("/google", (request, response, next) => {
  authController.googleStart(request, response).catch(next);
});

authRoutes.get("/google/callback", (request, response, next) => {
  authController.googleCallback(request, response).catch(next);
});

authRoutes.post("/register", (request, response, next) => {
  authController.register(request, response).catch(next);
});

authRoutes.post("/register/request-otp", (request, response, next) => {
  authController.requestRegistrationOtp(request, response).catch(next);
});

authRoutes.post("/verify-otp", (request, response, next) => {
  authController.verifyOtp(request, response).catch(next);
});

authRoutes.post("/resend-otp", (request, response, next) => {
  authController.resendOtp(request, response).catch(next);
});

authRoutes.post("/login", (request, response, next) => {
  authController.login(request, response).catch(next);
});

authRoutes.post("/forgot-password", (request, response, next) => {
  authController.forgotPassword(request, response).catch(next);
});

authRoutes.post("/reset-password", (request, response, next) => {
  authController.resetPassword(request, response).catch(next);
});

authRoutes.post("/refresh", (request, response, next) => {
  authController.refresh(request, response).catch(next);
});

authRoutes.post("/logout", requireAuth, (request, response, next) => {
  authController.logout(request, response).catch(next);
});

authRoutes.get("/me", requireAuth, (request, response, next) => {
  authController.me(request, response).catch(next);
});

authRoutes.put("/profile", requireAuth, (request, response, next) => {
  authController.updateProfile(request, response).catch(next);
});

authRoutes.post("/avatar", requireAuth, memoryUpload.single("avatar"), (request, response, next) => {
  mediaController.avatar(request, response).catch(next);
});

authRoutes.get("/activity", requireAuth, (request, response, next) => {
  authController.activity(request, response).catch(next);
});

authRoutes.get("/reputation", requireAuth, (request, response, next) => {
  authController.reputation(request, response).catch(next);
});

authRoutes.get("/notifications", requireAuth, (request, response, next) => {
  authController.notifications(request, response).catch(next);
});

authRoutes.patch("/notifications/read-all", requireAuth, (request, response, next) => {
  authController.markAllNotificationsRead(request, response).catch(next);
});

authRoutes.patch("/notifications/:id/read", requireAuth, (request, response, next) => {
  authController.markNotificationRead(request, response).catch(next);
});
