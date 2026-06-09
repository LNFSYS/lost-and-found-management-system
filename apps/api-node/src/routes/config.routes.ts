import { Router } from "express";
import { configController } from "../controllers/config.controller.js";

export const configRoutes = Router();

configRoutes.get("/public", (request, response, next) => {
  configController.publicConfig(request, response).catch(next);
});
