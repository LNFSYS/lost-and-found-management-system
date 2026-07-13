import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";

export function canReadPostMatches(auth: AccessTokenPayload, ownerId: string) {
  return auth.sub === ownerId || auth.roles.includes("STAFF") || auth.roles.includes("ADMIN");
}
