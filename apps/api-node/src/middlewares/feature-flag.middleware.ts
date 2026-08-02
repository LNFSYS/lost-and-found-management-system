import type { NextFunction, Request, Response } from "express";
import { configRepository } from "../repositories/config.repository.js";
import { HttpError } from "../utils/http-error.js";

export function requireFeatureFlag(key: string) {
  return async (_request: Request, _response: Response, next: NextFunction) => {
    try {
      const enabled = await configRepository.booleanValue(key);
      if (!enabled) {
        next(new HttpError(404, "Feature is not enabled"));
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
