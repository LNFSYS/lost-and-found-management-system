import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { mysqlSslOptions } from "../config/mysql-ssl.js";
import { migrationChecksum, migrationLockName } from "./migration-integrity.js";

const migrationsDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationLockTimeoutSeconds = 60;

interface MigrationRow extends mysql.RowDataPacket {
  filename: string;
  checksum_sha256: string | null;
  status: "APPLYING" | "APPLIED" | "FAILED" | null;
}

interface LockRow extends mysql.RowDataPacket {
  acquired: number | null;
}

function assertSafeDatabaseName(databaseName: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error("DB_NAME may only contain letters, numbers, and underscores");
  }
}

function assertDatabaseCredentials() {
  if (!env.db.user || env.db.user === "YOUR_VALUE_HERE") {
    throw new Error("Missing DB_USER. Create a .env file from .env.example and set DB_USER.");
  }
  if (env.db.password === "YOUR_VALUE_HERE") {
    throw new Error("Missing DB_PASSWORD. Create a .env file from .env.example and set DB_PASSWORD.");
  }
}

function isBadDatabaseError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_BAD_DB_ERROR"
  );
}

async function runMigrations() {
  assertSafeDatabaseName(env.db.name);
  assertDatabaseCredentials();

  const baseConnectionOptions = {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    ssl: mysqlSslOptions(),
    multipleStatements: true,
    charset: "utf8mb4"
  };

  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection({
      ...baseConnectionOptions,
      database: env.db.name
    });
  } catch (error) {
    if (isBadDatabaseError(error)) {
      connection = await mysql.createConnection(baseConnectionOptions);
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await connection.query(`USE \`${env.db.name}\``);
    } else {
      throw error;
    }
  }

  const lockName = migrationLockName(env.db.name);
  let lockAcquired = false;
  try {
    const [lockRows] = await connection.query<LockRow[]>("SELECT GET_LOCK(?, ?) AS acquired", [
      lockName,
      migrationLockTimeoutSeconds
    ]);
    if (lockRows[0]?.acquired !== 1) {
      throw new Error(`Could not acquire migration lock for database ${env.db.name}`);
    }
    lockAcquired = true;

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        checksum_sha256 CHAR(64) NULL,
        status ENUM('APPLYING', 'APPLIED', 'FAILED') NOT NULL DEFAULT 'APPLIED',
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [migrationColumns] = await connection.query<mysql.RowDataPacket[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'schema_migrations'
      `,
      [env.db.name]
    );
    const existingColumns = new Set(migrationColumns.map((row) => String(row.COLUMN_NAME)));
    if (!existingColumns.has("checksum_sha256")) {
      await connection.query("ALTER TABLE schema_migrations ADD COLUMN checksum_sha256 CHAR(64) NULL AFTER filename");
    }
    if (!existingColumns.has("status")) {
      await connection.query(
        "ALTER TABLE schema_migrations ADD COLUMN status ENUM('APPLYING', 'APPLIED', 'FAILED') NOT NULL DEFAULT 'APPLIED' AFTER checksum_sha256"
      );
    }

    const filenames = (await readdir(migrationsDirectory))
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    for (const filename of filenames) {
      const sql = await readFile(path.join(migrationsDirectory, filename), "utf8");
      const checksum = migrationChecksum(sql);
      const [existingRows] = await connection.query<MigrationRow[]>(
        "SELECT filename, checksum_sha256, status FROM schema_migrations WHERE filename = ?",
        [filename]
      );

      const existing = existingRows[0];
      if (existing) {
        if (existing.status && existing.status !== "APPLIED") {
          throw new Error(
            `Migration ${filename} is marked ${existing.status}. Inspect the schema and resolve it manually before retrying.`
          );
        }
        if (existing.checksum_sha256 && existing.checksum_sha256 !== checksum) {
          throw new Error(`Migration checksum drift detected for ${filename}`);
        }
        if (!existing.checksum_sha256 || !existing.status) {
          await connection.execute(
            "UPDATE schema_migrations SET checksum_sha256 = ?, status = 'APPLIED' WHERE filename = ?",
            [checksum, filename]
          );
        }
        console.log(`Skipping ${filename}; already applied`);
        continue;
      }

      await connection.execute(
        `
          INSERT INTO schema_migrations (filename, checksum_sha256, status)
          VALUES (?, ?, 'APPLYING')
        `,
        [filename, checksum]
      );
      try {
        await connection.query(sql);
        await connection.execute(
          `
            UPDATE schema_migrations
            SET status = 'APPLIED', applied_at = UTC_TIMESTAMP()
            WHERE filename = ? AND checksum_sha256 = ? AND status = 'APPLYING'
          `,
          [filename, checksum]
        );
        console.log(`Applied ${filename}`);
      } catch (error) {
        await connection.execute(
          "UPDATE schema_migrations SET status = 'FAILED' WHERE filename = ? AND status = 'APPLYING'",
          [filename]
        );
        throw error;
      }
    }
  } finally {
    if (lockAcquired) {
      try {
        await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
      } catch {
        // Closing the connection also releases the named lock.
      }
    }
    await connection.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
