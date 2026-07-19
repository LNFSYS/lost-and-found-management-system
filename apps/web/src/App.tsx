import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Handshake,
  Key,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  MoreVertical,
  Search,
  Share2,
  ShieldCheck,
  Upload,
  UserCircle,
  Users,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { useLocation, useNavigate } from "react-router-dom";
import {
  api,
  clearTokens,
  getApiOrigin,
  getStoredAccessToken,
  hasAccessToken,
  restoreWebSession,
  saveTokens,
  type BoardPost,
  type ListPostsParams,
  type NotificationItem,
  type PostMatchSuggestion,
  type PostClaimSummary,
} from "./services/api";
import { HandoverPointPage } from "./handover/HandoverPointPage";
import { MATCH_SUGGESTION_CHECK_INTERVAL_MS } from "./app/constants";
import type { AdminTab, AuthEntryMode, ImageUploadRules, View } from "./app/types";
import { acceptAttribute, formNullable, formatDate, getImageUploadRules, locationText, matchSuggestionsSignature, toDateTimeIso, validateImageFiles, viewTitle } from "./app/helpers";
import { RealtimeNotificationToast, UserMenu } from "./app/AppShellWidgets";
import { AppointmentProofImage, ClaimEvidenceImage } from "./app/MediaWidgets";
import { pathForView, postPath, routeState } from "./app/routes";
import { BoardView } from "./features/posts/BoardView";
import { CreatePostView } from "./features/posts/CreatePostView";
import { AccountView } from "./features/account/AccountView";
import { ClaimChatBox, ClaimVerificationBadge } from "./features/claims/ClaimChatPanel";
import { AdminDashboardView } from "./features/admin/AdminDashboardView";

