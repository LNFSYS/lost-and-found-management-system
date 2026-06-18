import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Filter,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle,
  Users
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  clearTokens,
  getStoredRefreshToken,
  hasAccessToken,
  saveTokens,
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
  type PostStatus,
  type PostType,
  type PublicConfigEntry,
  type PublicUser,
} from "./services/api";
import { HandoverPointPage } from "./handover/HandoverPointPage";

type View = "board" | "my-posts" | "create" | "handover" | "account";
type AuthMode = "login" | "register" | "forgot" | "reset";
type AuthEntryMode = Extract<AuthMode, "login" | "register">;
type AudienceRole = "STUDENT" | "LECTURER";
type AdminTab = "overview" | "moderation" | "categories" | "locations" | "handover" | "warehouse" | "users" | "reports";

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

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => api.categories() });
  const areasQuery = useQuery({ queryKey: ["areas"], queryFn: () => api.areas() });
  const handoverQuery = useQuery({ queryKey: ["handover-points"], queryFn: () => api.handoverPoints() });
  const publicConfigQuery = useQuery({ queryKey: ["public-config"], queryFn: () => api.publicConfig() });
  const filterBuildingsQuery = useQuery({
    queryKey: ["filter-buildings", filters.areaId],
    queryFn: () => api.buildings(filters.areaId!),
    enabled: Boolean(filters.areaId)
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
  const canUseAdmin = isAdmin || userRoles.includes("STAFF");
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
    enabled: adminMode && isAdmin
  });
  const adminAreasQuery = useQuery({
    queryKey: ["admin-areas", adminMode],
    queryFn: () => api.adminAreas(),
    enabled: adminMode && isAdmin
  });
  const adminBuildingsQuery = useQuery({
    queryKey: ["admin-buildings", adminMode],
    queryFn: () => api.adminBuildings(),
    enabled: adminMode && isAdmin
  });
  const adminHandoverQuery = useQuery({
    queryKey: ["admin-handover", adminMode],
    queryFn: () => api.adminHandoverPoints(),
    enabled: adminMode && isAdmin
  });
  const adminWarehouseQuery = useQuery({
    queryKey: ["admin-warehouse", adminMode],
    queryFn: () => api.adminWarehouseItems(),
    enabled: adminMode && isAdmin
  });
  const adminReportsQuery = useQuery({
    queryKey: ["admin-reports", adminMode],
    queryFn: () => api.adminReports(),
    enabled: adminMode && isAdmin
  });
  const myPostsQuery = useQuery({
    queryKey: ["my-posts", filters, authVersion],
    queryFn: () => api.myPosts(filters),
    enabled: view === "my-posts" && hasAccessToken()
  });
  const selectedPostQuery = useQuery({
    queryKey: ["post", selectedPostId],
    queryFn: () => api.getPost(selectedPostId!),
    enabled: Boolean(selectedPostId)
  });

  const isSignedIn = Boolean(meQuery.data?.user);
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
    if (!canUseAdmin) {
      setAdminMode(false);
    }
  }, [canUseAdmin]);

  useEffect(() => {
    if (adminMode && !isAdmin && adminTab !== "overview") {
      setAdminTab("overview");
    }
  }, [adminMode, adminTab, isAdmin]);

  function updateFilter<Key extends keyof ListPostsParams>(key: Key, value: ListPostsParams[Key]) {
    setFilters((current) => {
      const next = { ...current, [key]: value, page: 1 };
      if (key === "areaId") {
        next.buildingId = undefined;
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
            adminMode={adminMode}
            logoutPending={logoutMutation.isPending}
            markAllPending={markAllNotificationsReadMutation.isPending}
            onProfile={() => {
              setAdminMode(false);
              setView("account");
            }}
            onToggleAdmin={() => setAdminMode(true)}
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
          <button className="mode-switch" type="button" onClick={() => setAdminMode((value) => !value)}>
            {adminMode ? "Chuyển sang cộng đồng" : "Mở Admin Dashboard"}
          </button>
        )}

        <div className="sidebar-card">
          {adminMode ? <BarChart3 size={20} /> : <MessageCircle size={20} />}
          <strong>{adminMode ? "Bảng điều hành" : "Community feed"}</strong>
          <span>
            {adminMode
              ? "Theo dõi vận hành, dữ liệu nền và các điểm bàn giao của hệ thống."
              : "Sinh viên và giảng viên đăng tin, tìm kiếm, claim và theo dõi đồ thất lạc như một diễn đàn campus."}
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{adminMode ? "Admin operations" : "FPTU community"}</span>
            <h1>{adminMode ? "Admin Dashboard" : title}</h1>
          </div>
          <div className="topbar-actions">
            {isSignedIn && meQuery.data?.user ? (
              <UserMenu
                user={meQuery.data.user}
                notifications={notificationsQuery.data?.items ?? []}
                unreadCount={notificationsQuery.data?.unreadCount ?? 0}
                canUseAdmin={canUseAdmin}
                adminMode={adminMode}
                logoutPending={logoutMutation.isPending}
                markAllPending={markAllNotificationsReadMutation.isPending}
                onProfile={() => {
                  setAdminMode(false);
                  setView("account");
                }}
                onToggleAdmin={() => setAdminMode((value) => !value)}
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
            totalPosts={adminPostsQuery.data?.total ?? 0}
            onSelectPost={openPost}
          />
        )}

        {!adminMode && view === "board" && (
          <BoardView
            variant="feed"
            categories={categoriesQuery.data?.categories ?? []}
            areas={areasQuery.data?.areas ?? []}
            buildings={filterBuildingsQuery.data?.buildings ?? []}
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
            buildings={filterBuildingsQuery.data?.buildings ?? []}
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
          onClose={() => setMatchSuggestions(null)}
          onSelect={(postId) => {
            setMatchSuggestions(null);
            openPost(postId);
          }}
        />
      )}
    </main>
  );
}

