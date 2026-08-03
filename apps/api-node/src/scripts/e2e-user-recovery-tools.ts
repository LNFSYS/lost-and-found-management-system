const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const password = process.env.E2E_PASSWORD ?? "12345678";
const lostOwnerEmail = process.env.E2E_LOST_OWNER_EMAIL ?? "studentlnf@gmail.com";
const finderEmail = process.env.E2E_FINDER_EMAIL ?? "lecturerlnf@gmail.com";

interface Envelope<T> { success: boolean; data?: T; message?: string; error?: string }

async function request<T>(path: string, init: RequestInit = {}, token?: string, expectedStatus = 200) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as Envelope<T>;
  if (response.status !== expectedStatus || (expectedStatus < 400 && !payload.success)) {
    throw new Error(`${path} expected ${expectedStatus}, got ${response.status}: ${payload.message ?? payload.error ?? "unknown"}`);
  }
  return payload.data as T;
}

async function login(email: string) {
  const result = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password })
  });
  return result.tokens.accessToken;
}

function png() {
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  return new File([bytes], "finder-quick-scan.png", { type: "image/png" });
}

async function main() {
  const [ownerToken, finderToken] = await Promise.all([login(lostOwnerEmail), login(finderEmail)]);
  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) throw new Error("No category available for recovery tools E2E.");
  const unique = Date.now();
  const lost = await request<{ post: { id: string; status: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "LOST",
      visibilityMode: "PUBLIC",
      title: `E2E LOST recovery ${unique}`,
      description: "Mất ví màu xanh có móc khóa tại khu Alpha.",
      categoryId,
      customLocation: "Alpha",
      contactInfo: "e2e-owner@example.com",
      lostFoundAt: new Date(Date.now() - 60 * 60_000).toISOString(),
      secretVerification: "vết xước nhỏ bên trong"
    })
  }, ownerToken, 201);

  let foundPostId: string | null = null;
  try {
    await request(`/posts/${lost.post.id}/search-companion`, {}, finderToken, 403);
    const answered = await request<{ profile: { revision: number }; completionPercent: number }>(`/posts/${lost.post.id}/search-companion/answers`, {
      method: "POST", body: JSON.stringify({ field: "primaryColor", value: "xanh" })
    }, ownerToken);
    if (answered.profile.revision < 1) throw new Error("Search Companion revision was not persisted.");
    const preview = await request<{ advisory: string; candidates: unknown[] }>(`/posts/${lost.post.id}/search-companion/recalculate`, { method: "POST" }, ownerToken);
    if (!/human review/i.test(preview.advisory)) throw new Error("Search preview omitted the human-review advisory.");

    const scanBody = new FormData();
    scanBody.append("image", png());
    scanBody.append("idempotencyKey", `e2e-${unique}`);
    scanBody.append("categoryId", categoryId);
    scanBody.append("source", "IMAGE");
    const scan = await request<{ id: string; candidates: Array<{ postId: string }>; advisory: string }>("/posts/finder-quick-scan", { method: "POST", body: scanBody }, finderToken);
    const retryBody = new FormData();
    retryBody.append("image", png());
    retryBody.append("idempotencyKey", `e2e-${unique}`);
    retryBody.append("categoryId", categoryId);
    retryBody.append("source", "IMAGE");
    const scanRetry = await request<{ id: string }>("/posts/finder-quick-scan", { method: "POST", body: retryBody }, finderToken);
    if (scanRetry.id !== scan.id) throw new Error("Finder scan idempotency created a duplicate session.");

    const selectedLostPostId = scan.candidates.some((candidate) => candidate.postId === lost.post.id) ? lost.post.id : null;
    await request(`/posts/finder-quick-scan/${scan.id}/create-draft`, {
      method: "POST", body: JSON.stringify({ selectedLostPostId })
    }, finderToken);
    const publishPayload = {
      type: "FOUND",
      visibilityMode: "PUBLIC",
      title: `E2E FOUND recovery ${unique}`,
      description: "Nhặt được ví màu xanh; cần chủ sở hữu cung cấp bằng chứng riêng.",
      categoryId,
      customLocation: "Alpha",
      contactInfo: "e2e-finder@example.com",
      lostFoundAt: new Date().toISOString(),
      handoverPointId: null,
      secretVerification: null
    };
    const published = await request<{ post: { id: string }; reused: boolean }>(`/posts/finder-quick-scan/${scan.id}/publish`, {
      method: "POST", body: JSON.stringify(publishPayload)
    }, finderToken, 201);
    foundPostId = published.post.id;
    const publishedRetry = await request<{ post: { id: string }; reused: boolean }>(`/posts/finder-quick-scan/${scan.id}/publish`, {
      method: "POST", body: JSON.stringify(publishPayload)
    }, finderToken);
    if (!publishedRetry.reused || publishedRetry.post.id !== foundPostId) throw new Error("Finder publish retry created a duplicate post.");

    const lostAfter = await request<{ post: { status: string } }>(`/posts/${lost.post.id}`, {}, ownerToken);
    if (lostAfter.post.status !== "OPEN") throw new Error("High-confidence assistance changed LOST status automatically.");
    const timeline = await request<{ events: Array<Record<string, unknown>>; privateEvidenceExcluded: boolean }>(`/posts/${lost.post.id}/recovery-timeline`, {}, ownerToken);
    if (!timeline.privateEvidenceExcluded || timeline.events.some((event) => "note" in event || "url" in event)) {
      throw new Error("Recovery Timeline exposed private evidence fields.");
    }
    await request(`/posts/${lost.post.id}/recovery-timeline`, {}, finderToken, 403);
    console.log(`User recovery tools E2E passed. LOST=${lost.post.id} FOUND=${foundPostId}`);
  } finally {
    if (foundPostId) await request(`/posts/${foundPostId}`, { method: "DELETE" }, finderToken).catch(() => undefined);
    await request(`/posts/${lost.post.id}`, { method: "DELETE" }, ownerToken).catch(() => undefined);
  }
}

main().catch((error: unknown) => { console.error(error); process.exit(1); });
