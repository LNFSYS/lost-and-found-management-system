import mysql from "mysql2/promise";
import { env } from "./env.js";

export const dbPool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  charset: "utf8mb4",
  dateStrings: true,
  timezone: "Z",
  waitForConnections: true,
  connectionLimit: 10
});
