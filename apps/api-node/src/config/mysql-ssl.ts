import { readFileSync } from "node:fs";
import { env } from "./env.js";

export function mysqlSslOptions() {
  if (!env.db.ssl) {
    return undefined;
  }

  const ca = env.db.sslCaPath
    ? readFileSync(env.db.sslCaPath, "utf8")
    : env.db.sslCa?.replace(/\\n/g, "\n");

  return {
    rejectUnauthorized: env.db.sslRejectUnauthorized,
    ...(ca ? { ca } : {})
  };
}

