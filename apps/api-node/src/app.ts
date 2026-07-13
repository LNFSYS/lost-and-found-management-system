import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { apiRoutes } from "./routes/index.js";

function splitOrigins(...values: Array<string | undefined>) {
  return values.flatMap((value) => value?.split(",") ?? []).map((origin) => origin.trim()).filter(Boolean);
}

function isDevelopmentOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(origin);
}

function corsOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowedOrigins = new Set(splitOrigins(env.frontendUrl, env.socketCorsOrigin));
  if (allowedOrigins.has(origin) || (env.nodeEnv !== "production" && isDevelopmentOrigin(origin))) {
    callback(null, true);
    return;
  }

  callback(null, false);
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
