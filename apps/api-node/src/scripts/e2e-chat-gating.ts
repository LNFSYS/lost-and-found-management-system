import { io, type Socket } from "socket.io-client";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const SOCKET_URL = process.env.E2E_SOCKET_URL ?? API_BASE_URL.replace(/\/api\/?$/, "");
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const ownerPassword = process.env.E2E_PASSWORD ?? "12345678";
const claimantEmail = process.env.E2E_CLAIMANT_EMAIL ?? "studentlnf@gmail.com";
const claimantPassword = process.env.E2E_CLAIMANT_PASSWORD ?? "12345678";

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface AckPayload {
  ok: boolean;
  error?: string;
  message?: unknown;
  messages?: unknown[];
}

function assertNoRawMediaUrl(payload: unknown, context: string) {
  const serialized = JSON.stringify(payload);
  if (/"mediaUrl"|res\.cloudinary\.com|https?:\/\//i.test(serialized)) {
    throw new Error(`${context} exposed a raw media URL.`);
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string, expectedStatus = 200) {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as Envelope<T>;
  if (response.status !== expectedStatus || (expectedStatus < 400 && !payload.success)) {
    throw new Error(`${path} expected ${expectedStatus}, got ${response.status}: ${payload.message ?? payload.error ?? "unknown"}`);
  }
  return payload.data as T;
}

async function login(email: string, password: string) {
  const data = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return data.tokens.accessToken;
}

function connectSocket(token: string) {
  return new Promise<Socket>((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      timeout: 5_000,
      reconnection: false
    });
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Socket connection timed out"));
    }, 7_000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      socket.close();
      reject(error);
    });
  });
}

function emitAck(socket: Socket, event: string, payload: Record<string, unknown>) {
  return new Promise<AckPayload>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} acknowledgement timed out`)), 5_000);
    socket.emit(event, payload, (ack: AckPayload) => {
      clearTimeout(timeout);
      resolve(ack);
    });
  });
}

async function createFoundPost(token: string, categoryId: string, marker: string) {
  return request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: `E2E chat ${marker}`,
      description: `E2E chat status guard ${marker}`,
      categoryId,
      roomText: "E2E temporary storage",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    })
  }, token, 201);
}

async function createClaim(token: string, postId: string, marker: string) {
  return request<{ claim: { id: string } }>("/claims", {
    method: "POST",
    body: JSON.stringify({
      postId,
      secretAnswer: `E2E ownership ${marker}`,
      description: `E2E chat claim ${marker}`,
      approximateLocation: "E2E campus"
    })
  }, token, 201);
}

async function main() {
  const ownerToken = await login(ownerEmail, ownerPassword);
  const claimantToken = await login(claimantEmail, claimantPassword);
  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for chat gating smoke.");
  }

  const socket = await connectSocket(claimantToken);
  const createdPostIds: string[] = [];
  try {
    const marker = Date.now().toString();

    const acceptedPost = await createFoundPost(ownerToken, categoryId, `${marker}-accepted`);
    createdPostIds.push(acceptedPost.post.id);
    const acceptedClaim = await createClaim(claimantToken, acceptedPost.post.id, `${marker}-accepted`);

    const pendingJoin = await emitAck(socket, "claim:join", { claimId: acceptedClaim.claim.id });
    if (pendingJoin.ok) {
      throw new Error("PENDING claim unexpectedly joined chat.");
    }
    const pendingMessage = await emitAck(socket, "chat:message", {
      claimId: acceptedClaim.claim.id,
      content: "This message must be blocked"
    });
    if (pendingMessage.ok) {
      throw new Error("PENDING claim unexpectedly sent a chat message.");
    }

    await request(`/claims/${acceptedClaim.claim.id}/accept`, { method: "PATCH" }, ownerToken);
    const acceptedJoin = await emitAck(socket, "claim:join", { claimId: acceptedClaim.claim.id });
    if (!acceptedJoin.ok) {
      throw new Error(`ACCEPTED claim could not join chat: ${acceptedJoin.error ?? "unknown"}`);
    }
    assertNoRawMediaUrl(acceptedJoin.messages, "claim:join history");
    const acceptedMessage = await emitAck(socket, "chat:message", {
      claimId: acceptedClaim.claim.id,
      content: "E2E accepted chat message"
    });
    if (!acceptedMessage.ok) {
      throw new Error(`ACCEPTED claim could not send chat: ${acceptedMessage.error ?? "unknown"}`);
    }
    assertNoRawMediaUrl(acceptedMessage.message, "chat:message acknowledgement");
    const forgedImage = await emitAck(socket, "chat:image", {
      claimId: acceptedClaim.claim.id,
      mediaUrl: "http://127.0.0.1/internal-image"
    });
    if (forgedImage.ok) {
      throw new Error("chat:image unexpectedly accepted a client-supplied mediaUrl.");
    }

    const rejectedPost = await createFoundPost(ownerToken, categoryId, `${marker}-rejected`);
    createdPostIds.push(rejectedPost.post.id);
    const rejectedClaim = await createClaim(claimantToken, rejectedPost.post.id, `${marker}-rejected`);
    await request(`/claims/${rejectedClaim.claim.id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason: "E2E rejection" })
    }, ownerToken);
    if ((await emitAck(socket, "claim:join", { claimId: rejectedClaim.claim.id })).ok) {
      throw new Error("REJECTED claim unexpectedly joined chat.");
    }

    const cancelledPost = await createFoundPost(ownerToken, categoryId, `${marker}-cancelled`);
    createdPostIds.push(cancelledPost.post.id);
    const cancelledClaim = await createClaim(claimantToken, cancelledPost.post.id, `${marker}-cancelled`);
    await request(`/claims/${cancelledClaim.claim.id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason: "E2E cancellation" })
    }, claimantToken);
    if ((await emitAck(socket, "claim:join", { claimId: cancelledClaim.claim.id })).ok) {
      throw new Error("CANCELLED claim unexpectedly joined chat.");
    }

    console.log("Chat gating smoke passed for PENDING, ACCEPTED, REJECTED, CANCELLED and forged image URL cases.");
  } finally {
    socket.close();
    await Promise.allSettled(
      createdPostIds.map((postId) => request(`/posts/${postId}`, { method: "DELETE" }, ownerToken))
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
