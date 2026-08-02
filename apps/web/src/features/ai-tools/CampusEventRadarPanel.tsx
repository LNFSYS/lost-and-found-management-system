import { BellRing, CheckCircle2, Clock3, MapPin, MapPinned, SlidersHorizontal, X } from "lucide-react";
import { useId } from "react";
import "./ai-tools.css";

export type CampusRadarEventType = "LOST";
export type CampusRadarPeriod = "24H" | "7D" | "30D";
export type CampusRadarAlertSeverity = "INFO" | "ATTENTION" | "URGENT";

export interface CampusRadarFilters {
  type: CampusRadarEventType;
  period: CampusRadarPeriod;
  categoryId?: string;
  zoneId?: string;
}

export interface CampusRadarCategory {
  id: string;
  name: string;
}

export interface CampusRadarZone {
  id: string;
  name: string;
  mapPosition: { x: number; y: number };
  lostCount: number;
  foundCount: number;
  latestEventAt?: string | null;
  summary?: string;
}

export interface CampusRadarAlert {
  id: string;
  title: string;
  description: string;
  severity: CampusRadarAlertSeverity;
  createdAt: string;
  zoneId?: string | null;
  acknowledged?: boolean;
}

export interface CampusEventRadarPanelProps {
  filters: CampusRadarFilters;
  zones: readonly CampusRadarZone[];
  alerts?: readonly CampusRadarAlert[];
  categories?: readonly CampusRadarCategory[];
  selectedZoneId?: string | null;
  campusMapImageUrl?: string | null;
  loading?: boolean;
  error?: string | null;
  onFiltersChange: (filters: CampusRadarFilters) => void;
  onSelectZone: (zone: CampusRadarZone) => void;
  onOpenZone?: (zone: CampusRadarZone) => void;
  onAcknowledgeAlert?: (alert: CampusRadarAlert) => void;
  onOpenAlert?: (alert: CampusRadarAlert) => void;
  onDismissAlert?: (alert: CampusRadarAlert) => void;
  onRetry?: () => void;
}

const periodLabels: Record<CampusRadarPeriod, string> = {
  "24H": "24 giờ qua",
  "7D": "7 ngày qua",
  "30D": "30 ngày qua"
};

function eventCount(zone: CampusRadarZone, type: CampusRadarEventType) {
  void type;
  return zone.lostCount;
}

