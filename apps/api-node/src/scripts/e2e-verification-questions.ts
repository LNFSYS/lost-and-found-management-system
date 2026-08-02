const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
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

async function request<T>(path: string, init: RequestInit = {}, token?: string, expectedStatus = 200) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
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

async function main() {
  const ownerToken = await login(ownerEmail, ownerPassword);
  const claimantToken = await login(claimantEmail, claimantPassword);
  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) throw new Error("No category available for verification-question smoke.");

  const marker = `e2e-verification-${Date.now()}`;
  const privateAnswer = "Q7Z9";
  const created = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: marker,
      description: `Found electronic item ${marker}`,
      categoryId,
      roomText: "E2E private verification desk",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    })
  }, ownerToken, 201);

  try {
    const suggestions = await request<{ suggestions: Array<{ prompt: string }> }>(
      `/posts/${created.post.id}/verification-questions/suggest`,
      { method: "POST" },
      ownerToken
    );
    if (suggestions.suggestions.length === 0) throw new Error("Question generator returned no suggestions.");

    const questionResult = await request<{ question: { id: string } }>(
      `/posts/${created.post.id}/verification-questions`,
      {
        method: "POST",
        body: JSON.stringify({
          prompt: "Bốn ký tự cuối của serial là gì?",
          questionType: "MASKED_SERIAL",
          sourceSignal: "serial_suffix",
          expectedAnswer: privateAnswer,
          weight: 0.9,
          privacyLevel: "HIGHLY_PRIVATE",
          approved: true
        })
      },
      ownerToken,
      201
    );
    if (JSON.stringify(questionResult).includes(privateAnswer) || /expectedAnswerHash/i.test(JSON.stringify(questionResult))) {
      throw new Error("Question API leaked a private expected answer or hash.");
    }

    const claim = await request<{ claim: { id: string } }>("/claims", {
      method: "POST",
      body: JSON.stringify({
        postId: created.post.id,
        secretAnswer: "Tai nghe có móc khóa riêng",
        description: marker,
        approximateLocation: "E2E campus"
      })
    }, claimantToken, 201);

    const claimantQuestions = await request<{ questions: Array<Record<string, unknown>> }>(
      `/claims/${claim.claim.id}/verification-questions`, {}, claimantToken
    );
    if (JSON.stringify(claimantQuestions).includes(privateAnswer) || /answerMatches/i.test(JSON.stringify(claimantQuestions))) {
      throw new Error("Claimant question view leaked an answer or comparison result.");
    }

    await request(`/claims/${claim.claim.id}/accept`, { method: "PATCH" }, ownerToken, 409);

    await request(
      `/posts/${created.post.id}/verification-questions`,
      {
        method: "POST",
        body: JSON.stringify({
          prompt: "Phụ kiện bí mật đi kèm vật phẩm là gì?",
          questionType: "TEXT",
          sourceSignal: "replacement-version-test",
          expectedAnswer: "hop vai den",
          weight: 0.7,
          privacyLevel: "PRIVATE",
          approved: true
        })
      },
      ownerToken,
      201
    );

    await request(
      `/claims/${claim.claim.id}/verification-questions/${questionResult.question.id}/answer`,
      { method: "POST", body: JSON.stringify({ answer: privateAnswer.toLowerCase() }) },
      claimantToken
    );

    const activity = await request<{ activity: Array<{ action: string; entityId: string | null; metadata: Record<string, unknown> }> }>(
      "/auth/activity", {}, claimantToken
    );
    const answerActivity = activity.activity.find((item) => item.action === "CLAIM_VERIFICATION_ANSWERED" && item.entityId === claim.claim.id);
    if (answerActivity && "matched" in answerActivity.metadata) {
      throw new Error("Claimant activity leaked the private answer comparison result.");
    }

    await request(`/claims/${claim.claim.id}/verification`, {}, claimantToken, 403);
    const reviewerQuestions = await request<{ questions: Array<{ id: string; answerMatches: boolean | null }> }>(
      `/claims/${claim.claim.id}/verification-questions`, {}, ownerToken
    );
    if (reviewerQuestions.questions[0]?.answerMatches !== true) {
      throw new Error("Reviewer did not receive the expected advisory match result.");
    }
    if (reviewerQuestions.questions.length !== 1 || !JSON.stringify(reviewerQuestions.questions).includes(questionResult.question.id)) {
      throw new Error("Claim did not retain its assigned verification-question version after replacement.");
    }
    const verification = await request<{ verification: { breakdown: { privateQuestionScore: number } } }>(
      `/claims/${claim.claim.id}/verification`, {}, ownerToken
    );
    if (verification.verification.breakdown.privateQuestionScore !== 100) {
      throw new Error("Verification score did not include the private question result.");
    }

    await request(`/claims/${claim.claim.id}/accept`, { method: "PATCH" }, ownerToken);
    await request(
      `/claims/${claim.claim.id}/verification-questions/${questionResult.question.id}/answer`,
      { method: "POST", body: JSON.stringify({ answer: privateAnswer }) },
      claimantToken,
      409
    );

    console.log("Verification-question smoke passed: privacy, normalization, authorization, terminal-state locking and advisory scoring.");
  } finally {
    await request(`/posts/${created.post.id}`, { method: "DELETE" }, ownerToken).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
