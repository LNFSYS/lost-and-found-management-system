import mysql from "mysql2/promise";
import { env } from "./env.js";
import { mysqlSslOptions } from "./mysql-ssl.js";

export const dbPool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  ssl: mysqlSslOptions(),
  charset: "utf8mb4",
  dateStrings: true,
  timezone: "Z",
  waitForConnections: true,
  connectionLimit: 10
});

export async function checkDatabaseConnection() {
  if (!env.db.user?.trim() || env.db.user.trim() === "YOUR_VALUE_HERE") {
    throw new Error("Missing DB_USER. Set DB_USER in .env.");
  }

  if (env.db.password?.trim() === "YOUR_VALUE_HERE") {
    throw new Error("Missing DB_PASSWORD. Set DB_PASSWORD in .env.");
  }

  await dbPool.query("SELECT 1");
}
