import { io, type Socket } from "socket.io-client";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const SOCKET_URL = process.env.E2E_SOCKET_URL ?? "http://localhost:3002";
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const ownerPassword = process.env.E2E_PASSWORD ?? "12345678";
const claimantEmail = process.env.E2E_CLAIMANT_EMAIL ?? "studentlnf@gmail.com";
const claimantPassword = process.env.E2E_CLAIMANT_PASSWORD ?? "12345678";
const unrelatedEmail = process.env.E2E_UNRELATED_EMAIL ?? "lecturerlnf@gmail.com";
const unrelatedPassword = process.env.E2E_UNRELATED_PASSWORD ?? "12345678";

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface RealtimeNotification {
  id: string;
  userId: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
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
  const data = await request<{ user: { id: string }; tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return { userId: data.user.id, token: data.tokens.accessToken };
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
      reject(new Error(`Socket connection to ${SOCKET_URL} timed out`));
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

function waitForNotification(socket: Socket, predicate: (notification: RealtimeNotification) => boolean) {
  return new Promise<RealtimeNotification>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("notification:new", listener);
      reject(new Error("Cross-instance notification timed out"));
    }, 8_000);
    const listener = (notification: RealtimeNotification) => {
      if (!predicate(notification)) {
        return;
      }
      clearTimeout(timeout);
      socket.off("notification:new", listener);
      resolve(notification);
    };
    socket.on("notification:new", listener);
  });
}

async function main() {
  if (API_BASE_URL.replace(/\/$/, "") === `${SOCKET_URL.replace(/\/$/, "")}/api`) {
    throw new Error("Scale-out smoke requires E2E_API_URL and E2E_SOCKET_URL to target different API instances.");
  }

  const owner = await login(ownerEmail, ownerPassword);
  const claimant = await login(claimantEmail, claimantPassword);
  const unrelated = await login(unrelatedEmail, unrelatedPassword);
  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, owner.token);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for Socket.IO scale-out smoke.");
  }

  const [ownerSocket, unrelatedSocket] = await Promise.all([
    connectSocket(owner.token),
    connectSocket(unrelated.token)
  ]);
  let unrelatedNotifications = 0;
  unrelatedSocket.on("notification:new", () => {
    unrelatedNotifications += 1;
  });

  let postId: string | undefined;
  try {
    const marker = Date.now().toString();
    const created = await request<{ post: { id: string } }>("/posts", {
      method: "POST",
      body: JSON.stringify({
        type: "FOUND",
        title: `E2E socket scale-out ${marker}`,
        description: `Cross-instance Redis adapter notification ${marker}`,
        categoryId,
        roomText: "E2E temporary storage",
        contactInfo: "e2e@example.com",
        lostFoundAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      })
    }, owner.token, 201);
    postId = created.post.id;

    const notificationPromise = waitForNotification(
      ownerSocket,
      (notification) => notification.type === "CLAIM_SUBMITTED"
    );
    const claim = await request<{ claim: { id: string } }>("/claims", {
      method: "POST",
      body: JSON.stringify({
        postId,
        secretAnswer: `Private ownership signal ${marker}`,
        description: `Socket scale-out claim ${marker}`,
        approximateLocation: "FPT University Da Nang campus"
      })
    }, claimant.token, 201);
    const notification = await notificationPromise;
    if (
      notification.userId !== owner.userId
      || notification.entityType !== "CLAIM"
      || notification.entityId !== claim.claim.id
    ) {
      throw new Error("Cross-instance notification contained an invalid target or entity.");
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
    if (unrelatedNotifications !== 0) {
      throw new Error(`Unrelated user room received ${unrelatedNotifications} private notification(s).`);
    }

    console.log("Socket.IO scale-out smoke passed across API instances with Redis room isolation.");
  } finally {
    ownerSocket.close();
    unrelatedSocket.close();
    if (postId) {
      await request(`/posts/${postId}`, { method: "DELETE" }, owner.token).catch(() => undefined);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
