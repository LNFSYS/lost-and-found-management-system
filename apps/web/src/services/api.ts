const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
const TOKEN_KEY = "lnfs.accessToken";
const REFRESH_TOKEN_KEY = "lnfs.refreshToken";

export type PostType = "LOST" | "FOUND";
export type PostStatus = "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "EXPIRED" | "HIDDEN";

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  studentCode?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  roles: string[];
  status: string;
  createdAt: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Area {
  id: string;
  name: string;
}

export interface Building {
  id: string;
  areaId: string;
  name: string;
}

export interface HandoverPoint {
  id: string;
  name: string;
  address: string;
  openingHours: string | null;
}

export interface AdminOverview {
  users: number;
  posts: number;
  claims: number;
  reports: number;
  categories: number;
  areas: number;
  handoverPoints: number;
  warehouseItems: number;
  postsByStatus: Array<{ status: string; total: number }>;
  postsByType: Array<{ type: string; total: number }>;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  studentCode: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export interface AdminNamedResource {
  id: string;
  name: string;
  isActive: boolean;
}

export type AdminRole = "USER" | "STUDENT" | "LECTURER" | "STAFF" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "LOCKED" | "DISABLED";

export interface AdminCategory extends AdminNamedResource {
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
}

export interface AdminArea extends AdminNamedResource {
  description: string | null;
  sortOrder: number;
}

export interface AdminBuilding extends AdminNamedResource {
  areaId: string;
  areaName: string | null;
  sortOrder: number;
}

export interface AdminHandoverPoint extends AdminNamedResource {
  address: string;
  areaId: string | null;
  buildingId: string | null;
  openingHours: string | null;
  contactInfo: string | null;
}

export type AdminWarehouseStatus =
  | "PENDING_APPROVAL"
  | "RECEIVED"
  | "STORED"
  | "CLAIMED"
  | "RETURNED"
  | "EXPIRED"
  | "DISPOSED"
  | "DONATED"
  | "TRANSFERRED";

export interface AdminWarehouseItem {
  id: string;
  post: { id: string; title: string | null } | null;
  handoverPoint: { id: string; name: string | null } | null;
  itemName: string;
  description: string | null;
  category: { id: string; name: string | null } | null;
  location: {
    areaId: string | null;
    areaName: string | null;
    buildingId: string | null;
    buildingName: string | null;
    roomText: string | null;
  };
  finder: {
    userId: string | null;
    fullName: string | null;
    name: string | null;
    contact: string | null;
  };
  status: AdminWarehouseStatus;
  conditionNotes: string | null;
  storageCode: string | null;
  receivedAt: string;
  returnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReport {
  id: string;
  entityType: "POST" | "USER" | "CLAIM";
  entityId: string;
  targetText: string;
  reason: string;
  details: string | null;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  reporter: { id: string; fullName: string | null; email: string | null };
  reviewer: { id: string; fullName: string | null } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PublicConfigEntry {
  key: string;
  value: unknown;
  valueType: "STRING" | "INTEGER" | "FLOAT" | "BOOLEAN" | "JSON";
  description: string | null;
}

export interface BoardPost {
  id: string;
  userId: string;
  type: PostType;
  status: PostStatus;
  title: string;
  description: string;
  category: { id: string; name: string | null } | null;
  location: {
    areaId: string | null;
    areaName: string | null;
    buildingId: string | null;
    buildingName: string | null;
    roomText: string | null;
    roomName: string | null;
    customLocation: string | null;
  };
  contactInfo: string | null;
  lostFoundAt: string | null;
  handoverPoint: { id: string; name: string | null } | null;
  resolvedAt: string | null;
  viewCount: number;
  owner: { id: string; fullName: string };
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  id: string;
  lostPostId: string;
  foundPostId: string;
  totalScore: number;
  textScore: number;
  categoryScore: number;
  locationScore: number;
  timeScore: number;
  isNotified?: boolean;
  createdAt: string;
}

export interface PostMatchSuggestion {
  match: MatchResult;
  post: BoardPost;
}

export interface PostDetail {
  post: BoardPost;
  media: Array<{ id: string; secureUrl: string; publicId: string; mediaKind?: "ITEM" | "EVIDENCE"; createdAt: string }>;
  tags: Array<{ id: string; tag: string; confidence: number; source: string; createdAt: string }>;
  matches: MatchResult[];
}

export interface ClaimDetail {
  claim: {
    id: string;
    postId: string;
    postOwnerId: string;
    claimant: { id: string; fullName: string };
    status: string;
    description: string | null;
    approximateLostAt: string | null;
    approximateLocation: string | null;
    createdAt: string;
  };
  evidence: Array<{ id: string; secureUrl: string; evidenceType: string; description: string | null }>;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  detail?: unknown;
}

export interface ListPostsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  type?: PostType | "";
  status?: PostStatus | "";
  categoryId?: string;
  areaId?: string;
  buildingId?: string;
  from?: string;
  to?: string;
  sort?: "latest" | "oldest" | "highest_match";
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(getToken());
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(tokens: Tokens) {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function buildQuery(params: ListPostsParams) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? `HTTP ${response.status}`);
  }
  if (payload.data === undefined) {
    throw new Error("API returned no data");
  }

