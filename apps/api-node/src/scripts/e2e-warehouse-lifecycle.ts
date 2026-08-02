import { dbPool } from "../config/db.js";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "adminlnf@gmail.com";
const password = process.env.E2E_PASSWORD ?? "12345678";
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

async function login(email = adminEmail, loginPassword = password) {
  const data = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: loginPassword })
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
  const claimantToken = await login(claimantEmail, claimantPassword);
  await assertWarehouseExport(token);
  const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

  await request("/admin/warehouse-items", {
    method: "POST",
    body: JSON.stringify({
      itemName: `E2E terminal create bypass ${Date.now()}`,
      status: "DISPOSED"
    })
  }, token, 409);

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

  await request(`/admin/warehouse-items/${created.id}`, {
    method: "PUT",
    body: JSON.stringify({
      itemName: "E2E terminal PUT bypass",
      status: "TRANSFERRED"
    })
  }, token, 409);

  await request(`/admin/warehouse-items/${created.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "STORED" })
  }, token);

  await request(`/admin/warehouse-items/${created.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "EXPIRED" })
  }, token);

  await request(`/admin/warehouse-items/${created.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "DONATED" })
  }, token, 409);

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

  const activity = await request<{
    activity: Array<{ action: string; entityId: string | null }>;
  }>("/auth/activity", {}, token);
  for (const expectedAction of [
    "WAREHOUSE_ITEM_CREATED",
    "WAREHOUSE_ITEM_STATUS_CHANGED",
    "WAREHOUSE_OVERDUE_ITEM_PROCESSED"
  ]) {
    if (!activity.activity.some((item) => item.action === expectedAction && item.entityId === created.id)) {
      throw new Error(`${expectedAction} audit event is missing for the warehouse item.`);
    }
  }

  await request(`/admin/warehouse-items/${created.id}`, { method: "DELETE" }, token).catch((error: unknown) => {
    console.warn(`Warehouse e2e cleanup skipped: ${error instanceof Error ? error.message : "unknown error"}`);
  });
  const activityAfterDelete = await request<{
    activity: Array<{ action: string; entityId: string | null }>;
  }>("/auth/activity", {}, token);
  if (!activityAfterDelete.activity.some(
    (item) => item.action === "WAREHOUSE_ITEM_SOFT_DELETED" && item.entityId === created.id
  )) {
    throw new Error("WAREHOUSE_ITEM_SOFT_DELETED audit event is missing.");
  }

  const graceItem = await request<{ id: string }>("/admin/warehouse-items", {
    method: "POST",
    body: JSON.stringify({
      itemName: `E2E grace guard ${Date.now()}`,
      status: "EXPIRED",
      receivedAt: oldDate,
      retentionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }, token, 201);
  await request(`/admin/warehouse-items/${graceItem.id}/process`, {
    method: "POST",
    body: JSON.stringify({ status: "DISPOSED", note: "Must be rejected before grace eligibility" })
  }, token, 409);

  const documentItem = await request<{ id: string }>("/admin/warehouse-items", {
    method: "POST",
    body: JSON.stringify({
      itemName: `Thẻ sinh viên E2E ${Date.now()}`,
      status: "EXPIRED",
      receivedAt: oldDate,
      retentionDeadline: oldDate
    })
  }, token, 201);
  await request(`/admin/warehouse-items/${documentItem.id}/process`, {
    method: "POST",
    body: JSON.stringify({ status: "DONATED", note: "Document donation must be rejected" })
  }, token, 409);
  await request(`/admin/warehouse-items/${documentItem.id}/process`, {
    method: "POST",
    body: JSON.stringify({ status: "TRANSFERRED", note: "Transferred to Student Services" })
  }, token);

  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, token);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for warehouse claim/appointment regression.");
  }
  const uniqueToken = `e2e-warehouse-eligibility-${Date.now()}`;
  const foundPost = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: uniqueToken,
      description: `Warehouse eligibility fixture ${uniqueToken}`,
      categoryId,
      roomText: "E2E warehouse",
      contactInfo: "e2e@example.com",
      lostFoundAt: oldDate
    })
  }, token, 201);
  const eligibilityItem = await request<{ id: string }>("/admin/warehouse-items", {
    method: "POST",
    body: JSON.stringify({
      postId: foundPost.post.id,
      itemName: `E2E claim and appointment guard ${Date.now()}`,
      status: "EXPIRED",
      receivedAt: oldDate,
      retentionDeadline: oldDate
    })
  }, token, 201);
  const claim = await request<{ claim: { id: string } }>("/claims", {
    method: "POST",
    body: JSON.stringify({
      postId: foundPost.post.id,
      secretAnswer: "E2E warehouse ownership proof",
      description: "E2E active claim guard",
      approximateLocation: "FPTU"
    })
  }, claimantToken, 201);
  await request(`/admin/warehouse-items/${eligibilityItem.id}/process`, {
    method: "POST",
    body: JSON.stringify({ status: "DISPOSED", note: "Active claim must block disposition" })
  }, token, 409);

  await request(`/claims/${claim.claim.id}/accept`, { method: "PATCH" }, token);
  const appointment = await request<{ appointment: { id: string } }>("/appointments", {
    method: "POST",
    body: JSON.stringify({
      claimId: claim.claim.id,
      proposedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      customLocation: "E2E warehouse appointment"
    })
  }, token, 201);
  await request(`/appointments/${appointment.appointment.id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({
      proposedAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      customLocation: "E2E rescheduled warehouse appointment"
    })
  }, claimantToken);

  // Isolate the appointment guard: disposition must still fail when no claim is active.
  await dbPool.execute(
    "UPDATE claims SET status = 'REJECTED', updated_at = UTC_TIMESTAMP() WHERE id = ?",
    [claim.claim.id]
  );
  await request(`/admin/warehouse-items/${eligibilityItem.id}/process`, {
    method: "POST",
    body: JSON.stringify({ status: "DISPOSED", note: "RESCHEDULED appointment must block disposition" })
  }, token, 409);

  const raceItem = await request<{ id: string }>("/admin/warehouse-items", {
    method: "POST",
    body: JSON.stringify({
      itemName: `E2E concurrent process ${Date.now()}`,
      status: "EXPIRED",
      receivedAt: oldDate,
      retentionDeadline: oldDate
    })
  }, token, 201);
  const raceResults = await Promise.all([
    rawRequest(`/admin/warehouse-items/${raceItem.id}/process`, {
      method: "POST",
      body: JSON.stringify({ status: "DISPOSED", note: "Concurrent disposition contender one" })
    }, token),
    rawRequest(`/admin/warehouse-items/${raceItem.id}/process`, {
      method: "POST",
      body: JSON.stringify({ status: "DONATED", note: "Concurrent disposition contender two" })
    }, token)
  ]);
  const raceStatuses = raceResults.map((result) => result.status).sort((left, right) => left - right);
  if (raceStatuses[0] !== 200 || raceStatuses[1] !== 409) {
    throw new Error(`Expected one successful process and one conflict, got ${raceStatuses.join(", ")}`);
  }

  await Promise.allSettled([
    request(`/admin/warehouse-items/${graceItem.id}`, { method: "DELETE" }, token),
    request(`/admin/warehouse-items/${documentItem.id}`, { method: "DELETE" }, token),
    request(`/admin/warehouse-items/${eligibilityItem.id}`, { method: "DELETE" }, token),
    request(`/admin/warehouse-items/${raceItem.id}`, { method: "DELETE" }, token),
    request(`/posts/${foundPost.post.id}`, { method: "DELETE" }, token)
  ]);

  console.log(`Warehouse lifecycle regression passed. ITEM=${created.id} RACE_ITEM=${raceItem.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbPool.end();
  });
