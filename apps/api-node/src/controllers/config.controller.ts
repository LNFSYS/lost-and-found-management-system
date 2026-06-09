import type { Request, Response } from "express";
import { configService } from "../services/config.service.js";
import { ok } from "../utils/api-response.js";

export const configController = {
  async publicConfig(_request: Request, response: Response) {
    const entries = await configService.getPublicConfig();
    response.json(ok({ entries }));
  }
};
