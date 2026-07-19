import { createClient } from "redis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

type ManagedRedisClient = ReturnType<typeof createClient>;

let sharedClient: ManagedRedisClient | null = null;
const socketClients: ManagedRedisClient[] = [];
let startupFallbackActive = false;

function buildClient() {
  let hasConnected = false;
  const client = createClient({
    url: env.redisUrl,
    socket: {
      connectTimeout: env.redisConnectTimeoutMs,
      reconnectStrategy: (retries) => {
        if (!env.redisRequired && !hasConnected) {
          return false;
        }
        return retries >= 5
          ? new Error("Redis reconnect limit reached")
          : Math.min(250 * 2 ** retries, 5_000);
      }
    }
  });
  client.on("ready", () => {
    hasConnected = true;
  });
  client.on("error", (error) => {
    if (!env.redisRequired && !hasConnected) {
      return;
    }
    logger.warn("redis_error", { error });
  });
  return client;
}

export function redisConfigured() {
  return Boolean(env.redisUrl);
}

export function redisRequired() {
  return env.redisRequired;
}

export function validateRedisConfiguration(redisUrl = env.redisUrl, required = env.redisRequired) {
  if (required && !redisUrl) {
    throw new Error("REDIS_URL is required when REDIS_REQUIRED=true");
  }
}

export function shouldFailWhenRedisIsUnavailable(required = env.redisRequired) {
  return required;
}

export async function connectSharedRedis() {
  validateRedisConfiguration();
  if (!redisConfigured()) {
    return null;
  }
  if (!sharedClient) {
    sharedClient = buildClient();
  }
  if (!sharedClient.isOpen) {
    try {
      await sharedClient.connect();
      startupFallbackActive = false;
      logger.info("redis_connected", { purpose: "shared" });
    } catch (error) {
      sharedClient = null;
      if (shouldFailWhenRedisIsUnavailable()) {
        throw error;
      }
      startupFallbackActive = true;
      logger.warn("redis_unavailable_using_local_fallback", {
        purpose: "shared",
        connectTimeoutMs: env.redisConnectTimeoutMs
      });
      return null;
    }
  }
  return sharedClient;
}

export function getSharedRedis() {
  return sharedClient?.isReady ? sharedClient : null;
}

export async function createSocketRedisClients() {
  if (!getSharedRedis()) {
    return null;
  }
  const publisher = buildClient();
  const subscriber = publisher.duplicate();
  socketClients.push(publisher, subscriber);
  await Promise.all([publisher.connect(), subscriber.connect()]);
  logger.info("redis_connected", { purpose: "socket-adapter" });
  return { publisher, subscriber };
}

export function redisHealth() {
  if (!redisConfigured()) {
    return { configured: false, required: redisRequired(), ready: false, mode: "local" as const };
  }
  return {
    configured: true,
    required: redisRequired(),
    ready: Boolean(sharedClient?.isReady),
    mode: sharedClient?.isReady
      ? "distributed" as const
      : startupFallbackActive
        ? "local_fallback" as const
        : "degraded" as const
  };
}

export async function closeRedisConnections() {
  const clients = [sharedClient, ...socketClients].filter((client): client is ManagedRedisClient => Boolean(client));
  await Promise.all(clients.map(async (client) => {
    if (client.isOpen) {
      await client.quit().catch(() => client.destroy());
    }
  }));
  sharedClient = null;
  socketClients.length = 0;
  startupFallbackActive = false;
}
