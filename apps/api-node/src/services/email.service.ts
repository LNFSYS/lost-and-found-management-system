import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { isConfigured } from "../utils/configured.js";

function smtpConfigured() {
  return (
    isConfigured(env.smtp.host) &&
    isConfigured(env.smtp.user) &&
    isConfigured(env.smtp.pass) &&
    isConfigured(env.smtp.from)
  );
}

export const emailService = {
  async sendOtp(email: string, otp: string): Promise<{ delivered: boolean }> {
    if (!smtpConfigured()) {
      console.warn("SMTP is not configured; OTP email was not sent. Configure SMTP_* variables.");
      if (env.nodeEnv !== "production") {
        console.warn(`Development OTP for ${email}: ${otp}`);
      }
      return { delivered: false };
    }

    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    });

    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: "FPTU Lost & Found verification code",
      text: `Your verification code is ${otp}. It expires in 10 minutes.`
    });

    return { delivered: true };
  }
};