export function App() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = useMemo(() => routeState(location.pathname, location.search), [location.pathname, location.search]);
  const view = currentRoute.view;
  const [filters, setFilters] = useState<ListPostsParams>({ page: 1, pageSize: 12, sort: "latest" });
  const selectedPostId = currentRoute.postId;
  const [detailReturnView, setDetailReturnView] = useState<Exclude<View, "post-detail">>("board");
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
  const adminReturnFeedbackQuery = useQuery({
    queryKey: ["admin-return-feedback", adminMode],
    queryFn: () => api.adminReturnFeedback(),
    enabled: adminMode && canUseAdmin
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

  useEffect(() => {
    if (hasAccessToken()) {
      return;
    }
    let active = true;
    void restoreWebSession().then((restored) => {
      if (active && restored) {
        afterAuthChange();
      }
    });
    return () => {
      active = false;
    };
  }, []);

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
    const refreshToken = params.get("refreshToken") ?? undefined;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    if (error) {
      setOauthError(error);
      setView("account");
      return;
    }
    if (!accessToken) {
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
    if (adminMode && !isAdmin && adminTab !== "overview" && adminTab !== "warehouse" && adminTab !== "feedback") {
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

  function setView(nextView: Exclude<View, "post-detail">) {
    navigate(pathForView(nextView));
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
    if (view !== "post-detail") {
      setDetailReturnView(view);
    }
    setAdminMode(false);
    navigate(postPath(postId));
  }

  function closePost() {
    navigate(pathForView(detailReturnView));
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
      await api.logout();
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
            <small>FPTU Đà Nẵng</small>
          </span>
        </a>

        <nav className="nav-list" aria-label="Main navigation">
          {adminMode ? (
            <>
              <button className={adminTab === "overview" ? "active" : ""} type="button" onClick={() => setAdminTab("overview")}>
                <LayoutDashboard size={18} /> Dashboard
              </button>
              {!isAdmin && (
                <>
                <button className={adminTab === "warehouse" ? "active" : ""} type="button" onClick={() => setAdminTab("warehouse")}>
                  <Boxes size={18} /> Quản lý kho
                </button>
                  <button className={adminTab === "feedback" ? "active" : ""} type="button" onClick={() => setAdminTab("feedback")}>
                    <MessageCircle size={18} /> Feedback
                  </button>
                </>
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
                  <button className={adminTab === "feedback" ? "active" : ""} type="button" onClick={() => setAdminTab("feedback")}>
                    <MessageCircle size={18} /> Feedback
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
            {adminMode ? "Chuyển sang cộng đồng" : isAdmin ? "Mở bảng quản trị" : "Mở bảng nhân viên"}
          </button>
        )}

        <div className="sidebar-card">
          {adminMode ? <BarChart3 size={20} /> : <MessageCircle size={20} />}
          <strong>{adminMode ? (isAdmin ? "Bảng điều hành" : "Nhân viên kho") : "Cộng đồng"}</strong>
          <span>
            {adminMode
              ? isAdmin
                ? "Theo dõi vận hành, dữ liệu nền và các điểm bàn giao của hệ thống."
                : "Tập trung nhập kho, cập nhật trạng thái và điều phối vật phẩm tại điểm bàn giao."
              : "Sinh viên và giảng viên đăng tin, tìm kiếm, gửi yêu cầu nhận đồ và theo dõi đồ thất lạc trong campus."}
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{adminMode ? (isAdmin ? "Admin operations" : "Staff warehouse") : "FPTU community"}</span>
            <h1>{adminMode ? (isAdmin ? "Bảng quản trị" : "Bảng nhân viên") : title}</h1>
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
            returnFeedback={adminReturnFeedbackQuery.data?.feedback ?? []}
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
              <span>Bấm đăng nhập hoặc đăng ký ở thanh trên để tiếp tục.</span>
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

        {!adminMode && view === "post-detail" && selectedPostId && (
          <PostDetailPage
            loading={selectedPostQuery.isLoading}
            detail={selectedPostQuery.data}
            handoverPoints={handoverQuery.data?.handoverPoints ?? []}
            currentUserId={meQuery.data?.user.id}
            onClose={closePost}
            onClaim={(post) => setClaimPost(post)}
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

function PostDetailPage(props: {
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
        if (m.optimizedUrl || m.secureUrl) list.push(m.optimizedUrl ?? m.secureUrl);
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
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) {
      return;
    }
    if (!hasAccessToken()) {
    setReportMessage("Bạn cần đăng nhập để báo cáo bài viết.");
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
      <section className="post-detail-page">
        <div className="post-detail-page-shell">
          {props.loading && <div className="notice">Đang tải chi tiết...</div>}
          {props.detail && post && (
            <>
              <div className="detail-modal-header">
                <span className={`detail-type-badge ${post.type.toLowerCase()}`}>
                  {post.type === "FOUND" ? "Vật nhặt được" : "Vật bị mất"}
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
                <div className="detail-description-header">Mô tả</div>
                <div className="detail-description-body">{post.description}</div>
              </div>

              <div className="detail-info-boxes">
                <div className="detail-info-box">
                  <div className="detail-info-box-icon">
                    <Calendar size={18} />
                  </div>
                  <div className="detail-info-box-content">
                    <span className="detail-info-box-label">Thời gian</span>
                    <span className="detail-info-box-value">{modalDate}</span>
                  </div>
                </div>

                <div className="detail-info-box">
                  <div className="detail-info-box-icon">
                    <MapPin size={18} />
                  </div>
                  <div className="detail-info-box-content">
                    <span className="detail-info-box-label">Vị trí</span>
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
                  <Share2 size={16} /> {copied ? "Đã sao chép liên kết" : "Sao chép liên kết"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setReportOpen((value) => !value)}>
                  <Flag size={16} /> Báo cáo
                </button>
                {canManagePost && (
                  <>
                    <button className="secondary-button" type="button" onClick={() => setEditOpen((value) => !value)}>
                      <MoreVertical size={16} /> Sửa bài
                    </button>
                    {(post.status === "OPEN" || post.status === "MATCHED") && (
                      <button
                        className="secondary-button"
                        disabled={postActionMutation.isPending}
                        type="button"
                        onClick={() => postActionMutation.mutate("close")}
                      >
                        Đóng bài
                      </button>
                    )}
                    <button
                      className="secondary-button danger"
                      disabled={postActionMutation.isPending}
                      type="button"
                      onClick={() => {
                        if (window.confirm("Xóa mềm bài viết này?")) {
                          postActionMutation.mutate("delete");
                        }
                      }}
                    >
                      Xóa mềm
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
        </div>
      </section>

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
          <small>{claim.approximateLocation || "Chưa có vị trí mất gần đúng"} - {formatDate(claim.createdAt)}</small>
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
            <ClaimAppointmentTimeline claimId={claim.id} />
            {claim.status === "ACCEPTED" && (
              <ClaimChatBox claimId={claim.id} currentUserId={props.currentUserId} />
            )}
          </article>
        ))}
        {acceptedClaims.length === 0 && <small>Chưa có yêu cầu nhận đồ nào được chấp nhận để tạo lịch hẹn.</small>}
        {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      </div>
    </section>
  );
}

function ClaimAppointmentTimeline(props: { claimId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const appointmentsQuery = useQuery({
    queryKey: ["claim-appointments", props.claimId],
    queryFn: () => api.claimAppointments(props.claimId),
    enabled: hasAccessToken(),
    retry: false
  });
  const feedbackMutation = useMutation({
    mutationFn: (input: { appointmentId: string; rating: number; comment?: string | null }) =>
      api.submitAppointmentFeedback(input.appointmentId, {
        rating: input.rating,
        comment: input.comment
      }),
    onSuccess: async () => {
      setMessage("Đã gửi feedback sau bàn giao.");
      await queryClient.invalidateQueries({ queryKey: ["claim-appointments", props.claimId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-return-feedback"] });
    }
  });
  const proofMutation = useMutation({
    mutationFn: (input: { appointmentId: string; file: File; note?: string | null }) =>
      api.uploadAppointmentProof(input.appointmentId, input.file, input.note),
    onSuccess: async () => {
      setMessage("Đã tải chứng từ bàn giao.");
      await queryClient.invalidateQueries({ queryKey: ["claim-appointments", props.claimId] });
    }
  });

  function submitFeedback(event: FormEvent<HTMLFormElement>, appointmentId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    feedbackMutation.mutate({
      appointmentId,
      rating: Number(data.get("rating") ?? 5),
      comment: formNullable(data, "comment")
    });
    event.currentTarget.reset();
  }

  function submitProof(event: FormEvent<HTMLFormElement>, appointmentId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = event.currentTarget.elements.namedItem("proof") as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      setMessage("Chọn một ảnh chứng từ bàn giao trước khi lưu.");
      return;
    }
    proofMutation.mutate({
      appointmentId,
      file,
      note: formNullable(data, "note")
    });
    event.currentTarget.reset();
  }

  const appointments = appointmentsQuery.data?.appointments ?? [];
  if (appointmentsQuery.isLoading) {
    return <small>Đang tải lịch bàn giao...</small>;
  }
  if (appointments.length === 0) {
    return null;
  }

  return (
    <div className="claim-appointment-list nested">
      {message && <div className="notice">{message}</div>}
      {appointments.map((appointment) => (
        <article className="claim-appointment-card" key={appointment.id}>
          <div>
            <span className={`status-pill claim-${appointment.status.toLowerCase()}`}>{appointment.status}</span>
            <strong>{appointment.handoverPoint?.name ?? appointment.customLocation ?? "Campus"}</strong>
            <small>{formatDate(appointment.proposedAt)}</small>
          </div>
          {appointment.proof && (
            <div className="appointment-proof-preview">
              <AppointmentProofImage appointmentId={appointment.id} alt="Chứng từ bàn giao" />
              <div>
                <strong>Chứng từ bàn giao</strong>
                <small>
                  {appointment.proof.uploadedBy?.fullName ? `${appointment.proof.uploadedBy.fullName} · ` : ""}
                  {appointment.proof.uploadedAt ? formatDate(appointment.proof.uploadedAt) : "Đã tải lên"}
                </small>
                {appointment.proof.note && <small>{appointment.proof.note}</small>}
              </div>
            </div>
          )}
          {(appointment.status === "ACCEPTED" || appointment.status === "COMPLETED") && (
            <form className="appointment-proof-form" onSubmit={(event) => submitProof(event, appointment.id)}>
              <input name="proof" type="file" accept="image/png,image/jpeg,image/webp" />
              <input name="note" placeholder="Ghi chú chứng từ bàn giao" />
              <button className="secondary-button" disabled={proofMutation.isPending} type="submit">
                Tải chứng từ
              </button>
            </form>
          )}
          {appointment.status === "COMPLETED" && (
            <form className="claim-appointment-form" onSubmit={(event) => submitFeedback(event, appointment.id)}>
              <select name="rating" defaultValue="5">
                <option value="5">5 sao - hài lòng</option>
                <option value="4">4 sao</option>
                <option value="3">3 sao - bình thường</option>
                <option value="2">2 sao - cần xem lại</option>
                <option value="1">1 sao - có vấn đề</option>
              </select>
              <input name="comment" placeholder="Ghi chú sau bàn giao" />
              <button className="secondary-button" disabled={feedbackMutation.isPending} type="submit">
                Gửi feedback
              </button>
            </form>
          )}
        </article>
      ))}
      {proofMutation.error instanceof Error && <div className="notice error">{proofMutation.error.message}</div>}
      {feedbackMutation.error instanceof Error && <div className="notice error">{feedbackMutation.error.message}</div>}
    </div>
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
      setMessage(input.action === "accept" ? "Đã chấp nhận yêu cầu nhận đồ." : "Đã cập nhật trạng thái yêu cầu nhận đồ.");
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
            Hủy yêu cầu
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
              <ClaimEvidenceImage claimId={claim.id} evidenceId={item.id} alt={item.evidenceType} />
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
          Hệ thống tìm thấy {props.suggestions.length} bài nhặt được có nhiều điểm tương đồng. Bạn có thể mở từng bài để xem ảnh, vị trí và gửi yêu cầu nhận đồ nếu đúng vật của mình.
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
        {!props.signedIn && <div className="notice error">Bạn cần đăng nhập trước khi gửi yêu cầu nhận đồ.</div>}
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
            {mutation.isPending ? "Đang gửi..." : "Gửi yêu cầu nhận đồ"}
          </button>
        </div>
      </form>
    </div>
  );
}
