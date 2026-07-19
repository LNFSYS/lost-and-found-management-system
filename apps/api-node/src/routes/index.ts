import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { healthService } from "../services/health.service.js";
import { metricsService } from "../services/metrics.service.js";
import { ok } from "../utils/api-response.js";
import { isConfigured } from "../utils/configured.js";
import { adminRoutes } from "./admin.routes.js";
import { appointmentRoutes } from "./appointment.routes.js";
import { authRoutes } from "./auth.routes.js";
import { claimRoutes } from "./claim.routes.js";
import { configRoutes } from "./config.routes.js";
import { docsRoutes } from "./docs.routes.js";
import { categoryRoutes, handoverPointRoutes, locationRoutes } from "./lookup.routes.js";
import { postRoutes, searchRoutes } from "./post.routes.js";

export const apiRoutes = Router();

apiRoutes.get("/health", (_request, response) => {
  response.json(ok(healthService.liveness()));
});

apiRoutes.get("/health/live", (_request, response) => {
  response.json(ok(healthService.liveness()));
});

apiRoutes.get("/health/ready", async (_request, response) => {
  const readiness = await healthService.readiness();
  response.status(readiness.status === "ready" ? 200 : 503).json(ok(readiness));
});

apiRoutes.get("/metrics", (request, response) => {
  if (isConfigured(env.metricsToken)) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    const actual = Buffer.from(token);
    const expected = Buffer.from(env.metricsToken!);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      response.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
  } else if (env.nodeEnv === "production") {
    response.status(404).json({ success: false, error: "Not found" });
    return;
  }
  response.type("text/plain; version=0.0.4").send(metricsService.renderPrometheus());
});

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/admin", adminRoutes);
apiRoutes.use("/appointments", appointmentRoutes);
apiRoutes.use("/claims", claimRoutes);
apiRoutes.use("/config", configRoutes);
apiRoutes.use("/categories", categoryRoutes);
apiRoutes.use("/locations", locationRoutes);
apiRoutes.use("/handover-points", handoverPointRoutes);
apiRoutes.use("/docs", docsRoutes);
apiRoutes.use("/posts", postRoutes);
apiRoutes.use("/search", searchRoutes);
