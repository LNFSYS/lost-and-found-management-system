import { env } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const severity: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }
  return {
    name: error.name,
    message: error.message,
    stack: env.nodeEnv === "production" ? undefined : error.stack
  };
}

function shouldLog(level: LogLevel) {
  return severity[level] >= severity[env.logLevel];
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value instanceof Error ? serializeError(value) : value])
  );
  if (env.logFormat === "json") {
    const output = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "lnfs-api-node",
      message,
      ...normalizedFields
    });
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(output);
    return;
  }

  const suffix = Object.keys(normalizedFields).length > 0 ? ` ${JSON.stringify(normalizedFields)}` : "";
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    `[${level.toUpperCase()}] ${message}${suffix}`
  );
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields)
};
