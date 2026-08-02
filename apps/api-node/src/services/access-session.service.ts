import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import type { UserStatus } from "../models/user.model.js";
import { sessionRepository } from "../repositories/session.repository.js";

export interface AccessSessionState {
  status: UserStatus;
  sessionVersion: number;
}

export function isAccessSessionCurrent(payload: AccessTokenPayload, state: AccessSessionState | null) {
  return (
    state !== null &&
    state.status === "ACTIVE" &&
    Number.isInteger(payload.sessionVersion) &&
    payload.sessionVersion === state.sessionVersion
  );
}

export async function validateAccessSession(payload: AccessTokenPayload) {
  return isAccessSessionCurrent(payload, await sessionRepository.findState(payload.sub));
}
