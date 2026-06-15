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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildOtpEmail(email: string, otp: string) {
  const safeEmail = escapeHtml(email);
  const safeOtp = escapeHtml(otp);
  const safeFrontendUrl = escapeHtml(env.frontendUrl);

  const text = [
    "FPTU Lost & Found",
    "",
    `Mã xác minh của bạn là: ${otp}`,
    "Mã này có hiệu lực trong 10 phút.",
    "",
    "Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.",
    env.frontendUrl
  ].join("\n");

  const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FPTU Lost & Found verification code</title>
  </head>
  <body style="margin:0;background:#f4f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Mã xác minh FPTU Lost & Found của bạn là ${safeOtp}. Mã có hiệu lực trong 10 phút.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6edf5;box-shadow:0 18px 45px rgba(15,35,68,0.10);">
            <tr>
              <td style="background:#ff6b1a;padding:24px 28px;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">FPTU Lost & Found</div>
                <div style="font-size:24px;font-weight:800;line-height:1.25;margin-top:8px;">Xác minh email của bạn</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 10px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#33415c;">Xin chào,</p>
                <p style="margin:0;font-size:16px;line-height:1.6;color:#33415c;">
                  Bạn đang yêu cầu mã xác minh cho tài khoản <strong>${safeEmail}</strong>.
                  Nhập mã bên dưới để tiếp tục.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 28px;">
                <div style="display:inline-block;background:#fff4ed;border:1px solid #ffd2bb;border-radius:16px;padding:16px 26px;">
                  <div style="font-size:34px;line-height:1;font-weight:800;letter-spacing:9px;color:#ff6b1a;">${safeOtp}</div>
                </div>
                <p style="margin:14px 0 0;font-size:14px;color:#68758f;">Mã có hiệu lực trong 10 phút.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 30px;">
                <div style="background:#f8fafc;border-radius:14px;padding:16px 18px;border:1px solid #edf2f7;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#68758f;">
                    Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Không chia sẻ mã OTP cho bất kỳ ai.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
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

    const message = buildOtpEmail(email, otp);

    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: "Mã xác minh FPTU Lost & Found",
      text: message.text,
      html: message.html
    });

    return { delivered: true };
  }
};
