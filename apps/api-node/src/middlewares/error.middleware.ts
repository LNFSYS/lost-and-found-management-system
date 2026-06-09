import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { fail } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";

export function notFoundHandler(request: Request, _response: Response, next: NextFunction) {
  next(new HttpError(404, `Route not found: ${request.method} ${request.originalUrl}`));
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    response.status(400).json(fail("VALIDATION_FAILED", "Validation failed", error.issues));
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json(fail("UPLOAD_ERROR", error.message));
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json(fail("HTTP_ERROR", error.message));
    return;
  }

  response
    .status(500)
    .json(
      fail(
        "INTERNAL_SERVER_ERROR",
        "Internal server error",
        env.nodeEnv === "development" && error instanceof Error ? error.message : undefined
      )
    );
}
