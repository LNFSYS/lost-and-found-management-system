import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { env } from "../config/env.js";
import { created, ok } from "../utils/api-response.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestRegistrationOtpSchema,
  resendOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyOtpSchema
} from "../validators/auth.validator.js";

function requestMeta(request: Request) {
  return {
    userAgent: request.header("user-agent") ?? undefined,
    ipAddress: request.ip
  };
}

export const authController = {
  async googleStart(_request: Request, response: Response) {
    response.redirect(authService.googleAuthorizationUrl());
  },

  async googleCallback(request: Request, response: Response) {
    const redirectUrl = new URL(env.frontendUrl);
    redirectUrl.pathname = "/";
    const code = typeof request.query.code === "string" ? request.query.code : "";
    if (!code) {
      redirectUrl.hash = new URLSearchParams({ oauth: "google", error: "Missing Google authorization code" }).toString();
      response.redirect(redirectUrl.toString());
      return;
    }

    try {
      const result = await authService.loginWithGoogle(code, requestMeta(request));
      redirectUrl.hash = new URLSearchParams({
        oauth: "google",
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        accessTokenExpiresIn: result.tokens.accessTokenExpiresIn,
        refreshTokenExpiresIn: result.tokens.refreshTokenExpiresIn
      }).toString();
    } catch (error) {
      redirectUrl.hash = new URLSearchParams({
        oauth: "google",
        error: error instanceof Error ? error.message : "Google login failed"
      }).toString();
    }
    response.redirect(redirectUrl.toString());
  },

  async register(request: Request, response: Response) {
    const input = registerSchema.parse(request.body);
    const result = await authService.register(input, requestMeta(request));
    response.status(201).json(created(result, "Registration completed"));
  },

  async requestRegistrationOtp(request: Request, response: Response) {
    const input = requestRegistrationOtpSchema.parse(request.body);
    const result = await authService.requestRegistrationOtp(input);
    response.json(ok(result, "Registration OTP sent"));
  },

  async verifyOtp(request: Request, response: Response) {
    const input = verifyOtpSchema.parse(request.body);
    const result = await authService.verifyOtp(input, requestMeta(request));
    response.json(ok(result, "Email verified"));
  },

  async resendOtp(request: Request, response: Response) {
    const input = resendOtpSchema.parse(request.body);
    const result = await authService.resendRegistrationOtp(input);
    response.json(ok(result, "Verification OTP resent"));
  },

  async login(request: Request, response: Response) {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input, requestMeta(request));
    response.json(ok(result, "Login successful"));
  },

  async forgotPassword(request: Request, response: Response) {
    const input = forgotPasswordSchema.parse(request.body);
    const result = await authService.forgotPassword(input);
    response.json(ok(result, "If the email is active, a password reset OTP has been sent"));
  },

  async resetPassword(request: Request, response: Response) {
    const input = resetPasswordSchema.parse(request.body);
    const result = await authService.resetPassword(input);
    response.json(ok(result, "Password reset successful"));
  },

  async refresh(request: Request, response: Response) {
    const input = refreshTokenSchema.parse(request.body);
    const result = await authService.refresh(input, requestMeta(request));
    response.json(ok(result, "Token refreshed"));
  },

  async logout(request: Request, response: Response) {
    const input = refreshTokenSchema.parse(request.body);
    await authService.logout(input);
    response.json(ok({ revoked: true }, "Logout successful"));
  },

  async me(request: Request, response: Response) {
    const userId = request.auth!.sub;
    const user = await authService.getCurrentUser(userId);
    response.json(ok({ user }));
  },

  async updateProfile(request: Request, response: Response) {
    const userId = request.auth!.sub;
    const input = updateProfileSchema.parse(request.body);
    const user = await authService.updateProfile(userId, input);
    response.json(ok({ user }, "Profile updated"));
  },

  async activity(request: Request, response: Response) {
    const userId = request.auth!.sub;
    const limit = Math.min(Number(request.query.limit ?? 20), 100);
    const activity = await authService.getActivity(userId, limit);
    response.json(ok({ activity }));
  },

  async reputation(request: Request, response: Response) {
    const userId = request.auth!.sub;
    const reputation = await authService.getReputation(userId);
    response.json(ok({ reputation }));
  },

  async notifications(request: Request, response: Response) {
    const userId = request.auth!.sub;
    const limit = Math.min(Number(request.query.limit ?? 20), 100);
    response.json(ok(await notificationRepository.listForUser(userId, limit)));
  },

  async markNotificationRead(request: Request, response: Response) {
    const userId = request.auth!.sub;
    response.json(ok(await notificationRepository.markRead(userId, String(request.params.id))));
  },

  async markAllNotificationsRead(request: Request, response: Response) {
    const userId = request.auth!.sub;
    response.json(ok(await notificationRepository.markAllRead(userId)));
  }
};
