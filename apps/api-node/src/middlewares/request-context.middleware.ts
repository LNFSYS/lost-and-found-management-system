import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { metricsService } from "../services/metrics.service.js";
import { logger } from "../utils/logger.js";

const requestIdPattern = /^[a-zA-Z0-9._-]{8,128}$/;

function requestIdFromHeader(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && requestIdPattern.test(candidate) ? candidate : randomUUID();
}

export function requestContext(request: Request, response: Response, next: NextFunction) {
  const requestId = requestIdFromHeader(request.headers["x-request-id"]);
  const startedAt = process.hrtime.bigint();
  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const routePath = request.route?.path ? `${request.baseUrl}${request.route.path}` : "unmatched";
    metricsService.recordHttpRequest(request.method, routePath, response.statusCode, durationMs);
    logger.info("http_request", {
      requestId,
      method: request.method,
      path: request.originalUrl,
      route: routePath,
      status: response.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    });
  });

  next();
}
