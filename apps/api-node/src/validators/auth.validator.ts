import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(160),
  otp: z.string().trim().regex(/^\d{6}$/),
  accountType: z.enum(["STUDENT", "LECTURER"]).default("STUDENT"),
  studentCode: z.string().trim().max(40).optional(),
  phoneNumber: z.string().trim().max(30).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/)
});

export const requestRegistrationOtpSchema = z.object({
  email: z.string().trim().email()
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email()
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(72)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20)
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(160).optional(),
  studentCode: z.string().trim().max(40).nullable().optional(),
  phoneNumber: z.string().trim().max(30).nullable().optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RequestRegistrationOtpInput = z.infer<typeof requestRegistrationOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
