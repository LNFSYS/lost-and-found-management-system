const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const password = process.env.E2E_PASSWORD ?? "12345678";
const claimantEmail = process.env.E2E_PUBLIC_VIEWER_EMAIL ?? "studentlnf@gmail.com";
const unrelatedEmail = process.env.E2E_UNRELATED_EMAIL ?? "lecturerlnf@gmail.com";

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
  return new File([bytes], "private-proof.png", { type: "image/png" });
}

async function imageStatus(path: string, token: string) {
  return fetch(`${API_BASE_URL.replace(/\/api\/?$/, "")}${path}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function main() {
  const [ownerToken, claimantToken, unrelatedToken] = await Promise.all([
    login(ownerEmail), login(claimantEmail), login(unrelatedEmail)
  ]);
  await request("/proof-vault", {}, undefined, 401);
  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) throw new Error("No category available for private assistance E2E.");

  const proof = await request<{ proof: { id: string } }>("/proof-vault", {
    method: "POST",
    body: JSON.stringify({
      itemName: "E2E private AirPods",
      proofType: "SERIAL_SUFFIX",
      privateDescription: "Scratch under the left earbud",
      secretValue: "FULL-SERIAL-E2E-9988"
    })
  }, claimantToken, 201);
  const proofId = proof.proof.id;
  await request(`/proof-vault/${proofId}`, { method: "PATCH", body: JSON.stringify({ itemName: "stolen" }) }, unrelatedToken, 404);
  await request(`/proof-vault/${proofId}`, { method: "DELETE" }, unrelatedToken, 404);
  await request(`/proof-vault/${proofId}/media`, {}, unrelatedToken, 404);

  const media = new FormData();
  media.append("media", png());
  const uploaded = await request<{ proof: unknown }>(`/proof-vault/${proofId}/media`, { method: "POST", body: media }, claimantToken, 201);
  if (/secureUrl|publicId|cloudinary|https?:\/\//i.test(JSON.stringify(uploaded))) throw new Error("Vault response exposed raw storage data.");

  const unique = Date.now();
  const found = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      visibilityMode: "PRIVATE_DETAILS",
      title: `AirPods serial SECRET-${unique}`,
      description: `Found at hidden room E2E-${unique} with unique scratch`,
      categoryId,
      roomText: `PRIVATE-ROOM-${unique}`,
      contactInfo: "private-owner@example.com",
      lostFoundAt: new Date(Date.now() - 30 * 60_000).toISOString()
    })
  }, ownerToken, 201);

  try {
    const publicDetail = await request<{ post: unknown; media: unknown[]; tags: unknown[] }>(`/posts/${found.post.id}`, {}, unrelatedToken);
    const serialized = JSON.stringify(publicDetail);
    if (/SECRET-|PRIVATE-ROOM|private-owner@example|unique scratch/i.test(serialized) || publicDetail.media.length > 0) {
      throw new Error("PRIVATE_DETAILS FOUND leaked private content.");
    }

    const claim = await request<{ claim: { id: string } }>("/claims", {
      method: "POST",
      body: JSON.stringify({
        postId: found.post.id,
        secretAnswer: "serial suffix 9988 and left scratch",
        description: "I owned these AirPods before loss",
        approximateLocation: "Alpha"
      })
    }, claimantToken, 201);
    const claimId = claim.claim.id;
    await request(`/claims/${claimId}/proof-vault/${proofId}`, { method: "POST" }, claimantToken, 201);
    await request(`/claims/${claimId}/proof-vault`, {}, unrelatedToken, 403);
    const claimantProofs = await request<{ proofs: Array<{ id: string; mediaPath: string | null }> }>(`/claims/${claimId}/proof-vault`, {}, claimantToken);
    const ownerProofs = await request<{ proofs: Array<{ id: string; mediaPath: string | null }> }>(`/claims/${claimId}/proof-vault`, {}, ownerToken);
    if (claimantProofs.proofs[0]?.id !== proofId || ownerProofs.proofs[0]?.id !== proofId) throw new Error("Authorized claim participants cannot view attached proof.");
    const mediaPath = ownerProofs.proofs[0]?.mediaPath;
    if (!mediaPath) throw new Error("Attached proof proxy path is missing.");
    if ((await imageStatus(mediaPath, unrelatedToken)).status !== 403) throw new Error("Unrelated user accessed attached proof media.");
    if ((await imageStatus(mediaPath, ownerToken)).status !== 200) throw new Error("Post owner could not access attached proof media.");

    await request(`/proof-vault/${proofId}`, { method: "DELETE" }, claimantToken);
    const afterArchive = await request<{ proofs: Array<{ id: string }> }>(`/claims/${claimId}/proof-vault`, {}, ownerToken);
    if (!afterArchive.proofs.some((item) => item.id === proofId)) throw new Error("Archiving proof broke claim history.");

    const summary = await request<{ verification: { reviewStatus?: string; ownershipConfidence?: number } }>(`/claims/${claimId}/verification`, {}, claimantToken);
    if (summary.verification.ownershipConfidence !== undefined || !summary.verification.reviewStatus) throw new Error("Claimant received reviewer-only consistency details.");
    const reviewer = await request<{ verification: { consistencyMap?: unknown[] } }>(`/claims/${claimId}/consistency-map`, {}, ownerToken);
    if (!reviewer.verification.consistencyMap?.length) throw new Error("Reviewer Evidence Consistency Map is missing.");

    const fake = new FormData();
    fake.append("image", new File(["not-an-image"], "fake.png", { type: "image/png" }));
    await request("/posts/ai-draft", { method: "POST", body: fake }, claimantToken, 422);
    console.log(`Private assistance E2E passed. POST=${found.post.id} CLAIM=${claimId}`);
  } finally {
    await request(`/posts/${found.post.id}`, { method: "DELETE" }, ownerToken).catch(() => undefined);
  }
}

main().catch((error: unknown) => { console.error(error); process.exit(1); });
