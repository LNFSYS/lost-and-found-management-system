import { Boxes, CheckCircle2, ChevronDown, ChevronUp, Filter, HelpCircle, Key, Laptop, Search, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import type { BoardPost, Building, Category, ListPostsParams } from "../../services/api";
import type { View } from "../../app/types";
import { PostCard } from "./PostCard";

export function BoardView(props: {
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
  onNavigate?: (view: Exclude<View, "post-detail">) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    type: false,
    category: false,
    location: false
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const rootCategories = useMemo(() => props.categories.filter((category) => !category.parentId), [props.categories]);
  const selectedCategoryIds = props.filters.categoryIds ?? (props.filters.categoryId ? [props.filters.categoryId] : []);

  const getCatIdByName = (name: string) => {
    const target = props.categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    return target?.id;
  };

  const toggleQuickCategory = (name: string) => {
    const id = getCatIdByName(name);
    if (!id) return;
    toggleCategory(id);
  };

  const toggleCategory = (id: string) => {
    const next = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter((categoryId) => categoryId !== id)
      : [...selectedCategoryIds, id];
    props.onFilter("categoryIds", next);
    props.onFilter("categoryId", undefined);
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleReset = () => {
    props.onFilter("type", "");
    props.onFilter("categoryId", undefined);
    props.onFilter("categoryIds", undefined);
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
              Cộng đồng FPT University Đà Nẵng Lost & Found
            </h1>
            <p className="banner-description">
              Nơi kết nối và hỗ trợ tìm lại đồ đạc thất lạc tại FPT University Đà Nẵng. Hãy cùng nhau xây dựng một campus tử tế hơn.
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
            <img src="/fpt-danang-illustration.jpg" alt="FPT University Đà Nẵng Lost & Found" />
          </div>
        </div>
      )}

      <div className={`community-feed-layout ${isSidebarOpen ? "" : "sidebar-closed"}`}>
        {isSidebarOpen && (
    <aside className="feed-sidebar" aria-label="Bộ lọc bài đăng">
        <div className="sidebar-header">
          <h2>Bộ lọc</h2>
          <button className="reset-link" type="button" onClick={handleReset}>
            Đặt lại
          </button>
        </div>

        <div className="filter-group">
          <div
            className={`filter-group-header ${collapsedGroups.type ? "collapsed" : ""}`}
            onClick={() => toggleGroup("type")}
          >
            <span>Loại bài đăng</span>
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
                <span>Đồ bị mất</span>
              </label>
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={props.filters.type === "FOUND"}
                  onChange={() => props.onFilter("type", props.filters.type === "FOUND" ? "" : "FOUND")}
                />
                <span>Đồ nhặt được</span>
              </label>
            </div>
          )}
        </div>

        <div className="filter-group">
          <div
            className={`filter-group-header ${collapsedGroups.category ? "collapsed" : ""}`}
            onClick={() => toggleGroup("category")}
          >
            <span>Danh mục</span>
            {collapsedGroups.category ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
          {!collapsedGroups.category && (
            <div className="filter-options">
              {rootCategories.map((cat) => (
                <label className="filter-checkbox-label" key={cat.id}>
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
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
            <span>Khu vực</span>
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
              <span className="stat-card-label">Tổng vật phẩm</span>
              <strong className="stat-card-value">{props.stats.lost + props.stats.found}</strong>
            </div>
            <div className="stat-card-right-icon blue-icon">
              <Boxes size={20} />
            </div>
          </div>
          <div className="stat-overview-card lost-items">
            <div className="stat-card-left">
              <span className="stat-card-label">Đồ bị mất</span>
              <strong className="stat-card-value">{props.stats.lost}</strong>
            </div>
            <div className="stat-card-right-icon red-icon">
              <HelpCircle size={20} />
            </div>
          </div>
          <div className="stat-overview-card found-items">
            <div className="stat-card-left">
              <span className="stat-card-label">Đồ nhặt được</span>
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
            aria-label="Bật hoặc tắt bộ lọc"
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
            Đồ nhặt được
            </button>
            <button
              className={`type-tab-btn ${props.filters.type === "LOST" ? "active" : ""}`}
              type="button"
              onClick={() => props.onFilter("type", "LOST")}
            >
            Đồ đánh rơi
            </button>
          </div>
        </div>

        <div className="quick-categories-row">
          <div
                className={`quick-category-card ${selectedCategoryIds.includes(getCatIdByName("Thiết bị điện tử") ?? "") ? "active" : ""}`}
                onClick={() => toggleQuickCategory("Thiết bị điện tử")}
          >
            <div className="quick-category-icon-wrapper">
              <Laptop size={22} />
            </div>
            <span>Đồ Điện Tử</span>
          </div>
          <div
                className={`quick-category-card ${selectedCategoryIds.includes(getCatIdByName("Giấy tờ cá nhân") ?? "") ? "active" : ""}`}
                onClick={() => toggleQuickCategory("Giấy tờ cá nhân")}
          >
            <div className="quick-category-icon-wrapper">
              <Wallet size={22} />
            </div>
                <span>Ví & Giấy tờ</span>
          </div>
          <div
                className={`quick-category-card ${selectedCategoryIds.includes(getCatIdByName("Chìa khóa & thẻ") ?? "") ? "active" : ""}`}
                onClick={() => toggleQuickCategory("Chìa khóa & thẻ")}
          >
            <div className="quick-category-icon-wrapper">
              <Key size={22} />
            </div>
                <span>Chìa khóa & Thẻ</span>
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

