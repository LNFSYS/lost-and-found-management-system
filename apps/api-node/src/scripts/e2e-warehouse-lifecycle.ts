const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "adminlnf@gmail.com";
const password = process.env.E2E_PASSWORD ?? "12345678";

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

async function login() {
  const data = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password })
  });
  return data.tokens.accessToken;
}

async function assertWarehouseExport(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/warehouse-items/export.csv`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status !== 200) {
    throw new Error(`/admin/warehouse-items/export.csv expected 200, got ${response.status}`);
  }
  const text = await response.text();
  if (!text.includes("itemName") || !text.includes("status")) {
    throw new Error("Warehouse CSV export is missing expected headers.");
  }
}

async function main() {
  const token = await login();
  await assertWarehouseExport(token);
  const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

  const created = await request<{ id: string }>("/admin/warehouse-items", {
    method: "POST",
    body: JSON.stringify({
      itemName: `E2E warehouse item ${Date.now()}`,
      description: "General item for warehouse lifecycle smoke test",
      status: "RECEIVED",
      finderName: "E2E Admin",
      finderContact: "e2e@example.com",
      receivedAt: oldDate,
      retentionDeadline: oldDate
    })
  }, token, 201);

  await request(`/admin/warehouse-items/${created.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "STORED" })
  }, token);

  await request(`/admin/warehouse-items/${created.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "EXPIRED" })
  }, token);

  await request(`/admin/warehouse-items/${created.id}/process`, {
    method: "POST",
    body: JSON.stringify({
      status: "DONATED",
      note: "E2E donated after retention deadline and grace period"
    })
  }, token);

  await request(`/admin/warehouse-items/${created.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "STORED" })
  }, token, 409);

  await request(`/admin/warehouse-items/${created.id}`, { method: "DELETE" }, token).catch((error: unknown) => {
    console.warn(`Warehouse e2e cleanup skipped: ${error instanceof Error ? error.message : "unknown error"}`);
  });

  console.log(`Warehouse lifecycle smoke passed. ITEM=${created.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
