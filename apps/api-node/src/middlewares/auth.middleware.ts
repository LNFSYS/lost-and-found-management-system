import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { validateAccessSession } from "../services/access-session.service.js";
import { isConfigured } from "../utils/configured.js";
import { HttpError } from "../utils/http-error.js";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  sessionVersion?: number;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AccessTokenPayload;
  }
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
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
    const payload = jwt.verify(token, accessSecret) as AccessTokenPayload;
    if (!(await validateAccessSession(payload))) {
      next(new HttpError(401, "Session is no longer active"));
      return;
    }
    request.auth = payload;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export async function optionalAuth(request: Request, _response: Response, next: NextFunction) {
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
    const payload = jwt.verify(token, accessSecret) as AccessTokenPayload;
    if (await validateAccessSession(payload)) {
      request.auth = payload;
    }
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
