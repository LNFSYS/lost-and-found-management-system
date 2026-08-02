import { expect, type Page, test } from "@playwright/test";

const now = "2026-07-19T08:00:00.000Z";

type MockRole = "STUDENT" | "STAFF" | "ADMIN";

function makeUser(role: MockRole) {
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.test`,
    fullName: role === "ADMIN" ? "Demo Admin" : role === "STAFF" ? "Demo Staff" : "Demo Student",
    studentCode: role === "STUDENT" ? "DEMO001" : null,
    roles: [role, "USER"],
    status: "ACTIVE",
    createdAt: now
  };
}

function makePost(id = "post-existing", type: "LOST" | "FOUND" = "LOST") {
  return {
    id,
    userId: type === "FOUND" ? "user-finder" : "user-student",
    type,
    status: "OPEN",
    title: type === "FOUND" ? "Ví sinh viên nhặt được" : "Ví màu nâu",
    description: type === "FOUND" ? "Nhặt được ví da tại sảnh Alpha." : "Ví da màu nâu có ngăn kéo khóa.",
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
    owner: { id: type === "FOUND" ? "user-finder" : "user-student", fullName: type === "FOUND" ? "Demo Finder" : "Demo Student" },
    coverImageUrl: null,
    createdAt: now,
    updatedAt: now
  };
}

async function installMockApi(
  page: Page,
  role: MockRole,
  options: {
    onCreatePost?: (payload: Record<string, unknown>) => void;
    onSubmitClaim?: (payload: Record<string, unknown>) => void;
    claimStatus?: "PENDING" | "ACCEPTED";
    onAcceptClaim?: () => void;
    onCreateAppointment?: (payload: Record<string, unknown>) => void;
    includeMatch?: boolean;
    onMatchFeedback?: (payload: Record<string, unknown>) => void;
    appointmentStatus?: "PENDING" | "ACCEPTED" | "COMPLETED";
    onAppointmentProof?: () => void;
    onCompleteAppointment?: () => void;
    onAppointmentFeedback?: (payload: Record<string, unknown>) => void;
    aiFeatures?: boolean;
    radarCategoryAlert?: boolean;
  } = {}
) {
  const user = makeUser(role);
  const existingPost = makePost("post-existing", "FOUND");
  let claimStatus: "PENDING" | "ACCEPTED" = options.claimStatus ?? "PENDING";
  let appointmentStatus = options.appointmentStatus;
  let proofUploaded = false;

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
      data = { entries: options.aiFeatures ? [
        { key: "ai.verification_questions_enabled", value: true, valueType: "BOOLEAN", description: null },
        { key: "ai.campus_radar_enabled", value: true, valueType: "BOOLEAN", description: null },
        { key: "ai.visual_hunt_enabled", value: true, valueType: "BOOLEAN", description: null }
      ] : [] };
    } else if (path === "/posts/my/match-suggestions") {
      data = { suggestions: [] };
    } else if (path === "/posts" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      options.onCreatePost?.(payload);
      data = { post: { ...existingPost, id: "post-created", ...payload }, matchSuggestions: [] };
    } else if (path === "/claims" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      options.onSubmitClaim?.(payload);
      data = {
        claim: {
          id: "claim-created",
          postId: "post-existing",
          postOwnerId: "user-finder",
          claimant: { id: user.id, fullName: user.fullName },
          status: claimStatus,
          description: payload.description ?? null,
          approximateLostAt: payload.approximateLostAt ?? null,
          approximateLocation: payload.approximateLocation ?? null,
          createdAt: now
        },
        evidence: []
      };
    } else if (path === "/posts/post-created") {
      data = { post: makePost("post-created"), media: [], tags: [], matches: [] };
    } else if (path === "/posts/post-existing") {
      data = {
        post: existingPost,
        media: [],
        tags: [],
        matches: options.includeMatch ? [{
          id: "match-review-1",
          lostPostId: "post-lost-related",
          foundPostId: "post-existing",
          totalScore: 0.82,
          textScore: 0.76,
          categoryScore: 1,
          locationScore: 0.8,
          timeScore: 0.7,
          createdAt: now
        }] : []
      };
    } else if (path === "/posts/post-existing/matches/explanations") {
      data = {
        explanations: options.includeMatch ? [{
          matchId: "match-review-1",
          lostPostId: "post-lost-related",
          foundPostId: "post-existing",
          totalScore: 0.82,
          summary: "Cùng danh mục và khu vực Alpha",
          reasons: ["Trùng danh mục Ví", "Cùng tòa Alpha", "Thời gian chênh lệch dưới 24 giờ"]
        }] : []
      };
    } else if (path === "/posts/post-existing/matches/match-review-1/feedback" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      options.onMatchFeedback?.(payload);
      data = {
        feedback: {
          id: "feedback-review-1",
          matchId: "match-review-1",
          label: payload.label
        }
      };
    } else if (path === "/posts/post-existing/claims") {
      data = {
        claims: options.claimStatus ? [{
          id: "claim-pending",
          postId: "post-existing",
          postOwnerId: "user-finder",
          claimant: { id: "user-student", fullName: "Demo Student" },
          status: claimStatus,
          description: "Ví có vết xước nhỏ",
          approximateLostAt: now,
          approximateLocation: "Sảnh Alpha",
          rejectionReason: null,
          moreInfoRequest: null,
          acceptedAt: claimStatus === "ACCEPTED" ? now : null,
          rejectedAt: null,
          cancelledAt: null,
          createdAt: now,
          updatedAt: now
        }] : []
      };
    } else if (path === "/claims/claim-pending/verification") {
      data = {
        verification: {
          claimId: "claim-pending",
          ownershipConfidence: 78,
          level: "HIGH",
          reviewConfidenceTier: "HIGH_REVIEW",
          isSystemVerified: false,
          note: "Mức hỗ trợ review, không tự động xác nhận quyền sở hữu.",
          breakdown: { matchScore: 80, textScore: 75, locationScore: 90, timeScore: 70, evidenceScore: 75 },
          signals: { hasClaimantMatchedLostPost: true, evidenceCount: 1, hasEvidenceOcrText: false, hasApproximateLostTime: true, hasApproximateLocation: true }
        }
      };
    } else if (path === "/claims/claim-pending/accept" && method === "PATCH") {
      claimStatus = "ACCEPTED";
      options.onAcceptClaim?.();
      data = { claim: { id: "claim-pending", status: "ACCEPTED" }, evidence: [] };
    } else if (path === "/appointments" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      options.onCreateAppointment?.(payload);
      data = { appointment: { id: "appointment-created", claimId: "claim-pending", status: "PENDING", ...payload } };
    } else if (path === "/appointments/claim/claim-pending") {
      data = {
        appointments: appointmentStatus ? [{
          id: "appointment-existing",
          claimId: "claim-pending",
          postId: "post-existing",
          proposer: { id: "user-staff", fullName: "Demo Staff" },
          status: appointmentStatus,
          proposedAt: now,
          handoverPoint: null,
          customLocation: "Quầy bàn giao Alpha",
          rejectionReason: null,
          cancellationReason: null,
          acceptedAt: appointmentStatus === "PENDING" ? null : now,
          completedAt: appointmentStatus === "COMPLETED" ? now : null,
          proof: proofUploaded ? {
            imageUrl: "/api/appointments/appointment-existing/proof-image",
            uploadedBy: { id: "user-staff", fullName: "Demo Staff" },
            uploadedAt: now,
            note: "Biên nhận bàn giao"
          } : null,
          createdAt: now,
          updatedAt: now
        }] : []
      };
    } else if (path === "/appointments/appointment-existing/proof" && method === "POST") {
      proofUploaded = true;
      options.onAppointmentProof?.();
      data = { appointment: { id: "appointment-existing", status: appointmentStatus } };
    } else if (path === "/appointments/appointment-existing/complete" && method === "PATCH") {
      appointmentStatus = "COMPLETED";
      options.onCompleteAppointment?.();
      data = { appointment: { id: "appointment-existing", status: appointmentStatus } };
    } else if (path === "/appointments/appointment-existing/feedback" && method === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      options.onAppointmentFeedback?.(payload);
      data = { feedback: { id: "feedback-existing", appointmentId: "appointment-existing", ...payload } };
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
      data = { categories: options.radarCategoryAlert ? [{ id: "category-wallet", name: "Ví", parentId: null, status: "ACTIVE" }] : [] };
    } else if (path === "/admin/users") {
      data = { users: [] };
    } else if (path === "/admin/reports") {
      data = { reports: [] };
    } else if (path === "/admin/config") {
      data = { entries: [] };
    } else if (path === "/admin/config/history") {
      data = { history: [] };
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
    } else if (path === "/admin/visual-hunt" && method === "POST") {
      data = {
        providerAvailable: true,
        fallback: { used: false, mode: "NONE", reason: null },
        safetyStatus: "CLEAR",
        resultCount: 1,
        results: [{
          postId: "post-existing",
          type: "LOST",
          status: "OPEN",
          title: "Ví màu nâu",
          category: { id: "category-wallet", name: "Ví" },
          area: { id: "area-alpha", name: "Alpha" },
          building: { id: "building-alpha", name: "Tòa Alpha" },
          lostFoundAt: now,
          createdAt: now,
          similarityScore: 0.87,
          signals: { visual: 0.9, ocr: 0.75 },
          matchMode: "VISUAL_METADATA"
        }]
      };
    } else if (path === "/admin/visual-hunt/feedback" && method === "POST") {
      data = { feedback: { id: "visual-feedback-1" } };
    } else if (path === "/admin/radar/events") {
      data = { events: options.radarCategoryAlert ? [{
        id: "radar-event-alpha",
        eventType: "ACADEMIC",
        source: { type: "OFFICIAL_CALENDAR", reference: "DEMO-EXAM" },
        area: { id: "area-alpha", name: "Alpha" },
        building: { id: "building-alpha", name: "Tòa Alpha" },
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date().toISOString(),
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }] : [] };
    } else if (path === "/admin/radar/alerts") {
      data = { alerts: options.radarCategoryAlert ? [{
        id: "radar-alert-wallet",
        eventId: "radar-event-alpha",
        category: { id: "category-wallet", name: "Ví" },
        scope: "CATEGORY",
        window: { startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), endsAt: new Date().toISOString(), minutes: 60, stepMinutes: 15 },
        baseline: { startsAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date().toISOString(), windowCount: 20, expectedMean: 2, standardDeviation: 1 },
        observedCount: 11,
        zScore: 9,
        observedRatio: 5.5,
        severity: "CRITICAL",
        status: "OPEN",
        occurrenceCount: 1,
        emissionCount: 1,
        lastDetectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }] : [], advisory: "Aggregate advisory only." };
    } else {
      data = { items: [], page: 1, pageSize: 12, total: 0 };
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
}

async function login(page: Page, role: MockRole) {
  await page.goto("/account");
  const form = page.locator("section.auth-card form");
  await form.getByLabel("Email").fill(`${role.toLowerCase()}@example.test`);
  await form.getByLabel("Mật khẩu").fill("12345678");
  await form.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mở menu tài khoản" })).toBeVisible();
}

test("student creates a LOST post through the web form", async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;
  await installMockApi(page, "STUDENT", { onCreatePost: (payload) => {
    submittedPayload = payload;
  } });
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

test("student creates a FOUND post through the web form", async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;
  await installMockApi(page, "STUDENT", { onCreatePost: (payload) => {
    submittedPayload = payload;
  } });
  await login(page, "STUDENT");

  await page.getByRole("button", { name: "Đăng tin" }).first().click();
  const form = page.locator("form.create-report-form");
  await form.getByRole("button", { name: "Tôi nhặt được" }).click();
  await form.getByLabel("Tiêu đề").fill("Nhặt được ví sinh viên");
  await form.getByLabel("Mô tả", { exact: true }).fill("Nhặt được một chiếc ví sinh viên màu nâu tại sảnh Alpha.");
  await form.getByLabel("Thông tin liên hệ").fill("student@example.test");
  await form.getByLabel("Nhóm danh mục").selectOption("category-wallet");
  await form.locator('select[name="areaId"]').selectOption("area-alpha");
  await form.locator('select[name="buildingId"]').selectOption("building-alpha");
  await form.getByRole("button", { name: "Đăng tin", exact: true }).click();

  await expect(page).toHaveURL(/\/posts\/post-created$/);
  expect(submittedPayload).toMatchObject({
    type: "FOUND",
    title: "Nhặt được ví sinh viên",
    categoryId: "category-wallet",
    areaId: "area-alpha",
    buildingId: "building-alpha",
    secretVerification: null
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

test("admin sees dashboard, user, report and configuration navigation", async ({ page }) => {
  await installMockApi(page, "ADMIN");
  await login(page, "ADMIN");
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByRole("button", { name: "Mở bảng quản trị" }).click();

  await expect(page.getByRole("heading", { name: "Bảng quản trị" })).toBeVisible();
  for (const label of ["Dashboard", "Người dùng", "Báo cáo", "Cấu hình"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Người dùng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Người dùng", exact: true })).toHaveClass(/active/);
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Báo cáo", exact: true })).toHaveClass(/active/);
  await page.getByRole("button", { name: "Cấu hình", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cấu hình", exact: true })).toHaveClass(/active/);
});

test("staff Radar shows the selected category count without requiring an all-category alert", async ({ page }) => {
  await installMockApi(page, "STAFF", { aiFeatures: true, radarCategoryAlert: true });
  await login(page, "STAFF");
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByRole("button", { name: "Mở bảng nhân viên" }).click();
  await page.getByRole("button", { name: "Radar campus" }).click();

  await page.getByLabel("Bộ lọc radar").getByLabel("Danh mục").selectOption("category-wallet");
  await expect(page.getByText("11 báo mất", { exact: true })).toBeVisible();
});

test("staff Visual Hunt handles denied camera and batch image fallback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) }
    });
  });
  await installMockApi(page, "STAFF", { aiFeatures: true });
  await login(page, "STAFF");
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByRole("button", { name: "Mở bảng nhân viên" }).click();
  await page.getByRole("button", { name: "Visual Hunt" }).click();

  await page.getByRole("button", { name: "Mở camera" }).click();
  await expect(page.getByText(/Quyền camera bị từ chối/)).toBeVisible();

  const imageInput = page.locator('input[type="file"][accept*="image/jpeg"]');
  await imageInput.setInputFiles([
    { name: "shelf-1.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") },
    { name: "shelf-2.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") }
  ]);
  await page.getByRole("button", { name: "Phân tích ảnh" }).click();
  await expect(page.getByText("87%")).toBeVisible();
  await page.getByRole("button", { name: "Đánh dấu candidate" }).click();
  await expect(page.getByText(/Đã ghi nhận candidate/)).toBeVisible();
});

test("staff Visual Hunt handles unavailable camera and local video-frame fallback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException("Missing", "NotFoundError")) }
    });

    const originalCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function createElement(tagName: string, options?: ElementCreationOptions) {
      const element = originalCreateElement.call(this, tagName, options);
      if (tagName.toLowerCase() !== "video") return element;

      const video = element as HTMLVideoElement;
      let currentTime = 0;
      Object.defineProperties(video, {
        duration: { configurable: true, get: () => 4 },
        videoWidth: { configurable: true, get: () => 96 },
        videoHeight: { configurable: true, get: () => 64 },
        readyState: { configurable: true, get: () => HTMLMediaElement.HAVE_ENOUGH_DATA },
        currentTime: {
          configurable: true,
          get: () => currentTime,
          set: (value: number) => {
            currentTime = value;
            window.setTimeout(() => video.dispatchEvent(new Event("seeked")), 0);
          }
        },
        src: {
          configurable: true,
          get: () => "blob:visual-hunt-test",
          set: () => window.setTimeout(() => video.dispatchEvent(new Event("loadedmetadata")), 10)
        }
      });
      video.load = () => undefined;
      return video;
    } as typeof Document.prototype.createElement;

    CanvasRenderingContext2D.prototype.drawImage = () => undefined;
    URL.createObjectURL = () => "blob:visual-hunt-test";
    URL.revokeObjectURL = () => undefined;
  });

  await installMockApi(page, "STAFF", { aiFeatures: true });
  await login(page, "STAFF");
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByRole("button", { name: "Mở bảng nhân viên" }).click();
  await page.getByRole("button", { name: "Visual Hunt" }).click();

  await page.getByRole("button", { name: "Mở camera" }).click();
  await expect(page.getByText("Không tìm thấy camera phù hợp trên thiết bị này.")).toBeVisible();

  await page.locator('input[type="file"][accept="video/*"]').setInputFiles({
    name: "warehouse-shelf.webm",
    mimeType: "video/webm",
    buffer: Buffer.from("1a45dfa3", "hex")
  });
  await expect(page.getByText("Đã trích 3 khung hình. Video gốc vẫn ở trên thiết bị.")).toBeVisible();
  await page.getByRole("button", { name: "Phân tích ảnh" }).click();
  await expect(page.getByText("87%")).toBeVisible();
});

test("student opens a FOUND post route and submits an ownership claim", async ({ page }) => {
  let submittedClaim: Record<string, unknown> | undefined;
  await installMockApi(page, "STUDENT", { onSubmitClaim: (payload) => {
    submittedClaim = payload;
  } });
  await login(page, "STUDENT");

  await page.getByRole("heading", { name: "Ví sinh viên nhặt được" }).click();
  await expect(page).toHaveURL(/\/posts\/post-existing$/);
  await expect(page.getByRole("heading", { name: "Ví sinh viên nhặt được" })).toBeVisible();

  await page.getByRole("button", { name: "Claim đồ này" }).click();
  const claimForm = page.locator("form.dialog");
  await claimForm.getByLabel("Mô tả bí mật").fill("Bên trong có thẻ thư viện mã DEMO001");
  await claimForm.getByLabel("Mô tả thêm").fill("Ví có một vết xước nhỏ ở góc phải");
  await claimForm.getByLabel("Vị trí mất ước lượng").fill("Sảnh Alpha gần quầy lễ tân");
  await claimForm.getByRole("button", { name: "Gửi yêu cầu nhận đồ" }).click();

  await expect(claimForm).toHaveCount(0);
  expect(submittedClaim).toMatchObject({
    postId: "post-existing",
    secretAnswer: "Bên trong có thẻ thư viện mã DEMO001",
    description: "Ví có một vết xước nhỏ ở góc phải",
    approximateLocation: "Sảnh Alpha gần quầy lễ tân"
  });
});

test("staff can review and accept a pending ownership claim", async ({ page }) => {
  let accepted = false;
  await installMockApi(page, "STAFF", {
    claimStatus: "PENDING",
    onAcceptClaim: () => {
      accepted = true;
    }
  });
  await login(page, "STAFF");

  await page.getByRole("heading", { name: "Ví sinh viên nhặt được" }).click();
  await expect(page).toHaveURL(/\/posts\/post-existing$/);
  await expect(page.getByText("Mức hỗ trợ xác thực: 78%", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Chấp nhận" }).click();

  expect(accepted).toBe(true);
  await expect(page.getByText("Đã chấp nhận yêu cầu nhận đồ.")).toBeVisible();
});

test("staff creates a handover appointment for an accepted claim", async ({ page }) => {
  let appointmentPayload: Record<string, unknown> | undefined;
  await installMockApi(page, "STAFF", {
    claimStatus: "ACCEPTED",
    onCreateAppointment: (payload) => {
      appointmentPayload = payload;
    }
  });
  await login(page, "STAFF");

  await page.getByRole("heading", { name: "Ví sinh viên nhặt được" }).click();
  await expect(page).toHaveURL(/\/posts\/post-existing$/);

  const appointmentForm = page.locator("form.claim-appointment-form").first();
  await appointmentForm.locator('input[name="proposedAt"]').fill("2026-07-20T10:00");
  await appointmentForm.locator('input[name="customLocation"]').fill("Quầy bàn giao Alpha");
  await appointmentForm.getByRole("button", { name: "Tạo lịch hẹn" }).click();

  expect(appointmentPayload).toMatchObject({
    claimId: "claim-pending",
    customLocation: "Quầy bàn giao Alpha"
  });
  expect(appointmentPayload?.proposedAt).toEqual(expect.any(String));
});

test("staff reviews a match with an explainable feedback label", async ({ page }) => {
  let feedbackPayload: Record<string, unknown> | undefined;
  await installMockApi(page, "STAFF", {
    includeMatch: true,
    onMatchFeedback: (payload) => {
      feedbackPayload = payload;
    }
  });
  await login(page, "STAFF");

  await page.getByRole("heading", { name: "Ví sinh viên nhặt được" }).click();
  await expect(page).toHaveURL(/\/posts\/post-existing$/);
  await expect(page.getByRole("heading", { name: "Đánh giá kết quả tương đồng" })).toBeVisible();
  await expect(page.getByText("Cùng danh mục và khu vực Alpha")).toBeVisible();

  const panel = page.locator(".match-review-panel");
  await panel.getByLabel("Kết luận review").selectOption("FALSE_MATCH");
  await panel.getByLabel("Ghi chú").fill("Màu sắc và dấu hiệu nhận dạng không trùng.");
  await panel.getByRole("button", { name: "Lưu đánh giá" }).click();

  await expect(panel.getByRole("button", { name: "Đã lưu" })).toBeVisible();
  expect(feedbackPayload).toEqual({
    label: "FALSE_MATCH",
    note: "Màu sắc và dấu hiệu nhận dạng không trùng."
  });
});

test("staff uploads proof, completes handover and submits return feedback", async ({ page }) => {
  let proofUploaded = false;
  let appointmentCompleted = false;
  let feedbackPayload: Record<string, unknown> | undefined;
  await installMockApi(page, "STAFF", {
    claimStatus: "ACCEPTED",
    appointmentStatus: "ACCEPTED",
    onAppointmentProof: () => {
      proofUploaded = true;
    },
    onCompleteAppointment: () => {
      appointmentCompleted = true;
    },
    onAppointmentFeedback: (payload) => {
      feedbackPayload = payload;
    }
  });
  await login(page, "STAFF");

  await page.getByRole("heading", { name: "Ví sinh viên nhặt được" }).click();
  const proofForm = page.locator("form.appointment-proof-form");
  await proofForm.locator('input[name="proof"]').setInputFiles({
    name: "handover-proof.png",
    mimeType: "image/png",
    buffer: Buffer.from("89504e470d0a1a0a", "hex")
  });
  await proofForm.locator('input[name="note"]').fill("Biên nhận bàn giao");
  await proofForm.getByRole("button", { name: "Tải chứng từ" }).click();
  await expect(page.getByText("Đã tải chứng từ bàn giao.")).toBeVisible();
  expect(proofUploaded).toBe(true);

  await page.getByRole("button", { name: "Hoàn tất bàn giao" }).click();
  await expect(page.getByText("Đã hoàn tất bàn giao.")).toBeVisible();
  expect(appointmentCompleted).toBe(true);

  const feedbackForm = page.locator("form.claim-appointment-form").filter({
    has: page.getByRole("button", { name: "Gửi feedback" })
  });
  await feedbackForm.locator('select[name="rating"]').selectOption("5");
  await feedbackForm.locator('input[name="comment"]').fill("Bàn giao đúng lịch và đầy đủ.");
  await feedbackForm.getByRole("button", { name: "Gửi feedback" }).click();
  await expect(page.getByText("Đã gửi feedback sau bàn giao.")).toBeVisible();
  expect(feedbackPayload).toEqual({
    rating: 5,
    comment: "Bàn giao đúng lịch và đầy đủ."
  });
});
