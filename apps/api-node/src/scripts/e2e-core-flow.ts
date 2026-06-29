const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
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
    body: JSON.stringify({ email: "vochieuquan@gmail.com", password: "Password123!" })
  });
  const token2 = login2.tokens.accessToken;

  const categories = await request<{ categories: Array<{ id: string; name: string }> }>("/categories", {}, token);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for e2e post creation.");
  }

  const lostPost = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "LOST",
      title: `E2E LOST ${Date.now()}`,
      description: "E2E smoke lost item",
      categoryId,
      secretVerification: "E2E private ownership proof",
      customLocation: "E2E campus",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    })
  }, token, 201);

  const foundPost = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: `E2E FOUND ${Date.now()}`,
      description: "E2E smoke found item",
      categoryId,
      roomText: "E2E temporary storage",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    })
  }, token, 201);

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

  console.log(`Core smoke passed. LOST=${lostPost.post.id} FOUND=${foundPost.post.id} CLAIM=${claim.claim.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
