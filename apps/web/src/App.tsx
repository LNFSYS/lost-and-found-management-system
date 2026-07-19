import {
  BarChart3,
  Boxes,
  Building2,
  Camera,
  Flag,
  Handshake,
  Key,
  LayoutDashboard,
  MessageCircle,
  Search,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
} from "./services/api";
import { HandoverPointPage } from "./handover/HandoverPointPage";
import { MATCH_SUGGESTION_CHECK_INTERVAL_MS } from "./app/constants";
import type { AdminTab, AuthEntryMode, View } from "./app/types";
import { getImageUploadRules, matchSuggestionsSignature, viewTitle } from "./app/helpers";
import { RealtimeNotificationToast, UserMenu } from "./app/AppShellWidgets";
import { pathForView, postPath, routeState } from "./app/routes";
import { BoardView } from "./features/posts/BoardView";
import { CreatePostView } from "./features/posts/CreatePostView";
import { ClaimDialog, MatchSuggestionsDialog } from "./features/posts/PostDialogs";
import { PostDetailPage } from "./features/posts/PostDetailPage";
import { AccountView } from "./features/account/AccountView";
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
