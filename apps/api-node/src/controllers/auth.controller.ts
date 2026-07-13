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

const REFRESH_COOKIE_NAME = "lnfs.refresh";

function readCookie(request: Request, name: string) {
  const header = request.header("cookie");
  if (!header) {
    return undefined;
  }
  for (const part of header.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return undefined;
}

function refreshTokenInput(request: Request) {
  return refreshTokenSchema.parse({
    refreshToken: request.body?.refreshToken ?? readCookie(request, REFRESH_COOKIE_NAME)
  });
}

function refreshCookieMaxAge() {
  const match = /^(\d+)([smhd])$/.exec(env.jwtRefreshExpiresIn.trim());
  if (!match) {
    return 30 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return amount * unitMs;
}

function setRefreshCookie(response: Response, refreshToken: string) {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: refreshCookieMaxAge()
  });
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/api/auth"
  });
}

function webSafeAuthResult<T extends { tokens: { refreshToken: string } }>(request: Request, response: Response, result: T) {
  setRefreshCookie(response, result.tokens.refreshToken);
  if (request.header("x-client-platform") !== "web") {
    return result;
  }
  const { refreshToken: _refreshToken, ...safeTokens } = result.tokens;
  return { ...result, tokens: safeTokens };
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
      setRefreshCookie(response, result.tokens.refreshToken);
      redirectUrl.hash = new URLSearchParams({
        oauth: "google",
        accessToken: result.tokens.accessToken,
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
    response.status(201).json(created(webSafeAuthResult(request, response, result), "Registration completed"));
  },

  async requestRegistrationOtp(request: Request, response: Response) {
    const input = requestRegistrationOtpSchema.parse(request.body);
    const result = await authService.requestRegistrationOtp(input);
    response.json(ok(result, "Registration OTP sent"));
  },

  async verifyOtp(request: Request, response: Response) {
    const input = verifyOtpSchema.parse(request.body);
    const result = await authService.verifyOtp(input, requestMeta(request));
    response.json(ok(webSafeAuthResult(request, response, result), "Email verified"));
  },

  async resendOtp(request: Request, response: Response) {
    const input = resendOtpSchema.parse(request.body);
    const result = await authService.resendRegistrationOtp(input);
    response.json(ok(result, "Verification OTP resent"));
  },

  async login(request: Request, response: Response) {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input, requestMeta(request));
    response.json(ok(webSafeAuthResult(request, response, result), "Login successful"));
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
    const input = refreshTokenInput(request);
    const result = await authService.refresh(input, requestMeta(request));
    response.json(ok(webSafeAuthResult(request, response, result), "Token refreshed"));
  },

  async logout(request: Request, response: Response) {
    const input = refreshTokenInput(request);
    await authService.logout(input);
    clearRefreshCookie(response);
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
