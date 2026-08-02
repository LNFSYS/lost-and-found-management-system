import { createHash } from "node:crypto";

export function migrationChecksum(sql: string) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export function migrationLockName(databaseName: string) {
  const databaseHash = createHash("sha256").update(databaseName, "utf8").digest("hex").slice(0, 32);
  return `lnfs:migrations:${databaseHash}`;
}
