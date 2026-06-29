import { Router } from "express";
import { ok } from "../utils/api-response.js";
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
  response.json(ok({ status: "ok", service: "lnfs-api-node" }));
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
