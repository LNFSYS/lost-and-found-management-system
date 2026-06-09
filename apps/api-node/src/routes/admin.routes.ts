import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";
import { requireAnyRole, requireAuth } from "../middlewares/auth.middleware.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAnyRole(["ADMIN", "STAFF"]));

adminRoutes.get("/dashboard/overview", (request, response, next) => {
  adminController.overview(request, response).catch(next);
});

adminRoutes.get("/users", (request, response, next) => {
  adminController.users(request, response).catch(next);
});
adminRoutes.post("/users", (request, response, next) => {
  adminController.createUser(request, response).catch(next);
});

adminRoutes.patch("/users/:id/status", (request, response, next) => {
  adminController.updateUserStatus(request, response).catch(next);
});
adminRoutes.patch("/users/:id/roles", (request, response, next) => {
  adminController.updateUserRoles(request, response).catch(next);
});

adminRoutes.get("/categories", (request, response, next) => {
  adminController.categories(request, response).catch(next);
});
adminRoutes.post("/categories", (request, response, next) => {
  adminController.createCategory(request, response).catch(next);
});
adminRoutes.put("/categories/:id", (request, response, next) => {
  adminController.updateCategory(request, response).catch(next);
});
adminRoutes.patch("/categories/:id/active", (request, response, next) => {
  adminController.setCategoryActive(request, response).catch(next);
});

adminRoutes.get("/locations/areas", (request, response, next) => {
  adminController.areas(request, response).catch(next);
});
adminRoutes.post("/locations/areas", (request, response, next) => {
  adminController.createArea(request, response).catch(next);
});
adminRoutes.put("/locations/areas/:id", (request, response, next) => {
  adminController.updateArea(request, response).catch(next);
});
adminRoutes.patch("/locations/areas/:id/active", (request, response, next) => {
  adminController.setAreaActive(request, response).catch(next);
});

adminRoutes.get("/locations/buildings", (request, response, next) => {
  adminController.buildings(request, response).catch(next);
});
adminRoutes.post("/locations/buildings", (request, response, next) => {
  adminController.createBuilding(request, response).catch(next);
});
adminRoutes.put("/locations/buildings/:id", (request, response, next) => {
  adminController.updateBuilding(request, response).catch(next);
});
adminRoutes.patch("/locations/buildings/:id/active", (request, response, next) => {
  adminController.setBuildingActive(request, response).catch(next);
});

adminRoutes.get("/locations/rooms", (request, response, next) => {
  adminController.rooms(request, response).catch(next);
});
adminRoutes.post("/locations/rooms", (request, response, next) => {
  adminController.createRoom(request, response).catch(next);
});
adminRoutes.put("/locations/rooms/:id", (request, response, next) => {
  adminController.updateRoom(request, response).catch(next);
});
adminRoutes.patch("/locations/rooms/:id/active", (request, response, next) => {
  adminController.setRoomActive(request, response).catch(next);
});

adminRoutes.get("/handover-points", (request, response, next) => {
  adminController.handoverPoints(request, response).catch(next);
});
adminRoutes.post("/handover-points", (request, response, next) => {
  adminController.createHandoverPoint(request, response).catch(next);
});
adminRoutes.put("/handover-points/:id", (request, response, next) => {
  adminController.updateHandoverPoint(request, response).catch(next);
});
adminRoutes.patch("/handover-points/:id/active", (request, response, next) => {
  adminController.setHandoverPointActive(request, response).catch(next);
});

adminRoutes.get("/reports", (request, response, next) => {
  adminController.reports(request, response).catch(next);
});
adminRoutes.patch("/reports/:id/handle", (request, response, next) => {
  adminController.handleReport(request, response).catch(next);
});
