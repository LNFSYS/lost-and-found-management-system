const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
const LEGACY_TOKEN_KEY = "lnfs.accessToken";
const LEGACY_REFRESH_TOKEN_KEY = "lnfs.refreshToken";
const SESSION_HINT_KEY = "lnfs.hasSession";
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

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
  refreshToken?: string;
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
  contactInfo?: string | null;
  mapImageUrl?: string | null;
  mapPositionX?: number | null;
  mapPositionY?: number | null;
  storedItems?: number;
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
  reputationPoints: number;
  reputationLevel: string;
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
  mapImageUrl: string | null;
  mapPositionX: number | null;
  mapPositionY: number | null;
  storedItems: number;
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
  retentionDeadline: string | null;
  createdAt: string;
  updatedAt: string;
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
    uploadedBy: { id: string; fullName: string | null } | null;
    uploadedAt: string | null;
    note: string | null;
  } | null;
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

export interface AdminConfigEntry extends PublicConfigEntry {
  id: string;
  rawValue: string;
  isPublic: boolean;
  updatedBy: string | null;
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
  reviewedBy: { id: string; fullName: string | null } | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConfigHistoryEntry {
  id: string;
  key: string;
  oldValue: string | null;
  newValue: string;
  changedBy: { id: string; fullName: string | null };
  changedAt: string;
}

export type RadarEventType = "ACADEMIC" | "SPORTS" | "CULTURAL" | "CAMPUS_OPERATIONS" | "WEATHER" | "OTHER";
export type RadarSourceType = "OFFICIAL_CALENDAR" | "CAMPUS_NOTICE" | "SECURITY_LOG" | "WEATHER_BULLETIN";
export type RadarAlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
export type RadarAlertSeverity = "WATCH" | "WARNING" | "CRITICAL";

export interface RadarEvent {
  id: string;
  eventType: RadarEventType;
  source: { type: RadarSourceType; reference: string };
  area: { id: string; name: string | null } | null;
  building: { id: string; name: string | null } | null;
  startsAt: string;
  endsAt: string;
  status: "ACTIVE" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface RadarAlert {
  id: string;
  eventId: string;
  category: { id: string; name: string | null } | null;
  scope: "CATEGORY" | "ALL_CATEGORIES";
  window: { startsAt: string; endsAt: string; minutes: number; stepMinutes: number };
  baseline: { startsAt: string; endsAt: string; windowCount: number; expectedMean: number; standardDeviation: number };
  observedCount: number;
  zScore: number;
  observedRatio: number;
  severity: RadarAlertSeverity;
  status: RadarAlertStatus;
  occurrenceCount: number;
  emissionCount: number;
  lastDetectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RadarRelatedPost {
  id: string;
  type: "LOST";
  status: PostStatus;
  title: string;
  lostFoundAt: string;
  createdAt: string;
  category: { id: string; name: string | null } | null;
  area: { id: string; name: string | null } | null;
  building: { id: string; name: string | null } | null;
}

export interface VisualHuntApiResult {
  postId: string;
  type: PostType;
  status: "OPEN" | "MATCHED";
  title: string;
  category: { id: string; name: string | null } | null;
  area: { id: string; name: string | null } | null;
  building: { id: string; name: string | null } | null;
  lostFoundAt: string | null;
  createdAt: string;
  similarityScore: number | null;
  signals: { visual: number | null; ocr: number | null };
  matchMode: "VISUAL_METADATA" | "FILTER_ONLY";
}

export interface VisualHuntApiResponse {
  providerAvailable: boolean;
  fallback: { used: boolean; mode: "NONE" | "FILTER_ONLY"; reason: string | null };
  safetyStatus: "CLEAR" | "BLOCKED" | "NOT_CHECKED";
  resultCount: number;
  results: VisualHuntApiResult[];
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

export type MatchFeedbackLabel =
  | "TRUE_MATCH"
  | "FALSE_MATCH"
  | "UNCERTAIN"
  | "DUPLICATE"
  | "INSUFFICIENT_EVIDENCE";

export interface MatchExplanation {
  matchId: string;
  lostPostId: string;
  foundPostId: string;
  totalScore: number;
  summary: string;
  reasons: string[];
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
    secureUrl?: string;
    thumbnailUrl?: string | null;
    optimizedUrl?: string | null;
    publicId?: string;
    imagePath?: string;
    mediaKind?: "ITEM" | "EVIDENCE";
    createdAt: string;
  }>;
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
  evidence: Array<{ id: string; imagePath: string; evidenceType: string; description: string | null }>;
}

export interface ClaimVerification {
  claimId: string;
  ownershipConfidence: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  reviewConfidenceTier?: "LOW" | "MEDIUM" | "HIGH_REVIEW" | "STRONG_REVIEW";
  isSystemVerified: boolean;
  note: string;
  breakdown: {
    matchScore: number;
    textScore: number;
    locationScore: number;
    timeScore: number;
    evidenceScore: number;
    privateSignalScore?: number;
    consistencyScore?: number;
    privateQuestionScore?: number | null;
    privateQuestionCompleteness?: number;
  };
  signals: {
    hasClaimantMatchedLostPost: boolean;
    evidenceCount: number;
    hasEvidenceOcrText: boolean;
    hasPrivateSignal?: boolean;
    hasApproximateLostTime: boolean;
    hasApproximateLocation: boolean;
    hasVerificationQuestions?: boolean;
  };
}

export type VerificationQuestionType = "TEXT" | "MASKED_SERIAL" | "MULTIPLE_CHOICE" | "VISUAL_DETAIL";

export interface VerificationQuestionSuggestion {
  prompt: string;
  questionType: VerificationQuestionType;
  sourceSignal: string;
  privacyLevel: "PRIVATE" | "HIGHLY_PRIVATE";
  reason: string;
}

export interface VerificationQuestion {
  id: string;
  postId: string;
  prompt: string;
  questionType: VerificationQuestionType;
  options?: string[] | null;
  sourceSignal: string;
  weight: number;
  privacyLevel: "PRIVATE" | "HIGHLY_PRIVATE";
  status: "DRAFT" | "APPROVED" | "DISABLED";
  answered: boolean;
  answerMatches?: boolean | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface PostClaimSummary {
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
  categoryIds?: string[];
  areaId?: string;
  buildingId?: string;
  from?: string;
  to?: string;
  sort?: "latest" | "oldest" | "highest_match";
}

function getToken() {
  return accessToken;
}

export function getStoredAccessToken() {
  return getToken();
}

export function getApiOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

export function hasAccessToken() {
  return Boolean(getToken());
}

export function getStoredRefreshToken() {
  return null;
}

export function saveTokens(tokens: Tokens) {
  accessToken = tokens.accessToken;
  localStorage.setItem(SESSION_HINT_KEY, "1");
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(SESSION_HINT_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

function buildQuery(params: object) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        searchParams.set(key, value.join(","));
      }
    } else if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function refreshWebSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Client-Platform": "web" },
        body: "{}"
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<{ user: PublicUser; tokens: Tokens }>;
      if (!response.ok || !payload.success || !payload.data) {
        clearTokens();
        return false;
      }
      saveTokens(payload.data.tokens);
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function restoreWebSession() {
  if (localStorage.getItem(SESSION_HINT_KEY) !== "1") {
    return Promise.resolve(false);
  }
  return refreshWebSession();
}

async function request<T>(path: string, init: RequestInit = {}, allowRefresh = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Client-Platform", "web");
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });
  if (response.status === 401 && allowRefresh && !path.startsWith("/auth/")) {
    if (await refreshWebSession()) {
      return request<T>(path, init, false);
    }
  }
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? `HTTP ${response.status}`);
  }
  if (payload.data === undefined) {
    throw new Error("API returned no data");
  }

