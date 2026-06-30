import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import type { PublicUser, User } from "../models/user.model.js";
import { toPublicUser } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
import { emailService } from "./email.service.js";
import { isConfigured } from "../utils/configured.js";
import { durationToMs } from "../utils/duration.js";
import { randomOtp, randomToken, sha256 } from "../utils/hash.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeEmail } from "../utils/normalize-email.js";
import type {
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  RegisterInput,
  RequestRegistrationOtpInput,
  ResendOtpInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyOtpInput
} from "../validators/auth.validator.js";

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

type OtpPurpose = "REGISTER" | "PASSWORD_RESET";
const GOOGLE_PROVIDER = "google";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function requireSecret(secret: string | undefined, name: string) {
  if (!isConfigured(secret)) {
    throw new HttpError(500, `${name} is not configured`);
  }

  return secret;
}

function signAccessToken(user: User) {
  const options: SignOptions = {
    expiresIn: env.jwtAccessExpiresIn as SignOptions["expiresIn"]
  };

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles
    },
    requireSecret(env.jwtAccessSecret, "JWT_ACCESS_SECRET"),
    options
  );
}

function mysqlDateToUtc(value: string) {
  return new Date(`${value.replace(" ", "T")}Z`);
}

function refreshExpiryDate() {
  return new Date(Date.now() + durationToMs(env.jwtRefreshExpiresIn));
}

function requireGoogleOAuthConfig() {
  return {
    clientId: requireSecret(env.google.clientId, "GOOGLE_CLIENT_ID"),
    clientSecret: requireSecret(env.google.clientSecret, "GOOGLE_CLIENT_SECRET"),
    callbackUrl: env.google.callbackUrl
  };
}

