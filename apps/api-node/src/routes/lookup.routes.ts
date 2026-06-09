import { Router } from "express";
import { lookupController } from "../controllers/lookup.controller.js";

export const categoryRoutes = Router();
export const locationRoutes = Router();
export const handoverPointRoutes = Router();

categoryRoutes.get("/", (request, response, next) => {
  lookupController.categories(request, response).catch(next);
});

locationRoutes.get("/areas", (request, response, next) => {
  lookupController.areas(request, response).catch(next);
});

locationRoutes.get("/areas/:id/buildings", (request, response, next) => {
  lookupController.buildings(request, response).catch(next);
});

handoverPointRoutes.get("/", (request, response, next) => {
  lookupController.handoverPoints(request, response).catch(next);
});

handoverPointRoutes.get("/:id", (request, response, next) => {
  lookupController.handoverPointDetail(request, response).catch(next);
});
