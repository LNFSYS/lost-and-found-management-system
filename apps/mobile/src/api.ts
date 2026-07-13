import * as SecureStore from "expo-secure-store";
import { SingleFlight } from "./single-flight";

declare const process: { env: Record<string, string | undefined> };

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE_URL = configuredApiUrl?.replace(/\/$/, "") ?? "http://10.0.2.2:3001/api";
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const ACCESS_TOKEN_KEY = "lnfs.mobile.accessToken";
const REFRESH_TOKEN_KEY = "lnfs.mobile.refreshToken";
const refreshGate = new SingleFlight<boolean>();

export type PostType = "LOST" | "FOUND";
export type PostStatus = "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "EXPIRED" | "HIDDEN";
export type Role = "USER" | "STUDENT" | "LECTURER" | "STAFF" | "ADMIN";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  studentCode?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  roles: Role[];
  status: string;
  createdAt: string;
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
  contactInfo?: string | null;
  mapImageUrl?: string | null;
  mapPositionX?: number | null;
  mapPositionY?: number | null;
  storedItems?: number;
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
  imageScore?: number;
  ocrScore?: number;
  scoreTier?: string;
  matcherVersion?: string;
  isNotified?: boolean;
  createdAt: string;
}

export interface PostMatchSuggestion {
  match: MatchResult;
  post: BoardPost;
  sourcePostId?: string;
}

export interface PostDetail {
  post: BoardPost;
  media: Array<{
    id: string;
    secureUrl: string;
    thumbnailUrl?: string | null;
    optimizedUrl?: string | null;
    publicId: string;
    mediaKind?: "ITEM" | "EVIDENCE";
    createdAt: string;
  }>;
  tags: Array<{ id: string; tag: string; confidence: number; source: string; createdAt: string }>;
  matches: MatchResult[];
}

export interface ClaimSummary {
  id: string;
  postId: string;
  postOwnerId: string;
  claimant: { id: string; fullName: string };
  status: "PENDING" | "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  description: string | null;
  approximateLostAt: string | null;
  approximateLocation: string | null;
  rejectionReason: string | null;
  moreInfoRequest: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  evidence: Array<{ id: string; imagePath: string; evidenceType: string; description: string | null }>;
}

export interface ReturnAppointment {
  id: string;
  claimId: string;
  postId: string;
  proposer: { id: string; fullName: string | null };
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED";
  proposedAt: string;
  handoverPoint: { id: string; name: string | null } | null;
  customLocation: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  proof: {
    imageUrl: string;
    publicId: string | null;
    uploadedBy: { id: string; fullName: string | null } | null;
    uploadedAt: string | null;
    note: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnFeedback {
  id: string;
  appointmentId: string;
  claimId: string;
  postId: string;
  postTitle: string | null;
  reviewer: { id: string; fullName: string | null; email: string | null };
  targetUser: { id: string; fullName: string | null; email: string | null };
  rating: number;
  comment: string | null;
  isNegative: boolean;
  status: "NEW" | "REVIEWED" | "FLAGGED" | "DISMISSED";
  createdAt: string;
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

export interface AdminWarehouseItem {
  id: string;
  itemName: string;
  description: string | null;
  status: string;
  storageCode: string | null;
  receivedAt: string;
  retentionDeadline: string | null;
  post: { id: string; title: string | null } | null;
  handoverPoint: { id: string; name: string | null } | null;
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
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LocalImageAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export async function saveTokens(tokens: Tokens) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  ]);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

function buildQuery(params: Record<string, unknown>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const maxAttempts = method === "GET" ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await requestOnce<T>(path, init, attempt < maxAttempts);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableError(error)) {
        break;
      }
      await sleep(350 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Network request failed");
}

async function requestOnce<T>(
  path: string,
  init: RequestInit = {},
  allowServerRetry = false,
  allowRefresh = true
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Client-Platform", "mobile");
  const token = await getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && allowRefresh && !path.startsWith("/auth/")) {
    const refreshed = await refreshMobileSession();
    if (refreshed) {
      return requestOnce<T>(path, init, allowServerRetry, false);
    }
  }
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (allowServerRetry && response.status >= 500) {
    throw new Error(`Retryable HTTP ${response.status}`);
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? `HTTP ${response.status}`);
  }
  if (payload.data === undefined) {
    throw new Error("API returned no data");
  }
  return payload.data;
}

async function refreshMobileSession() {
  return refreshGate.run(async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearTokens();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Platform": "mobile"
        },
        body: JSON.stringify({ refreshToken })
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<{
        user: PublicUser;
        tokens: Tokens;
      }>;
      if (!response.ok || !payload.success || !payload.data?.tokens.refreshToken) {
        await clearTokens();
        return false;
      }
      await saveTokens(payload.data.tokens);
      return true;
    } catch {
      await clearTokens();
      return false;
    }
  });
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("Network request failed") || error.message.startsWith("Retryable HTTP 5");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendImage(data: FormData, field: string, asset: LocalImageAsset, index = 0) {
  const name = asset.fileName ?? `${field}-${index}.jpg`;
  const type = asset.mimeType ?? "image/jpeg";
  data.append(field, { uri: asset.uri, name, type } as unknown as Blob);
}

