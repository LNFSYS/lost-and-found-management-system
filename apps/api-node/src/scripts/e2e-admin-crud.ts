const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "adminlnf@gmail.com";
const staffEmail = process.env.E2E_STAFF_EMAIL ?? "stafflnf@gmail.com";
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
  if (init.body) {
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
  const result = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return result.tokens.accessToken;
}

async function main() {
  const adminToken = await login(adminEmail);
  const staffToken = await login(staffEmail);
  const marker = Date.now();
  const publicCategories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, adminToken);
  const publicCategoryId = publicCategories.categories[0]?.id;
  if (!publicCategoryId) {
    throw new Error("No active category available for admin report CRUD smoke.");
  }

  await request("/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name: `Staff forbidden ${marker}` })
  }, staffToken, 403);

  const category = await request<{ id: string }>("/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name: `E2E Category ${marker}`, icon: "box", sortOrder: 999 })
  }, adminToken, 201);
  await request(`/admin/categories/${category.id}`, {
    method: "PUT",
    body: JSON.stringify({ name: `E2E Category Updated ${marker}`, icon: "box", sortOrder: 998 })
  }, adminToken);
  await request(`/admin/categories/${category.id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive: false })
  }, adminToken);

  const area = await request<{ id: string }>("/admin/locations/areas", {
    method: "POST",
    body: JSON.stringify({ name: `E2E Area ${marker}`, description: "Isolated CI area", sortOrder: 999 })
  }, adminToken, 201);
  await request(`/admin/locations/areas/${area.id}`, {
    method: "PUT",
    body: JSON.stringify({ name: `E2E Area Updated ${marker}`, description: "Updated CI area", sortOrder: 998 })
  }, adminToken);

  const building = await request<{ id: string }>("/admin/locations/buildings", {
    method: "POST",
    body: JSON.stringify({ areaId: area.id, name: `E2E Building ${marker}`, sortOrder: 999 })
  }, adminToken, 201);
  await request(`/admin/locations/buildings/${building.id}`, {
    method: "PUT",
    body: JSON.stringify({ areaId: area.id, name: `E2E Building Updated ${marker}`, sortOrder: 998 })
  }, adminToken);

  const handoverPayload = {
    name: `E2E Handover ${marker}`,
    address: "Isolated CI campus",
    areaId: area.id,
    buildingId: building.id,
    openingHours: "08:00-17:00",
    contactInfo: "e2e@example.com",
    mapPositionX: 50,
    mapPositionY: 50
  };
  const handover = await request<{ id: string }>("/admin/handover-points", {
    method: "POST",
    body: JSON.stringify(handoverPayload)
  }, adminToken, 201);
  await request(`/admin/handover-points/${handover.id}`, {
    method: "PUT",
    body: JSON.stringify({ ...handoverPayload, name: `E2E Handover Updated ${marker}` })
  }, adminToken);
  await request(`/admin/handover-points/${handover.id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive: false })
  }, adminToken);

  const user = await request<{ id: string }>("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: `e2e-admin-crud-${marker}@example.com`,
      password: "12345678",
      fullName: `E2E User ${marker}`,
      status: "ACTIVE",
      roles: ["STUDENT"]
    })
  }, adminToken, 201);
  await request(`/admin/users/${user.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "LOCKED" })
  }, adminToken);
  await request(`/admin/users/${user.id}/roles`, {
    method: "PATCH",
    body: JSON.stringify({ roles: ["USER", "LECTURER"] })
  }, adminToken);

  const [categories, areas, buildings, handovers, users] = await Promise.all([
    request<{ categories: Array<{ id: string; isActive: boolean }> }>("/admin/categories", {}, adminToken),
    request<{ areas: Array<{ id: string }> }>("/admin/locations/areas", {}, adminToken),
    request<{ buildings: Array<{ id: string }> }>("/admin/locations/buildings", {}, adminToken),
    request<{ handoverPoints: Array<{ id: string; isActive: boolean }> }>("/admin/handover-points", {}, adminToken),
    request<{ users: Array<{ id: string; status: string; roles: string[] }> }>("/admin/users", {}, adminToken)
  ]);

  if (categories.categories.find((item) => item.id === category.id)?.isActive !== false) throw new Error("Category toggle failed");
  if (!areas.areas.some((item) => item.id === area.id)) throw new Error("Area CRUD failed");
  if (!buildings.buildings.some((item) => item.id === building.id)) throw new Error("Building CRUD failed");
  if (handovers.handoverPoints.find((item) => item.id === handover.id)?.isActive !== false) throw new Error("Handover toggle failed");
  const createdUser = users.users.find((item) => item.id === user.id);
  if (createdUser?.status !== "LOCKED" || !createdUser.roles.includes("LECTURER")) throw new Error("User CRUD failed");

  const reportPost = await request<{ post: { id: string } }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "FOUND",
      title: `E2E report target ${marker}`,
      description: `E2E admin report handling ${marker}`,
      categoryId: publicCategoryId,
      roomText: "E2E report storage",
      contactInfo: "e2e@example.com",
      lostFoundAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    })
  }, adminToken, 201);
  const report = await request<{ id: string }>(`/posts/${reportPost.post.id}/report`, {
    method: "POST",
    body: JSON.stringify({ reason: `E2E report ${marker}`, details: "Isolated CI moderation report" })
  }, staffToken, 201);
  await request(`/admin/reports/${report.id}/handle`, {
    method: "PATCH",
    body: JSON.stringify({ status: "REVIEWED", note: "E2E reviewed", actionType: null })
  }, adminToken);
  await request(`/posts/${reportPost.post.id}`, { method: "DELETE" }, adminToken);

  console.log("Admin CRUD smoke passed for category, area, building, handover point, user and report management.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
