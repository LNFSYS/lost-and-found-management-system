import { Router } from "express";
import { openApiDocument } from "../docs/openapi.js";

export const docsRoutes = Router();

docsRoutes.get("/", (_request, response) => {
  response.json(openApiDocument);
});