export const api = {
  login(input: { email: string; password: string }) {
    return request<{ user: PublicUser; tokens: Tokens }>("/auth/login", {
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
  me() {
    return request<{ user: PublicUser }>("/auth/me");
  },
  logout(refreshToken: string) {
    return request<{ revoked: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
  },
  updateProfile(input: Record<string, unknown>) {
    return request<{ user: PublicUser }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  activity() {
    return request<{ activity: Array<{ id: string; action: string; createdAt: string }> }>("/auth/activity");
  },
  reputation() {
    return request<{
      reputation: {
        totalPoints: number;
        level: string;
        recentLogs: Array<{ id: string; delta: number; reason: string; createdAt: string }>;
      };
    }>("/auth/reputation");
  },
  notifications() {
    return request<{ items: NotificationItem[]; unreadCount: number }>("/auth/notifications");
  },
  markNotificationRead(id: string) {
    return request<{ updated: boolean }>(`/auth/notifications/${id}/read`, { method: "PATCH" });
  },
  listPosts(params: Record<string, unknown>) {
    return request<{ items: BoardPost[]; page: number; pageSize: number; total: number }>(
      `/posts${buildQuery(params)}`
    );
  },
  myPosts(params: Record<string, unknown>) {
    return request<{ items: BoardPost[]; page: number; pageSize: number; total: number }>(
      `/posts/my${buildQuery(params)}`
    );
  },
  getPost(id: string) {
    return request<PostDetail>(`/posts/${id}`);
  },
  postClaims(id: string) {
    return request<{ claims: ClaimSummary[] }>(`/posts/${id}/claims`);
  },
  getMatches(id: string) {
    return request<{ matches: MatchResult[] }>(`/posts/${id}/matches`);
  },
  myMatchSuggestions() {
    return request<{ suggestions: PostMatchSuggestion[] }>("/posts/my/match-suggestions");
  },
  createPost(input: Record<string, unknown>) {
    return request<{ post: BoardPost; matchSuggestions: PostMatchSuggestion[] }>("/posts", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  uploadPostImages(postId: string, images: LocalImageAsset[]) {
    const data = new FormData();
    images.forEach((image, index) => appendImage(data, "images", image, index));
    return request<{ media: unknown[]; ai: unknown[]; matchSuggestions: PostMatchSuggestion[] }>(`/posts/${postId}/media`, {
      method: "POST",
      body: data
    });
  },
  recordMatchFeedback(postId: string, matchId: string, label: string) {
    return request<{ feedback: { id: string; matchId: string; label: string } }>(
      `/posts/${postId}/matches/${matchId}/feedback`,
      {
        method: "POST",
        body: JSON.stringify({ label })
      }
    );
  },
  submitClaim(input: Record<string, unknown>) {
    return request<ClaimDetail>("/claims", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getClaim(id: string) {
    return request<ClaimDetail>(`/claims/${id}`);
  },
  claimVerification(id: string) {
    return request<{ verification: { ownershipConfidence: number; level: string; note: string } }>(
      `/claims/${id}/verification`
    );
  },
  uploadClaimEvidence(claimId: string, image: LocalImageAsset, evidenceType = "PHOTO") {
    const data = new FormData();
    appendImage(data, "evidence", image);
    data.append("evidenceType", evidenceType);
    return request<ClaimDetail>(`/claims/${claimId}/evidence`, {
      method: "POST",
      body: data
    });
  },
  acceptClaim(id: string) {
    return request<ClaimDetail>(`/claims/${id}/accept`, { method: "PATCH" });
  },
  rejectClaim(id: string, reason: string) {
    return request<ClaimDetail>(`/claims/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason })
    });
  },
  cancelClaim(id: string, reason: string) {
    return request<ClaimDetail>(`/claims/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason })
    });
  },
  createAppointment(input: Record<string, unknown>) {
    return request<{ appointment: ReturnAppointment }>("/appointments", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  claimAppointments(claimId: string) {
    return request<{ appointments: ReturnAppointment[] }>(`/appointments/claim/${claimId}`);
  },
  submitAppointmentFeedback(id: string, input: { rating: number; comment?: string | null; targetUserId?: string | null }) {
    return request<{ feedback: ReturnFeedback }>(`/appointments/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  uploadAppointmentProof(id: string, image: LocalImageAsset, note?: string | null) {
    const data = new FormData();
    appendImage(data, "proof", image);
    if (note?.trim()) {
      data.append("note", note.trim());
    }
    return request<{ appointment: ReturnAppointment }>(`/appointments/${id}/proof`, {
      method: "POST",
      body: data
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
  adminOverview() {
    return request<{ overview: AdminOverview }>("/admin/dashboard/overview");
  },
  adminWarehouseItems() {
    return request<{ warehouseItems: AdminWarehouseItem[] }>("/admin/warehouse-items");
  },
  adminReports() {
    return request<{ reports: AdminReport[] }>("/admin/reports");
  },
  adminReturnFeedback() {
    return request<{ feedback: ReturnFeedback[] }>("/admin/return-feedback");
  },
  adminReviewReturnFeedback(id: string, status: ReturnFeedback["status"]) {
    return request<ReturnFeedback | null>(`/admin/return-feedback/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }
};
