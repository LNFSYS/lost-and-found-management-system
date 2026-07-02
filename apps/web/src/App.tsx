import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Filter,
  Handshake,
  IdCard,
  Key,
  Laptop,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  MoreVertical,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Upload,
  UserCircle,
  Users,
  Wallet,
  X
} from "lucide-react";
import { type CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import {
  api,
  clearTokens,
  getApiOrigin,
  getStoredAccessToken,
  getStoredRefreshToken,
  hasAccessToken,
  saveTokens,
  type AdminConfigEntry,
  type AdminConfigHistoryEntry,
  type Category,
  type AdminArea,
  type AdminBuilding,
  type AdminCategory,
  type AdminHandoverPoint,
  type AdminNamedResource,
  type AdminOverview,
  type AdminReport,
  type AdminRole,
  type AdminUser,
  type AdminUserStatus,
  type AdminWarehouseItem,
  type AdminWarehouseStatus,
  type BoardPost,
  type Building,
  type ListPostsParams,
  type NotificationItem,
  type PostMatchSuggestion,
  type PostClaimSummary,
  type PostStatus,
  type PostType,
  type PublicConfigEntry,
  type PublicUser,
  type ReturnAppointment,
} from "./services/api";
import { HandoverPointPage } from "./handover/HandoverPointPage";

type View = "board" | "my-posts" | "create" | "handover" | "account";
type AuthMode = "login" | "register" | "forgot" | "reset";
type AuthEntryMode = Extract<AuthMode, "login" | "register">;
type AudienceRole = "STUDENT" | "LECTURER";
type AdminTab = "overview" | "moderation" | "categories" | "locations" | "handover" | "warehouse" | "users" | "reports" | "config";

type ChatMessageView = {
  id: string;
  sender: { id: string; fullName: string | null };
  content: string | null;
  mediaUrl: string | null;
  messageType: "TEXT" | "IMAGE" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
};

interface ImageUploadRules {
  allowedFormats: string[];
  maxImageSizeMb: number;
  maxImages: number;
}

const statusLabels: Record<string, string> = {
  OPEN: "Đang mở",
  MATCHED: "Có gợi ý",
  RESOLVED: "Đã trả",
  CLOSED: "Đã đóng",
  EXPIRED: "Hết hạn",
  HIDDEN: "Ẩn"
};

const typeLabels: Record<PostType, string> = {
  LOST: "Đồ bị mất",
  FOUND: "Đồ nhặt được"
};

function matchSuggestionsSignature(suggestions: PostMatchSuggestion[]) {
  return suggestions
    .map((suggestion) => `${suggestion.sourcePostId ?? "unknown"}:${suggestion.match.id}:${suggestion.post.id}`)
    .sort()
    .join("|");
}

const MATCH_SUGGESTION_CHECK_INTERVAL_MS = 10 * 60 * 1000;

const warehouseStatuses: AdminWarehouseStatus[] = [
  "PENDING_APPROVAL",
  "RECEIVED",
  "STORED",
  "CLAIMED",
  "RETURNED",
  "EXPIRED",
  "DISPOSED",
  "DONATED",
  "TRANSFERRED"
];

const warehouseStatusLabels: Record<AdminWarehouseStatus, string> = {
  PENDING_APPROVAL: "Chờ duyệt nhập kho",
  RECEIVED: "Đã nhận",
  STORED: "Đang lưu kho",
  CLAIMED: "Đang claim",
  RETURNED: "Đã trả",
  EXPIRED: "Quá hạn",
  DISPOSED: "Đã hủy/thanh lý",
  DONATED: "Đã quyên góp",
  TRANSFERRED: "Đã chuyển giao"
};

export function App() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("board");
  const [filters, setFilters] = useState<ListPostsParams>({ page: 1, pageSize: 12, sort: "latest" });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("post");
  });
  const [claimPost, setClaimPost] = useState<BoardPost | null>(null);
  const [authVersion, setAuthVersion] = useState(0);
  const [authEntryMode, setAuthEntryMode] = useState<AuthEntryMode>("login");
  const [authEntryKey, setAuthEntryKey] = useState(0);
  const [adminMode, setAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [matchSuggestions, setMatchSuggestions] = useState<PostMatchSuggestion[] | null>(null);
  const [dismissedMatch, setDismissedMatch] = useState<{ signature: string; dismissedAt: number } | null>(null);
  const [realtimeToast, setRealtimeToast] = useState<NotificationItem | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => api.categories() });
  const areasQuery = useQuery({ queryKey: ["areas"], queryFn: () => api.areas() });
  const handoverQuery = useQuery({ queryKey: ["handover-points"], queryFn: () => api.handoverPoints() });
  const publicConfigQuery = useQuery({ queryKey: ["public-config"], queryFn: () => api.publicConfig() });
  const filterBuildingsQuery = useQuery({
    queryKey: ["filter-buildings", filters.areaId],
    queryFn: () => api.buildings(filters.areaId!),
    enabled: Boolean(filters.areaId)
  });
  const allBuildingsQuery = useQuery({
    queryKey: ["all-buildings", areasQuery.data?.areas],
    queryFn: async () => {
      const areas = areasQuery.data?.areas ?? [];
      const results = await Promise.all(
        areas.map(async (area) => {
          try {
            const res = await api.buildings(area.id);
            return res.buildings.map((b) => ({ ...b, areaName: area.name }));
          } catch (e) {
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: Boolean(areasQuery.data?.areas)
  });
  const postsQuery = useQuery({ queryKey: ["posts", filters], queryFn: () => api.listPosts(filters) });
  const meQuery = useQuery({
    queryKey: ["me", authVersion],
    queryFn: () => api.me(),
    enabled: hasAccessToken()
  });
  const notificationsQuery = useQuery({
    queryKey: ["notifications", authVersion],
    queryFn: () => api.notifications(),
    enabled: hasAccessToken(),
    refetchInterval: 30000
  });
  const userRoles = meQuery.data?.user.roles ?? [];
  const isAdmin = userRoles.includes("ADMIN");
  const isStaff = userRoles.includes("STAFF");
  const canUseAdmin = isAdmin || isStaff;
  const adminPostsQuery = useQuery({
    queryKey: ["admin-posts-overview", adminMode],
    queryFn: () => api.listPosts({ page: 1, pageSize: 100, sort: "latest" }),
    enabled: adminMode
  });
  const adminHiddenPostsQuery = useQuery({
    queryKey: ["admin-hidden-posts", adminMode],
    queryFn: () => api.listPosts({ page: 1, pageSize: 100, status: "HIDDEN", sort: "latest" }),
    enabled: adminMode && isAdmin
  });
  const adminOverviewQuery = useQuery({
    queryKey: ["admin-overview", adminMode],
    queryFn: () => api.adminOverview(),
    enabled: adminMode && hasAccessToken()
  });
  const adminUsersQuery = useQuery({
    queryKey: ["admin-users", adminMode],
    queryFn: () => api.adminUsers(),
    enabled: adminMode && isAdmin
  });
  const adminCategoriesQuery = useQuery({
    queryKey: ["admin-categories", adminMode],
    queryFn: () => api.adminCategories(),
    enabled: adminMode && canUseAdmin
  });
  const adminAreasQuery = useQuery({
    queryKey: ["admin-areas", adminMode],
    queryFn: () => api.adminAreas(),
    enabled: adminMode && canUseAdmin
  });
  const adminBuildingsQuery = useQuery({
    queryKey: ["admin-buildings", adminMode],
    queryFn: () => api.adminBuildings(),
    enabled: adminMode && canUseAdmin
  });
  const adminHandoverQuery = useQuery({
    queryKey: ["admin-handover", adminMode],
    queryFn: () => api.adminHandoverPoints(),
    enabled: adminMode && canUseAdmin
  });
  const adminWarehouseQuery = useQuery({
    queryKey: ["admin-warehouse", adminMode],
    queryFn: () => api.adminWarehouseItems(),
    enabled: adminMode && canUseAdmin
  });
  const adminReportsQuery = useQuery({
    queryKey: ["admin-reports", adminMode],
    queryFn: () => api.adminReports(),
    enabled: adminMode && isAdmin
  });
  const adminConfigQuery = useQuery({
    queryKey: ["admin-config", adminMode],
    queryFn: () => api.adminConfig(),
    enabled: adminMode && isAdmin
  });
  const adminConfigHistoryQuery = useQuery({
    queryKey: ["admin-config-history", adminMode],
    queryFn: () => api.adminConfigHistory(),
    enabled: adminMode && isAdmin
  });
  const myPostsQuery = useQuery({
    queryKey: ["my-posts", filters, authVersion],
    queryFn: () => api.myPosts(filters),
    enabled: view === "my-posts" && hasAccessToken()
  });
  const isSignedIn = Boolean(meQuery.data?.user);
  const selectedPostQuery = useQuery({
    queryKey: ["post", selectedPostId],
    queryFn: () => api.getPost(selectedPostId!),
    enabled: Boolean(selectedPostId)
  });
  const realtimeMatchSuggestionsQuery = useQuery({
    queryKey: ["my-match-suggestions", authVersion],
    queryFn: () => api.myMatchSuggestions(),
    enabled: isSignedIn,
    refetchInterval: MATCH_SUGGESTION_CHECK_INTERVAL_MS,
    retry: false
  });

  const activeList = view === "my-posts" ? myPostsQuery.data : postsQuery.data;
  const activeListLoading = view === "my-posts" ? myPostsQuery.isLoading : postsQuery.isLoading;
  const activeListError = view === "my-posts" ? myPostsQuery.error : postsQuery.error;
  const moderationPosts = useMemo(
    () => [...(adminPostsQuery.data?.items ?? []), ...(adminHiddenPostsQuery.data?.items ?? [])],
    [adminHiddenPostsQuery.data?.items, adminPostsQuery.data?.items]
  );
  const imageRules = useMemo(() => getImageUploadRules(publicConfigQuery.data?.entries), [publicConfigQuery.data?.entries]);
  const title = viewTitle(view);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    if (params.get("oauth") !== "google") {
      return;
    }

    const error = params.get("error");
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    if (error) {
      setOauthError(error);
      setView("account");
      return;
    }
    if (!accessToken || !refreshToken) {
      setOauthError("Không nhận được token đăng nhập Google.");
      setView("account");
      return;
    }

    saveTokens({
      accessToken,
      refreshToken,
      accessTokenExpiresIn: params.get("accessTokenExpiresIn") ?? "15m",
      refreshTokenExpiresIn: params.get("refreshTokenExpiresIn") ?? "30d"
    });
    setOauthError(null);
    setView("board");
    afterAuthChange();
  }, []);

  useEffect(() => {
    if (!canUseAdmin) {
      setAdminMode(false);
    }
  }, [canUseAdmin]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token || !isSignedIn) {
      return;
    }
    const socket = io(getApiOrigin(), {
      auth: { token },
      transports: ["websocket", "polling"]
    });
    socket.on("notification:new", (notification: NotificationItem) => {
      setRealtimeToast(notification);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (notification.type === "MATCH_FOUND") {
        void queryClient.invalidateQueries({ queryKey: ["my-match-suggestions"] });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [authVersion, isSignedIn, queryClient]);

  useEffect(() => {
    if (!realtimeToast) {
      return;
    }
    const timeoutId = window.setTimeout(() => setRealtimeToast(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [realtimeToast]);

  useEffect(() => {
    if (adminMode && !isAdmin && adminTab !== "overview" && adminTab !== "warehouse") {
      setAdminTab("warehouse");
    }
  }, [adminMode, adminTab, isAdmin]);

  function toggleAdminMode() {
    setAdminMode((current) => {
      if (current) {
        return false;
      }
      setAdminTab(isAdmin ? "overview" : "warehouse");
      return true;
    });
  }

  function updateFilter<Key extends keyof ListPostsParams>(key: Key, value: ListPostsParams[Key]) {
    setFilters((current) => {
      const next = { ...current, [key]: value, page: 1 };
      if (key === "areaId") {
        next.buildingId = undefined;
      } else if (key === "buildingId") {
        if (!value) {
          next.areaId = undefined;
        } else {
          const bId = String(value);
          const building = allBuildingsQuery.data?.find((b) => b.id === bId);
          if (building) {
            next.areaId = building.areaId;
          }
        }
      }
      return next;
    });
  }

  function openPost(postId: string) {
    setSelectedPostId(postId);
    const url = new URL(window.location.href);
    url.searchParams.set("post", postId);
    window.history.replaceState(null, "", url);
  }

  function closePost() {
    setSelectedPostId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    window.history.replaceState(null, "", url);
  }

  async function refreshBoard() {
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
    await queryClient.invalidateQueries({ queryKey: ["my-posts"] });
  }

  function afterAuthChange() {
    setAuthVersion((value) => value + 1);
    void queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  function openAuth(mode: AuthEntryMode) {
    setAuthEntryMode(mode);
    setAuthEntryKey((value) => value + 1);
    setAdminMode(false);
    setView("account");
  }

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    },
    onSettled: () => {
      clearTokens();
      setAdminMode(false);
      setView("board");
      afterAuthChange();
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: string) => api.markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  function openNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      markNotificationReadMutation.mutate(notification.id);
    }
    if (notification.entityType === "POST" && notification.entityId) {
      setAdminMode(false);
      setView("board");
      openPost(notification.entityId);
    }
  }

  const stats = useMemo(() => {
    const items = activeList?.items ?? [];
    return {
      lost: items.filter((item) => item.type === "LOST").length,
      found: items.filter((item) => item.type === "FOUND").length,
      matched: items.filter((item) => item.status === "MATCHED").length
    };
  }, [activeList?.items]);

  useEffect(() => {
    const suggestions = realtimeMatchSuggestionsQuery.data?.suggestions ?? [];
    const signature = matchSuggestionsSignature(suggestions);
    const recentlyDismissed =
      dismissedMatch?.signature === signature &&
      Date.now() - dismissedMatch.dismissedAt < MATCH_SUGGESTION_CHECK_INTERVAL_MS;

    if (suggestions.length > 0 && !matchSuggestions && !recentlyDismissed) {
      setMatchSuggestions(suggestions);
    }
  }, [
    dismissedMatch,
    matchSuggestions,
    realtimeMatchSuggestionsQuery.data?.suggestions,
    realtimeMatchSuggestionsQuery.dataUpdatedAt
  ]);

  function dismissMatchSuggestions() {
    if (matchSuggestions) {
      setDismissedMatch({
        signature: matchSuggestionsSignature(matchSuggestions),
        dismissedAt: Date.now()
      });
    }
    setMatchSuggestions(null);
  }

  return (
    <main className={`app-shell ${adminMode ? "admin-shell" : "community-shell"} ${!isSignedIn ? "guest-shell" : ""}`}>
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="FPTU Lost and Found">
          <span className="brand-mark">
            <span>F</span>
            <span>P</span>
            <span>T</span>
          </span>
          <span>
            <strong>Lost & Found</strong>
            <small>FPTU Da Nang</small>
          </span>
        </a>

        <nav className="nav-list" aria-label="Main navigation">
          {adminMode ? (
            <>
              <button className={adminTab === "overview" ? "active" : ""} type="button" onClick={() => setAdminTab("overview")}>
                <LayoutDashboard size={18} /> Dashboard
              </button>
              {!isAdmin && (
                <button className={adminTab === "warehouse" ? "active" : ""} type="button" onClick={() => setAdminTab("warehouse")}>
                  <Boxes size={18} /> Quản lý kho
                </button>
              )}
              {isAdmin && (
                <>
                  <button className={adminTab === "moderation" ? "active" : ""} type="button" onClick={() => setAdminTab("moderation")}>
                    <ShieldCheck size={18} /> Kiểm duyệt
                  </button>
                  <button className={adminTab === "categories" ? "active" : ""} type="button" onClick={() => setAdminTab("categories")}>
                    <Boxes size={18} /> Danh mục
                  </button>
                  <button className={adminTab === "locations" ? "active" : ""} type="button" onClick={() => setAdminTab("locations")}>
                    <Building2 size={18} /> Khu vực
                  </button>
                  <button className={adminTab === "handover" ? "active" : ""} type="button" onClick={() => setAdminTab("handover")}>
                    <Handshake size={18} /> Bàn giao
                  </button>
                  <button className={adminTab === "warehouse" ? "active" : ""} type="button" onClick={() => setAdminTab("warehouse")}>
                    <Boxes size={18} /> Nhà kho
                  </button>
                  <button className={adminTab === "users" ? "active" : ""} type="button" onClick={() => setAdminTab("users")}>
                    <Users size={18} /> Người dùng
                  </button>
                  <button className={adminTab === "reports" ? "active" : ""} type="button" onClick={() => setAdminTab("reports")}>
                    <Flag size={18} /> Báo cáo
                  </button>
                  <button className={adminTab === "config" ? "active" : ""} type="button" onClick={() => setAdminTab("config")}>
                    <Key size={18} /> Cấu hình
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button className={view === "board" ? "active" : ""} type="button" onClick={() => setView("board")}>
                <Search size={18} /> Cộng đồng
              </button>
              {isSignedIn && (
              <button className={view === "my-posts" ? "active" : ""} type="button" onClick={() => setView("my-posts")}>
                <UserCircle size={18} /> Tin của tôi
              </button>
              )}
              <button className={view === "create" ? "active" : ""} type="button" onClick={() => setView("create")}>
                <Camera size={18} /> Đăng tin
              </button>
              <button className={view === "handover" ? "active" : ""} type="button" onClick={() => setView("handover")}>
                <Handshake size={18} /> Bàn giao
              </button>
            </>
          )}
        </nav>

        {!adminMode && isSignedIn && meQuery.data?.user && (
          <UserMenu
            user={meQuery.data.user}
            notifications={notificationsQuery.data?.items ?? []}
            unreadCount={notificationsQuery.data?.unreadCount ?? 0}
            canUseAdmin={canUseAdmin}
            isAdmin={isAdmin}
            adminMode={adminMode}
            logoutPending={logoutMutation.isPending}
            markAllPending={markAllNotificationsReadMutation.isPending}
            onProfile={() => {
              setAdminMode(false);
              setView("account");
            }}
            onToggleAdmin={toggleAdminMode}
            onNotification={openNotification}
            onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
            onLogout={() => logoutMutation.mutate()}
          />
        )}

        {!adminMode && !isSignedIn && (
          <div className="guest-auth-actions" aria-label="Guest authentication actions">
            <button className="guest-login-button" type="button" onClick={() => openAuth("login")}>
              Đăng nhập
            </button>
            <button className="guest-register-button" type="button" onClick={() => openAuth("register")}>
              Đăng ký
            </button>
          </div>
        )}

        {adminMode && canUseAdmin && (
          <button className="mode-switch" type="button" onClick={toggleAdminMode}>
            {adminMode ? "Chuyển sang cộng đồng" : isAdmin ? "Mở Admin Dashboard" : "Mở Staff Dashboard"}
          </button>
        )}

        <div className="sidebar-card">
          {adminMode ? <BarChart3 size={20} /> : <MessageCircle size={20} />}
          <strong>{adminMode ? (isAdmin ? "Bảng điều hành" : "Staff kho") : "Community feed"}</strong>
          <span>
            {adminMode
              ? isAdmin
                ? "Theo dõi vận hành, dữ liệu nền và các điểm bàn giao của hệ thống."
                : "Tập trung nhập kho, cập nhật trạng thái và điều phối vật phẩm tại điểm bàn giao."
              : "Sinh viên và giảng viên đăng tin, tìm kiếm, claim và theo dõi đồ thất lạc như một diễn đàn campus."}
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{adminMode ? (isAdmin ? "Admin operations" : "Staff warehouse") : "FPTU community"}</span>
            <h1>{adminMode ? (isAdmin ? "Admin Dashboard" : "Staff Dashboard") : title}</h1>
          </div>
          <div className="topbar-actions">
            {isSignedIn && meQuery.data?.user ? (
              <UserMenu
                user={meQuery.data.user}
                notifications={notificationsQuery.data?.items ?? []}
                unreadCount={notificationsQuery.data?.unreadCount ?? 0}
                canUseAdmin={canUseAdmin}
                isAdmin={isAdmin}
                adminMode={adminMode}
                logoutPending={logoutMutation.isPending}
                markAllPending={markAllNotificationsReadMutation.isPending}
                onProfile={() => {
                  setAdminMode(false);
                  setView("account");
                }}
                onToggleAdmin={toggleAdminMode}
                onNotification={openNotification}
                onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
                onLogout={() => logoutMutation.mutate()}
              />
            ) : (
              <button className="avatar-menu-trigger guest-avatar-trigger" type="button" onClick={() => openAuth("login")} aria-label="Đăng nhập">
                <UserCircle size={24} />
              </button>
            )}
            {!adminMode && (
              <button className="primary-button" type="button" onClick={() => setView("create")}>
                <Camera size={18} /> Đăng tin
              </button>
            )}
          </div>
        </header>

        {adminMode && canUseAdmin && (
          <AdminDashboardView
            activeTab={adminTab}
            isAdmin={isAdmin}
            posts={adminPostsQuery.data?.items ?? []}
            moderationPosts={moderationPosts}
            overview={adminOverviewQuery.data?.overview}
            users={adminUsersQuery.data?.users ?? []}
            categories={adminCategoriesQuery.data?.categories ?? []}
            areas={adminAreasQuery.data?.areas ?? []}
            buildings={adminBuildingsQuery.data?.buildings ?? []}
            handoverPoints={adminHandoverQuery.data?.handoverPoints ?? []}
            warehouseItems={adminWarehouseQuery.data?.warehouseItems ?? []}
            reports={adminReportsQuery.data?.reports ?? []}
            configEntries={adminConfigQuery.data?.entries ?? []}
            configHistory={adminConfigHistoryQuery.data?.history ?? []}
            totalPosts={adminPostsQuery.data?.total ?? 0}
            onSelectPost={openPost}
          />
        )}

        {!adminMode && view === "board" && (
          <BoardView
            variant="feed"
            categories={categoriesQuery.data?.categories ?? []}
            areas={areasQuery.data?.areas ?? []}
            buildings={allBuildingsQuery.data ?? []}
            filters={filters}
            posts={activeList?.items ?? []}
            stats={stats}
            total={activeList?.total ?? 0}
            loading={activeListLoading}
            error={activeListError}
            onFilter={updateFilter}
            onSelect={openPost}
            onClaim={setClaimPost}
            onNavigate={setView}
          />
        )}

        {!adminMode && view === "my-posts" && !isSignedIn && (
          <div className="empty-state">
            <ShieldCheck size={30} />
            <strong>Cần đăng nhập để xem tin của tôi</strong>
            <span>Bấm Đăng nhập hoặc Đăng ký ở thanh trên để tiếp tục.</span>
          </div>
        )}

        {!adminMode && view === "my-posts" && isSignedIn && (
          <BoardView
            variant="mine"
            categories={categoriesQuery.data?.categories ?? []}
            areas={areasQuery.data?.areas ?? []}
            buildings={allBuildingsQuery.data ?? []}
            filters={filters}
            posts={activeList?.items ?? []}
            stats={stats}
            total={activeList?.total ?? 0}
            loading={activeListLoading}
            error={activeListError}
            onFilter={updateFilter}
            onSelect={openPost}
            onClaim={setClaimPost}
          />
        )}

        {!adminMode && view === "create" && (
          <CreatePostView
            signedIn={isSignedIn}
            categories={categoriesQuery.data?.categories ?? []}
            areas={areasQuery.data?.areas ?? []}
            handoverPoints={handoverQuery.data?.handoverPoints ?? []}
            imageRules={imageRules}
            onCreated={async (postId, suggestions) => {
              setView("board");
              await refreshBoard();
              await queryClient.invalidateQueries({ queryKey: ["notifications"] });
              if (suggestions.length > 0) {
                setMatchSuggestions(suggestions);
                return;
              }
              openPost(postId);
            }}
          />
        )}

        {!adminMode && view === "handover" && (
          <HandoverPointPage
            handoverPoints={handoverQuery.data?.handoverPoints ?? []}
            loading={handoverQuery.isLoading}
            error={handoverQuery.error}
            canManage={canUseAdmin}
          />
        )}

        {!adminMode && view === "account" && (
          <AccountView
            user={meQuery.data?.user}
            entryMode={authEntryMode}
            entryKey={authEntryKey}
            oauthError={oauthError}
            imageRules={imageRules}
            onAuthChange={afterAuthChange}
            onSignedIn={() => {
              afterAuthChange();
              setView("board");
            }}
            onSignedOut={() => {
              clearTokens();
              afterAuthChange();
            }}
          />
        )}
      </section>

      {!adminMode && (
        <nav className={`mobile-bottom-nav ${isSignedIn ? "" : "guest-bottom-nav"}`} aria-label="Điều hướng nhanh">
          <button className={view === "board" ? "active" : ""} type="button" onClick={() => setView("board")}>
            <Search size={18} />
            <span>Cộng đồng</span>
          </button>
          {isSignedIn && (
            <button className={view === "my-posts" ? "active" : ""} type="button" onClick={() => setView("my-posts")}>
              <UserCircle size={18} />
              <span>Tin tôi</span>
            </button>
          )}
          <button className={view === "create" ? "active" : ""} type="button" onClick={() => setView("create")}>
            <Camera size={20} />
            <span>Đăng</span>
          </button>
          <button className={view === "handover" ? "active" : ""} type="button" onClick={() => setView("handover")}>
            <Handshake size={18} />
            <span>Bàn giao</span>
          </button>
          {isSignedIn ? (
          <button className={view === "account" ? "active" : ""} type="button" onClick={() => setView("account")}>
            <UserCircle size={18} />
            <span>Hồ sơ</span>
          </button>
          ) : (
          <button className={view === "account" ? "active" : ""} type="button" onClick={() => openAuth("login")}>
            <UserCircle size={18} />
            <span>Đăng nhập</span>
          </button>
          )}
        </nav>
      )}

      {selectedPostId && (
        <PostDrawer
          loading={selectedPostQuery.isLoading}
          detail={selectedPostQuery.data}
          handoverPoints={handoverQuery.data?.handoverPoints ?? []}
          currentUserId={meQuery.data?.user.id}
          onClose={closePost}
          onClaim={(post) => setClaimPost(post)}
        />
      )}

      {claimPost && (
        <ClaimDialog
          post={claimPost}
          signedIn={isSignedIn}
          imageRules={imageRules}
          onClose={() => setClaimPost(null)}
          onCreated={async () => {
            setClaimPost(null);
            await refreshBoard();
          }}
        />
      )}

      {matchSuggestions && (
        <MatchSuggestionsDialog
          suggestions={matchSuggestions}
          onClose={dismissMatchSuggestions}
          onSelect={(postId) => {
            dismissMatchSuggestions();
            openPost(postId);
          }}
        />
      )}

      {realtimeToast && (
        <RealtimeNotificationToast
          notification={realtimeToast}
          onClose={() => setRealtimeToast(null)}
          onOpen={() => {
            openNotification(realtimeToast);
            setRealtimeToast(null);
          }}
        />
      )}
    </main>
  );
}

function RealtimeNotificationToast(props: {
  notification: NotificationItem;
  onClose: () => void;
  onOpen: () => void;
}) {
  return (
    <aside className="realtime-toast" role="status" aria-live="polite">
      <Bell size={18} />
      <div>
        <strong>{props.notification.title}</strong>
        {props.notification.body && <span>{props.notification.body}</span>}
      </div>
      {props.notification.entityType === "POST" && props.notification.entityId && (
        <button className="text-button" type="button" onClick={props.onOpen}>
          Mở
        </button>
      )}
      <button className="icon-button" type="button" onClick={props.onClose} aria-label="Đóng thông báo">
        <X size={16} />
      </button>
    </aside>
  );
}

function UserMenu(props: {
  user: PublicUser;
  notifications: NotificationItem[];
  unreadCount: number;
  canUseAdmin: boolean;
  isAdmin: boolean;
  adminMode: boolean;
  logoutPending: boolean;
  markAllPending: boolean;
  onProfile: () => void;
  onToggleAdmin: () => void;
  onNotification: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unreadLabel = props.unreadCount > 9 ? "9+" : String(props.unreadCount);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="avatar-menu">
      <button
        className="avatar-menu-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở menu tài khoản"
        aria-expanded={open}
      >
        {props.user.avatarUrl ? <img src={props.user.avatarUrl} alt="" /> : <span>{avatarInitials(props.user.fullName)}</span>}
        {props.unreadCount > 0 && <em>{unreadLabel}</em>}
      </button>

      {open && (
        <div className="avatar-dropdown">
          <div className="avatar-dropdown-profile">
            {props.user.avatarUrl ? <img src={props.user.avatarUrl} alt="" /> : <span>{avatarInitials(props.user.fullName)}</span>}
            <div>
              <strong>{props.user.fullName}</strong>
              <small>{props.user.email}</small>
            </div>
          </div>

          <button type="button" onClick={() => {
            setOpen(false);
            props.onProfile();
          }}>
            <UserCircle size={17} /> Hồ sơ
          </button>

          {props.canUseAdmin && (
            <button type="button" onClick={() => {
              setOpen(false);
              props.onToggleAdmin();
            }}>
              <LayoutDashboard size={17} /> {props.adminMode ? "Về cộng đồng" : props.isAdmin ? "Mở Admin Dashboard" : "Mở Staff Dashboard"}
            </button>
          )}

          <div className="notification-menu">
            <div className="notification-menu-heading">
              <span><Bell size={16} /> Thông báo</span>
              {props.unreadCount > 0 && (
                <button disabled={props.markAllPending} type="button" onClick={props.onMarkAllRead}>
                  Đọc hết
                </button>
              )}
            </div>
            <div className="notification-list">
              {props.notifications.slice(0, 5).map((notification) => (
                <button
                  className={notification.isRead ? "" : "unread"}
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    props.onNotification(notification);
                  }}
                >
                  <strong>{notification.title}</strong>
                  {notification.body && <span>{notification.body}</span>}
                  <small>{formatDate(notification.createdAt)}</small>
                </button>
              ))}
              {props.notifications.length === 0 && <small className="notification-empty">Chưa có thông báo.</small>}
            </div>
          </div>

          <button className="logout-menu-button" disabled={props.logoutPending} type="button" onClick={() => {
            setOpen(false);
            props.onLogout();
          }}>
            <LogOut size={17} /> {props.logoutPending ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}

type AdminActionRunner = (task: () => Promise<unknown>) => void;

function AdminDashboardView(props: {
  activeTab: AdminTab;
  isAdmin: boolean;
  posts: BoardPost[];
  moderationPosts: BoardPost[];
  overview?: AdminOverview;
  users: AdminUser[];
  categories: AdminCategory[];
  areas: AdminArea[];
  buildings: AdminBuilding[];
  handoverPoints: AdminHandoverPoint[];
  warehouseItems: AdminWarehouseItem[];
  reports: AdminReport[];
  configEntries: AdminConfigEntry[];
  configHistory: AdminConfigHistoryEntry[];
  totalPosts: number;
  onSelectPost: (postId: string) => void;
}) {
  const queryClient = useQueryClient();
  const foundCount = props.posts.filter((post) => post.type === "FOUND").length;
  const resolvedCount = props.posts.filter((post) => post.status === "RESOLVED").length;
  const openCount = props.posts.filter((post) => post.status === "OPEN" || post.status === "MATCHED").length;
  const storedWarehouseCount = props.warehouseItems.filter((item) => item.status === "STORED" || item.status === "RECEIVED").length;
  const activeWarehouseCount = props.warehouseItems.filter((item) => item.status !== "RETURNED" && item.status !== "DISPOSED" && item.status !== "DONATED" && item.status !== "TRANSFERRED").length;
  const handoverWithItemsCount = props.handoverPoints.filter((point) => point.storedItems > 0).length;

  const adminMutation = useMutation({
    mutationFn: (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-posts-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-hidden-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-areas"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-buildings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-handover"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-warehouse"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-config"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-config-history"] }),
        queryClient.invalidateQueries({ queryKey: ["public-config"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["areas"] }),
        queryClient.invalidateQueries({ queryKey: ["handover-points"] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] })
      ]);
    }
  });

  const runAdminAction: AdminActionRunner = (task) => adminMutation.mutate(task);

  return (
    <div className="admin-dashboard">
      <section className="admin-metric-grid">
        {props.isAdmin ? (
          <>
            <Metric label="Tổng bài đăng" value={props.overview?.posts ?? props.totalPosts} icon={<BarChart3 size={18} />} />
            <Metric label="Đang xử lý" value={openCount} icon={<Clock size={18} />} />
            <Metric label="Người dùng" value={props.overview?.users ?? props.users.length} icon={<Users size={18} />} />
            <Metric label="Đã hoàn trả" value={resolvedCount} icon={<CheckCircle2 size={18} />} />
          </>
        ) : (
          <>
            <Metric label="Vật trong kho" value={activeWarehouseCount} icon={<Boxes size={18} />} />
            <Metric label="Đã nhận/lưu" value={storedWarehouseCount} icon={<CheckCircle2 size={18} />} />
            <Metric label="Điểm có vật" value={handoverWithItemsCount} icon={<MapPin size={18} />} />
            <Metric label="Bài FOUND" value={foundCount} icon={<Handshake size={18} />} />
          </>
        )}
      </section>

      {adminMutation.error instanceof Error && <div className="notice error">{adminMutation.error.message}</div>}
      {adminMutation.isPending && <div className="notice">Đang lưu thay đổi admin...</div>}

      {props.activeTab === "overview" && props.isAdmin && (
        <AdminOverviewPanel posts={props.posts} users={props.users} reports={props.reports} foundCount={foundCount} />
      )}
      {props.activeTab === "overview" && !props.isAdmin && (
        <StaffWarehouseOverviewPanel
          warehouseItems={props.warehouseItems}
          handoverPoints={props.handoverPoints}
          onSelectPost={props.onSelectPost}
        />
      )}
      {props.activeTab === "moderation" && props.isAdmin && (
        <AdminModerationPanel
          posts={props.moderationPosts}
          pending={adminMutation.isPending}
          onRun={runAdminAction}
          onSelectPost={props.onSelectPost}
        />
      )}
      {props.activeTab === "categories" && props.isAdmin && (
        <AdminCategoryPanel categories={props.categories} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
      {props.activeTab === "locations" && props.isAdmin && (
        <AdminLocationPanel
          areas={props.areas}
          buildings={props.buildings}
          pending={adminMutation.isPending}
          onRun={runAdminAction}
        />
      )}
      {props.activeTab === "handover" && props.isAdmin && (
        <AdminHandoverPanel
          areas={props.areas}
          buildings={props.buildings}
          handoverPoints={props.handoverPoints}
          pending={adminMutation.isPending}
          onRun={runAdminAction}
        />
      )}
      {props.activeTab === "warehouse" && (
        <AdminWarehousePanel
          posts={props.posts}
          categories={props.categories}
          areas={props.areas}
          buildings={props.buildings}
          handoverPoints={props.handoverPoints}
          warehouseItems={props.warehouseItems}
          pending={adminMutation.isPending}
          canDelete={props.isAdmin}
          onRun={runAdminAction}
          onSelectPost={props.onSelectPost}
        />
      )}
      {props.activeTab === "users" && props.isAdmin && (
        <AdminUsersPanel users={props.users} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
      {props.activeTab === "reports" && props.isAdmin && (
        <AdminReportsPanel reports={props.reports} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
      {props.activeTab === "config" && props.isAdmin && (
        <AdminConfigPanel
          entries={props.configEntries}
          history={props.configHistory}
          pending={adminMutation.isPending}
          onRun={runAdminAction}
        />
      )}
    </div>
  );
}

function AdminConfigPanel(props: {
  entries: AdminConfigEntry[];
  history: AdminConfigHistoryEntry[];
  pending: boolean;
  onRun: AdminActionRunner;
}) {
  const importantKeys = new Set([
    "post.expiration_days",
    "post.max_images",
    "post.max_image_size_mb",
    "post.allowed_image_formats",
    "matching.threshold",
    "matching.notification_threshold",
    "matching.weight_text",
    "matching.weight_category",
    "matching.weight_location",
    "matching.weight_time",
    "warehouse.capacity_total",
    "warehouse.capacity_warning_ratio",
    "email.policy"
  ]);
  const sortedEntries = props.entries
    .slice()
    .sort((left, right) => Number(importantKeys.has(right.key)) - Number(importantKeys.has(left.key)) || left.key.localeCompare(right.key));

  function valueFromForm(entry: AdminConfigEntry, form: HTMLFormElement) {
    const formData = new FormData(form);
    if (entry.valueType === "BOOLEAN") {
      return formData.get("value") === "on";
    }
    const raw = String(formData.get("value") ?? "").trim();
    if (entry.valueType === "INTEGER") {
      return Number.parseInt(raw, 10);
    }
    if (entry.valueType === "FLOAT") {
      return Number.parseFloat(raw);
    }
    if (entry.valueType === "JSON") {
      return JSON.parse(raw);
    }
    return raw;
  }

  return (
    <section className="admin-grid">
      <article className="admin-panel wide-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">System rules</span>
            <h2>Cấu hình vận hành</h2>
          </div>
          <Key size={18} />
        </div>
        <div className="admin-config-list">
          {sortedEntries.map((entry) => (
            <form
              className="admin-config-row"
              key={entry.key}
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                props.onRun(() => api.adminUpdateConfig(entry.key, valueFromForm(entry, form)));
              }}
            >
              <div>
                <strong>{entry.key}</strong>
                <small>{entry.description ?? "Không có mô tả"}</small>
              </div>
              <span className="status-pill">{entry.valueType}</span>
              {entry.valueType === "BOOLEAN" ? (
                <label className="switch-row compact">
                  <input name="value" type="checkbox" defaultChecked={Boolean(entry.value)} />
                  <span>Bật</span>
                </label>
              ) : (
                <input
                  name="value"
                  type={entry.valueType === "INTEGER" || entry.valueType === "FLOAT" ? "number" : "text"}
                  step={entry.valueType === "FLOAT" ? "0.01" : "1"}
                  defaultValue={entry.rawValue}
                />
              )}
              <button className="secondary-button" disabled={props.pending} type="submit">
                Lưu
              </button>
            </form>
          ))}
          {sortedEntries.length === 0 && <div className="notice">Chưa có cấu hình hệ thống.</div>}
        </div>
      </article>

      <article className="admin-panel wide-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">History</span>
            <h2>Lịch sử cấu hình</h2>
          </div>
          <Clock size={18} />
        </div>
        <div className="admin-table">
          <div className="admin-row head">
            <span>Key</span>
            <span>Giá trị cũ</span>
            <span>Giá trị mới</span>
            <span>Thời gian</span>
          </div>
          {props.history.slice(0, 12).map((item) => (
            <div className="admin-row" key={item.id}>
              <strong>{item.key}</strong>
              <span>{item.oldValue ?? "-"}</span>
              <span>{item.newValue}</span>
              <span>{formatDate(item.changedAt)}</span>
            </div>
          ))}
          {props.history.length === 0 && <div className="notice">Chưa có lịch sử thay đổi cấu hình.</div>}
        </div>
      </article>
    </section>
  );
}

function AdminOverviewPanel(props: { posts: BoardPost[]; users: AdminUser[]; reports: AdminReport[]; foundCount: number }) {
  const postsByDate = useMemo(() => {
    const buckets = new Map<string, { lost: number; found: number }>();
    props.posts.forEach((post) => {
      const key = new Date(post.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      const current = buckets.get(key) ?? { lost: 0, found: 0 };
      if (post.type === "LOST") {
        current.lost += 1;
      } else {
        current.found += 1;
      }
      buckets.set(key, current);
    });
    return Array.from(buckets.entries()).slice(0, 7).map(([label, value]) => ({ label, ...value }));
  }, [props.posts]);
  const categoryStats = useMemo(() => {
    const buckets = new Map<string, number>();
    props.posts.forEach((post) => buckets.set(post.category?.name ?? "Khac", (buckets.get(post.category?.name ?? "Khac") ?? 0) + 1));
    return Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [props.posts]);
  const areaStats = useMemo(() => {
    const buckets = new Map<string, number>();
    props.posts.forEach((post) => buckets.set(post.location.areaName ?? post.location.buildingName ?? "Chưa rõ", (buckets.get(post.location.areaName ?? post.location.buildingName ?? "Chưa rõ") ?? 0) + 1));
    return Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [props.posts]);
  const resolvedCount = props.posts.filter((post) => post.status === "RESOLVED").length;
  const successfulReturnRate = props.posts.length ? Math.round((resolvedCount / props.posts.length) * 100) : 0;
  const trustedUsers = props.users
    .filter((user) => user.status === "ACTIVE")
    .slice()
    .sort((a, b) => b.reputationPoints - a.reputationPoints || a.fullName.localeCompare(b.fullName))
    .slice(0, 6);

  return (
    <section className="admin-grid">
      <article className="admin-panel dashboard-chart-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Trend</span>
            <h2>LOST/FOUND theo ngay</h2>
          </div>
          <BarChart3 size={18} />
        </div>
        <div className="mini-bar-chart">
          {postsByDate.map((bucket) => {
            const max = Math.max(1, bucket.lost + bucket.found);
            return (
              <div key={bucket.label}>
                <span>{bucket.label}</span>
                <div>
                  <i className="lost" style={{ height: `${Math.max(8, (bucket.lost / max) * 64)}px` }} />
                  <i className="found" style={{ height: `${Math.max(8, (bucket.found / max) * 64)}px` }} />
                </div>
              </div>
            );
          })}
          {postsByDate.length === 0 && <small>Chưa có dữ liệu.</small>}
        </div>
      </article>

      <article className="admin-panel dashboard-chart-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Return rate</span>
            <h2>Ti le hoan tra</h2>
          </div>
          <CheckCircle2 size={18} />
        </div>
        <div className="return-rate-meter" style={{ "--rate": `${successfulReturnRate}%` } as CSSProperties}>
          <strong>{successfulReturnRate}%</strong>
          <span>{resolvedCount}/{props.posts.length} bai da resolved</span>
        </div>
      </article>

      <article className="admin-panel dashboard-chart-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Category</span>
            <h2>Thống kê danh mục</h2>
          </div>
          <Boxes size={18} />
        </div>
        <DashboardRankList items={categoryStats} />
      </article>

      <article className="admin-panel dashboard-chart-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Heatmap</span>
            <h2>Khu vuc mat do nhieu</h2>
          </div>
          <MapPin size={18} />
        </div>
        <DashboardRankList items={areaStats} />
      </article>

      <article className="admin-panel dashboard-chart-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Trust</span>
            <h2>Top trusted users</h2>
          </div>
          <ShieldCheck size={18} />
        </div>
        <div className="trusted-user-list">
          {trustedUsers.map((user) => (
            <div key={user.id}>
              <strong>{user.fullName}</strong>
              <span>{user.reputationPoints} diem - {user.reputationLevel}</span>
            </div>
          ))}
          {trustedUsers.length === 0 && <small>Chưa có người dùng hoạt động.</small>}
        </div>
      </article>

      <article className="admin-panel wide-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Bài đăng gần đây</h2>
          </div>
          <span>{props.foundCount} FOUND</span>
        </div>
        <div className="admin-table">
          <div className="admin-row head">
            <span>Loại</span>
            <span>Tiêu đề</span>
            <span>Trạng thái</span>
            <span>Vị trí</span>
          </div>
          {props.posts.slice(0, 8).map((post) => (
            <div className="admin-row" key={post.id}>
              <span className={`type-pill ${post.type.toLowerCase()}`}>{post.type}</span>
              <strong>{post.title}</strong>
              <span>{statusLabels[post.status] ?? post.status}</span>
              <span>{locationText(post)}</span>
            </div>
          ))}
          {props.posts.length === 0 && <div className="notice">Chưa có dữ liệu bài đăng để thống kê.</div>}
        </div>
      </article>

      <AdminListPanel title="Người dùng mới" icon={<Users size={18} />} items={props.users.map((user) => `${user.fullName} · ${user.roles.join("/") || user.status}`)} />
      <AdminListPanel title="Báo cáo mới" icon={<Flag size={18} />} items={props.reports.map((report) => `${report.status} · ${report.reason}`)} />
    </section>
  );
}

function DashboardRankList(props: { items: Array<[string, number]> }) {
  const max = Math.max(1, ...props.items.map((item) => item[1]));

  return (
    <div className="dashboard-rank-list">
      {props.items.map(([label, total]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{total}</strong>
          <i style={{ width: `${Math.max(8, (total / max) * 100)}%` }} />
        </div>
      ))}
      {props.items.length === 0 && <small>Chưa có dữ liệu.</small>}
    </div>
  );
}

function StaffWarehouseOverviewPanel(props: {
  warehouseItems: AdminWarehouseItem[];
  handoverPoints: AdminHandoverPoint[];
  onSelectPost: (postId: string) => void;
}) {
  const activeItems = props.warehouseItems.filter(
    (item) => item.status !== "RETURNED" && item.status !== "DISPOSED" && item.status !== "DONATED" && item.status !== "TRANSFERRED"
  );
  const attentionItems = props.warehouseItems.filter(
    (item) => item.status === "PENDING_APPROVAL" || item.status === "CLAIMED" || item.status === "EXPIRED"
  );
  const stockedPoints = props.handoverPoints
    .filter((point) => point.storedItems > 0)
    .sort((a, b) => b.storedItems - a.storedItems);

  return (
    <section className="staff-warehouse-overview">
      <article className="admin-panel staff-warehouse-command">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Staff warehouse</span>
            <h2>Ca trực kho hôm nay</h2>
          </div>
          <Boxes size={18} />
        </div>
        <div className="staff-command-grid">
          <div>
            <strong>{activeItems.length}</strong>
            <span>vật đang cần theo dõi</span>
          </div>
          <div>
            <strong>{attentionItems.length}</strong>
            <span>mục cần xử lý nhanh</span>
          </div>
          <div>
            <strong>{stockedPoints.length}</strong>
            <span>điểm bàn giao có lưu vật</span>
          </div>
        </div>
      </article>

      <article className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Queue</span>
            <h2>Cần xử lý</h2>
          </div>
          <Clock size={18} />
        </div>
        <div className="warehouse-item-list compact">
          {attentionItems.slice(0, 6).map((item) => (
            <div className={`warehouse-item-row status-${item.status.toLowerCase()}`} key={item.id}>
              <div className="warehouse-item-main">
                <span className={`warehouse-status status-${item.status.toLowerCase()}`}>{warehouseStatusLabel(item.status)}</span>
                <strong>{item.itemName}</strong>
                <small>{item.storageCode || item.handoverPoint?.name || warehouseLocationText(item)}</small>
              </div>
              {item.post && (
                <button className="secondary-button" type="button" onClick={() => props.onSelectPost(item.post!.id)}>
                  <Eye size={16} /> Xem bài
                </button>
              )}
            </div>
          ))}
          {attentionItems.length === 0 && <small>Không có vật nào cần xử lý gấp.</small>}
        </div>
      </article>

      <article className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Handover</span>
            <h2>Tồn theo điểm bàn giao</h2>
          </div>
          <MapPin size={18} />
        </div>
        <div className="staff-handover-stock-list">
          {stockedPoints.slice(0, 8).map((point) => (
            <div key={point.id}>
              <span>{point.name}</span>
              <strong>{point.storedItems}</strong>
            </div>
          ))}
          {stockedPoints.length === 0 && <small>Chưa có vật phẩm đang lưu tại điểm bàn giao.</small>}
        </div>
      </article>
    </section>
  );
}

function AdminModerationPanel(props: {
  posts: BoardPost[];
  pending: boolean;
  onRun: AdminActionRunner;
  onSelectPost: (postId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<PostStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<PostType | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePosts = props.posts.filter((post) => {
    const statusMatched = statusFilter === "ALL" || post.status === statusFilter;
    const typeMatched = typeFilter === "ALL" || post.type === typeFilter;
    const textMatched =
      normalizedQuery.length === 0 ||
      `${post.title} ${post.description} ${post.owner.fullName} ${locationText(post)}`.toLowerCase().includes(normalizedQuery);
    return statusMatched && typeMatched && textMatched;
  });

  return (
    <section className="admin-panel wide-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Moderation</span>
          <h2>Quản lý kiểm duyệt bài đăng</h2>
        </div>
        <span>{visiblePosts.length}/{props.posts.length}</span>
      </div>

      <div className="admin-moderation-filters">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề, mô tả, người đăng..." />
        </div>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as PostType | "ALL")}>
          <option value="ALL">Tất cả loại bài</option>
          <option value="LOST">Đồ bị mất</option>
          <option value="FOUND">Đồ nhặt được</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PostStatus | "ALL")}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="OPEN">Đang mở</option>
          <option value="MATCHED">Có gợi ý</option>
          <option value="RESOLVED">Đã hoàn thành</option>
          <option value="CLOSED">Đã đóng</option>
          <option value="HIDDEN">Đã ẩn</option>
        </select>
      </div>

      <div className="admin-moderation-list">
        {visiblePosts.map((post) => (
          <AdminModerationRow
            key={post.id}
            pending={props.pending}
            post={post}
            onRun={props.onRun}
            onSelectPost={props.onSelectPost}
          />
        ))}
        {visiblePosts.length === 0 && <div className="notice">Không có bài đăng phù hợp bộ lọc.</div>}
      </div>
    </section>
  );
}

function AdminModerationRow(props: {
  post: BoardPost;
  pending: boolean;
  onRun: AdminActionRunner;
  onSelectPost: (postId: string) => void;
}) {
  function updateStatus(status: PostStatus) {
    props.onRun(() => api.updatePostStatus(props.post.id, status));
  }

  function deletePost() {
    const confirmed = window.confirm(`Xóa mềm bài "${props.post.title}"? Bài sẽ không còn hiển thị trên hệ thống.`);
    if (confirmed) {
      props.onRun(() => api.deletePost(props.post.id));
    }
  }

  return (
    <article className="admin-post-moderation-row">
      <div className="admin-post-main">
        <div className="admin-post-title-line">
          <span className={`type-pill ${props.post.type.toLowerCase()}`}>{props.post.type}</span>
          <span className="status-pill">{statusLabels[props.post.status] ?? props.post.status}</span>
        </div>
        <strong>{props.post.title}</strong>
        <p>{props.post.description}</p>
        <small>
          {props.post.owner.fullName} · {locationText(props.post)} · {formatDate(props.post.createdAt)}
        </small>
      </div>
      <div className="admin-inline-actions">
        <button className="secondary-button" type="button" onClick={() => props.onSelectPost(props.post.id)}>
          <Eye size={16} /> Xem chi tiết
        </button>
        <button className="secondary-button" disabled={props.pending || props.post.status === "RESOLVED"} type="button" onClick={() => updateStatus("RESOLVED")}>
          Hoàn thành
        </button>
        <button className="secondary-button" disabled={props.pending || props.post.status === "CLOSED"} type="button" onClick={() => updateStatus("CLOSED")}>
          Đóng
        </button>
        <button className="secondary-button" disabled={props.pending || props.post.status === "OPEN"} type="button" onClick={() => updateStatus("OPEN")}>
          Mở lại
        </button>
        <button className="secondary-button" disabled={props.pending || props.post.status === "HIDDEN"} type="button" onClick={() => updateStatus("HIDDEN")}>
          Ẩn
        </button>
        <button className="danger-button" disabled={props.pending} type="button" onClick={deletePost}>
          Xóa
        </button>
      </div>
    </article>
  );
}

function AdminCategoryPanel(props: { categories: AdminCategory[]; pending: boolean; onRun: AdminActionRunner }) {
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const parentCategories = useMemo(() => props.categories.filter((category) => !category.parentId), [props.categories]);
  const childCategories = useMemo(() => props.categories.filter((category) => category.parentId), [props.categories]);
  const categoryNameById = useMemo(
    () => new Map(props.categories.map((category) => [category.id, category.name])),
    [props.categories]
  );
  const editingHasChildren = Boolean(editing && props.categories.some((category) => category.parentId === editing.id));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: formText(data, "name"),
      parentId: formNullable(data, "parentId")
    };
    props.onRun(() => (editing ? api.adminUpdateCategory(editing.id, payload) : api.adminCreateCategory(payload)));
    setEditing(null);
    event.currentTarget.reset();
  }

  return (
    <section className="admin-management-grid">
      <form className="admin-panel admin-form" key={editing?.id ?? "new-category"} onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Categories</span>
            <h2>{editing ? "Sửa danh mục" : "Tạo danh mục"}</h2>
          </div>
          <Boxes size={18} />
        </div>
        <label>
          Tên danh mục
          <input name="name" required minLength={2} defaultValue={editing?.name ?? ""} placeholder="Ví dụ: Thiết bị điện tử" />
        </label>
        <label>
          Nhóm hiển thị
          <select name="parentId" defaultValue={editing?.parentId ?? ""} disabled={editingHasChildren}>
            <option value="">Nhóm chính</option>
            {parentCategories
              .filter((category) => category.id !== editing?.id)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          <small className="form-hint">
            {editingHasChildren
              ? "Nhóm này đang có danh mục bên trong nên không thể chuyển sang nhóm khác."
              : "Để trống nếu đây là nhóm chính; chọn một nhóm nếu đây là danh mục cụ thể bên trong nhóm đó."}
          </small>
        </label>
        <div className="admin-form-actions">
          {editing && (
            <button className="secondary-button" type="button" onClick={() => setEditing(null)}>
              Hủy sửa
            </button>
          )}
          <button className="primary-button" disabled={props.pending} type="submit">
            {editing ? "Lưu danh mục" : "Tạo danh mục"}
          </button>
        </div>
      </form>

      <article className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CRUD</span>
            <h2>Danh sách danh mục</h2>
          </div>
          <span>{props.categories.length}</span>
        </div>
        <div className="admin-resource-list">
          <strong className="admin-resource-group-title">Nhóm chính</strong>
          <div className="admin-categories-grid">
            {parentCategories.map((category) => (
              <div className="admin-category-card" key={category.id}>
                <div className="category-card-header">
                  <AdminActiveBadge active={category.isActive} />
                  <div className="category-actions-container">
                    <button
                      className="category-actions-trigger"
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}
                      aria-label="Actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === category.id && (
                      <div className="category-actions-dropdown">
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setEditing(category);
                            setOpenMenuId(null);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          disabled={props.pending}
                          onClick={() => {
                            props.onRun(() => api.adminSetCategoryActive(category.id, !category.isActive));
                            setOpenMenuId(null);
                          }}
                        >
                          {category.isActive ? "Ẩn" : "Kích hoạt"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="category-card-body">
                  <strong>{category.name}</strong>
                  <span>{props.categories.filter((child) => child.parentId === category.id).length} danh mục</span>
                </div>
              </div>
            ))}
          </div>

          <strong className="admin-resource-group-title">Danh mục cụ thể</strong>
          <div className="admin-categories-grid">
            {childCategories.map((category) => (
              <div className="admin-category-card" key={category.id}>
                <div className="category-card-header">
                  <AdminActiveBadge active={category.isActive} />
                  <div className="category-actions-container">
                    <button
                      className="category-actions-trigger"
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}
                      aria-label="Actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === category.id && (
                      <div className="category-actions-dropdown">
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setEditing(category);
                            setOpenMenuId(null);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          disabled={props.pending}
                          onClick={() => {
                            props.onRun(() => api.adminSetCategoryActive(category.id, !category.isActive));
                            setOpenMenuId(null);
                          }}
                        >
                          {category.isActive ? "Ẩn" : "Kích hoạt"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="category-card-body">
                  <strong>{category.name}</strong>
                  <span>Trong nhóm {categoryNameById.get(category.parentId ?? "") ?? "đã ẩn/xóa"}</span>
                </div>
              </div>
            ))}
          </div>
          {props.categories.length === 0 && <small>Chưa có danh mục.</small>}
        </div>
      </article>
    </section>
  );
}

function AdminLocationPanel(props: {
  areas: AdminArea[];
  buildings: AdminBuilding[];
  pending: boolean;
  onRun: AdminActionRunner;
}) {
  const [areaEdit, setAreaEdit] = useState<AdminArea | null>(null);
  const [buildingEdit, setBuildingEdit] = useState<AdminBuilding | null>(null);

  function submitArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: formText(data, "name"),
      description: formNullable(data, "description")
    };
    props.onRun(() => (areaEdit ? api.adminUpdateArea(areaEdit.id, payload) : api.adminCreateArea(payload)));
    setAreaEdit(null);
    event.currentTarget.reset();
  }

  function submitBuilding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      areaId: formText(data, "areaId"),
      name: formText(data, "name")
    };
    props.onRun(() => (buildingEdit ? api.adminUpdateBuilding(buildingEdit.id, payload) : api.adminCreateBuilding(payload)));
    setBuildingEdit(null);
    event.currentTarget.reset();
  }

  return (
    <section className="admin-location-stack">
      <div className="admin-management-grid">
        <form className="admin-panel admin-form" key={areaEdit?.id ?? "new-area"} onSubmit={submitArea}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Areas</span>
              <h2>{areaEdit ? "Sửa khu vực" : "Tạo khu vực"}</h2>
            </div>
            <Building2 size={18} />
          </div>
          <label>
            Tên khu vực
            <input name="name" required defaultValue={areaEdit?.name ?? ""} placeholder="Ví dụ: Khu Alpha" />
          </label>
          <label>
            Mô tả
            <input name="description" defaultValue={areaEdit?.description ?? ""} placeholder="Mô tả ngắn" />
          </label>
          <div className="admin-form-actions">
            {areaEdit && <button className="secondary-button" type="button" onClick={() => setAreaEdit(null)}>Hủy sửa</button>}
            <button className="primary-button" disabled={props.pending} type="submit">{areaEdit ? "Lưu khu vực" : "Tạo khu vực"}</button>
          </div>
        </form>

        <AdminResourceList
          title="Danh sách khu vực"
          items={props.areas.map((area) => ({
            id: area.id,
            name: area.name,
            meta: area.description ?? "Không có mô tả",
            active: area.isActive,
            onEdit: () => setAreaEdit(area),
            onToggle: () => props.onRun(() => api.adminSetAreaActive(area.id, !area.isActive))
          }))}
          pending={props.pending}
        />
      </div>

      <div className="admin-management-grid">
        <form className="admin-panel admin-form" key={buildingEdit?.id ?? "new-building"} onSubmit={submitBuilding}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Buildings</span>
              <h2>{buildingEdit ? "Sửa địa điểm" : "Tạo địa điểm"}</h2>
            </div>
            <Building2 size={18} />
          </div>
          <label>
            Khu vực
            <select name="areaId" required defaultValue={buildingEdit?.areaId ?? ""}>
              <option value="">Chọn khu vực</option>
              {props.areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </label>
          <label>
            Tên địa điểm cụ thể
            <input name="name" required defaultValue={buildingEdit?.name ?? ""} placeholder="Ví dụ: Tòa Alpha, Cổng chính" />
          </label>
          <div className="admin-form-actions">
            {buildingEdit && <button className="secondary-button" type="button" onClick={() => setBuildingEdit(null)}>Hủy sửa</button>}
            <button className="primary-button" disabled={props.pending} type="submit">{buildingEdit ? "Lưu địa điểm" : "Tạo địa điểm"}</button>
          </div>
        </form>

        <AdminResourceList
          title="Danh sách địa điểm cụ thể"
          items={props.buildings.map((building) => ({
            id: building.id,
            name: building.name,
            meta: building.areaName ?? "Chưa gắn khu vực",
            active: building.isActive,
            onEdit: () => setBuildingEdit(building),
            onToggle: () => props.onRun(() => api.adminSetBuildingActive(building.id, !building.isActive))
          }))}
          pending={props.pending}
        />
      </div>

      <div className="notice">
        Phòng học không quản lý bằng CRUD riêng. Khi đăng tin, user sẽ nhập phòng/vị trí chi tiết dạng text để tránh phải tạo quá nhiều phòng.
      </div>
    </section>
  );
}

function AdminHandoverPanel(props: {
  areas: AdminArea[];
  buildings: AdminBuilding[];
  handoverPoints: AdminHandoverPoint[];
  pending: boolean;
  onRun: AdminActionRunner;
}) {
  const [editing, setEditing] = useState<AdminHandoverPoint | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(editing?.areaId ?? "");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(editing?.buildingId ?? "");
  const [mapImageUrl, setMapImageUrl] = useState("");
  const [mapPosition, setMapPosition] = useState({ x: 50, y: 50 });

  const buildingsQuery = useQuery({
    queryKey: ["admin-handover-buildings", selectedAreaId],
    queryFn: () => api.buildings(selectedAreaId),
    enabled: Boolean(selectedAreaId)
  });

  useEffect(() => {
    setSelectedAreaId(editing?.areaId ?? "");
    setSelectedBuildingId(editing?.buildingId ?? "");
    setMapImageUrl(editing?.mapImageUrl ?? "");
    setMapPosition({
      x: editing?.mapPositionX ?? 50,
      y: editing?.mapPositionY ?? 50
    });
  }, [editing]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: formText(data, "name"),
      address: formText(data, "address"),
      areaId: selectedAreaId || null,
      buildingId: selectedBuildingId || null,
      openingHours: formNullable(data, "openingHours"),
      contactInfo: formNullable(data, "contactInfo"),
      mapImageUrl: mapImageUrl.trim() || null,
      mapPositionX: mapPosition.x,
      mapPositionY: mapPosition.y
    };
    props.onRun(() => (editing ? api.adminUpdateHandoverPoint(editing.id, payload) : api.adminCreateHandoverPoint(payload)));
    setEditing(null);
    event.currentTarget.reset();
    setSelectedAreaId("");
    setSelectedBuildingId("");
    setMapImageUrl("");
    setMapPosition({ x: 50, y: 50 });
  }

  function selectMapFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMapImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="admin-management-grid">
      <form className="admin-panel admin-form" key={editing?.id ?? "new-handover"} onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Handover</span>
            <h2>{editing ? "Sửa điểm bàn giao" : "Tạo điểm bàn giao"}</h2>
          </div>
          <Handshake size={18} />
        </div>
        <label>
          Tên điểm
          <input name="name" required defaultValue={editing?.name ?? ""} placeholder="Ví dụ: Quầy CTSV" />
        </label>
        <label>
          Địa chỉ
          <input name="address" required defaultValue={editing?.address ?? ""} placeholder="Tầng 1, tòa Alpha" />
        </label>
        <div className="form-grid">
          <label>
            Khu vực
            <select
              name="areaId"
              value={selectedAreaId}
              onChange={(event) => {
                setSelectedAreaId(event.target.value);
                setSelectedBuildingId("");
              }}
            >
              <option value="">Không gắn</option>
              {props.areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </label>
          <label>
            Địa điểm cụ thể
            <select
              name="buildingId"
              value={selectedBuildingId}
              onChange={(event) => setSelectedBuildingId(event.target.value)}
              disabled={!selectedAreaId}
            >
              <option value="">Không gắn</option>
              {(buildingsQuery.data?.buildings ?? []).map((building) => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Giờ mở cửa
            <input name="openingHours" defaultValue={editing?.openingHours ?? ""} placeholder="08:00 - 17:00" />
          </label>
          <label>
            Liên hệ
            <input name="contactInfo" defaultValue={editing?.contactInfo ?? ""} placeholder="Email/SĐT phụ trách" />
          </label>
        </div>
        <div className="admin-map-picker-field">
          <label>
            Ảnh bản đồ campus
            <input
              value={mapImageUrl.startsWith("data:") ? "Ảnh đã chọn từ máy" : mapImageUrl}
              onChange={(event) => setMapImageUrl(event.target.value)}
              placeholder="/fpt-campus-map.jpg hoặc chọn file bên dưới"
              readOnly={mapImageUrl.startsWith("data:")}
            />
          </label>
          <label className="upload-strip admin-map-upload">
            <Upload size={18} />
            Chọn ảnh map
            <input type="file" accept="image/*" onChange={(event) => selectMapFile(event.target.files?.[0])} />
          </label>
          {mapImageUrl.startsWith("data:") && (
            <button className="secondary-button" type="button" onClick={() => setMapImageUrl("")}>
              Chọn lại bằng URL
            </button>
          )}
        </div>
        <AdminMapLocationPicker
          imageUrl={mapImageUrl}
          position={mapPosition}
          onChange={setMapPosition}
        />
        <div className="admin-form-actions">
          {editing && <button className="secondary-button" type="button" onClick={() => setEditing(null)}>Hủy sửa</button>}
          <button className="primary-button" disabled={props.pending} type="submit">{editing ? "Lưu điểm" : "Tạo điểm"}</button>
        </div>
      </form>

      <AdminResourceList
        title="Danh sách điểm bàn giao"
        items={props.handoverPoints.map((point) => ({
          id: point.id,
          name: point.name,
          meta: `${point.address}${point.openingHours ? ` · ${point.openingHours}` : ""} · ${point.storedItems} vật phẩm`,
          active: point.isActive,
          onEdit: () => setEditing(point),
          onToggle: () => props.onRun(() => api.adminSetHandoverPointActive(point.id, !point.isActive))
        }))}
        pending={props.pending}
      />
    </section>
  );
}

function AdminMapLocationPicker(props: {
  imageUrl: string;
  position: { x: number; y: number };
  onChange: (position: { x: number; y: number }) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  function updateFromPointer(clientX: number, clientY: number) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    props.onChange({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
  }

  return (
    <div className="admin-map-picker">
      <div className="admin-map-picker-heading">
        <strong>Vị trí điểm bàn giao trên map</strong>
        <span>{props.position.x.toFixed(1)}%, {props.position.y.toFixed(1)}%</span>
      </div>
      <div
        className={`admin-map-picker-surface ${props.imageUrl ? "" : "empty"}`}
        ref={mapRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) {
            updateFromPointer(event.clientX, event.clientY);
          }
        }}
      >
        {props.imageUrl ? (
          <img src={props.imageUrl} alt="Bản đồ campus dùng để đặt điểm bàn giao" />
        ) : (
          <span>Chọn ảnh map trước, sau đó kéo marker tới vị trí mong muốn.</span>
        )}
        <button
          className="admin-map-location-pin"
          type="button"
          style={{ left: `${props.position.x}%`, top: `${props.position.y}%` }}
          aria-label="Vị trí điểm bàn giao"
        >
          <MapPin size={22} />
        </button>
      </div>
    </div>
  );
}

function AdminWarehousePanel(props: {
  posts: BoardPost[];
  categories: AdminCategory[];
  areas: AdminArea[];
  buildings: AdminBuilding[];
  handoverPoints: AdminHandoverPoint[];
  warehouseItems: AdminWarehouseItem[];
  pending: boolean;
  canDelete: boolean;
  onRun: AdminActionRunner;
  onSelectPost: (postId: string) => void;
}) {
  const [editing, setEditing] = useState<AdminWarehouseItem | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const foundPosts = useMemo(() => props.posts.filter((post) => post.type === "FOUND"), [props.posts]);
  const categoryOptions = useMemo(() => categorySelectOptions(props.categories), [props.categories]);
  const buildingOptions = useMemo(
    () => props.buildings.filter((building) => !selectedAreaId || building.areaId === selectedAreaId),
    [props.buildings, selectedAreaId]
  );

  useEffect(() => {
    setSelectedAreaId(editing?.location.areaId ?? "");
    setSelectedBuildingId(editing?.location.buildingId ?? "");
  }, [editing]);

  function clearForm(form?: HTMLFormElement) {
    setEditing(null);
    setSelectedAreaId("");
    setSelectedBuildingId("");
    form?.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      postId: formNullable(data, "postId"),
      handoverPointId: formNullable(data, "handoverPointId"),
      itemName: formText(data, "itemName"),
      description: formNullable(data, "description"),
      categoryId: formNullable(data, "categoryId"),
      areaId: selectedAreaId || null,
      buildingId: selectedBuildingId || null,
      roomText: formNullable(data, "roomText"),
      finderName: formNullable(data, "finderName"),
      finderContact: formNullable(data, "finderContact"),
      status: formText(data, "status") as AdminWarehouseStatus,
      conditionNotes: formNullable(data, "conditionNotes"),
      storageCode: formNullable(data, "storageCode"),
      receivedAt: toDateTimeIso(data.get("receivedAt")),
      returnedAt: toDateTimeIso(data.get("returnedAt")),
      retentionDeadline: toDateTimeIso(data.get("retentionDeadline"))
    };
    props.onRun(() => (editing ? api.adminUpdateWarehouseItem(editing.id, payload) : api.adminCreateWarehouseItem(payload)));
    clearForm(event.currentTarget);
  }

  return (
    <section className="admin-management-grid warehouse-management-grid">
      <form className="admin-panel admin-form" key={editing?.id ?? "new-warehouse"} onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Warehouse</span>
            <h2>{editing ? "Sửa vật trong kho" : "Nhập vật vào kho"}</h2>
          </div>
          <Boxes size={18} />
        </div>
        <label>
          Tên vật
          <input name="itemName" required minLength={2} defaultValue={editing?.itemName ?? ""} placeholder="Ví dụ: Ví da màu nâu" />
        </label>
        <label>
          Bài FOUND liên quan
          <select name="postId" defaultValue={editing?.post?.id ?? ""}>
            <option value="">Không gắn bài đăng</option>
            {foundPosts.map((post) => (
              <option key={post.id} value={post.id}>{post.title}</option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Danh mục
            <select name="categoryId" defaultValue={editing?.category?.id ?? ""}>
              <option value="">Chưa phân loại</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select name="status" defaultValue={editing?.status ?? "RECEIVED"}>
              {warehouseStatuses.map((status) => (
                <option key={status} value={status}>{warehouseStatusLabel(status)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Điểm bàn giao/kho
            <select name="handoverPointId" defaultValue={editing?.handoverPoint?.id ?? ""}>
              <option value="">Chưa gắn điểm</option>
              {props.handoverPoints.map((point) => (
                <option key={point.id} value={point.id}>{point.name}</option>
              ))}
            </select>
          </label>
          <label>
            Mã kệ/ngăn
            <input name="storageCode" defaultValue={editing?.storageCode ?? ""} placeholder="VD: KHO-A1-03" />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Khu vực
            <select
              name="areaId"
              value={selectedAreaId}
              onChange={(event) => {
                setSelectedAreaId(event.target.value);
                setSelectedBuildingId("");
              }}
            >
              <option value="">Không gắn</option>
              {props.areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </label>
          <label>
            Địa điểm cụ thể
            <select
              name="buildingId"
              value={selectedBuildingId}
              onChange={(event) => setSelectedBuildingId(event.target.value)}
              disabled={!selectedAreaId}
            >
              <option value="">Không gắn</option>
              {buildingOptions.map((building) => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Phòng/vị trí chi tiết
          <input name="roomText" defaultValue={editing?.location.roomText ?? ""} placeholder="VD: quầy CTSV, kệ số 2" />
        </label>
        <div className="form-grid">
          <label>
            Người gửi/nhặt được
            <input name="finderName" defaultValue={editing?.finder.name ?? editing?.finder.fullName ?? ""} placeholder="Tên sinh viên gửi kho" />
          </label>
          <label>
            Liên hệ người gửi
            <input name="finderContact" defaultValue={editing?.finder.contact ?? ""} placeholder="SĐT/email/Zalo" />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Ngày nhận vào kho
            <input name="receivedAt" type="datetime-local" defaultValue={dateTimeLocalInputValue(editing?.receivedAt)} />
          </label>
          <label>
            Hạn lưu giữ
            <input name="retentionDeadline" type="datetime-local" defaultValue={dateTimeLocalInputValue(editing?.retentionDeadline ?? undefined)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Ngày hoàn trả/xử lý
            <input name="returnedAt" type="datetime-local" defaultValue={dateTimeLocalInputValue(editing?.returnedAt ?? undefined)} />
          </label>
        </div>
        <label>
          Mô tả
          <textarea name="description" rows={3} defaultValue={editing?.description ?? ""} placeholder="Mô tả vật, màu sắc, nhãn hiệu..." />
        </label>
        <label>
          Ghi chú tình trạng
          <textarea name="conditionNotes" rows={3} defaultValue={editing?.conditionNotes ?? ""} placeholder="Tình trạng khi nhận, bao bì, phụ kiện đi kèm..." />
        </label>
        <div className="admin-form-actions">
          {editing && <button className="secondary-button" type="button" onClick={() => clearForm()}>Hủy sửa</button>}
          <button className="primary-button" disabled={props.pending} type="submit">{editing ? "Lưu vật trong kho" : "Nhập kho"}</button>
        </div>
      </form>

      <article className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CRUD</span>
            <h2>Danh sách nhà kho</h2>
          </div>
          <span>{props.warehouseItems.length}</span>
        </div>
        <div className="warehouse-item-list">
          {props.warehouseItems.map((item) => (
            <AdminWarehouseRow
              key={item.id}
              item={item}
              pending={props.pending}
              canDelete={props.canDelete}
              onEdit={() => setEditing(item)}
              onRun={props.onRun}
              onSelectPost={props.onSelectPost}
            />
          ))}
          {props.warehouseItems.length === 0 && <small>Chưa có vật nào trong kho.</small>}
        </div>
      </article>
    </section>
  );
}

function AdminWarehouseRow(props: {
  item: AdminWarehouseItem;
  pending: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onRun: AdminActionRunner;
  onSelectPost: (postId: string) => void;
}) {
  function deleteItem() {
    const confirmed = window.confirm(`Xóa vật "${props.item.itemName}" khỏi danh sách nhà kho?`);
    if (confirmed) {
      props.onRun(() => api.adminDeleteWarehouseItem(props.item.id));
    }
  }

  return (
    <div className={`warehouse-item-row status-${props.item.status.toLowerCase()}`}>
      <div className="warehouse-item-main">
        <span className={`warehouse-status status-${props.item.status.toLowerCase()}`}>{warehouseStatusLabel(props.item.status)}</span>
        <strong>{props.item.itemName}</strong>
        <span>{props.item.storageCode || props.item.handoverPoint?.name || "Chưa có mã/kho cụ thể"}</span>
        <small>
          {warehouseLocationText(props.item)} · Nhận: {formatDate(props.item.receivedAt)} · Hạn: {props.item.retentionDeadline ? formatDate(props.item.retentionDeadline) : "60 ngày mặc định"}
        </small>
      </div>
      <select
        value={props.item.status}
        disabled={props.pending}
        onChange={(event) => props.onRun(() => api.adminUpdateWarehouseItemStatus(props.item.id, event.target.value as AdminWarehouseStatus))}
      >
        {warehouseStatuses.map((status) => (
          <option key={status} value={status}>{warehouseStatusLabel(status)}</option>
        ))}
      </select>
      <div className="admin-inline-actions">
        {props.item.post && (
          <button className="secondary-button" type="button" onClick={() => props.onSelectPost(props.item.post!.id)}>
            <Eye size={16} /> Xem bài
          </button>
        )}
        <button className="secondary-button" type="button" onClick={props.onEdit}>Sửa</button>
        {props.canDelete && <button className="danger-button" disabled={props.pending} type="button" onClick={deleteItem}>Xóa</button>}
      </div>
    </div>
  );
}

function AdminUsersPanel(props: { users: AdminUser[]; pending: boolean; onRun: AdminActionRunner }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selectedRoles = data.getAll("roles").map(String) as AdminRole[];
    const roles = selectedRoles.length > 0 ? selectedRoles : (["STUDENT"] as AdminRole[]);
    props.onRun(() =>
      api.adminCreateUser({
        email: formText(data, "email"),
        password: formText(data, "password"),
        fullName: formText(data, "fullName"),
        studentCode: formNullable(data, "studentCode"),
        phoneNumber: formNullable(data, "phoneNumber"),
        status: formText(data, "status") as AdminUserStatus,
        roles
      })
    );
    event.currentTarget.reset();
  }

  return (
    <section className="admin-management-grid">
      <form className="admin-panel admin-form" onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Users</span>
            <h2>Tạo người dùng</h2>
          </div>
          <Users size={18} />
        </div>
        <label>
          Email
          <input name="email" required type="email" placeholder="user@fpt.edu.vn" />
        </label>
        <label>
          Họ tên
          <input name="fullName" required minLength={2} placeholder="Nguyễn Văn A" />
        </label>
        <label>
          Mật khẩu tạm
          <input name="password" required minLength={8} type="password" placeholder="Ít nhất 8 ký tự" />
        </label>
        <div className="form-grid">
          <label>
            MSSV/Mã GV
            <input name="studentCode" placeholder="Tuỳ chọn" />
          </label>
          <label>
            SĐT
            <input name="phoneNumber" placeholder="Tuỳ chọn" />
          </label>
        </div>
        <label>
          Trạng thái
          <select name="status" defaultValue="ACTIVE">
            <option value="ACTIVE">ACTIVE</option>
            <option value="LOCKED">LOCKED</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </label>
        <div className="admin-check-grid">
          {(["STUDENT", "LECTURER", "STAFF", "ADMIN"] as AdminRole[]).map((role) => (
            <label key={role}>
              <input name="roles" type="checkbox" value={role} defaultChecked={role === "STUDENT"} />
              {role}
            </label>
          ))}
        </div>
        <button className="primary-button wide" disabled={props.pending} type="submit">Tạo người dùng</button>
      </form>

      <article className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Access control</span>
            <h2>Quản lý người dùng</h2>
          </div>
          <span>{props.users.length}</span>
        </div>
        <div className="admin-user-list">
          {props.users.map((user) => (
            <AdminUserRow key={user.id} pending={props.pending} user={user} onRun={props.onRun} />
          ))}
          {props.users.length === 0 && <small>Chưa có người dùng.</small>}
        </div>
      </article>
    </section>
  );
}

function AdminUserRow(props: { user: AdminUser; pending: boolean; onRun: AdminActionRunner }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const primaryRole = formText(data, "role") as AdminRole;
    const roles: AdminRole[] = primaryRole === "USER" ? ["USER"] : ["USER", primaryRole];
    props.onRun(() =>
      Promise.all([
        api.adminUpdateUserStatus(props.user.id, formText(data, "status") as AdminUserStatus),
        api.adminUpdateUserRoles(props.user.id, roles)
      ])
    );
  }

  return (
    <form className={`admin-user-row status-${props.user.status.toLowerCase()}`} onSubmit={submit}>
      <div>
        <strong>{props.user.fullName}</strong>
        <span>{props.user.email}</span>
      </div>
      <select name="status" defaultValue={props.user.status}>
        <option value="ACTIVE">ACTIVE</option>
        <option value="LOCKED">LOCKED</option>
        <option value="DISABLED">DISABLED</option>
      </select>
      <select name="role" defaultValue={primaryAdminRole(props.user.roles)}>
        <option value="USER">USER</option>
        <option value="STUDENT">STUDENT</option>
        <option value="LECTURER">LECTURER</option>
        <option value="STAFF">STAFF</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <button className="secondary-button" disabled={props.pending} type="submit">Lưu</button>
    </form>
  );
}

function AdminReportsPanel(props: { reports: AdminReport[]; pending: boolean; onRun: AdminActionRunner }) {
  return (
    <section className="admin-panel wide-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Reports</span>
          <h2>Quản lý báo cáo</h2>
        </div>
        <span>{props.reports.length}</span>
      </div>
      <div className="admin-report-list">
        {props.reports.map((report) => (
          <AdminReportRow key={report.id} pending={props.pending} report={report} onRun={props.onRun} />
        ))}
        {props.reports.length === 0 && <div className="notice">Chưa có báo cáo nào.</div>}
      </div>
    </section>
  );
}

function AdminReportRow(props: { report: AdminReport; pending: boolean; onRun: AdminActionRunner }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    props.onRun(() =>
      api.adminHandleReport(props.report.id, {
        status: formText(data, "status"),
        actionType: formNullable(data, "actionType"),
        note: formNullable(data, "note")
      })
    );
  }

  return (
    <form className={`admin-report-row status-${props.report.status.toLowerCase()}`} onSubmit={submit}>
      <div className="admin-report-body">
        <span className={`status-pill report-${props.report.status.toLowerCase()}`}>{props.report.status}</span>
        <strong>{props.report.reason}</strong>
        <p>{props.report.details ?? "Không có mô tả thêm."}</p>
        <small>
          {props.report.entityType} · {props.report.targetText} · Người báo cáo:{" "}
          {props.report.reporter.fullName ?? props.report.reporter.email ?? "Không rõ"}
        </small>
      </div>
      <select name="status" defaultValue={props.report.status === "PENDING" ? "REVIEWED" : props.report.status}>
        <option value="REVIEWED">Đã xử lý</option>
        <option value="DISMISSED">Bỏ qua</option>
      </select>
      <select name="actionType" defaultValue="">
        <option value="">Không áp dụng hành động</option>
        <option value="WARN_USER">Cảnh báo user</option>
        <option value="HIDE_POST">Ẩn bài viết</option>
        <option value="DELETE_POST">Xóa mềm bài viết</option>
        <option value="BAN_USER">Khóa user</option>
        <option value="UNBAN_USER">Mở khóa user</option>
      </select>
      <input name="note" placeholder="Ghi chú xử lý" />
      <button className="primary-button" disabled={props.pending} type="submit">Lưu xử lý</button>
    </form>
  );
}

function AdminResourceList(props: {
  title: string;
  pending: boolean;
  items: Array<{ id: string; name: string; meta: string; active: boolean; onEdit: () => void; onToggle: () => void }>;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <article className="admin-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CRUD</span>
          <h2>{props.title}</h2>
        </div>
        <span>{props.items.length}</span>
      </div>
      <div className="admin-resource-grid-container">
        <div className="admin-resource-grid">
          {props.items.map((item) => (
            <div className="admin-resource-card" key={item.id}>
              <div className="resource-card-header">
                <AdminActiveBadge active={item.active} />
                <div className="resource-actions-container">
                  <button
                    className="resource-actions-trigger"
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    aria-label="Actions"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === item.id && (
                    <div className="resource-actions-dropdown">
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          item.onEdit();
                          setOpenMenuId(null);
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        disabled={props.pending}
                        onClick={() => {
                          item.onToggle();
                          setOpenMenuId(null);
                        }}
                      >
                        {item.active ? "Ẩn" : "Kích hoạt"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="resource-card-body">
                <strong>{item.name}</strong>
                <span>{item.meta}</span>
              </div>
            </div>
          ))}
        </div>
        {props.items.length === 0 && <small className="empty-resource-notice">Chưa có dữ liệu.</small>}
      </div>
    </article>
  );
}

function AdminActiveBadge({ active }: { active: boolean }) {
  return <span className={`admin-active-badge ${active ? "active" : "inactive"}`}>{active ? "Active" : "Hidden"}</span>;
}

function primaryAdminRole(roles: string[]): AdminRole {
  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }
  if (roles.includes("STAFF")) {
    return "STAFF";
  }
  if (roles.includes("LECTURER")) {
    return "LECTURER";
  }
  if (roles.includes("STUDENT")) {
    return "STUDENT";
  }
  return "USER";
}

function LegacyAdminDashboardView(props: {
  posts: BoardPost[];
  overview?: AdminOverview;
  users: AdminUser[];
  categories: AdminNamedResource[];
  areas: AdminNamedResource[];
  handoverPoints: Array<AdminNamedResource & { address: string }>;
  totalPosts: number;
}) {
  const foundCount = props.posts.filter((post) => post.type === "FOUND").length;
  const resolvedCount = props.posts.filter((post) => post.status === "RESOLVED").length;
  const openCount = props.posts.filter((post) => post.status === "OPEN" || post.status === "MATCHED").length;
  const overview = props.overview;

  return (
    <div className="admin-dashboard">
      <section className="admin-metric-grid">
        <Metric label="Tổng bài đăng" value={overview?.posts ?? props.totalPosts} icon={<BarChart3 size={18} />} />
        <Metric label="Đang xử lý" value={openCount} icon={<Clock size={18} />} />
        <Metric label="Người dùng" value={overview?.users ?? props.users.length} icon={<Users size={18} />} />
        <Metric label="Đã hoàn trả" value={resolvedCount} icon={<CheckCircle2 size={18} />} />
      </section>

      <section className="admin-grid">
        <article className="admin-panel wide-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Operations</span>
              <h2>Bài đăng gần đây</h2>
            </div>
            <span>{foundCount} FOUND</span>
          </div>
          <div className="admin-table">
            <div className="admin-row head">
              <span>Loại</span>
              <span>Tiêu đề</span>
              <span>Trạng thái</span>
              <span>Vị trí</span>
            </div>
            {props.posts.slice(0, 8).map((post) => (
              <div className="admin-row" key={post.id}>
                <span className={`type-pill ${post.type.toLowerCase()}`}>{post.type}</span>
                <strong>{post.title}</strong>
                <span>{statusLabels[post.status] ?? post.status}</span>
                <span>{locationText(post)}</span>
              </div>
            ))}
            {props.posts.length === 0 && <div className="notice">Chưa có dữ liệu bài đăng để thống kê.</div>}
          </div>
        </article>

        <AdminListPanel title="Quản lý danh mục" icon={<Boxes size={18} />} items={props.categories.map(resourceLabel)} />
        <AdminListPanel title="Khu vực / địa điểm" icon={<Building2 size={18} />} items={props.areas.map(resourceLabel)} />
        <AdminListPanel title="Điểm bàn giao" icon={<Handshake size={18} />} items={props.handoverPoints.map((item) => `${resourceLabel(item)} · ${item.address}`)} />
        <article className="admin-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Users</span>
              <h2>Người dùng</h2>
            </div>
            <Users size={18} />
          </div>
          <div className="admin-chip-list">
            {props.users.slice(0, 8).map((user) => (
              <span key={user.id}>{user.fullName} · {user.roles.join("/") || user.status}</span>
            ))}
            {props.users.length === 0 && <small>Chưa có dữ liệu người dùng.</small>}
          </div>
        </article>
        <article className="admin-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Reports</span>
              <h2>Báo cáo</h2>
            </div>
            <Flag size={18} />
          </div>
          <p>
            Theo dõi bài vi phạm, claim bất thường, khu vực có nhiều đồ thất lạc và tỷ lệ hoàn trả theo thời gian.
          </p>
        </article>
      </section>
    </div>
  );
}

function resourceLabel(resource: AdminNamedResource) {
  return `${resource.name}${resource.isActive ? "" : " (ẩn)"}`;
}

function AdminListPanel(props: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <article className="admin-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CRUD</span>
          <h2>{props.title}</h2>
        </div>
        {props.icon}
      </div>
      <div className="admin-chip-list">
        {props.items.slice(0, 8).map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
        {props.items.length === 0 && <small>Chưa có dữ liệu.</small>}
      </div>
    </article>
  );
}

function BoardView(props: {
  variant: "feed" | "mine";
  categories: Category[];
  areas: Array<{ id: string; name: string }>;
  buildings: Building[];
  filters: ListPostsParams;
  posts: BoardPost[];
  stats: { lost: number; found: number; matched: number };
  total: number;
  loading: boolean;
  error: unknown;
  onFilter: <Key extends keyof ListPostsParams>(key: Key, value: ListPostsParams[Key]) => void;
  onSelect: (id: string) => void;
  onClaim: (post: BoardPost) => void;
  onNavigate?: (view: View) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    type: false,
    category: false,
    location: false
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const rootCategories = useMemo(() => props.categories.filter((category) => !category.parentId), [props.categories]);

  const getCatIdByName = (name: string) => {
    const target = props.categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    return target?.id;
  };

  const toggleQuickCategory = (name: string) => {
    const id = getCatIdByName(name);
    if (!id) return;
    props.onFilter("categoryId", props.filters.categoryId === id ? undefined : id);
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleReset = () => {
    props.onFilter("type", "");
    props.onFilter("categoryId", undefined);
    props.onFilter("buildingId", undefined);
    props.onFilter("areaId", undefined);
    props.onFilter("q", "");
  };

  return (
    <div className="community-board-container">
      {props.variant === "feed" && (
        <div className="fpt-community-banner">
          <div className="banner-left-content">
            <h1 className="banner-title">
              Cộng đồng FPT University Da Nang Lost & Found
            </h1>
            <p className="banner-description">
              Nơi kết nối và hỗ trợ tìm lại đồ đạc thất lạc tại FPT University Da Nang. Hãy cùng nhau xây dựng một cộng đồng văn minh và tử tế.
            </p>
            <div className="banner-actions">
              <button
                className="banner-btn-primary"
                type="button"
                onClick={() => props.onNavigate?.("create")}
              >
                Báo mất đồ
              </button>
              <button
                className="banner-btn-secondary"
                type="button"
                onClick={() => props.onFilter("type", "LOST")}
              >
                Tìm đồ rơi
              </button>
            </div>
          </div>
          <div className="banner-right-image">
            <img src="/fpt-danang-illustration.jpg" alt="FPT University Da Nang Lost & Found" />
          </div>
        </div>
      )}

      <div className={`community-feed-layout ${isSidebarOpen ? "" : "sidebar-closed"}`}>
        {isSidebarOpen && (
          <aside className="feed-sidebar" aria-label="Bộ lọc bài đăng">
        <div className="sidebar-header">
          <h2>Filters</h2>
          <button className="reset-link" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <div className="filter-group">
          <div
            className={`filter-group-header ${collapsedGroups.type ? "collapsed" : ""}`}
            onClick={() => toggleGroup("type")}
          >
            <span>Item Type</span>
            {collapsedGroups.type ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
          {!collapsedGroups.type && (
            <div className="filter-options">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={props.filters.type === "LOST"}
                  onChange={() => props.onFilter("type", props.filters.type === "LOST" ? "" : "LOST")}
                />
                <span>Lost Items</span>
              </label>
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={props.filters.type === "FOUND"}
                  onChange={() => props.onFilter("type", props.filters.type === "FOUND" ? "" : "FOUND")}
                />
                <span>Found Items</span>
              </label>
            </div>
          )}
        </div>

        <div className="filter-group">
          <div
            className={`filter-group-header ${collapsedGroups.category ? "collapsed" : ""}`}
            onClick={() => toggleGroup("category")}
          >
            <span>Category</span>
            {collapsedGroups.category ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
          {!collapsedGroups.category && (
            <div className="filter-options">
              {rootCategories.map((cat) => (
                <label className="filter-checkbox-label" key={cat.id}>
                  <input
                    type="checkbox"
                    checked={props.filters.categoryId === cat.id}
                    onChange={() => props.onFilter("categoryId", props.filters.categoryId === cat.id ? undefined : cat.id)}
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
              {rootCategories.length === 0 && <small>Không có danh mục</small>}
            </div>
          )}
        </div>

        <div className="filter-group">
          <div
            className={`filter-group-header ${collapsedGroups.location ? "collapsed" : ""}`}
            onClick={() => toggleGroup("location")}
          >
            <span>Location</span>
            {collapsedGroups.location ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
          {!collapsedGroups.location && (
            <div className="filter-options scrollable">
              {props.buildings.map((b) => (
                <label className="filter-checkbox-label" key={b.id}>
                  <input
                    type="checkbox"
                    checked={props.filters.buildingId === b.id}
                    onChange={() => props.onFilter("buildingId", props.filters.buildingId === b.id ? undefined : b.id)}
                  />
                  <span>{b.name}</span>
                </label>
              ))}
              {props.buildings.length === 0 && <small>Không có địa điểm</small>}
            </div>
          )}
        </div>
      </aside>
    )}

      <main className="feed-main-content">
        <div className="feed-header-section">
          <h1>Cộng đồng</h1>
          <p>Tìm kiếm, báo cáo và nhận lại đồ thất lạc trong khuôn viên FPT.</p>
        </div>

        <div className="feed-stats-overview">
          <div className="stat-overview-card total-items">
            <div className="stat-card-left">
              <span className="stat-card-label">Total Items</span>
              <strong className="stat-card-value">{props.stats.lost + props.stats.found}</strong>
            </div>
            <div className="stat-card-right-icon blue-icon">
              <Boxes size={20} />
            </div>
          </div>
          <div className="stat-overview-card lost-items">
            <div className="stat-card-left">
              <span className="stat-card-label">Lost Items</span>
              <strong className="stat-card-value">{props.stats.lost}</strong>
            </div>
            <div className="stat-card-right-icon red-icon">
              <HelpCircle size={20} />
            </div>
          </div>
          <div className="stat-overview-card found-items">
            <div className="stat-card-left">
              <span className="stat-card-label">Found Items</span>
              <strong className="stat-card-value">{props.stats.found}</strong>
            </div>
            <div className="stat-card-right-icon green-icon">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        <div className="feed-top-actions">
          <button
            className={`filter-toggle-btn ${isSidebarOpen ? "active" : ""}`}
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle filters"
          >
            <Filter size={18} />
            <span>Bộ lọc</span>
          </button>
          <div className="feed-search-bar">
            <Search size={18} />
            <input
              placeholder="Tìm kiếm theo tên vật phẩm, khu vực..."
              value={props.filters.q ?? ""}
              onChange={(event) => props.onFilter("q", event.target.value)}
            />
          </div>
          <div className="feed-type-tabs">
            <button
              className={`type-tab-btn ${!props.filters.type ? "active" : ""}`}
              type="button"
              onClick={() => props.onFilter("type", "")}
            >
              Tất cả
            </button>
            <button
              className={`type-tab-btn ${props.filters.type === "FOUND" ? "active" : ""}`}
              type="button"
              onClick={() => props.onFilter("type", "FOUND")}
            >
              Đồ Nhặt Được
            </button>
            <button
              className={`type-tab-btn ${props.filters.type === "LOST" ? "active" : ""}`}
              type="button"
              onClick={() => props.onFilter("type", "LOST")}
            >
              Đồ Đánh Rơi
            </button>
          </div>
        </div>

        <div className="quick-categories-row">
          <div
            className={`quick-category-card ${props.filters.categoryId === getCatIdByName("Thiết bị điện tử") ? "active" : ""}`}
            onClick={() => toggleQuickCategory("Thiết bị điện tử")}
          >
            <div className="quick-category-icon-wrapper">
              <Laptop size={22} />
            </div>
            <span>Đồ Điện Tử</span>
          </div>
          <div
            className={`quick-category-card ${props.filters.categoryId === getCatIdByName("Giấy tờ cá nhân") ? "active" : ""}`}
            onClick={() => toggleQuickCategory("Giấy tờ cá nhân")}
          >
            <div className="quick-category-icon-wrapper">
              <Wallet size={22} />
            </div>
            <span>Ví & Giấy Tờ</span>
          </div>
          <div
            className={`quick-category-card ${props.filters.categoryId === getCatIdByName("Chìa khóa & thẻ") ? "active" : ""}`}
            onClick={() => toggleQuickCategory("Chìa khóa & thẻ")}
          >
            <div className="quick-category-icon-wrapper">
              <Key size={22} />
            </div>
            <span>Chìa Khóa & Thẻ</span>
          </div>
        </div>

        {props.error instanceof Error && <div className="notice error">Chưa tải được bảng tin: {props.error.message}</div>}
        {props.loading && <div className="notice">Đang tải bảng tin...</div>}

        <div className="feed-post-grid">
          {props.posts.map((post) => (
            <PostCard key={post.id} post={post} onSelect={props.onSelect} />
          ))}
        </div>
        {!props.loading && props.posts.length === 0 && (
          <div className="empty-state">
            <Search size={28} />
            <strong>Chưa có bài phù hợp</strong>
            <span>Thử đổi bộ lọc hoặc đăng tin đầu tiên cho campus.</span>
          </div>
        )}
      </main>
    </div>
  </div>
  );
}

function PostCard({ post, onSelect }: { post: BoardPost; onSelect: (id: string) => void }) {
  const displayDate = post.lostFoundAt ? (() => {
    const d = new Date(post.lostFoundAt);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  })() : "Chưa rõ thời gian";

  return (
    <article className="feed-post-card" onClick={() => onSelect(post.id)}>
      <div className="card-media">
        {post.coverImageUrl ? (
          <img src={post.coverImageUrl} alt={post.title} loading="lazy" />
        ) : (
          <div className="card-placeholder-image">
            {post.type === "FOUND" ? <CheckCircle2 size={32} /> : <Search size={32} />}
          </div>
        )}
        <span className={`card-type-badge ${post.type.toLowerCase()}`}>
          {post.type === "FOUND" ? "Found" : "Lost"}
        </span>
      </div>

      <div className="card-body">
        <h3 className="card-title" title={post.title}>{post.title}</h3>

        <div className="card-metadata-grid">
          <div className="card-metadata-left">
            <div className="card-info-item" title={locationText(post)}>
              <MapPin size={12} />
              <span>{locationText(post)}</span>
            </div>
            <div className="card-info-item">
              <Calendar size={12} />
              <span>{displayDate}</span>
            </div>
          </div>
          <div className="card-metadata-right">
            {post.category?.name ? (
              <span className="card-category-tag" title={post.category.name}>{post.category.name}</span>
            ) : (
              <span className="card-category-tag empty">-</span>
            )}
            <div className="card-info-item card-owner" title={post.owner.fullName}>
              <UserCircle size={12} />
              <span>{post.owner.fullName}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <article className="metric-card">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </article>
  );
}

function CreatePostView(props: {
  signedIn: boolean;
  categories: Category[];
  areas: Array<{ id: string; name: string }>;
  handoverPoints: Array<{ id: string; name: string }>;
  imageRules: ImageUploadRules;
  onCreated: (postId: string, suggestions: PostMatchSuggestion[]) => Promise<void>;
}) {
  const [type, setType] = useState<PostType>("LOST");
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState("");
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [itemFiles, setItemFiles] = useState<File[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [itemImagePreviews, setItemImagePreviews] = useState<string[]>([]);
  const [evidenceImagePreviews, setEvidenceImagePreviews] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const buildingsQuery = useQuery({
    queryKey: ["create-buildings", selectedAreaId],
    queryFn: () => api.buildings(selectedAreaId),
    enabled: Boolean(selectedAreaId)
  });
  const rootCategories = useMemo(() => props.categories.filter((category) => !category.parentId), [props.categories]);
  const childCategories = useMemo(
    () => props.categories.filter((category) => category.parentId === selectedParentCategoryId),
    [props.categories, selectedParentCategoryId]
  );
  const selectedCategoryId = childCategories.length > 0 ? selectedChildCategoryId : selectedParentCategoryId;
  const totalSelectedFiles = itemFiles.length + evidenceFiles.length;

  useEffect(() => {
    const urls = itemFiles.map((file) => URL.createObjectURL(file));
    setItemImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [itemFiles]);

  useEffect(() => {
    const urls = evidenceFiles.map((file) => URL.createObjectURL(file));
    setEvidenceImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [evidenceFiles]);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await api.createPost({
        type,
        title: String(formData.get("title")),
        description: String(formData.get("description")),
        categoryId: selectedCategoryId,
        areaId: emptyToNull(formData.get("areaId")),
        buildingId: emptyToNull(formData.get("buildingId")),
        roomText: emptyToNull(formData.get("roomText")),
        customLocation: emptyToNull(formData.get("customLocation")),
        contactInfo: String(formData.get("contactInfo")),
        lostFoundAt: toDateTimeIso(formData.get("lostFoundAt")),
        handoverPointId: type === "FOUND" ? emptyToNull(formData.get("handoverPointId")) : null,
        secretVerification: type === "LOST" ? String(formData.get("secretVerification")) : null
      });

      let matchSuggestions = result.matchSuggestions ?? [];
      if (totalSelectedFiles > 0) {
        const mediaResult = await api.uploadPostImages(result.post.id, itemFiles, evidenceFiles);
        if (mediaResult.matchSuggestions.length > 0) {
          matchSuggestions = mediaResult.matchSuggestions;
        }
      }

      return { post: result.post, matchSuggestions };
    },
    onSuccess: async (result) => {
      setMessage(
        result.matchSuggestions.length > 0
          ? `Đã tạo bài và tìm thấy ${result.matchSuggestions.length} gợi ý phù hợp.`
          : "Đã tạo bài. Hệ thống đã kiểm tra matching tự động."
      );
      await props.onCreated(result.post.id, result.matchSuggestions);
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!selectedParentCategoryId) {
      setMessage("Vui lòng chọn nhóm danh mục.");
      return;
    }
    if (childCategories.length > 0 && !selectedChildCategoryId) {
      setMessage("Vui lòng chọn danh mục cụ thể.");
      return;
    }
    const validationErrors = validateImageFiles([...itemFiles, ...evidenceFiles], props.imageRules, props.imageRules.maxImages);
    if (validationErrors.length > 0) {
      setMessage(validationErrors[0]);
      return;
    }
    createMutation.mutate(new FormData(event.currentTarget));
  }

  function selectFiles(fileList: FileList | null, kind: "ITEM" | "EVIDENCE") {
    const incomingFiles = Array.from(fileList ?? []);
    const targetFiles = kind === "ITEM" ? itemFiles : evidenceFiles;
    const otherFiles = kind === "ITEM" ? evidenceFiles : itemFiles;
    const nextFiles = [...targetFiles];
    const existingKeys = new Set(nextFiles.map(fileKey));

    for (const file of incomingFiles) {
      const key = fileKey(file);
      if (!existingKeys.has(key)) {
        nextFiles.push(file);
        existingKeys.add(key);
      }
    }

    const validationErrors = validateImageFiles([...otherFiles, ...nextFiles], props.imageRules, props.imageRules.maxImages);
    if (validationErrors.length > 0) {
      setMessage(validationErrors[0]);
      return;
    }

    if (kind === "ITEM") {
      setItemFiles(nextFiles);
    } else {
      setEvidenceFiles(nextFiles);
    }
    setMessage(`${otherFiles.length + nextFiles.length} ảnh đã sẵn sàng upload.`);
  }

  function removeFile(index: number, kind: "ITEM" | "EVIDENCE") {
    const setter = kind === "ITEM" ? setItemFiles : setEvidenceFiles;
    setter((current) => {
      const nextFiles = current.filter((_, fileIndex) => fileIndex !== index);
      const otherCount = kind === "ITEM" ? evidenceFiles.length : itemFiles.length;
      const total = otherCount + nextFiles.length;
      setMessage(total > 0 ? `${total} ảnh đã sẵn sàng upload.` : null);
      return nextFiles;
    });
  }

  if (!props.signedIn) {
    return (
      <div className="empty-state">
        <ShieldCheck size={30} />
        <strong>Cần đăng nhập để đăng tin</strong>
        <span>Bấm Đăng nhập hoặc Đăng ký ở thanh trên để tiếp tục.</span>
      </div>
    );
  }

  return (
    <div className="create-page">
      <section className="create-intro">
        <span className="eyebrow">Tạo bài trong cộng đồng</span>
        <h2>Báo cáo Mất / Nhặt được đồ</h2>
        <p>Điền đủ thông tin để cộng đồng và hệ thống matching có thể giúp bạn tìm lại hoặc trả đúng chủ sở hữu nhanh hơn.</p>
      </section>

      <form className="form-panel create-report-form" onSubmit={submit}>
      <div className="segmented">
        <button className={type === "LOST" ? "active" : ""} type="button" onClick={() => setType("LOST")}>
          Tôi làm mất
        </button>
        <button className={type === "FOUND" ? "active" : ""} type="button" onClick={() => setType("FOUND")}>
          Tôi nhặt được
        </button>
      </div>
      <div className="form-section-heading">
        <span>01</span>
        <div>
          <strong>Thông tin cơ bản</strong>
          <small>Tiêu đề rõ, mô tả cụ thể và chọn đúng danh mục.</small>
        </div>
      </div>
      <label>
        Tiêu đề
        <input name="title" required minLength={3} placeholder="Ví dụ: Tai nghe Sony màu đen" />
      </label>
      <label>
        Mô tả
        <textarea name="description" required minLength={10} rows={4} placeholder="Mô tả đặc điểm, nơi thấy/mất..." />
      </label>
      <label>
        Thông tin liên hệ
        <input name="contactInfo" required minLength={3} placeholder="SĐT, email hoặc Zalo để người liên quan liên hệ" />
      </label>
      <div className="form-grid">
        <label>
          Nhóm danh mục
          <select
            required
            value={selectedParentCategoryId}
            onChange={(event) => {
              setSelectedParentCategoryId(event.target.value);
              setSelectedChildCategoryId("");
            }}
          >
            <option value="">Chọn nhóm đồ</option>
            {rootCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Danh mục cụ thể
          <select
            required={childCategories.length > 0}
            disabled={!selectedParentCategoryId || childCategories.length === 0}
            value={selectedChildCategoryId}
            onChange={(event) => setSelectedChildCategoryId(event.target.value)}
          >
            <option value="">
              {!selectedParentCategoryId
                ? "Chọn nhóm trước"
                : childCategories.length === 0
                  ? "Nhóm này chưa có danh mục cụ thể"
                  : "Chọn danh mục cụ thể"}
            </option>
            {childCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-section-heading">
        <span>02</span>
        <div>
          <strong>Vị trí & thời gian</strong>
          <small>Chọn nơi gần đúng, rồi bổ sung vị trí tự nhập nếu cần.</small>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Khu vực
          <select
            name="areaId"
            value={selectedAreaId}
            onChange={(event) => {
              setSelectedAreaId(event.target.value);
              setSelectedBuildingId("");
            }}
          >
            <option value="">Chọn khu vực</option>
            {props.areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Địa điểm cụ thể
          <select
            name="buildingId"
            disabled={!selectedAreaId}
            value={selectedBuildingId}
            onChange={(event) => setSelectedBuildingId(event.target.value)}
          >
            <option value="">{selectedAreaId ? "Chọn địa điểm cụ thể" : "Chọn khu vực trước"}</option>
            {(buildingsQuery.data?.buildings ?? []).map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
          {selectedAreaId && buildingsQuery.data?.buildings.length === 0 && <small className="form-hint">Khu vực này chưa có địa điểm cụ thể active.</small>}
        </label>
        <label>
          Phòng
          <input name="roomText" placeholder="VD: A101, LAB 302, hành lang tầng 2..." />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Vị trí tự nhập
          <input name="customLocation" placeholder="VD: Alpha tầng 2, thư viện..." />
        </label>
        <label>
          Thời gian
          <input name="lostFoundAt" type="datetime-local" />
        </label>
      </div>
      <div className="form-section-heading">
        <span>03</span>
        <div>
          <strong>Xác minh & hình ảnh</strong>
          <small>Ảnh và câu xác minh giúp giảm nhận nhầm đồ.</small>
        </div>
      </div>
      {type === "FOUND" ? (
        <label>
          Điểm bàn giao nếu đã gửi về trường
          <select name="handoverPointId">
            <option value="">Tôi đang giữ đồ / chưa gửi về điểm bàn giao</option>
            {props.handoverPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Mô tả chi tiết và dấu hiệu chứng minh quyền sở hữu
          <textarea
            name="secretVerification"
            required
            minLength={3}
            rows={3}
            placeholder="Nêu dấu hiệu riêng, mã/serial, vết trầy, vật bên trong, nội dung hóa đơn hoặc chi tiết chỉ chủ sở hữu biết"
          />
        </label>
      )}
      <div className="upload-guide-panel">
        <strong>Gợi ý chụp ảnh đồ vật</strong>
        <div className="upload-guide-grid">
          <span>Chụp mặt trước, mặt sau và hai cạnh để hệ thống nhìn vật theo nhiều góc.</span>
          <span>Thêm ảnh cận cảnh logo, vết trầy, serial, phụ kiện hoặc dấu hiệu riêng.</span>
          <span>Nếu có thể, xoay quanh vật như chụp 3D: trên, dưới, trái, phải. Không bắt buộc.</span>
        </div>
      </div>
      <div className="upload-split-grid">
        <label className="upload-dropzone">
          <Upload size={22} />
          <strong>Ảnh đồ vật</strong>
          <span>Ưu tiên ảnh rõ vật, nền sáng, không che khuất. Ảnh đầu tiên sẽ làm ảnh bìa.</span>
          <input
            type="file"
            accept={acceptAttribute(props.imageRules)}
            multiple
            onChange={(event) => {
              selectFiles(event.target.files, "ITEM");
              event.currentTarget.value = "";
            }}
          />
        </label>
        <label className="upload-dropzone evidence-dropzone">
          <Upload size={22} />
          <strong>Bằng chứng kèm theo</strong>
          <span>Không bắt buộc. Có thể thêm bill, hóa đơn, ảnh từng sử dụng, khung hình camera hoặc giấy tờ liên quan.</span>
          <input
            type="file"
            accept={acceptAttribute(props.imageRules)}
            multiple
            onChange={(event) => {
              selectFiles(event.target.files, "EVIDENCE");
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {itemImagePreviews.length > 0 && (
        <>
          <strong className="preview-section-title">Ảnh đồ vật</strong>
          <div className="preview-grid">
            {itemImagePreviews.map((previewUrl, index) => (
              <div className="preview-item" key={previewUrl}>
                <img src={previewUrl} alt={`Ảnh đồ vật ${index + 1}`} />
                <button type="button" onClick={() => removeFile(index, "ITEM")} aria-label={`Xóa ảnh đồ vật ${index + 1}`}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {evidenceImagePreviews.length > 0 && (
        <>
          <strong className="preview-section-title">Ảnh bằng chứng</strong>
          <div className="preview-grid">
            {evidenceImagePreviews.map((previewUrl, index) => (
              <div className="preview-item" key={previewUrl}>
                <img src={previewUrl} alt={`Ảnh bằng chứng ${index + 1}`} />
                <button type="button" onClick={() => removeFile(index, "EVIDENCE")} aria-label={`Xóa ảnh bằng chứng ${index + 1}`}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <small className="form-hint">
        Tối đa {props.imageRules.maxImages} ảnh cho cả ảnh đồ vật và bằng chứng, mỗi ảnh {props.imageRules.maxImageSizeMb}MB, định dạng{" "}
        {props.imageRules.allowedFormats.join(", ").toUpperCase()}.
      </small>
      {createMutation.error instanceof Error && <div className="notice error">{createMutation.error.message}</div>}
      {message && <div className="notice success">{message}</div>}
      <button className="primary-button wide" disabled={createMutation.isPending} type="submit">
        <Upload size={18} />
        {createMutation.isPending ? "Đang đăng..." : "Đăng tin"}
      </button>
      </form>
    </div>
  );
}

function AccountView(props: {
  user?: PublicUser;
  entryMode: AuthEntryMode;
  entryKey: number;
  oauthError: string | null;
  imageRules: ImageUploadRules;
  onAuthChange: () => void;
  onSignedIn: () => void;
  onSignedOut: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(props.entryMode);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!props.user) {
      setAuthMessage(null);
      setMode(props.entryMode);
    }
  }, [props.entryKey, props.entryMode, props.user]);

  const activityQuery = useQuery({ queryKey: ["activity"], queryFn: () => api.activity(), enabled: Boolean(props.user) });
  const reputationQuery = useQuery({ queryKey: ["reputation"], queryFn: () => api.reputation(), enabled: Boolean(props.user) });
  const loginMutation = useMutation({
    mutationFn: (formData: FormData) => api.login({ email: formData.get("email"), password: formData.get("password") }),
    onSuccess: (result) => {
      saveTokens(result.tokens);
      props.onSignedIn();
    }
  });
  const registerMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const email = String(formData.get("email"));
      setRegisteredEmail(email);
      return api.register({
        email,
        password: formData.get("password"),
        fullName: formData.get("fullName"),
        accountType: formData.get("accountType"),
        studentCode: formData.get("studentCode"),
        otp: formData.get("otp")
      });
    },
    onSuccess: (result) => {
      saveTokens(result.tokens);
      props.onSignedIn();
    }
  });
  const requestRegistrationOtpMutation = useMutation({
    mutationFn: (email: string) => {
      setRegisteredEmail(email);
      return api.requestRegistrationOtp({ email });
    },
    onSuccess: () => {
      setAuthMessage("Đã gửi mã OTP đăng ký. Vui lòng kiểm tra email hoặc liên hệ quản trị viên nếu chưa nhận được mã.");
    }
  });
  const forgotMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const email = String(formData.get("email"));
      setRegisteredEmail(email);
      return api.forgotPassword({ email });
    },
    onSuccess: () => {
      setAuthMessage("Nếu email đã kích hoạt, mã đặt lại mật khẩu đã được gửi.");
      setMode("reset");
    }
  });
  const resetMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.resetPassword({
        email: formData.get("email"),
        otp: formData.get("otp"),
        newPassword: formData.get("newPassword")
      }),
    onSuccess: () => {
      setAuthMessage("Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.");
      setMode("login");
    }
  });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    },
    onSettled: props.onSignedOut
  });

  if (props.user) {
    return (
      <section className="account-panel">
        <div className="profile-card">
          {props.user.avatarUrl ? <img src={props.user.avatarUrl} alt="" /> : <UserCircle size={56} />}
          <div>
            <h2>{props.user.fullName}</h2>
            <p>{props.user.email}</p>
          </div>
        </div>
        <ProfileForm user={props.user} onUpdated={props.onAuthChange} />
        <AvatarForm imageRules={props.imageRules} onUploaded={props.onAuthChange} />
        <div className="account-grid">
          <article className="mini-panel">
            <Bell size={18} />
            <strong>{reputationQuery.data?.reputation.level ?? "NEW"}</strong>
            <span>{reputationQuery.data?.reputation.totalPoints ?? 0} reputation points</span>
          </article>
          <article className="mini-panel">
            <CheckCircle2 size={18} />
            <strong>{activityQuery.data?.activity.length ?? 0}</strong>
            <span>hoạt động gần đây</span>
          </article>
        </div>
        <div className="activity-list">
          {(activityQuery.data?.activity ?? []).slice(0, 5).map((activity) => (
            <span key={activity.id}>
              {activity.action} · {formatDate(activity.createdAt)}
            </span>
          ))}
        </div>
        <div className="reputation-history">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Reputation</span>
              <h2>Lịch sử điểm</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          {(reputationQuery.data?.reputation.recentLogs ?? []).map((entry) => (
            <div className="reputation-history-row" key={entry.id}>
              <strong className={entry.delta >= 0 ? "positive" : "negative"}>
                {entry.delta >= 0 ? "+" : ""}{entry.delta}
              </strong>
              <span>{entry.reason}</span>
              <small>{formatDate(entry.createdAt)}</small>
            </div>
          ))}
          {(reputationQuery.data?.reputation.recentLogs ?? []).length === 0 && <small>Chưa có lịch sử điểm.</small>}
        </div>
        <button className="secondary-button" type="button" onClick={() => logoutMutation.mutate()}>
          <LogOut size={18} /> Đăng xuất
        </button>
      </section>
    );
  }

  return (
    <section className={`account-panel auth-card ${mode === "register" ? "register-mode" : ""}`}>
      <div className="auth-card-heading">
        <span className="eyebrow">FPTU Lost & Found</span>
        <h2>{mode === "register" ? "Tạo tài khoản" : mode === "forgot" ? "Lấy lại mật khẩu" : mode === "reset" ? "Đặt mật khẩu mới" : "Đăng nhập"}</h2>
        <p>
          {mode === "register"
            ? "Xác thực email bằng OTP trước khi tham gia cộng đồng Lost & Found."
            : mode === "forgot" || mode === "reset"
              ? "Nhập email và mã OTP để đặt lại mật khẩu tài khoản của bạn."
              : "Đăng nhập để đăng tin, claim đồ nhặt được và theo dõi bài viết của bạn."}
        </p>
      </div>

      {(mode === "forgot" || mode === "reset") && (
        <button className="text-link auth-back-link" type="button" onClick={() => {
          setAuthMessage(null);
          setMode("login");
        }}>
          Quay lại đăng nhập
        </button>
      )}

      {props.oauthError && <div className="notice error">{props.oauthError}</div>}
      {authMessage && <div className="notice success">{authMessage}</div>}
      {mode === "login" && (
        <LoginForm
          pending={loginMutation.isPending}
          error={loginMutation.error}
          onForgotPassword={() => {
            setAuthMessage(null);
            setMode("forgot");
          }}
          onRegister={() => {
            setAuthMessage(null);
            setMode("register");
          }}
          onSubmit={(data) => loginMutation.mutate(data)}
        />
      )}
      {mode === "register" && (
        <RegisterForm
          defaultEmail={registeredEmail}
          pending={registerMutation.isPending}
          error={registerMutation.error}
          requestPending={requestRegistrationOtpMutation.isPending}
          requestError={requestRegistrationOtpMutation.error}
          onRequestOtp={(email) => requestRegistrationOtpMutation.mutate(email)}
          onLogin={() => {
            setAuthMessage(null);
            setMode("login");
          }}
          onSubmit={(data) => registerMutation.mutate(data)}
        />
      )}
      {mode === "forgot" && (
        <AuthForm
          fields={["email"]}
          submitLabel="Gửi mã đặt lại mật khẩu"
          pending={forgotMutation.isPending}
          error={forgotMutation.error}
          defaults={{ email: registeredEmail }}
          onSubmit={(data) => forgotMutation.mutate(data)}
        />
      )}
      {mode === "reset" && (
        <AuthForm
          fields={["email", "otp", "newPassword"]}
          submitLabel="Đặt lại mật khẩu"
          pending={resetMutation.isPending}
          error={resetMutation.error}
          defaults={{ email: registeredEmail }}
          onSubmit={(data) => resetMutation.mutate(data)}
        />
      )}
    </section>
  );
}

function ProfileForm({ user, onUpdated }: { user: PublicUser; onUpdated: () => void }) {
  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.updateProfile({
        fullName: formData.get("fullName"),
        studentCode: formData.get("studentCode"),
        phoneNumber: formData.get("phoneNumber")
      }),
    onSuccess: onUpdated
  });

  return (
    <form className="inline-profile-form" onSubmit={(event) => {
      event.preventDefault();
      mutation.mutate(new FormData(event.currentTarget));
    }}>
      <label>
        Họ tên
        <input name="fullName" required minLength={2} defaultValue={user.fullName} />
      </label>
      <label>
        Mã sinh viên
        <input name="studentCode" defaultValue={user.studentCode ?? ""} />
      </label>
      <label>
        Số điện thoại
        <input name="phoneNumber" defaultValue={user.phoneNumber ?? ""} />
      </label>
      <button className="secondary-button" disabled={mutation.isPending} type="submit">
        Lưu hồ sơ
      </button>
    </form>
  );
}

function LoginForm(props: {
  pending: boolean;
  error: unknown;
  onForgotPassword: () => void;
  onRegister: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form className="form-panel compact-form" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit(new FormData(event.currentTarget));
    }}>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" required minLength={8} />
      </label>
      <button className="secondary-button google-login-button" type="button" onClick={() => {
        window.location.href = api.googleLoginUrl();
      }}>
        <UserCircle size={16} /> Đăng nhập với Google
      </button>
      <button className="text-link auth-forgot-link" type="button" onClick={props.onForgotPassword}>
        Quên mật khẩu?
      </button>
      {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      <div className="auth-submit-row">
        <button className="primary-button" disabled={props.pending} type="submit">
          {props.pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <span>
          Bạn chưa có tài khoản?{" "}
          <button className="text-link" type="button" onClick={props.onRegister}>
            Đăng ký
          </button>
        </span>
      </div>
    </form>
  );
}

function RegisterForm(props: {
  defaultEmail: string;
  pending: boolean;
  error: unknown;
  requestPending: boolean;
  requestError: unknown;
  onRequestOtp: (email: string) => void;
  onLogin: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [email, setEmail] = useState(props.defaultEmail);

  return (
    <form className="form-panel compact-form" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit(new FormData(event.currentTarget));
    }}>
      <label>
        Họ tên
        <input name="fullName" required minLength={2} />
      </label>
      <label>
        Loại tài khoản
        <select name="accountType" defaultValue={"STUDENT" satisfies AudienceRole}>
          <option value="STUDENT">Sinh viên</option>
          <option value="LECTURER">Giảng viên</option>
        </select>
      </label>
      <label>
        Email
        <div className="otp-request-row">
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            className="secondary-button"
            disabled={!email || props.requestPending}
            type="button"
            onClick={() => props.onRequestOtp(email)}
          >
            {props.requestPending ? "Đang gửi..." : "Nhận mã"}
          </button>
        </div>
      </label>
      <label>
        Mã sinh viên / giảng viên
        <input name="studentCode" />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" required minLength={8} />
      </label>
      <label>
        OTP
        <input name="otp" required inputMode="numeric" minLength={6} maxLength={6} pattern="[0-9]{6}" />
      </label>
      {props.requestError instanceof Error && <div className="notice error">{props.requestError.message}</div>}
      {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      <div className="auth-submit-row">
        <button className="primary-button" disabled={props.pending} type="submit">
          {props.pending ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
        <span>
          Đã có tài khoản?{" "}
          <button className="text-link" type="button" onClick={props.onLogin}>
            Đăng nhập
          </button>
        </span>
      </div>
    </form>
  );
}

function AuthForm(props: {
  fields: string[];
  submitLabel: string;
  pending: boolean;
  error: unknown;
  defaults?: Record<string, string>;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form className="form-panel compact-form" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit(new FormData(event.currentTarget));
    }}>
      {props.fields.map((field) => (
        <label key={field}>
          {fieldLabel(field)}
          <input
            name={field}
            defaultValue={props.defaults?.[field] ?? ""}
            type={field.toLowerCase().includes("password") ? "password" : field === "email" ? "email" : "text"}
            required={field !== "studentCode"}
            minLength={field.toLowerCase().includes("password") ? 8 : undefined}
          />
        </label>
      ))}
      {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      <button className="primary-button wide" disabled={props.pending} type="submit">
        {props.pending ? "Đang xử lý..." : props.submitLabel}
      </button>
    </form>
  );
}

function AvatarForm({ imageRules, onUploaded }: { imageRules: ImageUploadRules; onUploaded: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: onUploaded
  });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function selectAvatar(file: File | undefined) {
    setError(null);
    if (!file) {
      return;
    }

    const validationErrors = validateImageFiles([file], imageRules, 1);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    mutation.mutate(file);
  }

  return (
    <div className="avatar-upload-panel">
      {previewUrl && <img src={previewUrl} alt="Avatar preview" />}
      <label className="upload-strip">
        <Upload size={18} />
        {mutation.isPending ? "Đang upload avatar..." : "Upload avatar"}
        <input type="file" accept={acceptAttribute(imageRules)} onChange={(event) => selectAvatar(event.target.files?.[0])} />
      </label>
      {error && <div className="notice error">{error}</div>}
      {mutation.error instanceof Error && <div className="notice error">{mutation.error.message}</div>}
    </div>
  );
}

function PostDrawer(props: {
  loading: boolean;
  detail?: Awaited<ReturnType<typeof api.getPost>>;
  handoverPoints: Array<{ id: string; name: string }>;
  currentUserId?: string;
  onClose: () => void;
  onClaim: (post: BoardPost) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const post = props.detail?.post;
  const queryClient = useQueryClient();
  const claimsQuery = useQuery({
    queryKey: ["post-claims", post?.id],
    queryFn: () => api.postClaims(post!.id),
    enabled: Boolean(post?.id && hasAccessToken() && post.type === "FOUND"),
    retry: false
  });
  const appointmentMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.createAppointment(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["claim-appointments"] });
    }
  });
  const reportMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.reportPost(post!.id, input),
    onSuccess: () => {
      setReportMessage("Đã gửi báo cáo. Admin sẽ kiểm tra nội dung này.");
      setReportOpen(false);
    }
  });
  const editMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.updatePost(post!.id, input),
    onSuccess: async () => {
      setActionMessage("Đã cập nhật bài viết.");
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["post", post?.id] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["my-posts"] });
    }
  });
  const postActionMutation = useMutation<unknown, Error, "close" | "delete">({
    mutationFn: (action: "close" | "delete") => {
      if (!post) {
        throw new Error("Post not ready");
      }
      return action === "close" ? api.updatePostStatus(post.id, "CLOSED") : api.deletePost(post.id);
    },
    onSuccess: async (_result, action) => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["post", post?.id] });
      if (action === "delete") {
        props.onClose();
      } else {
        setActionMessage("Đã đóng bài viết.");
      }
    }
  });

  useEffect(() => {
    setCurrentImageIndex(0);
    setReportOpen(false);
    setReportMessage(null);
    setEditOpen(false);
    setActionMessage(null);
  }, [post?.id]);

  const images = useMemo(() => {
    const list: string[] = [];
    if (props.detail?.media && props.detail.media.length > 0) {
      props.detail.media.forEach((m) => {
        if (m.secureUrl) list.push(m.secureUrl);
      });
    } else if (post?.coverImageUrl) {
      list.push(post.coverImageUrl);
    }
    return list;
  }, [props.detail?.media, post?.coverImageUrl]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (activeImageUrl) {
          setActiveImageUrl(null);
        } else {
          props.onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageUrl, props.onClose]);

  useEffect(() => {
    if (activeImageUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeImageUrl]);

  async function copyShareLink() {
    if (!post) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("post", post.id);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) {
      return;
    }
    if (!hasAccessToken()) {
      setReportMessage("Ban can dang nhap de bao cao bai viet.");
      return;
    }
    const data = new FormData(event.currentTarget);
    reportMutation.mutate({
      reason: String(data.get("reason")),
      details: formNullable(data, "details")
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) {
      return;
    }
    const data = new FormData(event.currentTarget);
    editMutation.mutate({
      title: String(data.get("title") ?? "").trim(),
      description: String(data.get("description") ?? "").trim(),
      contactInfo: formNullable(data, "contactInfo"),
      roomText: formNullable(data, "roomText"),
      customLocation: formNullable(data, "customLocation")
    });
  }

  const modalDate = post?.lostFoundAt ? (() => {
    const date = new Date(post.lostFoundAt);
    const weekday = date.toLocaleDateString("vi-VN", { weekday: "long" });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${capitalizedWeekday}, ${day} tháng ${month}, ${year}`;
  })() : "Chưa rõ thời gian";

  const canManagePost = Boolean(post && props.currentUserId === post.userId);

  return (
    <>
      <div className="drawer-backdrop" onClick={props.onClose}>
        <aside className="drawer" onClick={(event) => event.stopPropagation()}>
          {props.loading && <div className="notice">Đang tải chi tiết...</div>}
          {props.detail && post && (
            <>
              <div className="detail-modal-header">
                <span className={`detail-type-badge ${post.type.toLowerCase()}`}>
                  {post.type === "FOUND" ? "Found Item" : "Lost Item"}
                </span>
                <button className="detail-close-btn" type="button" onClick={props.onClose} aria-label="Đóng">
                  <X size={20} />
                </button>
              </div>

              {images.length > 0 && (
                <div className="detail-image-container">
                  <img
                    src={images[currentImageIndex]}
                    alt={post.title}
                    style={{ cursor: "zoom-in" }}
                    onClick={() => setActiveImageUrl(images[currentImageIndex])}
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="carousel-control prev"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                        }}
                        aria-label="Ảnh trước"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <button
                        type="button"
                        className="carousel-control next"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                        }}
                        aria-label="Ảnh sau"
                      >
                        <ChevronRight size={20} />
                      </button>

                      <div className="carousel-indicators">
                        {images.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`indicator-dot ${idx === currentImageIndex ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(idx);
                            }}
                            aria-label={`Ảnh ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <h2 className="detail-title">{post.title}</h2>

              <div className="detail-tags-row">
                {post.category?.name && (
                  <span className="detail-tag">
                    <Boxes size={14} />
                    <span>{post.category.name}</span>
                  </span>
                )}
                <span className="detail-tag">
                  <MapPin size={14} />
                  <span>{locationText(post)}</span>
                </span>
              </div>

              <div className="detail-description-section">
                <div className="detail-description-header">Description</div>
                <div className="detail-description-body">{post.description}</div>
              </div>

              <div className="detail-info-boxes">
                <div className="detail-info-box">
                  <div className="detail-info-box-icon">
                    <Calendar size={18} />
                  </div>
                  <div className="detail-info-box-content">
                    <span className="detail-info-box-label">Date</span>
                    <span className="detail-info-box-value">{modalDate}</span>
                  </div>
                </div>

                <div className="detail-info-box">
                  <div className="detail-info-box-icon">
                    <MapPin size={18} />
                  </div>
                  <div className="detail-info-box-content">
                    <span className="detail-info-box-label">Location</span>
                    <span className="detail-info-box-value">{locationText(post)}</span>
                  </div>
                </div>
              </div>

              {/* Extra images thumbnails indicator below */}
              {images.length > 1 && (
                <div className="detail-thumbnails-row">
                  {images.map((url, idx) => (
                    <div
                      key={idx}
                      className={`detail-thumbnail-wrapper ${idx === currentImageIndex ? "active" : ""}`}
                      onClick={() => setCurrentImageIndex(idx)}
                    >
                      <img src={url} alt="" />
                    </div>
                  ))}
                </div>
              )}

              {/* AI tags */}
              {props.detail?.tags && props.detail.tags.length > 0 && (
                <div className="detail-meta-section">
                  <h4 style={{ margin: "12px 0 6px" }}>AI tags</h4>
                  <div className="tag-list" style={{ marginBottom: "8px" }}>
                    {props.detail.tags.map((tag) => (
                      <span key={tag.id}>{tag.tag} · {Math.round(tag.confidence * 100)}%</span>
                    ))}
                  </div>
                </div>
              )}

              {post.type === "FOUND" && claimsQuery.data?.claims && claimsQuery.data.claims.length > 0 && (
                <ClaimAppointmentPanel
                  claims={claimsQuery.data.claims}
                  handoverPoints={props.handoverPoints}
                  currentUserId={props.currentUserId}
                  pending={appointmentMutation.isPending}
                  error={appointmentMutation.error}
                  onCreate={(payload) => appointmentMutation.mutate(payload)}
                />
              )}

              <div className="detail-modal-footer-actions">
                <button className="secondary-button" type="button" onClick={() => void copyShareLink()}>
                  <Share2 size={16} /> {copied ? "Đã copy link" : "Copy link"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setReportOpen((value) => !value)}>
                  <Flag size={16} /> Bao cao
                </button>
                {canManagePost && (
                  <>
                    <button className="secondary-button" type="button" onClick={() => setEditOpen((value) => !value)}>
                      <MoreVertical size={16} /> Sua bai
                    </button>
                    {(post.status === "OPEN" || post.status === "MATCHED") && (
                      <button
                        className="secondary-button"
                        disabled={postActionMutation.isPending}
                        type="button"
                        onClick={() => postActionMutation.mutate("close")}
                      >
                        Dong bai
                      </button>
                    )}
                    <button
                      className="secondary-button danger"
                      disabled={postActionMutation.isPending}
                      type="button"
                      onClick={() => {
                        if (window.confirm("Xoa mem bai viet nay?")) {
                          postActionMutation.mutate("delete");
                        }
                      }}
                    >
                      Xoa mem
                    </button>
                  </>
                )}
                {post.type === "FOUND" && (
                  <button className="primary-button" type="button" onClick={() => props.onClaim(post)}>
                    Claim đồ này
                  </button>
                )}
              </div>
              {editOpen && (
                <form className="post-edit-form" onSubmit={submitEdit}>
                  <input name="title" required minLength={3} maxLength={255} defaultValue={post.title} placeholder="Tiêu đề" />
                  <textarea name="description" required minLength={10} rows={4} defaultValue={post.description} placeholder="Mô tả" />
                  <input name="contactInfo" defaultValue={post.contactInfo ?? ""} placeholder="Thông tin liên hệ" />
                  <div className="post-edit-grid">
                    <input name="roomText" defaultValue={post.location.roomText ?? ""} placeholder="Phòng/khu vực cụ thể" />
                    <input name="customLocation" defaultValue={post.location.customLocation ?? ""} placeholder="Vị trí tùy chỉnh" />
                  </div>
                  <button className="primary-button" disabled={editMutation.isPending} type="submit">
                    Lưu thay đổi
                  </button>
                </form>
              )}
              {reportOpen && (
                <form className="post-report-form" onSubmit={submitReport}>
                  <input name="reason" required minLength={3} maxLength={255} placeholder="Lý do báo cáo" />
                  <textarea name="details" rows={3} maxLength={2000} placeholder="Mô tả thêm cho quản trị viên" />
                  <button className="primary-button" disabled={reportMutation.isPending} type="submit">
                    Gửi báo cáo
                  </button>
                </form>
              )}
              {reportMessage && <div className="notice">{reportMessage}</div>}
              {actionMessage && <div className="notice">{actionMessage}</div>}
              {reportMutation.error instanceof Error && <div className="notice error">{reportMutation.error.message}</div>}
              {editMutation.error instanceof Error && <div className="notice error">{editMutation.error.message}</div>}
              {postActionMutation.error instanceof Error && <div className="notice error">{postActionMutation.error.message}</div>}
            </>
          )}
        </aside>
      </div>

      {activeImageUrl && (
        <div className="lightbox-overlay" onClick={() => setActiveImageUrl(null)}>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img src={activeImageUrl} alt="Xem ảnh đầy đủ" />
            <button type="button" className="lightbox-close" onClick={() => setActiveImageUrl(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ClaimAppointmentPanel(props: {
  claims: PostClaimSummary[];
  handoverPoints: Array<{ id: string; name: string }>;
  currentUserId?: string;
  pending: boolean;
  error: unknown;
  onCreate: (payload: Record<string, unknown>) => void;
}) {
  const acceptedClaims = props.claims.filter((claim) => claim.status === "ACCEPTED");

  function submit(event: FormEvent<HTMLFormElement>, claim: PostClaimSummary) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    props.onCreate({
      claimId: claim.id,
      proposedAt: toDateTimeIso(data.get("proposedAt")),
      handoverPointId: formNullable(data, "handoverPointId"),
      customLocation: formNullable(data, "customLocation")
    });
    event.currentTarget.reset();
  }

  return (
    <section className="detail-description-section">
      <div className="detail-description-header">Claim và lịch hẹn trả đồ</div>
      <div className="claim-appointment-list">
        {props.claims.map((claim) => (
          <article className="claim-appointment-card" key={claim.id}>
            <div>
              <span className={`status-pill claim-${claim.status.toLowerCase()}`}>{claim.status}</span>
              <strong>{claim.claimant.fullName}</strong>
              <ClaimVerificationBadge claimId={claim.id} />
              <ClaimExtraActions claim={claim} currentUserId={props.currentUserId} />
              <small>{claim.approximateLocation || "Chưa có vị trí mất gần đúng"} · {formatDate(claim.createdAt)}</small>
            </div>
            {claim.status === "ACCEPTED" && (
              <form className="claim-appointment-form" onSubmit={(event) => submit(event, claim)}>
                <input name="proposedAt" required type="datetime-local" />
                <select name="handoverPointId">
                  <option value="">Chọn điểm bàn giao</option>
                  {props.handoverPoints.map((point) => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
                <input name="customLocation" placeholder="Hoặc nhập vị trí hẹn khác" />
                <button className="primary-button" disabled={props.pending} type="submit">
                  Tạo lịch hẹn
                </button>
              </form>
            )}
            {(claim.status === "ACCEPTED" || claim.status === "NEED_MORE_INFO") && (
              <ClaimChatBox claimId={claim.id} currentUserId={props.currentUserId} />
            )}
          </article>
        ))}
        {acceptedClaims.length === 0 && <small>Chưa có claim nào được accepted để tạo lịch hẹn.</small>}
        {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      </div>
    </section>
  );
}

function ClaimExtraActions(props: { claim: PostClaimSummary; currentUserId?: string }) {
  const { claim } = props;
  const queryClient = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionForm, setActionForm] = useState<"more-info" | "reject" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canReview = Boolean(props.currentUserId && props.currentUserId === claim.postOwnerId);
  const canCancel = Boolean(props.currentUserId && (props.currentUserId === claim.claimant.id || canReview));
  const canUploadEvidence = Boolean(
    props.currentUserId === claim.claimant.id && (claim.status === "PENDING" || claim.status === "NEED_MORE_INFO")
  );

  const detailQuery = useQuery({
    queryKey: ["claim-detail", claim.id],
    queryFn: () => api.getClaim(claim.id),
    enabled: detailOpen,
    retry: false
  });

  const actionMutation = useMutation({
    mutationFn: (input: { action: "accept" | "more-info" | "reject" | "cancel"; reason?: string }) => {
      if (input.action === "accept") {
        return api.acceptClaim(claim.id);
      }
      if (input.action === "more-info") {
        return api.requestClaimMoreInfo(claim.id, input.reason ?? "");
      }
      if (input.action === "cancel") {
        return api.cancelClaim(claim.id, input.reason ?? "");
      }
      return api.rejectClaim(claim.id, input.reason ?? "");
    },
    onSuccess: async (_result, input) => {
      setActionForm(null);
      setMessage(input.action === "accept" ? "Đã chấp nhận claim." : "Đã cập nhật trạng thái claim.");
      await queryClient.invalidateQueries({ queryKey: ["post-claims", claim.postId] });
      await queryClient.invalidateQueries({ queryKey: ["claim-detail", claim.id] });
      await queryClient.invalidateQueries({ queryKey: ["claim-verification", claim.id] });
    }
  });

  const evidenceMutation = useMutation({
    mutationFn: async (input: { files: File[]; evidenceType: string }) => {
      for (const file of input.files) {
        await api.uploadClaimEvidence(claim.id, file, input.evidenceType);
      }
      return { uploaded: input.files.length };
    },
    onSuccess: async (result) => {
      setMessage(`Đã tải ${result.uploaded} bằng chứng.`);
      setDetailOpen(true);
      await queryClient.invalidateQueries({ queryKey: ["claim-detail", claim.id] });
      await queryClient.invalidateQueries({ queryKey: ["claim-verification", claim.id] });
    }
  });

  function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionForm) {
      return;
    }
    const data = new FormData(event.currentTarget);
    actionMutation.mutate({
      action: actionForm,
      reason: String(data.get("reason") ?? "").trim()
    });
  }

  function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = event.currentTarget.elements.namedItem("evidence") as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (files.length === 0) {
      setMessage("Chọn ít nhất 1 file bằng chứng.");
      return;
    }
    evidenceMutation.mutate({
      files,
      evidenceType: String(data.get("evidenceType") ?? "OWNERSHIP_PROOF")
    });
    event.currentTarget.reset();
  }

  const detail = detailQuery.data;

  return (
    <div className="claim-extra-actions">
      {claim.moreInfoRequest && <small>Yêu cầu bổ sung: {claim.moreInfoRequest}</small>}
      {claim.rejectionReason && <small>Lý do từ chối: {claim.rejectionReason}</small>}
      <div className="claim-action-row">
        <button className="secondary-button" type="button" onClick={() => setDetailOpen((value) => !value)}>
          <Eye size={15} /> {detailOpen ? "Ẩn bằng chứng" : "Xem bằng chứng"}
        </button>
        {canReview && (claim.status === "PENDING" || claim.status === "NEED_MORE_INFO") && (
          <>
            <button
              className="secondary-button"
              disabled={actionMutation.isPending}
              type="button"
              onClick={() => actionMutation.mutate({ action: "accept" })}
            >
              Chấp nhận
            </button>
            <button className="secondary-button" type="button" onClick={() => setActionForm("more-info")}>
              Yêu cầu thêm
            </button>
            <button className="secondary-button danger" type="button" onClick={() => setActionForm("reject")}>
              Từ chối
            </button>
          </>
        )}
        {canCancel && claim.status !== "ACCEPTED" && claim.status !== "REJECTED" && claim.status !== "CANCELLED" && (
          <button className="secondary-button danger" type="button" onClick={() => setActionForm("cancel")}>
            Hủy claim
          </button>
        )}
      </div>

      {actionForm && (
        <form className="claim-action-form" onSubmit={submitAction}>
          <textarea
            name="reason"
            required
            rows={3}
            minLength={3}
            placeholder={actionForm === "more-info" ? "Cần bổ sung thông tin gì?" : "Nhập lý do"}
          />
          <button className="primary-button" disabled={actionMutation.isPending} type="submit">
            Lưu
          </button>
        </form>
      )}

      {canUploadEvidence && (
        <form className="claim-evidence-upload" onSubmit={submitEvidence}>
          <select name="evidenceType" defaultValue="OWNERSHIP_PROOF">
            <option value="OWNERSHIP_PROOF">Bằng chứng sở hữu</option>
            <option value="ADDITIONAL_DOC">Tài liệu bổ sung</option>
            <option value="PHOTO">Ảnh bổ sung</option>
          </select>
          <input name="evidence" type="file" accept="image/*" multiple />
          <button className="secondary-button" disabled={evidenceMutation.isPending} type="submit">
            <Upload size={15} /> Tải bằng chứng
          </button>
        </form>
      )}

      {detailOpen && (
        <div className="claim-evidence-panel">
          {detailQuery.isLoading && <small>Đang tải bằng chứng...</small>}
          {detail?.claim.description && <p>{detail.claim.description}</p>}
          {detail?.evidence.map((item) => (
            <figure key={item.id}>
              <img src={item.secureUrl} alt={item.evidenceType} />
              <figcaption>{item.evidenceType}{item.description ? ` - ${item.description}` : ""}</figcaption>
            </figure>
          ))}
          {detail && detail.evidence.length === 0 && <small>Claim chưa có file bằng chứng.</small>}
          {detailQuery.error instanceof Error && <div className="notice error">{detailQuery.error.message}</div>}
        </div>
      )}

      {message && <div className="notice">{message}</div>}
      {actionMutation.error instanceof Error && <div className="notice error">{actionMutation.error.message}</div>}
      {evidenceMutation.error instanceof Error && <div className="notice error">{evidenceMutation.error.message}</div>}
    </div>
  );
}

function ClaimVerificationBadge(props: { claimId: string }) {
  const verificationQuery = useQuery({
    queryKey: ["claim-verification", props.claimId],
    queryFn: () => api.claimVerification(props.claimId),
    enabled: hasAccessToken(),
    retry: false
  });
  const verification = verificationQuery.data?.verification;

  if (verificationQuery.isLoading) {
    return <small>Đang tính xác thực...</small>;
  }
  if (!verification) {
    return null;
  }

  return (
    <small className={`claim-verification-badge level-${verification.level.toLowerCase()}`}>
      M&#7913;c h&#7895; tr&#7907; x&#225;c th&#7921;c: {verification.ownershipConfidence}% - match {verification.breakdown.matchScore}% - b&#7857;ng ch&#7913;ng {verification.breakdown.evidenceScore}%
    </small>
  );
}

function ClaimChatBox(props: { claimId: string; currentUserId?: string }) {
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const unreadCount = messages.filter((message) => message.sender.id !== props.currentUserId && !message.isRead).length;

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("connecting");
    const socket = io(getApiOrigin(), {
      auth: { token },
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;
    socket.on("chat:message", (message: ChatMessageView) => {
      if (message.sender.id !== props.currentUserId) {
        socket.emit("chat:seen", { claimId: props.claimId });
      }
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }
        return [...current, message];
      });
    });
    socket.on("chat:seen", (payload: { readerId?: string }) => {
      if (!payload.readerId) {
        return;
      }
      setMessages((current) =>
        current.map((message) => (message.sender.id !== payload.readerId ? { ...message, isRead: true } : message))
      );
    });
    socket.emit("claim:join", { claimId: props.claimId }, (payload: { ok: boolean; messages?: ChatMessageView[] }) => {
      if (payload.ok) {
        setMessages(payload.messages ?? []);
        setStatus("ready");
        socket.emit("chat:seen", { claimId: props.claimId });
      } else {
        setStatus("error");
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [props.claimId, props.currentUserId]);

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const content = String(data.get("content") ?? "").trim();
    if (!content || !socketRef.current) {
      return;
    }
    socketRef.current.emit("chat:message", { claimId: props.claimId, content }, (payload: { ok: boolean }) => {
      if (payload.ok) {
        form.reset();
      } else {
        setStatus("error");
      }
    });
  }

  async function sendImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("image") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !socketRef.current) {
      return;
    }
    setImageError(null);
    setImageUploading(true);
    try {
      const uploaded = await api.uploadClaimChatImage(props.claimId, file);
      socketRef.current.emit(
        "chat:image",
        { claimId: props.claimId, mediaUrl: uploaded.image.secureUrl, mediaPublicId: uploaded.image.publicId },
        (payload: { ok: boolean }) => {
          if (payload.ok) {
            form.reset();
          } else {
            setStatus("error");
          }
        }
      );
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Không thể tải ảnh chat.");
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <section className="claim-chat-box">
      <div className="claim-chat-heading">
        <MessageCircle size={15} />
        {unreadCount > 0 && <span className="chat-unread-badge">{unreadCount} mới</span>}
        <strong>Trao đổi claim</strong>
        <small>{status === "ready" ? "Realtime" : status === "connecting" ? "Đang nối" : "Chưa sẵn sàng"}</small>
      </div>
      <div className="claim-chat-messages">
        {messages.map((message) => (
          <div className="claim-chat-message" key={message.id}>
            <strong>{message.sender.fullName ?? "Người dùng"}</strong>
            {message.mediaUrl ? <img src={message.mediaUrl} alt="" /> : <span>{message.content}</span>}
          </div>
        ))}
        {messages.length === 0 && <small>Chưa có tin nhắn.</small>}
      </div>
      <form className="claim-chat-form" onSubmit={send}>
        <input name="content" placeholder="Nhập tin nhắn" disabled={status !== "ready"} />
        <button className="secondary-button" disabled={status !== "ready"} type="submit">
          Gửi
        </button>
      </form>
      <form className="claim-chat-form image" onSubmit={sendImage}>
        <input name="image" type="file" accept="image/*" disabled={status !== "ready" || imageUploading} />
        <button className="secondary-button" disabled={status !== "ready" || imageUploading} type="submit">
          <Upload size={15} /> Ảnh
        </button>
      </form>
      {imageError && <div className="notice error">{imageError}</div>}
    </section>
  );
}

function MatchSuggestionsDialog(props: {
  suggestions: PostMatchSuggestion[];
  onClose: () => void;
  onSelect: (postId: string) => void;
}) {
  return (
    <div className="drawer-backdrop" onClick={props.onClose}>
      <section className="dialog match-suggestions-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Matching tự động</span>
            <h2>Có vật nhặt được giống bài của bạn</h2>
          </div>
          <Bell size={18} />
        </div>
        <p>
          Hệ thống tìm thấy {props.suggestions.length} bài FOUND có nhiều điểm tương đồng. Bạn có thể mở từng bài để xem ảnh, vị trí và gửi claim nếu đúng vật của mình.
        </p>
        <div className="match-suggestion-list">
          {props.suggestions.map((suggestion) => (
            <article className="match-suggestion-card" key={suggestion.match.id}>
              {suggestion.post.coverImageUrl ? (
                <img src={suggestion.post.coverImageUrl} alt="" />
              ) : (
                <div className="match-suggestion-placeholder">
                  <Camera size={22} />
                </div>
              )}
              <div>
                <span className="status-pill">{Math.round(suggestion.match.totalScore * 100)}% giống nhau</span>
                <strong>{suggestion.post.title}</strong>
                <small>{locationText(suggestion.post)} · {formatDate(suggestion.post.createdAt)}</small>
                <span className="match-breakdown">
                  text {Math.round(suggestion.match.textScore * 100)}% · danh mục {Math.round(suggestion.match.categoryScore * 100)}% · vị trí {Math.round(suggestion.match.locationScore * 100)}%
                </span>
              </div>
              <button className="primary-button" type="button" onClick={() => props.onSelect(suggestion.post.id)}>
                Xem bài
              </button>
            </article>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={props.onClose}>Đóng</button>
        </div>
      </section>
    </div>
  );
}

function ClaimDialog(props: {
  post: BoardPost;
  signedIn: boolean;
  imageRules: ImageUploadRules;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [evidence, setEvidence] = useState<File | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const claim = await api.submitClaim({
        postId: props.post.id,
        secretAnswer: formData.get("secretAnswer"),
        description: formData.get("description"),
        approximateLostAt: toDateTimeIso(formData.get("approximateLostAt")),
        approximateLocation: formData.get("approximateLocation")
      });
      if (evidence) {
        await api.uploadClaimEvidence(claim.claim.id, evidence, "OWNERSHIP_PROOF");
      }
      return claim;
    },
    onSuccess: props.onCreated
  });

  function selectEvidence(file: File | undefined) {
    setEvidenceError(null);
    if (!file) {
      setEvidence(null);
      return;
    }

    const validationErrors = validateImageFiles([file], props.imageRules, 1);
    if (validationErrors.length > 0) {
      setEvidence(null);
      setEvidenceError(validationErrors[0]);
      return;
    }
    setEvidence(file);
  }

  return (
    <div className="drawer-backdrop" onClick={props.onClose}>
      <form className="dialog" onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(new FormData(event.currentTarget));
      }}>
        <h2>Claim: {props.post.title}</h2>
        {!props.signedIn && <div className="notice error">Bạn cần đăng nhập trước khi claim.</div>}
        <label>
          Mô tả bí mật
          <textarea name="secretAnswer" required minLength={3} rows={3} />
        </label>
        <label>
          Mô tả thêm
          <textarea name="description" rows={3} />
        </label>
        <label>
          Thời gian mất ước lượng
          <input name="approximateLostAt" type="datetime-local" />
        </label>
        <label>
          Vị trí mất ước lượng
          <input name="approximateLocation" required />
        </label>
        <label>
          Bằng chứng ảnh
          <input type="file" accept={acceptAttribute(props.imageRules)} onChange={(event) => selectEvidence(event.target.files?.[0])} />
        </label>
        {evidence && <div className="notice success">Đã chọn {evidence.name}</div>}
        {evidenceError && <div className="notice error">{evidenceError}</div>}
        {mutation.error instanceof Error && <div className="notice error">{mutation.error.message}</div>}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={props.onClose}>Hủy</button>
          <button className="primary-button" disabled={!props.signedIn || mutation.isPending} type="submit">
            {mutation.isPending ? "Đang gửi..." : "Gửi claim"}
          </button>
        </div>
      </form>
    </div>
  );
}

function viewTitle(view: View) {
  const titles: Record<View, string> = {
    board: "Bảng Lost & Found",
    "my-posts": "Tin của tôi",
    create: "Đăng tin mới",
    handover: "Điểm bàn giao",
    account: "Tài khoản"
  };
  return titles[view];
}

function getImageUploadRules(entries: PublicConfigEntry[] | undefined): ImageUploadRules {
  const map = new Map((entries ?? []).map((entry) => [entry.key, entry.value]));
  const allowedFormats = String(map.get("post.allowed_image_formats") ?? "jpg,png,webp")
    .split(",")
    .map((format) => format.trim().toLowerCase())
    .filter(Boolean);
  const maxImageSizeMb = Number(map.get("post.max_image_size_mb") ?? 10);
  const maxImages = Number(map.get("post.max_images") ?? 5);

  return {
    allowedFormats: allowedFormats.length > 0 ? allowedFormats : ["jpg", "png", "webp"],
    maxImageSizeMb: Number.isFinite(maxImageSizeMb) && maxImageSizeMb > 0 ? maxImageSizeMb : 10,
    maxImages: Number.isFinite(maxImages) && maxImages > 0 ? maxImages : 5
  };
}

function acceptAttribute(rules: ImageUploadRules) {
  return rules.allowedFormats.map((format) => `image/${format === "jpg" ? "jpeg" : format}`).join(",");
}

function formText(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function formNullable(data: FormData, key: string) {
  const value = formText(data, key);
  return value === "" ? null : value;
}

function formNumber(data: FormData, key: string) {
  const value = Number(data.get(key) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function validateImageFiles(files: File[], rules: ImageUploadRules, maxFiles: number) {
  const errors: string[] = [];
  if (files.length > maxFiles) {
    errors.push(`Chỉ được chọn tối đa ${maxFiles} ảnh.`);
  }

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const normalizedExtension = extension === "jpeg" ? "jpg" : extension;
    const typeFormat = file.type.replace("image/", "").replace("jpeg", "jpg").toLowerCase();
    const allowed = rules.allowedFormats.includes(normalizedExtension) || rules.allowedFormats.includes(typeFormat);
    if (!allowed) {
      errors.push(`${file.name} không đúng định dạng ${rules.allowedFormats.join(", ").toUpperCase()}.`);
    }
    if (file.size > rules.maxImageSizeMb * 1024 * 1024) {
      errors.push(`${file.name} vượt quá ${rules.maxImageSizeMb}MB.`);
    }
  }

  return errors;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function storageLocationText(post: BoardPost) {
  if (post.handoverPoint?.name) {
    return `Điểm bàn giao: ${post.handoverPoint.name}`;
  }
  const exactLocation = [post.location.areaName, post.location.buildingName, post.location.roomName].filter(Boolean).join(", ");
  return exactLocation || post.location.customLocation || "Chưa có vị trí lưu trữ cụ thể";
}

function locationText(post: BoardPost) {
  return (
    post.location.customLocation ||
    [post.location.areaName, post.location.buildingName, post.location.roomName].filter(Boolean).join(", ") ||
    post.handoverPoint?.name ||
    "Chưa rõ vị trí"
  );
}

function categorySelectOptions(categories: Category[]) {
  const roots = categories.filter((category) => !category.parentId);
  const options: Array<{ id: string; label: string }> = [];

  for (const root of roots) {
    const children = categories.filter((category) => category.parentId === root.id);
    options.push({
      id: root.id,
      label: children.length > 0 ? `${root.name} (tất cả)` : root.name
    });
    for (const child of children) {
      options.push({ id: child.id, label: `- ${child.name}` });
    }
  }

  for (const category of categories) {
    if (category.parentId && !categories.some((parent) => parent.id === category.parentId)) {
      options.push({ id: category.id, label: category.name });
    }
  }

  return options;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2);
  return (initials || "U").toUpperCase();
}

function warehouseStatusLabel(status: AdminWarehouseStatus) {
  return warehouseStatusLabels[status] ?? status;
}

function warehouseLocationText(item: AdminWarehouseItem) {
  return (
    item.location.roomText ||
    [item.location.areaName, item.location.buildingName].filter(Boolean).join(", ") ||
    item.handoverPoint?.name ||
    "Chưa rõ vị trí kho"
  );
}

function dateTimeLocalInputValue(value: string | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

function toDateTimeIso(value: FormDataEntryValue | null) {
  const text = value?.toString();
  return text ? new Date(text).toISOString() : null;
}

function dateToIso(value: string, edge: "start" | "end") {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T${edge === "start" ? "00:00:00" : "23:59:59"}`).toISOString();
}

function dateInputValue(value: string | undefined) {
  return value ? value.slice(0, 10) : "";
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    fullName: "Họ tên",
    email: "Email",
    studentCode: "Mã sinh viên",
    password: "Mật khẩu",
    newPassword: "Mật khẩu mới",
    otp: "OTP"
  };
  return labels[field] ?? field;
}