  return payload.data;
}

export interface AiMediaAnalysis {
  mediaId: string;
  suggestedCategories: Array<{ id: string; name: string; score: number }>;
}

async function downloadFile(path: string) {
  const headers = new Headers();
  headers.set("X-Client-Platform", "web");
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { headers, credentials: "include" });
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}`);
  }
  return response.blob();
}

async function fetchAuthorizedBlobUrl(path: string) {
  const blob = await downloadFile(path);
  return URL.createObjectURL(blob);
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
  myMatchSuggestions() {
    return request<{ suggestions: PostMatchSuggestion[] }>("/posts/my/match-suggestions");
  },
  getPost(id: string) {
    return request<PostDetail>(`/posts/${id}`);
  },
  getMatches(id: string) {
    return request<{ matches: MatchResult[] }>(`/posts/${id}/matches`);
  },
  getMatchExplanations(id: string) {
    return request<{ explanations: MatchExplanation[] }>(`/posts/${id}/matches/explanations`);
  },
  recordMatchFeedback(
    postId: string,
    matchId: string,
    input: { label: MatchFeedbackLabel; note?: string | null }
  ) {
    return request<{ feedback: { id: string; matchId: string; label: MatchFeedbackLabel } }>(
      `/posts/${postId}/matches/${matchId}/feedback`,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  },
  postClaims(id: string) {
    return request<{ claims: PostClaimSummary[] }>(`/posts/${id}/claims`);
  },
  suggestVerificationQuestions(postId: string) {
    return request<{ suggestions: VerificationQuestionSuggestion[] }>(`/posts/${postId}/verification-questions/suggest`, {
      method: "POST"
    });
  },
  postVerificationQuestions(postId: string) {
    return request<{ questions: VerificationQuestion[] }>(`/posts/${postId}/verification-questions`);
  },
  createVerificationQuestion(postId: string, input: {
    prompt: string;
    questionType: VerificationQuestionType;
    sourceSignal: string;
    expectedAnswer: string;
    options?: string[];
    weight: number;
    privacyLevel: "PRIVATE" | "HIGHLY_PRIVATE";
    approved: boolean;
  }) {
    return request<{ question: VerificationQuestion }>(`/posts/${postId}/verification-questions`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateVerificationQuestionStatus(postId: string, questionId: string, status: "APPROVED" | "DISABLED") {
    return request<{ question: VerificationQuestion }>(`/posts/${postId}/verification-questions/${questionId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
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
  updatePost(id: string, input: Record<string, unknown>) {
    return request<{ post: BoardPost }>(`/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  deletePost(id: string) {
    return request<{ deleted: boolean }>(`/posts/${id}`, {
      method: "DELETE"
    });
  },
  reportPost(id: string, input: Record<string, unknown>) {
    return request<{ id: string }>(`/posts/${id}/report`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  uploadPostImages(id: string, files: FileList | File[], evidenceFiles: FileList | File[] = []) {
    const data = new FormData();
    Array.from(files).forEach((file) => data.append("images", file));
    Array.from(evidenceFiles).forEach((file) => data.append("evidenceImages", file));
    return request<{ media: unknown[]; ai: AiMediaAnalysis[]; matchSuggestions: PostMatchSuggestion[] }>(`/posts/${id}/media`, {
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
  getClaim(id: string) {
    return request<ClaimDetail>(`/claims/${id}`);
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
  claimEvidenceImage(claimId: string, evidenceId: string) {
    return fetchAuthorizedBlobUrl(`/claims/${claimId}/evidence/${evidenceId}/image`);
  },
  postEvidenceImage(postId: string, mediaId: string) {
    return fetchAuthorizedBlobUrl(`/posts/${postId}/media/${mediaId}/image`);
  },
  uploadClaimChatImage(id: string, file: File) {
    const data = new FormData();
    data.append("image", file);
    return request<{ image: { publicId: string; bytes?: number | null } }>(`/claims/${id}/chat-image`, {
      method: "POST",
      body: data
    });
  },
  claimChatImage(claimId: string, mediaPublicId: string) {
    return fetchAuthorizedBlobUrl(`/claims/${claimId}/chat-image?publicId=${encodeURIComponent(mediaPublicId)}`);
  },
  claimVerification(id: string) {
    return request<{ verification: ClaimVerification }>(`/claims/${id}/verification`);
  },
  claimVerificationQuestions(id: string) {
    return request<{ questions: VerificationQuestion[] }>(`/claims/${id}/verification-questions`);
  },
  answerClaimVerificationQuestion(claimId: string, questionId: string, answer: string) {
    return request<{ submitted: boolean }>(`/claims/${claimId}/verification-questions/${questionId}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer })
    });
  },
  requestClaimMoreInfo(id: string, message: string) {
    return request<ClaimDetail>(`/claims/${id}/more-info`, {
      method: "PATCH",
      body: JSON.stringify({ message })
    });
  },
  acceptClaim(id: string) {
    return request<ClaimDetail>(`/claims/${id}/accept`, {
      method: "PATCH"
    });
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
  uploadAppointmentProof(id: string, file: File, note?: string | null) {
    const data = new FormData();
    data.append("proof", file);
    if (note?.trim()) {
      data.append("note", note.trim());
    }
    return request<{ appointment: ReturnAppointment }>(`/appointments/${id}/proof`, {
      method: "POST",
      body: data
    });
  },
  appointmentProofImage(id: string) {
    return fetchAuthorizedBlobUrl(`/appointments/${id}/proof-image`);
  },
  acceptAppointment(id: string) {
    return request<{ appointment: ReturnAppointment }>(`/appointments/${id}/accept`, {
      method: "PATCH"
    });
  },
  rejectAppointment(id: string, reason: string) {
    return request<{ appointment: ReturnAppointment }>(`/appointments/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason })
    });
  },
  cancelAppointment(id: string, reason: string) {
    return request<{ appointment: ReturnAppointment }>(`/appointments/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason })
    });
  },
  completeAppointment(id: string) {
    return request<{ appointment: ReturnAppointment }>(`/appointments/${id}/complete`, {
      method: "PATCH"
    });
  },
  rescheduleAppointment(id: string, input: Record<string, unknown>) {
    return request<{ appointment: ReturnAppointment }>(`/appointments/${id}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  sendAppointmentReminders(hoursAhead = 24) {
    return request<{ reminded: number }>("/appointments/jobs/send-reminders", {
      method: "POST",
      body: JSON.stringify({ hoursAhead })
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
  googleLoginUrl() {
    return `${API_BASE_URL}/auth/google`;
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
  logout(refreshToken?: string) {
    return request<{ revoked: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {})
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
    return request<{
      reputation: {
        totalPoints: number;
        level: string;
        recentLogs: Array<{
          id: string;
          delta: number;
          reason: string;
          entityType: string | null;
          entityId: string | null;
          createdAt: string;
        }>;
      };
    }>("/auth/reputation");
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
  adminConfig() {
    return request<{ entries: AdminConfigEntry[] }>("/admin/config");
  },
  adminUpdateConfig(key: string, value: unknown) {
    return request<{ key: string; value: unknown; rawValue: string }>(`/admin/config/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value })
    });
  },
  adminConfigHistory(limit = 50) {
    return request<{ history: AdminConfigHistoryEntry[] }>(`/admin/config/history?limit=${limit}`);
  },
  adminRollbackConfigHistory(id: string) {
    return request<{ key: string; value: unknown; rawValue: string; rolledBackFromHistoryId: string }>(
      `/admin/config/history/${id}/rollback`,
      {
        method: "POST"
      }
    );
  },
  adminDashboardExportUrl() {
    return `${API_BASE_URL}/admin/dashboard/export.csv`;
  },
  adminDownloadWarehouseCsv() {
    return downloadFile("/admin/warehouse-items/export.csv");
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
  adminWarehouseCapacity() {
    return request<{
      capacity: { activeItems: number; capacity: number; warningAt: number; usageRatio: number; isFull: boolean; isNearFull: boolean };
    }>("/admin/warehouse/capacity");
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
  adminProcessWarehouseItem(id: string, input: { status: "DISPOSED" | "DONATED" | "TRANSFERRED"; note: string }) {
    return request<{ updated: boolean }>(`/admin/warehouse-items/${id}/process`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminDeleteWarehouseItem(id: string) {
    return request<{ deleted: boolean }>(`/admin/warehouse-items/${id}`, {
      method: "DELETE"
    });
  },
  adminExpirePosts() {
    return request<{ expired: number }>("/admin/jobs/expire-posts", {
      method: "POST"
    });
  },
  adminExpireWarehouseItems() {
    return request<{ expired: number }>("/admin/warehouse-items/expire-overdue", {
      method: "POST"
    });
  },
  adminAlertWarehouseNearExpiry(daysAhead = 7) {
    return request<{ alertedItems: number }>("/admin/warehouse-items/alert-near-expiry", {
      method: "POST",
      body: JSON.stringify({ daysAhead })
    });
  },
  adminAlertWarehouseCapacity() {
    return request<{ alerted: boolean }>("/admin/warehouse/alert-capacity", {
      method: "POST"
    });
  },
  adminRadarEvents(status?: "ACTIVE" | "CANCELLED") {
    return request<{ events: RadarEvent[] }>(`/admin/radar/events${status ? `?status=${status}` : ""}`);
  },
  adminRadarAlerts(input: { status?: RadarAlertStatus; severity?: RadarAlertSeverity; limit?: number } = {}) {
    return request<{ alerts: RadarAlert[]; advisory: string }>(`/admin/radar/alerts${buildQuery(input)}`);
  },
  adminRadarRelatedPosts(alertId: string, limit = 50) {
    return request<{ posts: RadarRelatedPost[]; advisory: string }>(`/admin/radar/alerts/${alertId}/posts?limit=${limit}`);
  },
  adminCreateRadarEvent(input: {
    eventType: RadarEventType;
    sourceType: RadarSourceType;
    sourceReference: string;
    areaId?: string | null;
    buildingId?: string | null;
    startsAt: string;
    endsAt: string;
  }) {
    return request<{ event: RadarEvent }>("/admin/radar/events", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminAnalyzeRadarEvent(id: string) {
    return request<{ eventId: string; detectedAlerts: number; emittedAlerts: number; advisory: string }>(`/admin/radar/events/${id}/analyze`, {
      method: "POST"
    });
  },
  adminUpdateRadarAlert(id: string, status: Exclude<RadarAlertStatus, "OPEN">, reason: "REVIEWED_NO_ACTION" | "MONITORING" | "OPERATIONAL_FOLLOW_UP" | "FALSE_POSITIVE") {
    return request<{ alert: RadarAlert | null; updated: boolean }>(`/admin/radar/alerts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason })
    });
  },
  adminVisualHunt(image: File, input: { targetType?: PostType; categoryId?: string; areaId?: string; maxResults?: number } = {}) {
    const data = new FormData();
    data.append("image", image);
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== "") data.append(key, String(value));
    });
    return request<VisualHuntApiResponse>("/admin/visual-hunt", { method: "POST", body: data });
  },
  adminVisualHuntFeedback(input: { postId: string; decision: "CANDIDATE" | "NOT_RELEVANT"; similarityScore: number | null; source: "CAMERA" | "IMAGE" | "VIDEO_FRAMES" | "BATCH_IMAGES" }) {
    return request<{ feedback: { id: string } }>("/admin/visual-hunt/feedback", {
      method: "POST",
      body: JSON.stringify(input)
    });
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
  },
  adminHandleReport(id: string, input: Record<string, unknown>) {
    return request<{ updated: boolean }>(`/admin/reports/${id}/handle`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  }
};
