import { createHash, timingSafeEqual } from "node:crypto";
import { getSharedRedis } from "../config/redis.js";
import { randomToken, sha256 } from "../utils/hash.js";

const GOOGLE_OAUTH_REQUEST_TTL_SECONDS = 10 * 60;
const MAX_LOCAL_REQUESTS = 10_000;
const REDIS_KEY_PREFIX = "auth:google-oauth:";

interface LocalRequest {
  codeVerifier: string;
  expiresAt: number;
}

interface OAuthRequestRedis {
  set(
    key: string,
    value: string,
    options: { EX: number; NX: true }
  ): Promise<string | null>;
  getDel(key: string): Promise<string | null>;
}

export interface GoogleOAuthRequest {
  state: string;
  codeChallenge: string;
}

export function pkceS256Challenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function oauthStateMatches(expected: string | undefined, actual: string | undefined) {
  if (!expected || !actual) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export class GoogleOAuthRequestStore {
  private readonly localRequests = new Map<string, LocalRequest>();

  constructor(
    private readonly redisProvider: () => OAuthRequestRedis | null = () => getSharedRedis(),
    private readonly now: () => number = () => Date.now()
  ) {}

  private key(state: string) {
    return `${REDIS_KEY_PREFIX}${sha256(state)}`;
  }

  private pruneLocalRequests() {
    const now = this.now();
    for (const [key, request] of this.localRequests) {
      if (request.expiresAt <= now) {
        this.localRequests.delete(key);
      }
    }
  }

  async create(): Promise<GoogleOAuthRequest> {
    const redis = this.redisProvider();
    this.pruneLocalRequests();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const state = randomToken(32);
      const codeVerifier = randomToken(64);
      const key = this.key(state);

      if (redis) {
        const stored = await redis.set(key, codeVerifier, {
          EX: GOOGLE_OAUTH_REQUEST_TTL_SECONDS,
          NX: true
        });
        if (stored !== "OK") {
          continue;
        }
      } else {
        if (this.localRequests.size >= MAX_LOCAL_REQUESTS) {
          throw new Error("Google OAuth request capacity exceeded");
        }
        if (this.localRequests.has(key)) {
          continue;
        }
        this.localRequests.set(key, {
          codeVerifier,
          expiresAt: this.now() + GOOGLE_OAUTH_REQUEST_TTL_SECONDS * 1000
        });
      }

      return {
        state,
        codeChallenge: pkceS256Challenge(codeVerifier)
      };
    }

    throw new Error("Unable to create Google OAuth request");
  }

  async consume(state: string | undefined, boundState: string | undefined): Promise<string | null> {
    if (!oauthStateMatches(state, boundState)) {
      return null;
    }

    const key = this.key(state!);
    const redis = this.redisProvider();
    if (redis) {
      return redis.getDel(key);
    }

    const request = this.localRequests.get(key);
    if (!request) {
      return null;
    }

    this.localRequests.delete(key);
    if (request.expiresAt <= this.now()) {
      return null;
    }
    return request.codeVerifier;
  }
}

export const googleOAuthRequestStore = new GoogleOAuthRequestStore();