  return payload.data;
}

export const api = {
  listPosts(params: ListPostsParams) {
    return request<{ items: BoardPost[]; page: number; pageSize: number; total: number }>(
      `/posts${buildQuery(params)}`
    );
  },
  myPosts(params: ListPostsParams) {
    return request<{ items: BoardPost[]; page: number; pageSize: number; total: number }>(
      `/posts/my${buildQuery(params)}`
    );
  },
  getPost(id: string) {
    return request<PostDetail>(`/posts/${id}`);
  },
  getMatches(id: string) {
    return request<{ matches: MatchResult[] }>(`/posts/${id}/matches`);
  },
  createPost(input: Record<string, unknown>) {
    return request<{ post: BoardPost; matchSuggestions: PostMatchSuggestion[] }>("/posts", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updatePostStatus(id: string, status: PostStatus) {
    return request<{ post: BoardPost }>(`/posts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  deletePost(id: string) {
    return request<{ deleted: boolean }>(`/posts/${id}`, {
      method: "DELETE"
    });
  },
  uploadPostImages(id: string, files: FileList | File[], evidenceFiles: FileList | File[] = []) {
    const data = new FormData();
    Array.from(files).forEach((file) => data.append("images", file));
    Array.from(evidenceFiles).forEach((file) => data.append("evidenceImages", file));
    return request<{ media: unknown[]; ai: unknown[]; matchSuggestions: PostMatchSuggestion[] }>(`/posts/${id}/media`, {
      method: "POST",
      body: data
    });
  },
  submitClaim(input: Record<string, unknown>) {
    return request<ClaimDetail>("/claims", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  uploadClaimEvidence(id: string, file: File, evidenceType: string) {
    const data = new FormData();
    data.append("evidence", file);
    data.append("evidenceType", evidenceType);
    return request<ClaimDetail>(`/claims/${id}/evidence`, {
      method: "POST",
      body: data
    });
  },
  register(input: Record<string, unknown>) {
    return request<{ user: PublicUser; tokens: Tokens }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  requestRegistrationOtp(input: Record<string, unknown>) {
    return request<{ otpDelivered: boolean }>("/auth/register/request-otp", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  verifyOtp(input: Record<string, unknown>) {
    return request<{ user: PublicUser; tokens: Tokens }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  resendOtp(input: Record<string, unknown>) {
    return request<{ otpDelivered: boolean }>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  login(input: Record<string, unknown>) {
    return request<{ user: PublicUser; tokens: Tokens }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  forgotPassword(input: Record<string, unknown>) {
    return request<{ otpDelivered: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  resetPassword(input: Record<string, unknown>) {
    return request<{ reset: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  logout(refreshToken: string) {
    return request<{ revoked: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
  },
  me() {
    return request<{ user: PublicUser }>("/auth/me");
  },
  updateProfile(input: Record<string, unknown>) {
    return request<{ user: PublicUser }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  uploadAvatar(file: File) {
    const data = new FormData();
    data.append("avatar", file);
    return request<{ user: PublicUser }>("/auth/avatar", {
      method: "POST",
      body: data
    });
  },
  activity() {
    return request<{ activity: Array<{ id: string; action: string; createdAt: string }> }>("/auth/activity");
  },
  reputation() {
    return request<{ reputation: { totalPoints: number; level: string } }>("/auth/reputation");
  },
  notifications() {
    return request<{ items: NotificationItem[]; unreadCount: number }>("/auth/notifications");
  },
  markNotificationRead(id: string) {
    return request<{ updated: boolean }>(`/auth/notifications/${id}/read`, {
      method: "PATCH"
    });
  },
  markAllNotificationsRead() {
    return request<{ updated: boolean }>("/auth/notifications/read-all", {
      method: "PATCH"
    });
  },
  categories() {
    return request<{ categories: Category[] }>("/categories");
  },
  areas() {
    return request<{ areas: Area[] }>("/locations/areas");
  },
  buildings(areaId: string) {
    return request<{ buildings: Building[] }>(`/locations/areas/${areaId}/buildings`);
  },
  handoverPoints() {
    return request<{ handoverPoints: HandoverPoint[] }>("/handover-points");
  },
  publicConfig() {
    return request<{ entries: PublicConfigEntry[] }>("/config/public");
  },
  adminOverview() {
    return request<{ overview: AdminOverview }>("/admin/dashboard/overview");
  },
  adminUsers() {
    return request<{ users: AdminUser[] }>("/admin/users");
  },
  adminCreateUser(input: Record<string, unknown>) {
    return request<{ id: string }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminUpdateUserStatus(id: string, status: AdminUserStatus) {
    return request<{ updated: boolean }>(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  adminUpdateUserRoles(id: string, roles: AdminRole[]) {
    return request<{ updated: boolean }>(`/admin/users/${id}/roles`, {
      method: "PATCH",
      body: JSON.stringify({ roles })
    });
  },
  adminCategories() {
    return request<{ categories: AdminCategory[] }>("/admin/categories");
  },
  adminCreateCategory(input: Record<string, unknown>) {
    return request<{ id: string }>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminUpdateCategory(id: string, input: Record<string, unknown>) {
    return request<{ updated: boolean }>(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  adminSetCategoryActive(id: string, isActive: boolean) {
    return request<{ updated: boolean }>(`/admin/categories/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive })
    });
  },
  adminAreas() {
    return request<{ areas: AdminArea[] }>("/admin/locations/areas");
  },
  adminCreateArea(input: Record<string, unknown>) {
    return request<{ id: string }>("/admin/locations/areas", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminUpdateArea(id: string, input: Record<string, unknown>) {
    return request<{ updated: boolean }>(`/admin/locations/areas/${id}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  adminSetAreaActive(id: string, isActive: boolean) {
    return request<{ updated: boolean }>(`/admin/locations/areas/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive })
    });
  },
  adminBuildings() {
    return request<{ buildings: AdminBuilding[] }>("/admin/locations/buildings");
  },
  adminCreateBuilding(input: Record<string, unknown>) {
    return request<{ id: string }>("/admin/locations/buildings", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminUpdateBuilding(id: string, input: Record<string, unknown>) {
    return request<{ updated: boolean }>(`/admin/locations/buildings/${id}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  adminSetBuildingActive(id: string, isActive: boolean) {
    return request<{ updated: boolean }>(`/admin/locations/buildings/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive })
    });
  },
  adminHandoverPoints() {
    return request<{ handoverPoints: AdminHandoverPoint[] }>("/admin/handover-points");
  },
  adminCreateHandoverPoint(input: Record<string, unknown>) {
    return request<{ id: string }>("/admin/handover-points", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminUpdateHandoverPoint(id: string, input: Record<string, unknown>) {
    return request<{ updated: boolean }>(`/admin/handover-points/${id}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  adminSetHandoverPointActive(id: string, isActive: boolean) {
    return request<{ updated: boolean }>(`/admin/handover-points/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive })
    });
  },
  adminWarehouseItems() {
    return request<{ warehouseItems: AdminWarehouseItem[] }>("/admin/warehouse-items");
  },
  adminCreateWarehouseItem(input: Record<string, unknown>) {
    return request<{ id: string }>("/admin/warehouse-items", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminUpdateWarehouseItem(id: string, input: Record<string, unknown>) {
    return request<{ updated: boolean }>(`/admin/warehouse-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  adminUpdateWarehouseItemStatus(id: string, status: AdminWarehouseStatus) {
    return request<{ updated: boolean }>(`/admin/warehouse-items/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  adminDeleteWarehouseItem(id: string) {
    return request<{ deleted: boolean }>(`/admin/warehouse-items/${id}`, {
      method: "DELETE"
    });
  },
  adminReports() {
    return request<{ reports: AdminReport[] }>("/admin/reports");
  },
  adminHandleReport(id: string, input: Record<string, unknown>) {
    return request<{ updated: boolean }>(`/admin/reports/${id}/handle`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  }
};
