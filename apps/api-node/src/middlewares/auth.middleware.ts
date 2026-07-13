import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { isConfigured } from "../utils/configured.js";
import { HttpError } from "../utils/http-error.js";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AccessTokenPayload;
  }
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authHeader = request.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    next(new HttpError(401, "Missing bearer token"));
    return;
  }

  const accessSecret = env.jwtAccessSecret;
  if (!isConfigured(accessSecret)) {
    next(new HttpError(500, "JWT_ACCESS_SECRET is not configured"));
    return;
  }

  try {
    request.auth = jwt.verify(token, accessSecret) as AccessTokenPayload;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const authHeader = request.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    next();
    return;
  }

  const accessSecret = env.jwtAccessSecret;
  if (!isConfigured(accessSecret)) {
    next(new HttpError(500, "JWT_ACCESS_SECRET is not configured"));
    return;
  }

  try {
    request.auth = jwt.verify(token, accessSecret) as AccessTokenPayload;
    next();
  } catch {
    next();
  }
}

export function requireAnyRole(roles: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const userRoles = request.auth?.roles ?? [];
    if (!roles.some((role) => userRoles.includes(role))) {
      next(new HttpError(403, "Insufficient role"));
      return;
    }

    next();
  };
}
