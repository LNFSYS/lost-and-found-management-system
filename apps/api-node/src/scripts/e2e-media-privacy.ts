const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const ownerPassword = process.env.E2E_PASSWORD ?? "12345678";
const publicViewerEmail = process.env.E2E_PUBLIC_VIEWER_EMAIL ?? "studentlnf@gmail.com";
const publicViewerPassword = process.env.E2E_CLAIMANT_PASSWORD ?? "12345678";
const unrelatedEmail = process.env.E2E_UNRELATED_EMAIL ?? "lecturerlnf@gmail.com";
const unrelatedPassword = process.env.E2E_UNRELATED_PASSWORD ?? "12345678";

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PostDetail {
  post: { id: string; contactInfo?: string | null; contactInfoHidden?: boolean };
  media: Array<{
    id: string;
    mediaKind?: "ITEM" | "EVIDENCE";
    secureUrl?: string;
    publicId?: string;
    imagePath?: string;
  }>;
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

async function imageRequest(path: string, token: string) {
  const response = await fetch(`${API_BASE_URL.replace(/\/api\/?$/, "")}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { status: response.status, contentType: response.headers.get("content-type") ?? "" };
}

function tinyPngFile() {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return new File([bytes], "e2e-private-evidence.png", { type: "image/png" });
}

async function waitForMatch(ownerToken: string, lostPostId: string, foundPostId: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const result = await request<{
      matches: Array<{ id: string; lostPostId: string; foundPostId: string }>;
    }>(`/posts/${lostPostId}/matches`, {}, ownerToken);
    const match = result.matches.find(
      (item) => item.lostPostId === lostPostId && item.foundPostId === foundPostId
    );
    if (match) {
      return match;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("Timed out waiting for a match result in the media privacy smoke.");
}

async function main() {
  const ownerToken = await login(ownerEmail, ownerPassword);
  const viewerToken = await login(publicViewerEmail, publicViewerPassword);
  const unrelatedToken = await login(unrelatedEmail, unrelatedPassword);
  const categories = await request<{ categories: Array<{ id: string; name: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for media privacy smoke.");
  }

  const uniqueToken = `e2e-media-privacy-${Date.now()}`;
  let createdPostId: string | null = null;
  let foundPostId: string | null = null;
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

    await request(`/posts/${created.post.id}/matches`, {}, viewerToken, 403);
    await request(`/posts/${created.post.id}/matches/explanations`, {}, viewerToken, 403);
    await request(`/posts/${created.post.id}/matches`, {}, ownerToken, 200);
    await request(`/posts/${created.post.id}/matches/explanations`, {}, ownerToken, 200);

    const upload = new FormData();
    upload.append("images", tinyPngFile());
    upload.append("evidenceImages", tinyPngFile());
    await request(`/posts/${created.post.id}/media`, { method: "POST", body: upload }, ownerToken, 201);

    const ownerDetail = await request<PostDetail>(`/posts/${created.post.id}`, {}, ownerToken);
    const postEvidence = ownerDetail.media.find((media) => media.mediaKind === "EVIDENCE");
    if (!postEvidence?.imagePath) {
      throw new Error("Expected owner to see their private post evidence media.");
    }
    if (postEvidence.secureUrl || postEvidence.publicId || /https?:\/\//i.test(JSON.stringify(postEvidence))) {
      throw new Error("Private post evidence exposed a raw storage URL or identifier.");
    }
    const unrelatedPostEvidence = await imageRequest(postEvidence.imagePath, unrelatedToken);
    if (unrelatedPostEvidence.status !== 403) {
      throw new Error(`Unrelated user must receive 403 for private post evidence, got ${unrelatedPostEvidence.status}.`);
    }
    const ownerPostEvidence = await imageRequest(postEvidence.imagePath, ownerToken);
    if (ownerPostEvidence.status !== 200 || !ownerPostEvidence.contentType.startsWith("image/")) {
      throw new Error("Authorized owner could not stream private post evidence.");
    }

    const viewerDetail = await request<PostDetail>(`/posts/${created.post.id}`, {}, viewerToken);
    if (viewerDetail.media.some((media) => media.mediaKind === "EVIDENCE")) {
      throw new Error("Public/non-owner post detail must not expose private evidence media.");
    }
    if (viewerDetail.post.contactInfo || !viewerDetail.post.contactInfoHidden) {
      throw new Error("Public/non-owner post detail must mask contact info.");
    }

    const found = await request<{ post: { id: string } }>("/posts", {
      method: "POST",
      body: JSON.stringify({
        type: "FOUND",
        title: `E2E claim privacy ${uniqueToken}`,
        description: `Private claim evidence ${uniqueToken}`,
        categoryId,
        roomText: "E2E secure evidence desk",
        contactInfo: "private-owner@example.com",
        lostFoundAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      })
    }, ownerToken, 201);
    foundPostId = found.post.id;

    const match = await waitForMatch(ownerToken, created.post.id, found.post.id);
    await request(`/posts/${created.post.id}/matches/${match.id}/feedback`, {
      method: "POST",
      body: JSON.stringify({ label: "FALSE_MATCH", note: "Unrelated reviewer must be denied" })
    }, unrelatedToken, 403);
    await request(`/posts/${created.post.id}/matches/${match.id}/feedback`, {
      method: "POST",
      body: JSON.stringify({ label: "TRUE_MATCH", note: "E2E owner review" })
    }, ownerToken);

    const claim = await request<{ claim: { id: string } }>("/claims", {
      method: "POST",
      body: JSON.stringify({
        postId: found.post.id,
        secretAnswer: "Private serial E2E-998877",
        description: "Private ownership details",
        approximateLocation: "E2E secure desk"
      })
    }, viewerToken, 201);
    const evidenceForm = new FormData();
    evidenceForm.append("evidence", tinyPngFile());
    evidenceForm.append("evidenceType", "OWNERSHIP_PROOF");
    const claimDetail = await request<{
      evidence: Array<{ id: string; imagePath: string }>;
    }>(`/claims/${claim.claim.id}/evidence`, { method: "POST", body: evidenceForm }, viewerToken, 201);
    const serializedClaim = JSON.stringify(claimDetail);
    if (/secureUrl|publicId|cloudinary|https?:\/\//i.test(serializedClaim)) {
      throw new Error("Claim detail exposed a raw private storage URL or identifier.");
    }
    const evidence = claimDetail.evidence[0];
    if (!evidence?.imagePath) {
      throw new Error("Claim evidence proxy path is missing.");
    }

    const denied = await imageRequest(evidence.imagePath, unrelatedToken);
    if (denied.status !== 403) {
      throw new Error(`Unrelated user must receive 403 for private claim evidence, got ${denied.status}.`);
    }
    const ownerImage = await imageRequest(evidence.imagePath, ownerToken);
    if (ownerImage.status !== 200 || !ownerImage.contentType.startsWith("image/")) {
      throw new Error(`Authorized owner could not stream private evidence: ${ownerImage.status} ${ownerImage.contentType}`);
    }
    await request(`/claims/${claim.claim.id}`, {}, ownerToken);
    const activity = await request<{
      activity: Array<{ action: string; entityId: string | null }>;
    }>("/auth/activity", {}, ownerToken);
    if (!activity.activity.some(
      (item) => item.action === "CLAIM_EVIDENCE_VIEWED" && item.entityId === claim.claim.id
    )) {
      throw new Error("Claim evidence view did not write the expected activity audit event.");
    }

    console.log(`Media privacy smoke passed. POST=${created.post.id} CLAIM=${claim.claim.id}`);
  } finally {
    if (foundPostId) {
      await request(`/posts/${foundPostId}`, { method: "DELETE" }, ownerToken).catch(() => undefined);
    }
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
