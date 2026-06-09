import type { Request, Response } from "express";
import { lookupRepository } from "../repositories/lookup.repository.js";
import { ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";

function requireStringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }

  return value;
}

export const lookupController = {
  async categories(_request: Request, response: Response) {
    const categories = await lookupRepository.listCategories();
    response.json(ok({ categories }));
  },

  async areas(_request: Request, response: Response) {
    const areas = await lookupRepository.listAreas();
    response.json(ok({ areas }));
  },

  async buildings(request: Request, response: Response) {
    const buildings = await lookupRepository.listBuildingsByArea(requireStringParam(request.params.id, "id"));
    response.json(ok({ buildings }));
  },

  async handoverPoints(_request: Request, response: Response) {
    const handoverPoints = await lookupRepository.listHandoverPoints();
    response.json(ok({ handoverPoints }));
  },

  async handoverPointDetail(request: Request, response: Response) {
    const handoverPoint = await lookupRepository.findHandoverPointById(requireStringParam(request.params.id, "id"));
    if (!handoverPoint) {
      throw new HttpError(404, "Handover point not found");
    }

    response.json(ok({ handoverPoint }));
  }
};