function formatRadarTime(value: string | null | undefined) {
  if (!value) return "Chưa có thời gian mới nhất";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian mới nhất";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function CampusEventRadarPanel(props: CampusEventRadarPanelProps) {
  const titleId = useId();
  const selectedZone = props.zones.find((zone) => zone.id === props.selectedZoneId) ?? null;
  const sortedZones = [...props.zones].sort((left, right) => eventCount(right, props.filters.type) - eventCount(left, props.filters.type));
  const totalEvents = props.zones.reduce((total, zone) => total + eventCount(zone, props.filters.type), 0);

  function updateFilter<Key extends keyof CampusRadarFilters>(key: Key, value: CampusRadarFilters[Key]) {
    props.onFiltersChange({ ...props.filters, [key]: value });
  }

  return (
    <section className="ai-tool campus-radar-panel" aria-labelledby={titleId}>
      <header className="ai-tool-heading radar-heading">
        <div className="ai-tool-heading-icon radar" aria-hidden="true">
          <MapPinned size={22} />
        </div>
        <div>
          <span className="ai-tool-eyebrow">Tín hiệu trong campus</span>
          <h2 id={titleId}>Radar sự kiện thất lạc</h2>
          <p>Dữ liệu được tổng hợp theo khu vực; bản đồ không theo dõi vị trí thiết bị hoặc hiển thị thông tin người đăng.</p>
        </div>
        <div className="radar-total" aria-label={`${totalEvents} sự kiện trong ${periodLabels[props.filters.period]}`}>
          <strong>{totalEvents}</strong>
          <span>{periodLabels[props.filters.period]}</span>
        </div>
      </header>

      <div className="radar-filter-bar" aria-label="Bộ lọc radar">
        <span className="radar-filter-label"><SlidersHorizontal size={16} aria-hidden="true" /> Bộ lọc</span>
        <span className="status-pill">Chỉ báo LOST</span>
        <label>
          <span>Thời gian</span>
          <select value={props.filters.period} onChange={(event) => updateFilter("period", event.target.value as CampusRadarPeriod)}>
            {Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Danh mục</span>
          <select value={props.filters.categoryId ?? ""} onChange={(event) => updateFilter("categoryId", event.target.value || undefined)}>
            <option value="">Tất cả danh mục</option>
            {(props.categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>

      {props.error && (
        <div className="ai-tool-notice error radar-error" role="alert">
          <span>{props.error}</span>
          {props.onRetry && <button className="ai-tool-button secondary" type="button" onClick={props.onRetry}>Thử lại</button>}
        </div>
      )}

      <div className="radar-layout">
        <div className={`radar-map ${props.loading ? "loading" : ""}`} aria-label="Bản đồ tổng hợp sự kiện theo khu vực">
          {props.campusMapImageUrl ? <img src={props.campusMapImageUrl} alt="Bản đồ khuôn viên FPT University Đà Nẵng" /> : <div className="radar-map-grid" aria-hidden="true" />}
          {props.zones.map((zone) => {
            const count = eventCount(zone, props.filters.type);
            return (
              <button
                className={`radar-marker ${zone.id === props.selectedZoneId ? "selected" : ""} ${count === 0 ? "empty" : ""}`}
                key={zone.id}
                type="button"
                style={{ left: `${zone.mapPosition.x}%`, top: `${zone.mapPosition.y}%` }}
                aria-pressed={zone.id === props.selectedZoneId}
                aria-label={`${zone.name}: ${count} sự kiện, ${zone.lostCount} mất, ${zone.foundCount} nhặt được`}
                onClick={() => props.onSelectZone(zone)}
              >
                <MapPin size={18} aria-hidden="true" />
                <span>{count}</span>
              </button>
            );
          })}
          {props.loading && <div className="radar-loading" role="status">Đang cập nhật radar...</div>}
          {!props.loading && props.zones.length === 0 && (
            <div className="radar-map-empty" role="status">
              <MapPin size={24} aria-hidden="true" />
              <strong>Chưa có khu vực để hiển thị</strong>
              <span>Thử đổi bộ lọc hoặc kiểm tra dữ liệu tọa độ campus.</span>
            </div>
          )}
        </div>

        <div className="radar-zone-panel">
          <div className="radar-zone-panel-heading">
            <div>
              <span className="ai-tool-eyebrow">Danh sách thay thế bản đồ</span>
              <h3>{selectedZone ? selectedZone.name : "Các điểm nổi bật"}</h3>
            </div>
            {selectedZone && <button className="ai-tool-button secondary compact" type="button" onClick={() => props.onOpenZone?.(selectedZone)}>Xem bài đăng</button>}
          </div>

          <ul className="radar-zone-list" aria-live="polite">
            {sortedZones.map((zone) => (
              <li key={zone.id}>
                <button
                  className={`radar-zone-row ${zone.id === props.selectedZoneId ? "selected" : ""}`}
                  type="button"
                  onClick={() => props.onSelectZone(zone)}
                >
                  <span className="radar-zone-rank" aria-hidden="true">{eventCount(zone, props.filters.type)}</span>
                  <span className="radar-zone-copy">
                    <strong>{zone.name}</strong>
                    <small>{zone.summary || formatRadarTime(zone.latestEventAt)}</small>
                  </span>
                  <span className="radar-zone-split"><small className="lost">{zone.lostCount} báo mất</small></span>
                </button>
              </li>
            ))}
            {!props.loading && sortedZones.length === 0 && <li className="ai-tool-empty">Không có sự kiện phù hợp bộ lọc hiện tại.</li>}
          </ul>
        </div>
      </div>

      {(props.alerts?.length ?? 0) > 0 && (
        <div className="radar-alert-section" aria-labelledby={`${titleId}-alerts`}>
          <div className="radar-alert-heading">
            <BellRing size={18} aria-hidden="true" />
            <div>
              <h3 id={`${titleId}-alerts`}>Cảnh báo cần chú ý</h3>
              <span>Các tín hiệu vận hành do hệ thống hoặc nhân viên tạo.</span>
            </div>
          </div>
          <div className="radar-alert-list">
            {(props.alerts ?? []).map((alert) => (
              <article className={`radar-alert severity-${alert.severity.toLowerCase()} ${alert.acknowledged ? "acknowledged" : ""}`} key={alert.id}>
                <div className="radar-alert-copy">
                  <span className="radar-alert-severity">{alert.severity === "URGENT" ? "Khẩn" : alert.severity === "ATTENTION" ? "Chú ý" : "Thông tin"}</span>
                  <strong>{alert.title}</strong>
                  <p>{alert.description}</p>
                  <small><Clock3 size={13} aria-hidden="true" /> {formatRadarTime(alert.createdAt)}</small>
                </div>
                <div className="radar-alert-actions">
                  {props.onOpenAlert && (
                    <button className="ai-tool-button secondary compact" type="button" onClick={() => props.onOpenAlert?.(alert)}>
                      Xem bài liên quan
                    </button>
                  )}
                  {!alert.acknowledged && props.onAcknowledgeAlert && (
                    <button className="ai-tool-button secondary compact" type="button" onClick={() => props.onAcknowledgeAlert?.(alert)}>
                      <CheckCircle2 size={15} aria-hidden="true" /> Đã xem
                    </button>
                  )}
                  {props.onDismissAlert && (
                    <button className="ai-tool-icon-button" type="button" aria-label={`Ẩn cảnh báo: ${alert.title}`} onClick={() => props.onDismissAlert?.(alert)}>
                      <X size={17} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
