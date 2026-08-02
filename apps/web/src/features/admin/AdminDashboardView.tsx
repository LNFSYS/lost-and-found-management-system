import {
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Handshake,
  Key,
  MapPin,
  MoreVertical,
  Radar,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type AdminArea,
  type AdminBuilding,
  type AdminCategory,
  type AdminConfigEntry,
  type AdminConfigHistoryEntry,
  type AdminHandoverPoint,
  type AdminOverview,
  type AdminReport,
  type AdminRole,
  type AdminUser,
  type AdminUserStatus,
  type AdminWarehouseItem,
  type AdminWarehouseStatus,
  type BoardPost,
  type PostStatus,
  type PostType,
  type RadarAlert,
  type RadarEvent,
  type RadarEventType,
  type RadarSourceType,
  type ReturnFeedback
} from "../../services/api";
import { statusLabels, warehouseStatuses } from "../../app/constants";
import type { AdminActionRunner, AdminTab } from "../../app/types";
import {
  categorySelectOptions,
  dateTimeLocalInputValue,
  formNullable,
  formText,
  formatDate,
  locationText,
  toDateTimeIso,
  warehouseLocationText,
  warehouseStatusLabel
} from "../../app/helpers";
import {
  AdminActiveBadge,
  AdminListPanel,
  DashboardRankList,
  Metric,
  primaryAdminRole
} from "../../app/AdminWidgets";
import {
  CampusEventRadarPanel,
  VisualHuntPage,
  type CampusRadarAlert,
  type CampusRadarFilters,
  type CampusRadarZone,
  type VisualHuntAnalysisInput,
  type VisualHuntResult
} from "../ai-tools";

