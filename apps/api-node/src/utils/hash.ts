import { createHash, randomBytes, randomInt } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(byteLength = 48) {
  return randomBytes(byteLength).toString("base64url");
}

export function randomOtp() {
  return String(randomInt(100000, 1000000));
}