function UserMenu(props: {
  user: PublicUser;
  notifications: NotificationItem[];
  unreadCount: number;
  canUseAdmin: boolean;
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
              <LayoutDashboard size={17} /> {props.adminMode ? "Về cộng đồng" : "Mở Admin Dashboard"}
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
  totalPosts: number;
  onSelectPost: (postId: string) => void;
}) {
  const queryClient = useQueryClient();
  const foundCount = props.posts.filter((post) => post.type === "FOUND").length;
  const resolvedCount = props.posts.filter((post) => post.status === "RESOLVED").length;
  const openCount = props.posts.filter((post) => post.status === "OPEN" || post.status === "MATCHED").length;

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
        <Metric label="Tổng bài đăng" value={props.overview?.posts ?? props.totalPosts} icon={<BarChart3 size={18} />} />
        <Metric label="Đang xử lý" value={openCount} icon={<Clock size={18} />} />
        <Metric label="Người dùng" value={props.overview?.users ?? props.users.length} icon={<Users size={18} />} />
        <Metric label="Đã hoàn trả" value={resolvedCount} icon={<CheckCircle2 size={18} />} />
      </section>

      {adminMutation.error instanceof Error && <div className="notice error">{adminMutation.error.message}</div>}
      {adminMutation.isPending && <div className="notice">Đang lưu thay đổi admin...</div>}

      {props.activeTab === "overview" && (
        <AdminOverviewPanel posts={props.posts} users={props.users} reports={props.reports} foundCount={foundCount} />
      )}
      {props.activeTab === "moderation" && (
        <AdminModerationPanel
          posts={props.moderationPosts}
          pending={adminMutation.isPending}
          onRun={runAdminAction}
          onSelectPost={props.onSelectPost}
        />
      )}
      {props.activeTab === "categories" && (
        <AdminCategoryPanel categories={props.categories} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
      {props.activeTab === "locations" && (
        <AdminLocationPanel
          areas={props.areas}
          buildings={props.buildings}
          pending={adminMutation.isPending}
          onRun={runAdminAction}
        />
      )}
      {props.activeTab === "handover" && (
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
          onRun={runAdminAction}
          onSelectPost={props.onSelectPost}
        />
      )}
      {props.activeTab === "users" && (
        <AdminUsersPanel users={props.users} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
      {props.activeTab === "reports" && (
        <AdminReportsPanel reports={props.reports} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
    </div>
  );
}

function AdminOverviewPanel(props: { posts: BoardPost[]; users: AdminUser[]; reports: AdminReport[]; foundCount: number }) {
  return (
    <section className="admin-grid">
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
          {parentCategories.map((category) => (
            <div className="admin-resource-row" key={category.id}>
              <div>
                <strong>{category.name}</strong>
                <span>{props.categories.filter((child) => child.parentId === category.id).length} danh mục</span>
              </div>
              <AdminActiveBadge active={category.isActive} />
              <button className="secondary-button" type="button" onClick={() => setEditing(category)}>
                Sửa
              </button>
              <button
                className="secondary-button"
                disabled={props.pending}
                type="button"
                onClick={() => props.onRun(() => api.adminSetCategoryActive(category.id, !category.isActive))}
              >
                {category.isActive ? "Ẩn" : "Kích hoạt"}
              </button>
            </div>
          ))}
          <strong className="admin-resource-group-title">Danh mục cụ thể</strong>
          {childCategories.map((category) => (
            <div className="admin-resource-row" key={category.id}>
              <div>
                <strong>{category.name}</strong>
                <span>Trong nhóm {categoryNameById.get(category.parentId ?? "") ?? "đã ẩn/xóa"}</span>
              </div>
              <AdminActiveBadge active={category.isActive} />
              <button className="secondary-button" type="button" onClick={() => setEditing(category)}>
                Sửa
              </button>
              <button
                className="secondary-button"
                disabled={props.pending}
                type="button"
                onClick={() => props.onRun(() => api.adminSetCategoryActive(category.id, !category.isActive))}
              >
                {category.isActive ? "Ẩn" : "Kích hoạt"}
              </button>
            </div>
          ))}
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
      returnedAt: toDateTimeIso(data.get("returnedAt"))
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
    <div className="warehouse-item-row">
      <div className="warehouse-item-main">
        <span className={`warehouse-status status-${props.item.status.toLowerCase()}`}>{warehouseStatusLabel(props.item.status)}</span>
        <strong>{props.item.itemName}</strong>
        <span>{props.item.storageCode || props.item.handoverPoint?.name || "Chưa có mã/kho cụ thể"}</span>
        <small>
          {warehouseLocationText(props.item)} · Nhận: {formatDate(props.item.receivedAt)}
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
        <button className="danger-button" disabled={props.pending} type="button" onClick={deleteItem}>Xóa</button>
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
    <form className="admin-user-row" onSubmit={submit}>
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
    <form className="admin-report-row" onSubmit={submit}>
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
  return (
    <article className="admin-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CRUD</span>
          <h2>{props.title}</h2>
        </div>
        <span>{props.items.length}</span>
      </div>
      <div className="admin-resource-list">
        {props.items.map((item) => (
          <div className="admin-resource-row" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.meta}</span>
            </div>
            <AdminActiveBadge active={item.active} />
            <button className="secondary-button" type="button" onClick={item.onEdit}>Sửa</button>
            <button className="secondary-button" disabled={props.pending} type="button" onClick={item.onToggle}>
              {item.active ? "Ẩn" : "Kích hoạt"}
            </button>
          </div>
        ))}
        {props.items.length === 0 && <small>Chưa có dữ liệu.</small>}
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
}) {
  const rootCategories = useMemo(() => props.categories.filter((category) => !category.parentId), [props.categories]);
  const categoryFilterOptions = useMemo(() => categorySelectOptions(props.categories), [props.categories]);
  const featuredCategories =
    rootCategories.length > 0
      ? rootCategories.slice(0, 4)
      : [
          { id: "", name: "Thiết bị điện tử", parentId: null },
          { id: "", name: "Giấy tờ cá nhân", parentId: null },
          { id: "", name: "Balo & phụ kiện", parentId: null },
          { id: "", name: "Đồ học tập", parentId: null }
        ];
  const categoryIcons = [Boxes, Camera, UserCircle, Sparkles];
  const isMine = props.variant === "mine";

  return (
    <div className={`screen-grid ${isMine ? "my-posts-screen" : "community-feed-screen"}`}>
      <section className={`feed-hero ${isMine ? "mine" : ""}`}>
        <div>
          <span className="eyebrow">{isMine ? "My activity" : "Lost & Found community"}</span>
          <h2>{isMine ? "Theo dõi các tin bạn đã đăng" : "Có ai mất hoặc nhặt được món này không?"}</h2>
          <p>
            {isMine
              ? "Quản lý bài mất đồ, bài nhặt được, trạng thái matching và lịch sử bàn giao trong một nơi gọn gàng."
              : "Đăng bài như một diễn đàn campus: mô tả rõ đồ vật, nơi mất/nhặt, thêm ảnh và theo dõi claim từ cộng đồng."}
          </p>
        </div>
        <div className="feed-stats">
          <span>{props.total} bài đang hiển thị</span>
          <span>{props.stats.lost} bị mất</span>
          <span>{props.stats.found} nhặt được</span>
        </div>
      </section>

      {isMine && (
        <section className="my-post-tabs">
          <div className="segmented">
            <button
              className={props.filters.type === "LOST" ? "active" : ""}
              type="button"
              onClick={() => props.onFilter("type", props.filters.type === "LOST" ? "" : "LOST")}
            >
              Tin làm mất
            </button>
            <button
              className={props.filters.type === "FOUND" ? "active" : ""}
              type="button"
              onClick={() => props.onFilter("type", props.filters.type === "FOUND" ? "" : "FOUND")}
            >
              Tin nhặt được
            </button>
          </div>
        </section>
      )}

      <section className="community-stat-grid" aria-label="Thống kê nhanh">
        <Metric label={isMine ? "Tin của bạn" : "Bài đang hiển thị"} value={props.total} icon={<MessageCircle size={18} />} />
        <Metric label="Đồ bị mất" value={props.stats.lost} icon={<Search size={18} />} />
        <Metric label="Đồ nhặt được" value={props.stats.found} icon={<CheckCircle2 size={18} />} />
        <Metric label="Có gợi ý match" value={props.stats.matched} icon={<Sparkles size={18} />} />
      </section>

      <section className="toolbar-band feed-filter-bar">
        <div className="search-box">
          <Search size={19} />
          <input
            aria-label="Tìm kiếm"
            placeholder="Tìm ví, tai nghe, thẻ sinh viên..."
            value={props.filters.q ?? ""}
            onChange={(event) => props.onFilter("q", event.target.value)}
          />
        </div>
        <select value={props.filters.type ?? ""} onChange={(event) => props.onFilter("type", event.target.value as PostType | "")}>
          <option value="">Tất cả loại tin</option>
          <option value="LOST">LOST</option>
          <option value="FOUND">FOUND</option>
        </select>
        <select
          value={props.filters.categoryId ?? ""}
          onChange={(event) => props.onFilter("categoryId", event.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categoryFilterOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <select value={props.filters.areaId ?? ""} onChange={(event) => props.onFilter("areaId", event.target.value)}>
          <option value="">Mọi khu vực</option>
          {props.areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
        <select
          value={props.filters.buildingId ?? ""}
          disabled={!props.filters.areaId}
          onChange={(event) => props.onFilter("buildingId", event.target.value)}
        >
          <option value="">Mọi địa điểm cụ thể</option>
          {props.buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
        <select
          value={props.filters.status ?? ""}
          onChange={(event) => props.onFilter("status", event.target.value as ListPostsParams["status"])}
        >
          <option value="">Mọi trạng thái</option>
          <option value="OPEN">Đang mở</option>
          <option value="MATCHED">Có match</option>
          <option value="RESOLVED">Đã trả</option>
          <option value="CLOSED">Đã đóng</option>
        </select>
        <input
          aria-label="Từ ngày"
          type="date"
          value={dateInputValue(props.filters.from)}
          onChange={(event) => props.onFilter("from", dateToIso(event.target.value, "start"))}
        />
        <input
          aria-label="Đến ngày"
          type="date"
          value={dateInputValue(props.filters.to)}
          onChange={(event) => props.onFilter("to", dateToIso(event.target.value, "end"))}
        />
        <select
          value={props.filters.sort ?? "latest"}
          onChange={(event) => props.onFilter("sort", event.target.value as ListPostsParams["sort"])}
        >
          <option value="latest">Mới nhất</option>
          <option value="highest_match">Match cao nhất</option>
          <option value="oldest">Cũ nhất</option>
        </select>
      </section>

      {!isMine && (
        <section className="category-bento" aria-label="Danh mục phổ biến">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Khám phá theo danh mục</span>
              <h2>Tìm nhanh đúng nhóm đồ</h2>
            </div>
          </div>
          <div className="category-grid">
            {featuredCategories.map((category, index) => {
              const CategoryIcon = categoryIcons[index % categoryIcons.length];
              return (
                <button
                  className={`category-tile tile-${index + 1} ${props.filters.categoryId === category.id && category.id ? "active" : ""}`}
                  key={`${category.id}-${category.name}`}
                  type="button"
                  onClick={() => props.onFilter("categoryId", category.id)}
                >
                  <span>
                    <CategoryIcon size={22} />
                  </span>
                  <strong>{category.name}</strong>
                  <small>{index === 0 ? "Ưu tiên xem nhiều" : "Lọc bài liên quan"}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {props.error instanceof Error && <div className="notice error">API chưa sẵn sàng: {props.error.message}</div>}
      {props.loading && <div className="notice">Đang tải bảng tin...</div>}

      <div className="section-heading feed-heading">
        <div>
          <span className="eyebrow">{isMine ? "Bài viết cá nhân" : "Bảng tin mới nhất"}</span>
          <h2>{isMine ? "Tin của tôi" : "Dòng tin cộng đồng"}</h2>
        </div>
      </div>

      <section className="post-grid">
        {props.posts.map((post) => (
          <PostCard key={post.id} post={post} onSelect={props.onSelect} onClaim={props.onClaim} />
        ))}
        {!props.loading && props.posts.length === 0 && (
          <div className="empty-state">
            <Search size={28} />
            <strong>Chưa có bài phù hợp</strong>
            <span>Thử đổi bộ lọc hoặc đăng tin đầu tiên cho campus.</span>
          </div>
        )}
      </section>
    </div>
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

function PostCard({ post, onSelect, onClaim }: { post: BoardPost; onSelect: (id: string) => void; onClaim: (post: BoardPost) => void }) {
  return (
    <article className="post-card">
      <div className={`post-media-surface ${post.type.toLowerCase()} ${post.coverImageUrl ? "has-cover" : ""}`}>
        {post.coverImageUrl && <img className="post-cover-image" src={post.coverImageUrl} alt="" loading="lazy" />}
        <span className={`type-pill ${post.type.toLowerCase()}`}>{typeLabels[post.type]}</span>
        {!post.coverImageUrl && (
          <div className="post-media-icon">
            {post.type === "FOUND" ? <CheckCircle2 size={34} /> : <Search size={34} />}
          </div>
        )}
        <small>{post.category?.name ?? "Chưa phân loại"}</small>
      </div>
      <div className="post-card-head">
        <span className="post-author-line compact">
          <UserCircle size={16} />
          {post.owner.fullName}
        </span>
        <span className="status-pill">{statusLabels[post.status] ?? post.status}</span>
      </div>
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      <div className="post-author-line">
        <span>{formatDate(post.createdAt)}</span>
      </div>
      <div className="post-meta">
        <span>
          <MapPin size={16} />
          {locationText(post)}
        </span>
        <span>
          <Clock size={16} />
          {post.lostFoundAt ? formatDate(post.lostFoundAt) : "Chưa rõ thời gian"}
        </span>
      </div>
      <div className="post-actions">
        <button className="secondary-button" type="button" onClick={() => onSelect(post.id)}>
          <MessageCircle size={16} /> Chi tiết
        </button>
        {post.type === "FOUND" && (
          <button className="primary-button" type="button" onClick={() => onClaim(post)}>
            Claim
          </button>
        )}
      </div>
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
          ? `Đã tạo bài và tìm thấy ${result.matchSuggestions.length} gợi ý giống trên 80%.`
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
      setAuthMessage("Đã gửi mã OTP đăng ký. Kiểm tra email hoặc terminal API nếu SMTP chưa cấu hình.");
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
  onClose: () => void;
  onClaim: (post: BoardPost) => void;
}) {
  const [copied, setCopied] = useState(false);
  const post = props.detail?.post;

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

  return (
    <div className="drawer-backdrop" onClick={props.onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" type="button" onClick={props.onClose}>Đóng</button>
        {props.loading && <div className="notice">Đang tải chi tiết...</div>}
        {props.detail && (
          <>
            <span className={`type-pill ${props.detail.post.type.toLowerCase()}`}>{props.detail.post.type}</span>
            <h2>{props.detail.post.title}</h2>
            <p>{props.detail.post.description}</p>
            <div className="drawer-actions">
              <button className="secondary-button" type="button" onClick={() => void copyShareLink()}>
                <Share2 size={18} /> {copied ? "Đã copy link" : "Copy link"}
              </button>
            </div>
            <div className="media-grid">
              {props.detail.media.map((media) => (
                <img key={media.id} src={media.secureUrl} alt="" />
              ))}
            </div>
            <h3>Lưu trữ / bàn giao</h3>
            <div className="storage-panel">
              <span>
                <MapPin size={17} />
                {storageLocationText(props.detail.post)}
              </span>
              <small>{props.detail.post.resolvedAt ? `Đã hoàn tất: ${formatDate(props.detail.post.resolvedAt)}` : "Chưa hoàn tất bàn giao"}</small>
            </div>
            <h3>Liên hệ</h3>
            <div className="storage-panel">
              <span>
                <UserCircle size={17} />
                {props.detail.post.contactInfo ?? "Chưa có thông tin liên hệ"}
              </span>
              <small>Thông tin do người đăng cung cấp để trao đổi thêm.</small>
            </div>
            <h3>AI tags</h3>
            <div className="tag-list">
              {props.detail.tags.map((tag) => (
                <span key={tag.id}>{tag.tag} · {Math.round(tag.confidence * 100)}%</span>
              ))}
              {props.detail.tags.length === 0 && <span>Chưa có tag AI</span>}
            </div>
            <h3>Matching</h3>
            <div className="match-list">
              {props.detail.matches.map((match) => (
                <span key={match.id}>
                  {Math.round(match.totalScore * 100)}% · text {Math.round(match.textScore * 100)}%
                  {match.totalScore >= 0.8 ? " · đã thông báo" : ""}
                </span>
              ))}
              {props.detail.matches.length === 0 && <span>Chưa có match vượt ngưỡng</span>}
            </div>
            {props.detail.post.type === "FOUND" && (
              <button className="primary-button wide" type="button" onClick={() => props.onClaim(props.detail!.post)}>
                Claim đồ này
              </button>
            )}
          </>
        )}
      </aside>
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
          Hệ thống tìm thấy {props.suggestions.length} bài FOUND có độ giống trên 80%. Bạn có thể mở từng bài để xem ảnh, vị trí và gửi claim nếu đúng vật của mình.
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
