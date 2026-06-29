import { createApp } from "./app.js";
import { checkDatabaseConnection } from "./config/db.js";
import { env } from "./config/env.js";
import { setupRealtimeServer } from "./services/realtime.service.js";
import { startScheduledJobs } from "./services/scheduled-jobs.service.js";
import { createServer } from "node:http";

async function startServer() {
  await checkDatabaseConnection();

  const app = createApp();
  const server = createServer(app);
  setupRealtimeServer(server);
  startScheduledJobs();

  server.listen(env.port, () => {
    console.log(`LNFS Node API listening on http://localhost:${env.port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start LNFS Node API");
  console.error(error);
  process.exit(1);
});