export function AdminDashboardView(props: {
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
  returnFeedback: ReturnFeedback[];
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
        queryClient.invalidateQueries({ queryKey: ["admin-return-feedback"] }),
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
      {props.activeTab === "visual-hunt" && (
        <VisualHuntOperationsPanel onSelectPost={props.onSelectPost} />
      )}
      {props.activeTab === "radar" && (
        <RadarOperationsPanel
          areas={props.areas}
          buildings={props.buildings}
          categories={props.categories}
          isAdmin={props.isAdmin}
          onSelectPost={props.onSelectPost}
        />
      )}
      {props.activeTab === "users" && props.isAdmin && (
        <AdminUsersPanel users={props.users} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
      {props.activeTab === "reports" && props.isAdmin && (
        <AdminReportsPanel reports={props.reports} pending={adminMutation.isPending} onRun={runAdminAction} />
      )}
      {props.activeTab === "feedback" && (
        <AdminReturnFeedbackPanel
          feedback={props.returnFeedback}
          canReview={props.isAdmin}
          pending={adminMutation.isPending}
          onRun={runAdminAction}
        />
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

function VisualHuntOperationsPanel(props: { onSelectPost: (postId: string) => void }) {
  async function analyze(input: VisualHuntAnalysisInput): Promise<readonly VisualHuntResult[]> {
    const responses = [];
    for (const image of input.images) {
      responses.push(await api.adminVisualHunt(image, { targetType: "LOST", maxResults: 12 }));
    }

    const merged = new Map<string, VisualHuntResult>();
    responses.flatMap((response) => response.results).forEach((result) => {
      const reasons = [
        result.signals.visual !== null ? `Hình ảnh ${Math.round(result.signals.visual * 100)}%` : null,
        result.signals.ocr !== null ? `OCR ${Math.round(result.signals.ocr * 100)}%` : null,
        result.matchMode === "FILTER_ONLY" ? "Kết quả lọc dự phòng" : null
      ].filter((reason): reason is string => Boolean(reason));
      const mapped: VisualHuntResult = {
        id: result.postId,
        title: result.title,
        type: result.type,
        confidence: result.similarityScore ?? 0,
        location: result.building?.name ?? result.area?.name ?? null,
        reasons
      };
      const current = merged.get(result.postId);
      if (!current || mapped.confidence > current.confidence) merged.set(result.postId, mapped);
    });

    return [...merged.values()]
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, 20);
  }

  return (
    <VisualHuntPage
      advisoryText="Kết quả được xếp hạng từ metadata Google Vision/OCR và chỉ hỗ trợ nhân viên tìm kiếm. Luôn kiểm tra bằng chứng trước khi bàn giao."
      onAnalyze={analyze}
      onCandidateDecision={async (result, decision, source) => {
        await api.adminVisualHuntFeedback({
          postId: result.id,
          decision,
          similarityScore: result.confidence,
          source
        });
      }}
      onOpenResult={(result) => props.onSelectPost(result.id)}
    />
  );
}

const radarPositions = [
  { x: 76, y: 43 },
  { x: 54, y: 64 },
  { x: 73, y: 75 },
  { x: 36, y: 35 },
  { x: 31, y: 59 },
  { x: 45, y: 25 },
  { x: 43, y: 78 },
  { x: 22, y: 26 }
];

function radarDateTimeDefault(hoursOffset: number) {
  const date = new Date(Date.now() + hoursOffset * 60 * 60 * 1000);
  date.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function RadarOperationsPanel(props: {
  areas: AdminArea[];
  buildings: AdminBuilding[];
  categories: AdminCategory[];
  isAdmin: boolean;
  onSelectPost: (postId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CampusRadarFilters>({ type: "LOST", period: "7D" });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [eventAreaId, setEventAreaId] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const eventsQuery = useQuery({ queryKey: ["admin-radar-events"], queryFn: () => api.adminRadarEvents() });
  const alertsQuery = useQuery({ queryKey: ["admin-radar-alerts"], queryFn: () => api.adminRadarAlerts({ limit: 100 }) });
  const relatedPostsQuery = useQuery({
    queryKey: ["admin-radar-related-posts", selectedAlertId],
    queryFn: () => api.adminRadarRelatedPosts(selectedAlertId!, 50),
    enabled: Boolean(selectedAlertId)
  });
  const mutation = useMutation({
    mutationFn: (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-radar-events"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-radar-alerts"] })
      ]);
    }
  });

  const periodMs = filters.period === "24H" ? 24 * 60 * 60 * 1000 : filters.period === "7D" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const events = eventsQuery.data?.events ?? [];
  const eventById = new Map(events.map((event) => [event.id, event]));
  const filteredAlerts = (alertsQuery.data?.alerts ?? []).filter((alert) => {
    if (alert.status === "DISMISSED") return false;
    if (Date.now() - new Date(alert.lastDetectedAt).getTime() > periodMs) return false;
    if (filters.categoryId && alert.category?.id !== filters.categoryId) return false;
    const event = eventById.get(alert.eventId);
    const zoneId = event?.building?.id ?? event?.area?.id ?? "campus";
    return !filters.zoneId || filters.zoneId === zoneId;
  });
  const zoneBuckets = new Map<string, CampusRadarZone>();
  const allCategoryZoneIds = new Set(
    filteredAlerts
      .filter((alert) => alert.scope === "ALL_CATEGORIES")
      .map((alert) => {
        const event = eventById.get(alert.eventId);
        return event?.building?.id ?? event?.area?.id ?? "campus";
      })
  );
  filteredAlerts.forEach((alert) => {
    const event = eventById.get(alert.eventId);
    const id = event?.building?.id ?? event?.area?.id ?? "campus";
    const index = zoneBuckets.size % radarPositions.length;
    const existing = zoneBuckets.get(id) ?? {
      id,
      name: event?.building?.name ?? event?.area?.name ?? "Toàn campus",
      mapPosition: radarPositions[index],
      lostCount: 0,
      foundCount: 0,
      latestEventAt: alert.lastDetectedAt,
      summary: "Cụm LOST bất thường cần nhân viên xem xét"
    };
    if (filters.categoryId || alert.scope === "ALL_CATEGORIES") {
      existing.lostCount += alert.observedCount;
    } else if (!allCategoryZoneIds.has(id)) {
      existing.lostCount = Math.max(existing.lostCount, alert.observedCount);
    }
    if (new Date(alert.lastDetectedAt) > new Date(existing.latestEventAt ?? 0)) existing.latestEventAt = alert.lastDetectedAt;
    zoneBuckets.set(id, existing);
  });
  const zones = [...zoneBuckets.values()];
  const alerts: CampusRadarAlert[] = filteredAlerts.map((alert) => {
    const event = eventById.get(alert.eventId);
    return {
      id: alert.id,
      title: `${alert.observedCount} báo mất quanh ${event?.building?.name ?? event?.area?.name ?? "campus"}`,
      description: `${alert.category?.name ?? "Tất cả danh mục"}: cao hơn mức nền ${alert.observedRatio.toFixed(1)} lần. Đây là cảnh báo thống kê cần người phụ trách kiểm tra.`,
      severity: alert.severity === "CRITICAL" ? "URGENT" : alert.severity === "WARNING" ? "ATTENTION" : "INFO",
      createdAt: alert.lastDetectedAt,
      zoneId: event?.building?.id ?? event?.area?.id ?? "campus",
      acknowledged: alert.status !== "OPEN"
    };
  });

  function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate(() => api.adminCreateRadarEvent({
      eventType: formText(data, "eventType") as RadarEventType,
      sourceType: formText(data, "sourceType") as RadarSourceType,
      sourceReference: formText(data, "sourceReference"),
      areaId: formNullable(data, "areaId"),
      buildingId: formNullable(data, "buildingId"),
      startsAt: new Date(formText(data, "startsAt")).toISOString(),
      endsAt: new Date(formText(data, "endsAt")).toISOString()
    }));
  }

  const error = eventsQuery.error instanceof Error
    ? eventsQuery.error.message
    : alertsQuery.error instanceof Error
      ? alertsQuery.error.message
      : mutation.error instanceof Error ? mutation.error.message : null;

  return (
    <section className="admin-grid radar-operations">
      <div className="wide-panel">
        <CampusEventRadarPanel
          alerts={alerts}
          campusMapImageUrl="/fpt-campus-map.jpg"
          categories={props.categories}
          error={error}
          filters={filters}
          loading={eventsQuery.isLoading || alertsQuery.isLoading}
          selectedZoneId={selectedZoneId}
          zones={zones}
          onAcknowledgeAlert={(alert) => mutation.mutate(() => api.adminUpdateRadarAlert(alert.id, "ACKNOWLEDGED", "MONITORING"))}
          onOpenAlert={(alert) => setSelectedAlertId(alert.id)}
          onDismissAlert={(alert) => mutation.mutate(() => api.adminUpdateRadarAlert(alert.id, "DISMISSED", "FALSE_POSITIVE"))}
          onFiltersChange={setFilters}
          onRetry={() => {
            void eventsQuery.refetch();
            void alertsQuery.refetch();
          }}
          onSelectZone={(zone) => {
            setSelectedZoneId(zone.id);
            setFilters((current) => ({ ...current, zoneId: zone.id }));
          }}
        />
        {selectedAlertId && (
          <section className="radar-related-posts" aria-labelledby="radar-related-posts-title">
            <div className="panel-heading">
              <div><span className="eyebrow">Phạm vi cảnh báo</span><h3 id="radar-related-posts-title">Bài LOST liên quan</h3></div>
              <button className="secondary-button" type="button" onClick={() => setSelectedAlertId(null)}>Đóng</button>
            </div>
            {relatedPostsQuery.isLoading && <div className="notice">Đang tải bài liên quan...</div>}
            {relatedPostsQuery.error instanceof Error && <div className="notice error">{relatedPostsQuery.error.message}</div>}
            <div className="admin-list">
              {(relatedPostsQuery.data?.posts ?? []).map((post) => (
                <button className="admin-list-row" key={post.id} type="button" onClick={() => props.onSelectPost(post.id)}>
                  <div><strong>{post.title}</strong><span>{post.category?.name ?? "Chưa phân loại"}</span><small>{post.building?.name ?? post.area?.name ?? "Toàn campus"} · {formatDate(post.lostFoundAt)}</small></div>
                </button>
              ))}
              {!relatedPostsQuery.isLoading && (relatedPostsQuery.data?.posts.length ?? 0) === 0 && <div className="notice">Không còn bài công khai trong phạm vi cảnh báo này.</div>}
            </div>
          </section>
        )}
      </div>

      {props.isAdmin && (
        <form className="admin-panel admin-form" onSubmit={submitEvent}>
          <div className="panel-heading">
            <div><span className="eyebrow">Nguồn sự kiện</span><h2>Tạo mốc phân tích</h2></div>
            <Radar size={18} />
          </div>
          <label>Loại sự kiện
            <select name="eventType" defaultValue="ACADEMIC">
              <option value="ACADEMIC">Học tập/thi cử</option><option value="SPORTS">Thể thao</option>
              <option value="CULTURAL">Văn hóa/sự kiện</option><option value="CAMPUS_OPERATIONS">Vận hành campus</option>
              <option value="WEATHER">Thời tiết</option><option value="OTHER">Khác</option>
            </select>
          </label>
          <label>Nguồn xác thực
            <select name="sourceType" defaultValue="OFFICIAL_CALENDAR">
              <option value="OFFICIAL_CALENDAR">Lịch chính thức</option><option value="CAMPUS_NOTICE">Thông báo campus</option>
              <option value="SECURITY_LOG">Nhật ký an ninh</option><option value="WEATHER_BULLETIN">Bản tin thời tiết</option>
            </select>
          </label>
          <label>Mã/URL nguồn<input name="sourceReference" required minLength={3} maxLength={255} placeholder="calendar-final-exam-2026" /></label>
          <label>Khu vực
            <select name="areaId" value={eventAreaId} onChange={(event) => setEventAreaId(event.target.value)}><option value="">Toàn campus</option>{props.areas.filter((area) => area.isActive).map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
          </label>
          <label>Địa điểm cụ thể
            <select name="buildingId" defaultValue="" disabled={!eventAreaId}><option value="">Không giới hạn</option>{props.buildings.filter((building) => building.isActive && building.areaId === eventAreaId).map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select>
          </label>
          <div className="form-grid">
            <label>Bắt đầu<input name="startsAt" type="datetime-local" step={900} required defaultValue={radarDateTimeDefault(-2)} /></label>
            <label>Kết thúc<input name="endsAt" type="datetime-local" step={900} required defaultValue={radarDateTimeDefault(0)} /></label>
          </div>
          <button className="primary-button" disabled={mutation.isPending} type="submit">Tạo mốc radar</button>
        </form>
      )}

      <article className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Phân tích thủ công</span><h2>Mốc sự kiện gần đây</h2></div><span>{events.length}</span></div>
        <div className="admin-list">
          {events.slice(0, 12).map((event: RadarEvent) => (
            <div key={event.id} className="admin-list-row">
              <div><strong>{event.eventType}</strong><span>{event.building?.name ?? event.area?.name ?? "Toàn campus"}</span><small>{formatDate(event.startsAt)} - {event.source.type}</small></div>
              {props.isAdmin && event.status === "ACTIVE" && <button className="secondary-button" disabled={mutation.isPending} type="button" onClick={() => mutation.mutate(() => api.adminAnalyzeRadarEvent(event.id))}>Phân tích</button>}
            </div>
          ))}
          {!eventsQuery.isLoading && events.length === 0 && <div className="notice">Chưa có mốc sự kiện chính thức để phân tích.</div>}
        </div>
      </article>
      <div className="notice wide-panel">Radar chỉ phân tích số lượng LOST đã tổng hợp theo khu vực và thời gian. Hệ thống không theo dõi thiết bị, không suy luận cá nhân và không tự kết luận nguyên nhân.</div>
    </section>
  );
}

function AdminConfigPanel(props: {
  entries: AdminConfigEntry[];
  history: AdminConfigHistoryEntry[];
  pending: boolean;
  onRun: AdminActionRunner;
}) {
  const numericBounds: Record<string, { min: number; max: number; step: number }> = {
    "ai.radar.minimum_observed_count": { min: 3, max: 50, step: 1 },
    "ai.radar.minimum_z_score": { min: 1, max: 10, step: 0.1 },
    "ai.radar.minimum_observed_ratio": { min: 1.1, max: 10, step: 0.1 },
    "ai.visual_hunt.candidate_threshold": { min: 0, max: 1, step: 0.01 }
  };
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
    "ai.verification_questions_enabled",
    "ai.campus_radar_enabled",
    "ai.visual_hunt_enabled",
    "ai.radar.minimum_observed_count",
    "ai.radar.minimum_z_score",
    "ai.radar.minimum_observed_ratio",
    "ai.visual_hunt.candidate_threshold",
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
            <span className="eyebrow">Quy tắc hệ thống</span>
              <h2>Cấu hình vận hành</h2>
          </div>
          <Key size={18} />
        </div>
        <div className="admin-config-list">
          {sortedEntries.map((entry) => {
            const bounds = numericBounds[entry.key];
            return (
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
                  min={bounds?.min}
                  max={bounds?.max}
                  step={bounds?.step ?? (entry.valueType === "FLOAT" ? "0.01" : "1")}
                  defaultValue={entry.rawValue}
                />
              )}
              <button className="secondary-button" disabled={props.pending} type="submit">
                Lưu
              </button>
            </form>
            );
          })}
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
              <button
                className="secondary-button compact-button"
                disabled={props.pending || item.oldValue === null}
                type="button"
                onClick={() => props.onRun(() => api.adminRollbackConfigHistory(item.id))}
              >
                Rollback
              </button>
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
    props.posts.forEach((post) => buckets.set(post.category?.name ?? "Khác", (buckets.get(post.category?.name ?? "Khác") ?? 0) + 1));
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
            <h2>Tỷ lệ hoàn trả</h2>
          </div>
          <CheckCircle2 size={18} />
        </div>
        <div className="return-rate-meter" style={{ "--rate": `${successfulReturnRate}%` } as CSSProperties}>
          <strong>{successfulReturnRate}%</strong>
              <span>{resolvedCount}/{props.posts.length} bài đã resolved</span>
        </div>
      </article>

      <article className="admin-panel dashboard-chart-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Danh mục</span>
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
              <h2>Khu vực mật độ nhiều</h2>
          </div>
          <MapPin size={18} />
        </div>
        <DashboardRankList items={areaStats} />
      </article>

      <article className="admin-panel dashboard-chart-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Trust</span>
            <h2>Người dùng uy tín</h2>
          </div>
          <ShieldCheck size={18} />
        </div>
        <div className="trusted-user-list">
          {trustedUsers.map((user) => (
            <div key={user.id}>
              <strong>{user.fullName}</strong>
                <span>{user.reputationPoints} điểm - {user.reputationLevel}</span>
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

        <AdminListPanel title="Người dùng mới" icon={<Users size={18} />} items={props.users.map((user) => `${user.fullName} - ${user.roles.join("/") || user.status}`)} />
        <AdminListPanel title="Báo cáo mới" icon={<Flag size={18} />} items={props.reports.map((report) => `${report.status} - ${report.reason}`)} />
    </section>
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
              <h2>Cần xử lý?</h2>
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
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

  async function exportWarehouseCsv() {
    setExportError(null);
    setExporting(true);
    try {
      const blob = await api.adminDownloadWarehouseCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lost-found-warehouse-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Không thể xuất CSV kho.");
    } finally {
      setExporting(false);
    }
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
          <input name="finderContact" defaultValue={editing?.finder.contact ?? ""} placeholder="SDT/email/Zalo" />
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
          <div className="panel-heading-actions">
            <span>{props.warehouseItems.length}</span>
            <button className="secondary-button compact-button" disabled={exporting} type="button" onClick={() => void exportWarehouseCsv()}>
          {exporting ? "Đang xuất..." : "Xuất CSV"}
            </button>
          </div>
        </div>
        {exportError && <div className="notice error">{exportError}</div>}
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
  const [dispositionStatus, setDispositionStatus] = useState<"DISPOSED" | "DONATED" | "TRANSFERRED">("DONATED");

  function deleteItem() {
    const confirmed = window.confirm(`Xóa vật "${props.item.itemName}" khỏi danh sách nhà kho?`);
    if (confirmed) {
      props.onRun(() => api.adminDeleteWarehouseItem(props.item.id));
    }
  }

  function processDisposition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    props.onRun(() =>
      api.adminProcessWarehouseItem(props.item.id, {
        status: dispositionStatus,
        note: formText(data, "dispositionNote")
      })
    );
  }

  const selectableStatuses = warehouseStatuses.filter(
    (status) => !["DISPOSED", "DONATED", "TRANSFERRED"].includes(status) || status === props.item.status
  );

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
        {selectableStatuses.map((status) => (
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
      {props.item.status === "EXPIRED" && (
        <form className="warehouse-disposition-form" onSubmit={processDisposition}>
          <label>
            Phương án xử lý
            <select
              value={dispositionStatus}
              onChange={(event) => setDispositionStatus(event.target.value as typeof dispositionStatus)}
            >
              <option value="DONATED">Lập lô quyên góp</option>
              <option value="TRANSFERRED">Chuyển đơn vị phụ trách</option>
              <option value="DISPOSED">Lập biên bản thanh lý/hủy</option>
            </select>
          </label>
          <label>
            Nội dung biên bản
            <input name="dispositionNote" required minLength={2} maxLength={1000} placeholder="Mã biên bản, đơn vị nhận, lý do và người thực hiện" />
          </label>
          <button className="primary-button" disabled={props.pending} type="submit">Xác nhận xử lý</button>
        </form>
      )}
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
          <input name="studentCode" placeholder="Tùy chọn" />
          </label>
          <label>
            SĐT
          <input name="phoneNumber" placeholder="Tùy chọn" />
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
            <option value="WARN_USER">Cảnh báo người dùng</option>
            <option value="HIDE_POST">Ẩn bài viết</option>
            <option value="DELETE_POST">Xóa mềm bài viết</option>
            <option value="BAN_USER">Khóa người dùng</option>
            <option value="UNBAN_USER">Mở khóa người dùng</option>
      </select>
        <input name="note" placeholder="Ghi chú xử lý" />
          <button className="primary-button" disabled={props.pending} type="submit">Lưu xử lý</button>
    </form>
  );
}

function AdminReturnFeedbackPanel(props: {
  feedback: ReturnFeedback[];
  canReview: boolean;
  pending: boolean;
  onRun: AdminActionRunner;
}) {
  return (
    <section className="admin-panel wide-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Return feedback</span>
        <h2>Feedback sau bàn giao</h2>
        </div>
        <span>{props.feedback.length}</span>
      </div>
      <div className="admin-report-list">
        {props.feedback.map((item) => (
          <form
            className={`admin-report-row status-${item.status.toLowerCase()}`}
            key={item.id}
            onSubmit={(event) => {
              event.preventDefault();
              if (!props.canReview) {
                return;
              }
              const data = new FormData(event.currentTarget);
              props.onRun(() => api.adminReviewReturnFeedback(item.id, formText(data, "status") as ReturnFeedback["status"]));
            }}
          >
            <div className="admin-report-body">
              <span className={`status-pill report-${item.status.toLowerCase()}`}>{item.status}</span>
              <strong>
              {item.rating}/5 - {item.targetUser.fullName ?? item.targetUser.email ?? "Người dùng"}
              </strong>
          <p>{item.comment ?? "Không có ghi chú thêm."}</p>
              <small>
          {item.postTitle ?? item.postId} - Người đánh giá: {item.reviewer.fullName ?? item.reviewer.email ?? "Không rõ"} -{" "}
                {formatDate(item.createdAt)}
              </small>
            </div>
            {props.canReview ? (
              <>
                <select name="status" defaultValue={item.status === "NEW" ? "REVIEWED" : item.status}>
            <option value="REVIEWED">Đã xem</option>
            <option value="FLAGGED">Gắn cờ user</option>
            <option value="DISMISSED">Bỏ qua</option>
                </select>
                <button className="primary-button" disabled={props.pending} type="submit">
          Lưu xử lý
                </button>
              </>
            ) : (
              <span className="status-pill">Staff view</span>
            )}
          </form>
        ))}
        {props.feedback.length === 0 && <div className="notice">Chưa có feedback sau bàn giao.</div>}
      </div>
    </section>
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
