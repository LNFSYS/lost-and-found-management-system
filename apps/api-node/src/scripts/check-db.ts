import { dbPool, checkDatabaseConnection } from "../config/db.js";
import { env } from "../config/env.js";

async function main() {
  await checkDatabaseConnection();
  console.log(`Connected to MySQL ${env.db.host}:${env.db.port}/${env.db.name}`);
}

main()
  .catch((error: unknown) => {
    console.error("Database connection failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await dbPool.end();
  });
