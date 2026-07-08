const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const claimantEmail = process.env.E2E_CLAIMANT_EMAIL ?? "stafflnf@gmail.com";
const claimantPassword = process.env.E2E_CLAIMANT_PASSWORD ?? "12345678";
const acceptedClaimId = process.env.E2E_ACCEPTED_CLAIM_ID;

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

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing ${name}. Set ${name} to run the core flow smoke test.`);
  }
  return value;
}

async function main() {
  const loginEmail = requireEnv("E2E_EMAIL", email);
  const loginPassword = requireEnv("E2E_PASSWORD", password);

  const login = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: loginEmail, password: loginPassword })
  });
  const token = login.tokens.accessToken;

  // Login as a second user to submit the claim (avoid claiming own item)
  const login2 = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: claimantEmail, password: claimantPassword })
  });
  const token2 = login2.tokens.accessToken;

  const categories = await request<{ categories: Array<{ id: string; name: string }> }>("/categories", {}, token);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for e2e post creation.");
  }

  const uniqueToken = `e2e-match-${Date.now()}`;
  const foundPost = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: `E2E FOUND ${uniqueToken}`,
      description: `E2E smoke found item with unique marker ${uniqueToken}`,
      categoryId,
      roomText: "E2E temporary storage",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    })
  }, token, 201);

  const lostPost = await request<{
    post: { id: string };
    matchSuggestions: Array<{ match: { totalScore: number; scoreTier?: string }; post: { id: string } }>;
  }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "LOST",
      title: `E2E LOST ${uniqueToken}`,
      description: `E2E smoke lost item with unique marker ${uniqueToken}`,
      categoryId,
      secretVerification: "E2E private ownership proof",
      customLocation: "E2E campus",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    })
  }, token, 201);
  const bestSuggestion = lostPost.matchSuggestions[0];
  if (!bestSuggestion || bestSuggestion.match.totalScore < 0.45 || !bestSuggestion.match.scoreTier) {
    throw new Error("Expected at least one tiered match suggestion for the E2E LOST/FOUND pair.");
  }

  const claim = await request<{ claim: { id: string } }>("/claims", {
    method: "POST",
    body: JSON.stringify({
      postId: foundPost.post.id,
      secretAnswer: "E2E private ownership proof",
      description: "E2E claim proof",
      approximateLocation: "E2E campus"
    })
  }, token2, 201);

  await request("/appointments", {
    method: "POST",
    body: JSON.stringify({
      claimId: claim.claim.id,
      proposedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      customLocation: "E2E appointment guard"
    })
  }, token, 409);

  await request(`/claims/${claim.claim.id}/accept`, { method: "PATCH" }, token);
  const appointment = await request<{ appointment: { id: string } }>("/appointments", {
    method: "POST",
    body: JSON.stringify({
      claimId: claim.claim.id,
      proposedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      customLocation: "E2E completed appointment"
    })
  }, token, 201);
  await request(`/appointments/${appointment.appointment.id}/accept`, { method: "PATCH" }, token2);
  await request(`/appointments/${appointment.appointment.id}/complete`, { method: "PATCH" }, token);
  await request(`/appointments/${appointment.appointment.id}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      rating: 5,
      comment: "E2E return feedback"
    })
  }, token2, 201);

  if (acceptedClaimId) {
    await request("/appointments", {
      method: "POST",
      body: JSON.stringify({
        claimId: acceptedClaimId,
        proposedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customLocation: "E2E accepted claim appointment"
      })
    }, token, 201);
  }

  await Promise.allSettled([
    request(`/posts/${lostPost.post.id}`, { method: "DELETE" }, token),
    request(`/posts/${foundPost.post.id}`, { method: "DELETE" }, token)
  ]).then((results) => {
    const skipped = results.filter((result) => result.status === "rejected").length;
    if (skipped > 0) {
      console.warn(`Core e2e cleanup skipped for ${skipped} post(s).`);
    }
  });

  console.log(`Core smoke passed. LOST=${lostPost.post.id} FOUND=${foundPost.post.id} CLAIM=${claim.claim.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
