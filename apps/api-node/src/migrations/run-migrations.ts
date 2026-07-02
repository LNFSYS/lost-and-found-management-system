import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { mysqlSslOptions } from "../config/mysql-ssl.js";

const migrationsDirectory = path.dirname(fileURLToPath(import.meta.url));

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

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const filenames = (await readdir(migrationsDirectory))
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    for (const filename of filenames) {
      const [existingRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT filename FROM schema_migrations WHERE filename = ?",
        [filename]
      );

      if (existingRows.length > 0) {
        console.log(`Skipping ${filename}; already applied`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDirectory, filename), "utf8");
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
        await connection.commit();
        console.log(`Applied ${filename}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    await connection.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
