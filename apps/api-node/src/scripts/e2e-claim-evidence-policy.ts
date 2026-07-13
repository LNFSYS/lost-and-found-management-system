const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const ownerPassword = process.env.E2E_PASSWORD ?? "12345678";
const claimantEmail = process.env.E2E_CLAIMANT_EMAIL ?? "studentlnf@gmail.com";
const claimantPassword = process.env.E2E_CLAIMANT_PASSWORD ?? "12345678";
const privateAnswer = "E2E private evidence signal IMEI 359876543210123";

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

async function login(email: string, password: string) {
  const result = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return result.tokens.accessToken;
}

function evidenceForm() {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
  const form = new FormData();
  form.append("evidence", new File([png], "policy-evidence.png", { type: "image/png" }));
  form.append("evidenceType", "OWNERSHIP_PROOF");
  return form;
}

async function main() {
  const ownerToken = await login(ownerEmail, ownerPassword);
  const claimantToken = await login(claimantEmail, claimantPassword);
  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for claim evidence policy smoke.");
  }

  const marker = `e2e-evidence-policy-${Date.now()}`;
  const created = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: marker,
      description: `Claim evidence policy ${marker}`,
      categoryId,
      roomText: "E2E evidence policy storage",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    })
  }, ownerToken, 201);

  try {
    const claim = await request<{ claim: { id: string } }>("/claims", {
      method: "POST",
      body: JSON.stringify({
        postId: created.post.id,
        secretAnswer: privateAnswer,
        description: marker,
        approximateLocation: "E2E campus"
      })
    }, claimantToken, 201);

    const serializedClaim = JSON.stringify(claim);
    if (serializedClaim.includes(privateAnswer) || serializedClaim.includes("secretAnswer")) {
      throw new Error("Claim API response must not expose the ownership answer or its field name.");
    }

    const evidenceDetail = await request<{
      evidence: Array<{ id: string; imagePath: string }>;
    }>(`/claims/${claim.claim.id}/evidence`, {
      method: "POST",
      body: evidenceForm()
    }, claimantToken, 201);
    const serializedEvidence = JSON.stringify(evidenceDetail);
    if (/secureUrl|publicId|cloudinary|https?:\/\//i.test(serializedEvidence)) {
      throw new Error("Claim evidence response must not expose raw storage identifiers or URLs.");
    }
    const evidence = evidenceDetail.evidence[0];
    if (!evidence?.imagePath.endsWith(`/claims/${claim.claim.id}/evidence/${evidence.id}/image`)) {
      throw new Error("Claim evidence response must provide the authenticated application proxy path.");
    }

    await request(`/claims/${claim.claim.id}/evidence`, {
      method: "POST",
      body: evidenceForm()
    }, ownerToken, 403);

    await request(`/claims/${claim.claim.id}/accept`, { method: "PATCH" }, ownerToken);
    await request(`/claims/${claim.claim.id}/evidence`, {
      method: "POST",
      body: evidenceForm()
    }, claimantToken, 409);

    console.log("Claim evidence policy smoke passed for reviewer upload denial and accepted-claim lock.");
  } finally {
    await request(`/posts/${created.post.id}`, { method: "DELETE" }, ownerToken).catch((error: unknown) => {
      console.warn(`Evidence policy cleanup skipped: ${error instanceof Error ? error.message : "unknown error"}`);
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
