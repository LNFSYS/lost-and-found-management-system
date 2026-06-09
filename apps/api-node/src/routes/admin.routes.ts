import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";
import { requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";

export const adminRoutes = Router();

const requireStaffOrAdmin = requireAnyRole(["ADMIN", "STAFF"]);
const requireAdmin = requireAnyRole(["ADMIN"]);

adminRoutes.use(requireAuth);

adminRoutes.get("/dashboard/overview", requireStaffOrAdmin, (request, response, next) => {
  adminController.overview(request, response).catch(next);
});

adminRoutes.get("/users", requireAdmin, (request, response, next) => {
  adminController.users(request, response).catch(next);
});
adminRoutes.post("/users", requireAdmin, (request, response, next) => {
  adminController.createUser(request, response).catch(next);
});

adminRoutes.patch("/users/:id/status", requireAdmin, (request, response, next) => {
  adminController.updateUserStatus(request, response).catch(next);
});
adminRoutes.patch("/users/:id/roles", requireAdmin, (request, response, next) => {
  adminController.updateUserRoles(request, response).catch(next);
});

adminRoutes.get("/categories", requireAdmin, (request, response, next) => {
  adminController.categories(request, response).catch(next);
});
adminRoutes.post("/categories", requireAdmin, (request, response, next) => {
  adminController.createCategory(request, response).catch(next);
});
adminRoutes.put("/categories/:id", requireAdmin, (request, response, next) => {
  adminController.updateCategory(request, response).catch(next);
});
adminRoutes.patch("/categories/:id/active", requireAdmin, (request, response, next) => {
  adminController.setCategoryActive(request, response).catch(next);
});

adminRoutes.get("/locations/areas", requireAdmin, (request, response, next) => {
  adminController.areas(request, response).catch(next);
});
adminRoutes.post("/locations/areas", requireAdmin, (request, response, next) => {
  adminController.createArea(request, response).catch(next);
});
adminRoutes.put("/locations/areas/:id", requireAdmin, (request, response, next) => {
  adminController.updateArea(request, response).catch(next);
});
adminRoutes.patch("/locations/areas/:id/active", requireAdmin, (request, response, next) => {
  adminController.setAreaActive(request, response).catch(next);
});

adminRoutes.get("/locations/buildings", requireAdmin, (request, response, next) => {
  adminController.buildings(request, response).catch(next);
});
adminRoutes.post("/locations/buildings", requireAdmin, (request, response, next) => {
  adminController.createBuilding(request, response).catch(next);
});
adminRoutes.put("/locations/buildings/:id", requireAdmin, (request, response, next) => {
  adminController.updateBuilding(request, response).catch(next);
});
adminRoutes.patch("/locations/buildings/:id/active", requireAdmin, (request, response, next) => {
  adminController.setBuildingActive(request, response).catch(next);
});

adminRoutes.get("/handover-points", requireAdmin, (request, response, next) => {
  adminController.handoverPoints(request, response).catch(next);
});
adminRoutes.post("/handover-points", requireAdmin, (request, response, next) => {
  adminController.createHandoverPoint(request, response).catch(next);
});
adminRoutes.put("/handover-points/:id", requireAdmin, (request, response, next) => {
  adminController.updateHandoverPoint(request, response).catch(next);
});
adminRoutes.patch("/handover-points/:id/active", requireAdmin, (request, response, next) => {
  adminController.setHandoverPointActive(request, response).catch(next);
});

adminRoutes.get("/reports", requireAdmin, (request, response, next) => {
  adminController.reports(request, response).catch(next);
});
adminRoutes.patch("/reports/:id/handle", requireAdmin, (request, response, next) => {
  adminController.handleReport(request, response).catch(next);
});
