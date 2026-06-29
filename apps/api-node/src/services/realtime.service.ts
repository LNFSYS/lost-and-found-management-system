import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { chatRepository } from "../repositories/chat.repository.js";
import { isConfigured } from "../utils/configured.js";

let realtimeIo: Server | null = null;

function authFromSocket(handshakeAuth: unknown): string | null {
  if (typeof handshakeAuth === "object" && handshakeAuth !== null && "token" in handshakeAuth) {
    const token = (handshakeAuth as { token?: unknown }).token;
    return typeof token === "string" ? token : null;
  }
  return null;
}

export function setupRealtimeServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });
  realtimeIo = io;

  io.use((socket, next) => {
    const token = authFromSocket(socket.handshake.auth);
    if (!token || !isConfigured(env.jwtAccessSecret)) {
      next(new Error("Unauthorized socket"));
      return;
    }
    try {
      socket.data.auth = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
      next();
    } catch {
      next(new Error("Unauthorized socket"));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.data.auth as AccessTokenPayload;
    socket.join(`user:${auth.sub}`);

    socket.on("claim:join", async (input: { claimId?: string }, ack?: (payload: unknown) => void) => {
      try {
        const claimId = input.claimId;
        if (!claimId || !(await chatRepository.canAccessClaim(claimId, auth.sub, auth.roles))) {
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
      try {
        const claimId = input.claimId;
        const content = input.content?.trim();
        if (!claimId || !content || !(await chatRepository.canAccessClaim(claimId, auth.sub, auth.roles))) {
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

    socket.on("chat:image", async (input: { claimId?: string; mediaUrl?: string; mediaPublicId?: string }, ack?: (payload: unknown) => void) => {
      try {
        const claimId = input.claimId;
        const mediaUrl = input.mediaUrl?.trim();
        if (!claimId || !mediaUrl || !(await chatRepository.canAccessClaim(claimId, auth.sub, auth.roles))) {
          ack?.({ ok: false, error: "Invalid chat image" });
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
          mediaUrl,
          mediaPublicId: input.mediaPublicId ?? null,
          messageType: "IMAGE"
        });
        io.to(`claim:${room.id}`).emit("chat:message", message);
        ack?.({ ok: true, message });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    });

    socket.on("chat:seen", async (input: { claimId?: string }, ack?: (payload: unknown) => void) => {
      try {
        const claimId = input.claimId;
        if (!claimId || !(await chatRepository.canAccessClaim(claimId, auth.sub, auth.roles))) {
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