async function issueOtp(input: {
  userId: string | null;
  email: string;
  normalizedEmail: string;
  purpose: OtpPurpose;
}) {
  await userRepository.cancelPendingOtps(input.normalizedEmail, input.purpose);
  const otp = randomOtp();
  await userRepository.createOtp({
    id: randomUUID(),
    userId: input.userId,
    email: input.email,
    normalizedEmail: input.normalizedEmail,
    otpHash: await bcrypt.hash(otp, env.bcryptSaltRounds),
    purpose: input.purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  return emailService.sendOtp(input.email, otp);
}

async function sendRegistrationOtp(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await userRepository.findByNormalizedEmail(normalizedEmail);

  if (existingUser && existingUser.status !== "PENDING_EMAIL_VERIFICATION") {
    throw new HttpError(409, "Email already registered");
  }

  const delivery = await issueOtp({
    userId: existingUser?.id ?? null,
    email: existingUser?.email ?? email.trim(),
    normalizedEmail,
    purpose: "REGISTER"
  });

  if (existingUser) {
    await userRepository.createActivityLog({
      userId: existingUser.id,
      action: "REGISTER_OTP_REQUESTED",
      entityType: "USER",
      entityId: existingUser.id,
      metadata: { otpDelivered: delivery.delivered }
    });
  }

  return {
    otpDelivered: delivery.delivered
  };
}

async function validateOtp(normalizedEmail: string, purpose: OtpPurpose, otp: string) {
  const otpRow = await userRepository.findLatestPendingOtp(normalizedEmail, purpose);

  if (!otpRow) {
    throw new HttpError(404, "Pending OTP not found");
  }

  if (otpRow.attempt_count >= otpRow.max_attempts) {
    await userRepository.markOtpStatus(otpRow.id, "CANCELLED");
    throw new HttpError(429, "OTP attempt limit reached");
  }

  if (mysqlDateToUtc(otpRow.expires_at).getTime() < Date.now()) {
    await userRepository.markOtpStatus(otpRow.id, "EXPIRED");
    throw new HttpError(410, "OTP has expired");
  }

  await userRepository.incrementOtpAttempt(otpRow.id);
  const otpMatches = await bcrypt.compare(otp, otpRow.otp_hash);
  if (!otpMatches) {
    if (otpRow.attempt_count + 1 >= otpRow.max_attempts) {
      await userRepository.markOtpStatus(otpRow.id, "CANCELLED");
    }
    throw new HttpError(401, "Invalid OTP");
  }

  return otpRow;
}

async function createTokenPair(user: User, meta: RequestMeta): Promise<TokenPair> {
  const refreshToken = randomToken();
  await userRepository.createRefreshToken({
    id: randomUUID(),
    userId: user.id,
    tokenHash: sha256(refreshToken),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: refreshExpiryDate()
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    accessTokenExpiresIn: env.jwtAccessExpiresIn,
    refreshTokenExpiresIn: env.jwtRefreshExpiresIn
  };
}

export const authService = {
  googleAuthorizationUrl() {
    const google = requireGoogleOAuthConfig();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", google.clientId);
    url.searchParams.set("redirect_uri", google.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  },

  async loginWithGoogle(code: string, meta: RequestMeta): Promise<AuthResult> {
    const google = requireGoogleOAuthConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: google.clientId,
        client_secret: google.clientSecret,
        redirect_uri: google.callbackUrl,
        grant_type: "authorization_code"
      })
    });
    const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new HttpError(401, tokenPayload.error_description ?? tokenPayload.error ?? "Google OAuth token exchange failed");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
    });
    const profile = (await profileResponse.json().catch(() => ({}))) as GoogleUserInfo;
    if (!profileResponse.ok || !profile.sub || !profile.email) {
      throw new HttpError(401, "Google profile lookup failed");
    }
    if (!profile.email_verified) {
      throw new HttpError(403, "Google email is not verified");
    }

    const normalizedEmail = normalizeEmail(profile.email);
    const linkedUserId = await userRepository.findOAuthUserId(GOOGLE_PROVIDER, profile.sub);
    let user = linkedUserId ? await userRepository.findById(linkedUserId) : await userRepository.findByNormalizedEmail(normalizedEmail);

    if (user && user.status !== "ACTIVE") {
      throw new HttpError(403, "Account is not active");
    }

    if (!user) {
      const now = new Date().toISOString();
      user = await userRepository.create({
        id: randomUUID(),
        email: profile.email.trim(),
        normalizedEmail,
        passwordHash: null,
        fullName: profile.name?.trim() || profile.email.split("@")[0],
        avatarUrl: profile.picture,
        roles: [],
        status: "ACTIVE",
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now
      });
      await userRepository.assignRole(user.id, "USER");
      await userRepository.assignRole(user.id, "STUDENT");
      await userRepository.ensureReputationScore(user.id);
      user = await userRepository.findById(user.id);
      if (!user) {
        throw new HttpError(500, "Unable to load Google user");
      }
    }

    await userRepository.upsertOAuthAccount({
      userId: user.id,
      provider: GOOGLE_PROVIDER,
      providerUserId: profile.sub,
      providerEmail: profile.email
    });
    await userRepository.updateLastLogin(user.id);
    await userRepository.createLoginAudit({
      userId: user.id,
      normalizedEmail,
      eventType: "LOGIN_GOOGLE",
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await userRepository.createActivityLog({
      userId: user.id,
      action: "GOOGLE_LOGIN",
      entityType: "USER",
      entityId: user.id
    });

    return {
      user: toPublicUser(user),
      tokens: await createTokenPair(user, meta)
    };
  },

  async requestRegistrationOtp(input: RequestRegistrationOtpInput) {
    return sendRegistrationOtp(input.email);
  },

  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const existingUser = await userRepository.findByNormalizedEmail(normalizedEmail);

    if (existingUser) {
      if (existingUser.status !== "PENDING_EMAIL_VERIFICATION") {
        throw new HttpError(409, "Email already registered");
      }

      const otpRow = await validateOtp(normalizedEmail, "REGISTER", input.otp);
      const passwordHash = await bcrypt.hash(input.password, env.bcryptSaltRounds);
      const user = await userRepository.updatePendingRegistration(existingUser.id, {
        email: input.email.trim(),
        normalizedEmail,
        passwordHash,
        fullName: input.fullName.trim(),
        studentCode: input.studentCode?.trim() ?? null,
        phoneNumber: input.phoneNumber?.trim() ?? null
      });

      if (!user) {
        throw new HttpError(500, "Unable to update pending registration");
      }

      await userRepository.markOtpStatus(otpRow.id, "VERIFIED");
      await userRepository.markEmailVerified(user.id);
      await userRepository.assignRole(user.id, "USER");
      await userRepository.assignRole(user.id, input.accountType);
      await userRepository.ensureReputationScore(user.id);
      await userRepository.createActivityLog({
        userId: user.id,
        action: "REGISTER_COMPLETED",
        entityType: "USER",
        entityId: user.id
      });

      const activeUser = await userRepository.findById(user.id);
      if (!activeUser) {
        throw new HttpError(500, "Unable to load registered user");
      }

      return {
        user: toPublicUser(activeUser),
        tokens: await createTokenPair(activeUser, meta)
      };
    }

    const otpRow = await validateOtp(normalizedEmail, "REGISTER", input.otp);
    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      email: input.email.trim(),
      normalizedEmail,
      passwordHash: await bcrypt.hash(input.password, env.bcryptSaltRounds),
      fullName: input.fullName.trim(),
      studentCode: input.studentCode?.trim(),
      phoneNumber: input.phoneNumber?.trim(),
      roles: [],
      status: "PENDING_EMAIL_VERIFICATION",
      createdAt: now,
      updatedAt: now
    };

    await userRepository.create(user);
    await userRepository.markOtpStatus(otpRow.id, "VERIFIED");
    await userRepository.markEmailVerified(user.id);
    await userRepository.assignRole(user.id, "USER");
    await userRepository.assignRole(user.id, input.accountType);
    await userRepository.ensureReputationScore(user.id);
    await userRepository.createActivityLog({
      userId: user.id,
      action: "REGISTER_COMPLETED",
      entityType: "USER",
      entityId: user.id
    });

    const activeUser = await userRepository.findById(user.id);
    if (!activeUser) {
      throw new HttpError(500, "Unable to load registered user");
    }

    return {
      user: toPublicUser(activeUser),
      tokens: await createTokenPair(activeUser, meta)
    };
  },

  async resendRegistrationOtp(input: ResendOtpInput) {
    return sendRegistrationOtp(input.email);
  },

  async verifyOtp(input: VerifyOtpInput, meta: RequestMeta): Promise<AuthResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const otpRow = await validateOtp(normalizedEmail, "REGISTER", input.otp);

    const user = await userRepository.findByNormalizedEmail(normalizedEmail);
    if (!user) {
      throw new HttpError(404, "User not found for OTP");
    }

    await userRepository.markOtpStatus(otpRow.id, "VERIFIED");
    await userRepository.markEmailVerified(user.id);
    await userRepository.assignRole(user.id, "USER");
    await userRepository.assignRole(user.id, "STUDENT");
    await userRepository.ensureReputationScore(user.id);
    await userRepository.createActivityLog({
      userId: user.id,
      action: "EMAIL_VERIFIED",
      entityType: "USER",
      entityId: user.id
    });

    const activeUser = await userRepository.findById(user.id);
    if (!activeUser) {
      throw new HttpError(500, "Unable to load verified user");
    }

    return {
      user: toPublicUser(activeUser),
      tokens: await createTokenPair(activeUser, meta)
    };
  },

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await userRepository.findByNormalizedEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      await userRepository.createLoginAudit({
        normalizedEmail,
        eventType: "LOGIN_PASSWORD",
        success: false,
        failureReason: "INVALID_CREDENTIALS",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      throw new HttpError(401, "Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      await userRepository.createLoginAudit({
        userId: user.id,
        normalizedEmail,
        eventType: "LOGIN_PASSWORD",
        success: false,
        failureReason: "ACCOUNT_NOT_ACTIVE",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      throw new HttpError(403, "Account is not active");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      await userRepository.createLoginAudit({
        userId: user.id,
        normalizedEmail,
        eventType: "LOGIN_PASSWORD",
        success: false,
        failureReason: "INVALID_CREDENTIALS",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      throw new HttpError(401, "Invalid email or password");
    }

    await userRepository.updateLastLogin(user.id);
    await userRepository.createLoginAudit({
      userId: user.id,
      normalizedEmail,
      eventType: "LOGIN_PASSWORD",
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await userRepository.createActivityLog({
      userId: user.id,
      action: "LOGIN",
      entityType: "USER",
      entityId: user.id
    });

    return {
      user: toPublicUser(user),
      tokens: await createTokenPair(user, meta)
    };
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await userRepository.findByNormalizedEmail(normalizedEmail);

    if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
      return { otpDelivered: false };
    }

    const delivery = await issueOtp({
      userId: user.id,
      email: user.email,
      normalizedEmail,
      purpose: "PASSWORD_RESET"
    });
    await userRepository.createActivityLog({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      metadata: { otpDelivered: delivery.delivered }
    });

    return { otpDelivered: delivery.delivered };
  },

  async resetPassword(input: ResetPasswordInput) {
    const normalizedEmail = normalizeEmail(input.email);
    const otpRow = await validateOtp(normalizedEmail, "PASSWORD_RESET", input.otp);
    const user = await userRepository.findByNormalizedEmail(normalizedEmail);

    if (!user || user.status !== "ACTIVE") {
      throw new HttpError(404, "Active user not found");
    }

    await userRepository.updatePassword(user.id, await bcrypt.hash(input.newPassword, env.bcryptSaltRounds));
    await userRepository.markOtpStatus(otpRow.id, "VERIFIED");
    await userRepository.revokeActiveRefreshTokensByUser(user.id);
    await userRepository.createActivityLog({
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: user.id
    });

    return { reset: true };
  },

  async refresh(input: RefreshTokenInput, meta: RequestMeta): Promise<AuthResult> {
    const existingToken = await userRepository.findActiveRefreshToken(sha256(input.refreshToken));
    if (!existingToken) {
      throw new HttpError(401, "Invalid or expired refresh token");
    }

    const user = await userRepository.findById(existingToken.user_id);
    if (!user || user.status !== "ACTIVE") {
      throw new HttpError(401, "Invalid refresh token user");
    }

    const newRefreshToken = randomToken();
    const newRefreshTokenId = randomUUID();
    await userRepository.rotateRefreshToken({
      oldTokenId: existingToken.id,
      newTokenId: newRefreshTokenId,
      userId: user.id,
      tokenHash: sha256(newRefreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: refreshExpiryDate()
    });

    await userRepository.createActivityLog({
      userId: user.id,
      action: "REFRESH_TOKEN_ROTATED",
      entityType: "USER",
      entityId: user.id
    });

    return {
      user: toPublicUser(user),
      tokens: {
        accessToken: signAccessToken(user),
        refreshToken: newRefreshToken,
        accessTokenExpiresIn: env.jwtAccessExpiresIn,
        refreshTokenExpiresIn: env.jwtRefreshExpiresIn
      }
    };
  },

  async logout(input: RefreshTokenInput): Promise<void> {
    const existingToken = await userRepository.findActiveRefreshToken(sha256(input.refreshToken));
    if (existingToken) {
      await userRepository.revokeRefreshToken(existingToken.id, "LOGOUT");
      await userRepository.createLoginAudit({
        userId: existingToken.user_id,
        eventType: "LOGOUT",
        success: true
      });
      await userRepository.createActivityLog({
        userId: existingToken.user_id,
        action: "LOGOUT",
        entityType: "USER",
        entityId: existingToken.user_id
      });
    }
  },

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError(401, "Invalid token user");
    }

    return toPublicUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await userRepository.updateProfile(userId, {
      fullName: input.fullName?.trim(),
      studentCode: input.studentCode === undefined ? undefined : input.studentCode?.trim() ?? null,
      phoneNumber: input.phoneNumber === undefined ? undefined : input.phoneNumber?.trim() ?? null
    });

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    await userRepository.createActivityLog({
      userId,
      action: "PROFILE_UPDATED",
      entityType: "USER",
      entityId: userId
    });

    return toPublicUser(user);
  },

  async getActivity(userId: string, limit: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError(401, "Invalid token user");
    }

    return userRepository.listActivityLogs(userId, limit);
  },

  async getReputation(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError(401, "Invalid token user");
    }

    return userRepository.getReputation(userId);
  }
};
