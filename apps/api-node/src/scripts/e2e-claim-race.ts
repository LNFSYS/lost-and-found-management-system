const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const ownerPassword = process.env.E2E_PASSWORD ?? "12345678";
const firstClaimantEmail = process.env.E2E_FIRST_CLAIMANT_EMAIL ?? "stafflnf@gmail.com";
const firstClaimantPassword = process.env.E2E_FIRST_CLAIMANT_PASSWORD ?? "12345678";
const secondClaimantEmail = process.env.E2E_SECOND_CLAIMANT_EMAIL ?? "studentlnf@gmail.com";
const secondClaimantPassword = process.env.E2E_SECOND_CLAIMANT_PASSWORD ?? "12345678";

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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

async function rawRequest(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  return {
    status: response.status,
    payload: (await response.json().catch(() => ({}))) as Envelope<unknown>
  };
}

async function login(email: string, password: string) {
  const data = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return data.tokens.accessToken;
}

async function main() {
  const ownerToken = await login(ownerEmail, ownerPassword);
  const firstClaimantToken = await login(firstClaimantEmail, firstClaimantPassword);
  const secondClaimantToken = await login(secondClaimantEmail, secondClaimantPassword);
  const categories = await request<{ categories: Array<{ id: string; name: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for claim race smoke.");
  }

  const uniqueToken = `e2e-claim-race-${Date.now()}`;
  const foundPost = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: `E2E claim race ${uniqueToken}`,
      description: `Race smoke found item ${uniqueToken}`,
      categoryId,
      roomText: "E2E race storage",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    })
  }, ownerToken, 201);

  const firstClaim = await request<{ claim: { id: string } }>("/claims", {
    method: "POST",
    body: JSON.stringify({
      postId: foundPost.post.id,
      secretAnswer: "E2E first claimant private proof",
      description: "E2E first claimant race proof",
      approximateLocation: "E2E race campus"
    })
  }, firstClaimantToken, 201);

  const secondClaim = await request<{ claim: { id: string } }>("/claims", {
    method: "POST",
    body: JSON.stringify({
      postId: foundPost.post.id,
      secretAnswer: "E2E second claimant private proof",
      description: "E2E second claimant race proof",
      approximateLocation: "E2E race campus"
    })
  }, secondClaimantToken, 201);

  const results = await Promise.allSettled([
    rawRequest(`/claims/${firstClaim.claim.id}/accept`, { method: "PATCH" }, ownerToken),
    rawRequest(`/claims/${secondClaim.claim.id}/accept`, { method: "PATCH" }, ownerToken)
  ]);

  const statuses = results.map((result) => {
    if (result.status === "rejected") {
      throw result.reason;
    }
    return result.value.status;
  });
  const successCount = statuses.filter((status) => status === 200).length;
  const conflictCount = statuses.filter((status) => status === 409).length;
  if (successCount !== 1 || conflictCount !== 1) {
    throw new Error(`Expected exactly one accepted claim and one 409 loser, got statuses: ${statuses.join(", ")}`);
  }

  const claimList = await request<{ claims: Array<{ id: string; status: string }> }>(
    `/posts/${foundPost.post.id}/claims`,
    {},
    ownerToken
  );
  const acceptedClaims = claimList.claims.filter((item) => item.status === "ACCEPTED");
  if (acceptedClaims.length !== 1) {
    throw new Error(`Database invariant failed: expected one accepted claim, got ${acceptedClaims.length}`);
  }

  await request(`/posts/${foundPost.post.id}`, { method: "DELETE" }, ownerToken).catch((error: unknown) => {
    console.warn(`Claim race e2e cleanup skipped: ${error instanceof Error ? error.message : "unknown error"}`);
  });

  console.log(`Two-claim race smoke passed. ACCEPTED_CLAIM=${acceptedClaims[0]?.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
