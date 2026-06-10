import { createApp } from "./app.js";
import { checkDatabaseConnection } from "./config/db.js";
import { env } from "./config/env.js";

async function startServer() {
  await checkDatabaseConnection();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`LNFS Node API listening on http://localhost:${env.port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start LNFS Node API");
  console.error(error);
  process.exit(1);
});
