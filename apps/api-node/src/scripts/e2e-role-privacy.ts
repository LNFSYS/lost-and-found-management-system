const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "adminlnf@gmail.com";
const staffEmail = process.env.E2E_STAFF_EMAIL ?? "stafflnf@gmail.com";
const password = process.env.E2E_PASSWORD ?? "12345678";
const claimId = process.env.E2E_PRIVATE_CLAIM_ID;

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

async function login(email: string) {
  const data = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return data.tokens.accessToken;
}

async function main() {
  const adminToken = await login(adminEmail);
  const staffToken = await login(staffEmail);

  await request("/admin/users", {}, adminToken, 200);
  await request("/admin/users", {}, staffToken, 403);
  await request("/admin/reports", {}, staffToken, 403);
  await request("/admin/config", {}, staffToken, 403);
  await request("/admin/warehouse-items", {}, staffToken, 200);
  await request("/admin/dashboard/overview", {}, staffToken, 200);

  if (claimId) {
    await request(`/claims/${claimId}`, {}, staffToken, 200);
  }

  console.log("Role/privacy smoke passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
