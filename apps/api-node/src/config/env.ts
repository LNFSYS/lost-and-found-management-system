import dotenv from "dotenv";
import path from "node:path";

for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", "..", ".env")
]) {
  dotenv.config({ path: envPath, override: false });
}

function numberFromEnv(name: string, fallback: number) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (Number.isNaN(parsedValue)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }

  return parsedValue;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: numberFromEnv("API_PORT", numberFromEnv("PORT", 3001)),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: numberFromEnv("DB_PORT", 3306),
    name: process.env.DB_NAME ?? "fptu_lost_found",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  bcryptSaltRounds: numberFromEnv("BCRYPT_SALT_ROUNDS", 12),
  smtp: {
    host: process.env.SMTP_HOST,
    port: numberFromEnv("SMTP_PORT", 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:3001/api/auth/google/callback",
    visionApiKey: process.env.GOOGLE_VISION_API_KEY,
    applicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
  },
  redisUrl: process.env.REDIS_URL,
  socketPort: numberFromEnv("SOCKET_PORT", 3002),
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN ?? process.env.FRONTEND_URL ?? "http://localhost:5173"
};
