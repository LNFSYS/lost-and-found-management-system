const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const ownerPassword = process.env.E2E_PASSWORD ?? "12345678";
const publicViewerEmail = process.env.E2E_PUBLIC_VIEWER_EMAIL ?? "studentlnf@gmail.com";
const publicViewerPassword = process.env.E2E_CLAIMANT_PASSWORD ?? "12345678";

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PostDetail {
  post: { id: string; contactInfo?: string | null; contactInfoHidden?: boolean };
  media: Array<{ id: string; mediaKind?: "ITEM" | "EVIDENCE"; secureUrl: string }>;
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

function tinyPngFile() {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return new File([bytes], "e2e-private-evidence.png", { type: "image/png" });
}

async function main() {
  const ownerToken = await login(ownerEmail, ownerPassword);
  const viewerToken = await login(publicViewerEmail, publicViewerPassword);
  const categories = await request<{ categories: Array<{ id: string; name: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for media privacy smoke.");
  }

  const uniqueToken = `e2e-media-privacy-${Date.now()}`;
  let createdPostId: string | null = null;
  try {
    const created = await request<{ post: { id: string } }>("/posts", {
      method: "POST",
      body: JSON.stringify({
        type: "LOST",
        title: `E2E media privacy ${uniqueToken}`,
        description: `E2E private evidence filtering ${uniqueToken}`,
        categoryId,
        secretVerification: "private marker",
        customLocation: "E2E privacy campus",
        contactInfo: "private-e2e@example.com",
        lostFoundAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      })
    }, ownerToken, 201);
    createdPostId = created.post.id;

    const upload = new FormData();
    upload.append("images", tinyPngFile());
    upload.append("evidenceImages", tinyPngFile());
    await request(`/posts/${created.post.id}/media`, { method: "POST", body: upload }, ownerToken, 201);

    const ownerDetail = await request<PostDetail>(`/posts/${created.post.id}`, {}, ownerToken);
    if (!ownerDetail.media.some((media) => media.mediaKind === "EVIDENCE")) {
      throw new Error("Expected owner to see their private post evidence media.");
    }

    const viewerDetail = await request<PostDetail>(`/posts/${created.post.id}`, {}, viewerToken);
    if (viewerDetail.media.some((media) => media.mediaKind === "EVIDENCE")) {
      throw new Error("Public/non-owner post detail must not expose private evidence media.");
    }
    if (viewerDetail.post.contactInfo || !viewerDetail.post.contactInfoHidden) {
      throw new Error("Public/non-owner post detail must mask contact info.");
    }

    console.log(`Media privacy smoke passed. POST=${created.post.id}`);
  } finally {
    if (createdPostId) {
      await request(`/posts/${createdPostId}`, { method: "DELETE" }, ownerToken).catch((error: unknown) => {
        console.warn(`Media privacy e2e cleanup skipped: ${error instanceof Error ? error.message : "unknown error"}`);
      });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
