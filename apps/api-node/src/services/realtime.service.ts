import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { createSocketRedisClients, redisConfigured } from "../config/redis.js";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { chatRepository } from "../repositories/chat.repository.js";
import { isConfigured } from "../utils/configured.js";
import { logger } from "../utils/logger.js";
import { cloudinaryService } from "./cloudinary.service.js";
import { metricsService } from "./metrics.service.js";

let realtimeIo: Server | null = null;

function authFromSocket(handshakeAuth: unknown): string | null {
  if (typeof handshakeAuth === "object" && handshakeAuth !== null && "token" in handshakeAuth) {
    const token = (handshakeAuth as { token?: unknown }).token;
    return typeof token === "string" ? token : null;
  }
  return null;
}

export async function setupRealtimeServer(server: HttpServer) {
  const socketOrigins = env.socketCorsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
  const io = new Server(server, {
    cors: {
      origin: socketOrigins,
      credentials: true
    }
  });
  realtimeIo = io;

  if (redisConfigured()) {
    try {
      const clients = await createSocketRedisClients();
      if (clients) {
        io.adapter(createAdapter(clients.publisher, clients.subscriber));
        logger.info("socket_adapter_ready", { mode: "redis" });
        metricsService.increment("lnfs_socket_adapter_initializations_total", { mode: "redis" });
      } else {
        logger.info("socket_adapter_ready", { mode: "single-process", reason: "redis-unavailable" });
        metricsService.increment("lnfs_socket_adapter_initializations_total", { mode: "single_process" });
      }
    } catch (error) {
      if (env.redisRequired) {
        logger.error("socket_adapter_failed", { error });
        throw error;
      }
      logger.warn("socket_adapter_fallback", { mode: "single-process" });
      metricsService.increment("lnfs_socket_adapter_initializations_total", { mode: "single_process" });
    }
  } else {
    logger.info("socket_adapter_ready", { mode: "single-process" });
    metricsService.increment("lnfs_socket_adapter_initializations_total", { mode: "single_process" });
  }

  io.use((socket, next) => {
    const token = authFromSocket(socket.handshake.auth);
    if (!token || !isConfigured(env.jwtAccessSecret)) {
      next(new Error("Unauthorized socket"));
      return;
    }
    try {
      socket.data.auth = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
      socket.data.token = token;
      next();
    } catch {
      next(new Error("Unauthorized socket"));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.data.auth as AccessTokenPayload;
    const eventWindow = { startedAt: Date.now(), count: 0 };
    socket.use(([event], next) => {
      try {
        jwt.verify(socket.data.token as string, env.jwtAccessSecret!);
      } catch {
        metricsService.increment("lnfs_socket_event_rejections_total", { reason: "invalid_token" });
        next(new Error("Socket token expired or invalid"));
        return;
      }
      const now = Date.now();
      if (now - eventWindow.startedAt >= 60_000) {
        eventWindow.startedAt = now;
        eventWindow.count = 0;
      }
      eventWindow.count += 1;
      if (eventWindow.count > 120) {
        metricsService.increment("lnfs_socket_event_rejections_total", { reason: "rate_limit" });
        next(new Error("Too many socket events"));
        return;
      }
      metricsService.increment("lnfs_socket_event_middleware_total", { event: String(event) });
      next();
    });
    metricsService.socketConnected();
    metricsService.increment("lnfs_socket_connections_total");
    socket.join(`user:${auth.sub}`);
    socket.on("disconnect", (reason) => {
      metricsService.socketDisconnected();
      metricsService.increment("lnfs_socket_disconnects_total", { reason });
    });

    socket.on("claim:join", async (input: { claimId?: string }, ack?: (payload: unknown) => void) => {
      metricsService.increment("lnfs_socket_events_total", { event: "claim_join" });
      try {
        const claimId = input.claimId;
        if (!claimId || !(await chatRepository.canUseClaimChat(claimId, auth.sub, auth.roles))) {
          ack?.({ ok: false, error: "Forbidden" });
          return;
        }
        const room = await chatRepository.getOrCreateRoom(claimId);
        if (!room) {
          ack?.({ ok: false, error: "Room not found" });
          return;
        }
        const socketRoom = `claim:${room.id}`;
        socket.join(socketRoom);
        const messages = await chatRepository.listMessages(room.id);
        ack?.({ ok: true, roomId: room.id, messages });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    });

    socket.on("chat:message", async (input: { claimId?: string; content?: string }, ack?: (payload: unknown) => void) => {
      metricsService.increment("lnfs_socket_events_total", { event: "chat_message" });
      try {
        const claimId = input.claimId;
        const content = input.content?.trim();
        if (!claimId || !content || !(await chatRepository.canUseClaimChat(claimId, auth.sub, auth.roles))) {
          ack?.({ ok: false, error: "Invalid chat message" });
          return;
        }
        const room = await chatRepository.getOrCreateRoom(claimId);
        if (!room) {
          ack?.({ ok: false, error: "Room not found" });
          return;
        }
        const message = await chatRepository.createMessage({
          roomId: room.id,
          senderId: auth.sub,
          content,
          messageType: "TEXT"
        });
        io.to(`claim:${room.id}`).emit("chat:message", message);
        ack?.({ ok: true, message });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    });

    socket.on("chat:image", async (input: { claimId?: string; mediaPublicId?: string }, ack?: (payload: unknown) => void) => {
      metricsService.increment("lnfs_socket_events_total", { event: "chat_image" });
      try {
        const claimId = input.claimId;
        const mediaPublicId = input.mediaPublicId?.trim();
        if (!claimId || !mediaPublicId || !(await chatRepository.canUseClaimChat(claimId, auth.sub, auth.roles))) {
          ack?.({ ok: false, error: "Invalid chat image" });
          return;
        }
        const media = await cloudinaryService.resolveUploadedImage(mediaPublicId, `lnfs/private/claim-chat/${claimId}`);
        const room = await chatRepository.getOrCreateRoom(claimId);
        if (!room) {
          ack?.({ ok: false, error: "Room not found" });
          return;
        }
        const message = await chatRepository.createMessage({
          roomId: room.id,
          senderId: auth.sub,
          mediaUrl: media.secureUrl,
          mediaPublicId: media.publicId,
          messageType: "IMAGE"
        });
        io.to(`claim:${room.id}`).emit("chat:message", message);
        ack?.({ ok: true, message });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    });

    socket.on("chat:seen", async (input: { claimId?: string }, ack?: (payload: unknown) => void) => {
      metricsService.increment("lnfs_socket_events_total", { event: "chat_seen" });
      try {
        const claimId = input.claimId;
        if (!claimId || !(await chatRepository.canUseClaimChat(claimId, auth.sub, auth.roles))) {
          ack?.({ ok: false, error: "Forbidden" });
          return;
        }
        const room = await chatRepository.getOrCreateRoom(claimId);
        if (!room) {
          ack?.({ ok: false, error: "Room not found" });
          return;
        }
        await chatRepository.markRoomRead(room.id, auth.sub);
        io.to(`claim:${room.id}`).emit("chat:seen", { roomId: room.id, readerId: auth.sub });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  });

  return io;
}

export function emitUserNotification(userId: string, notification: unknown) {
  realtimeIo?.to(`user:${userId}`).emit("notification:new", notification);
}

export async function closeRealtimeServer() {
  if (!realtimeIo) {
    return;
  }
  await new Promise<void>((resolve) => realtimeIo?.close(() => resolve()));
  realtimeIo = null;
}
