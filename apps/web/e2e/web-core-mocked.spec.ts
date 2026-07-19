import { expect, type Page, test } from "@playwright/test";

const now = "2026-07-19T08:00:00.000Z";

function makeUser(role: "STUDENT" | "STAFF") {
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.test`,
    fullName: role === "STAFF" ? "Demo Staff" : "Demo Student",
    studentCode: role === "STUDENT" ? "DEMO001" : null,
    roles: [role, "USER"],
    status: "ACTIVE",
    createdAt: now
  };
}

function makePost(id = "post-existing") {
  return {
    id,
    userId: "user-student",
    type: "LOST",
    status: "OPEN",
    title: "Ví màu nâu",
    description: "Ví da màu nâu có ngăn kéo khóa.",
    category: { id: "category-wallet", name: "Ví" },
    location: {
      areaId: "area-alpha",
      areaName: "Alpha",
      buildingId: "building-alpha",
      buildingName: "Tòa Alpha",
      roomText: "A101",
      roomName: null,
      customLocation: null
    },
    contactInfo: "student@example.test",
    lostFoundAt: now,
    handoverPoint: null,
    resolvedAt: null,
    viewCount: 0,
    owner: { id: "user-student", fullName: "Demo Student" },
    coverImageUrl: null,
    createdAt: now,
    updatedAt: now
  };
}

async function installMockApi(
  page: Page,
  role: "STUDENT" | "STAFF",
  onCreatePost?: (payload: Record<string, unknown>) => void
) {
  const user = makeUser(role);
  const existingPost = makePost();

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method();
    let data: unknown;

    if (path === "/auth/login" && method === "POST") {
      data = {
        user,
        tokens: {
          accessToken: "mock-access-token",
          accessTokenExpiresIn: "15m",
          refreshTokenExpiresIn: "30d"
        }
      };
    } else if (path === "/auth/me") {
      data = { user };
    } else if (path === "/auth/notifications") {
      data = { items: [], unreadCount: 0 };
    } else if (path === "/categories") {
      data = { categories: [{ id: "category-wallet", name: "Ví", parentId: null }] };
    } else if (path === "/locations/areas") {
      data = { areas: [{ id: "area-alpha", name: "Alpha" }] };
    } else if (path === "/locations/areas/area-alpha/buildings") {
      data = { buildings: [{ id: "building-alpha", areaId: "area-alpha", name: "Tòa Alpha" }] };
    } else if (path === "/handover-points") {
      data = { handoverPoints: [] };
    } else if (path === "/config/public") {
      data = { entries: [] };
    } else if (path === "/posts/my/match-suggestions") {
      data = { suggestions: [] };
    } else if (path === "/posts" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      onCreatePost?.(payload);
      data = { post: { ...existingPost, id: "post-created", ...payload }, matchSuggestions: [] };
    } else if (path === "/posts/post-created") {
      data = { post: makePost("post-created"), media: [], tags: [], matches: [] };
    } else if (path === "/posts/post-created/claims") {
      data = { claims: [] };
    } else if (path === "/posts/post-created/matches") {
      data = { matches: [] };
    } else if (path === "/posts/post-created/matches/explanations") {
      data = { explanations: [] };
    } else if (path === "/posts") {
      data = { items: [existingPost], page: 1, pageSize: 12, total: 1 };
    } else if (path === "/admin/dashboard/overview") {
      data = {
        overview: {
          users: 2,
          posts: 1,
          claims: 0,
          reports: 0,
          categories: 1,
          areas: 1,
          handoverPoints: 0,
          warehouseItems: 0,
          postsByStatus: [{ status: "OPEN", total: 1 }],
          postsByType: [{ type: "LOST", total: 1 }]
        }
      };
    } else if (path === "/admin/categories") {
      data = { categories: [] };
    } else if (path === "/admin/locations/areas") {
      data = { areas: [] };
    } else if (path === "/admin/locations/buildings") {
      data = { buildings: [] };
    } else if (path === "/admin/handover-points") {
      data = { handoverPoints: [] };
    } else if (path === "/admin/warehouse-items") {
      data = { warehouseItems: [] };
    } else if (path === "/admin/warehouse/capacity") {
      data = { capacity: { activeItems: 0, capacity: 100, warningAt: 80, usageRatio: 0, isFull: false, isNearFull: false } };
    } else if (path === "/admin/return-feedback") {
      data = { feedback: [] };
    } else {
      data = { items: [], page: 1, pageSize: 12, total: 0 };
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
}

async function login(page: Page, role: "STUDENT" | "STAFF") {
  await page.goto("/account");
  const form = page.locator("section.auth-card form");
  await form.getByLabel("Email").fill(`${role.toLowerCase()}@example.test`);
  await form.getByLabel("Mật khẩu").fill("12345678");
  await form.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mở menu tài khoản" })).toBeVisible();
}

test("student creates a LOST post through the web form", async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;
  await installMockApi(page, "STUDENT", (payload) => {
    submittedPayload = payload;
  });
  await login(page, "STUDENT");

  await page.getByRole("button", { name: "Đăng tin" }).first().click();
  await expect(page).toHaveURL(/\/create$/);
  const form = page.locator("form.create-report-form");
  await form.getByLabel("Tiêu đề").fill("Ví màu nâu");
  await form.getByLabel("Mô tả", { exact: true }).fill("Ví da màu nâu có ngăn kéo khóa và thẻ thư viện.");
  await form.getByLabel("Thông tin liên hệ").fill("student@example.test");
  await form.getByLabel("Nhóm danh mục").selectOption("category-wallet");
  await form.locator('select[name="areaId"]').selectOption("area-alpha");
  await form.locator('select[name="buildingId"]').selectOption("building-alpha");
  await form.getByLabel(/Mô tả chi tiết về dấu hiệu/).fill("Bên trong có thẻ thư viện mã DEMO001.");
  await form.getByRole("button", { name: "Đăng tin", exact: true }).click();

  await expect(page).toHaveURL(/\/posts\/post-created$/);
  expect(submittedPayload).toMatchObject({
    type: "LOST",
    title: "Ví màu nâu",
    categoryId: "category-wallet",
    areaId: "area-alpha",
    buildingId: "building-alpha"
  });
});

test("staff sees warehouse operations without admin-only tabs", async ({ page }) => {
  await installMockApi(page, "STAFF");
  await login(page, "STAFF");
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByRole("button", { name: "Mở bảng nhân viên" }).click();

  await expect(page.getByRole("heading", { name: "Bảng nhân viên" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quản lý kho" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Người dùng" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cấu hình" })).toHaveCount(0);
});
