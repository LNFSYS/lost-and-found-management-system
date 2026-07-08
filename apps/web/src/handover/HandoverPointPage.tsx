import { Route, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { HandoverPoint } from "../services/api";
import { CampusImageMap } from "./CampusImageMap";
import { buildHandoverPoints } from "./handover-data";
import { HandoverPointFilter } from "./HandoverPointFilter";
import { HandoverPointList } from "./HandoverPointList";
import { HandoverPointPopup } from "./HandoverPointPopup";
import type { HandoverFilters, HandoverPointView } from "./types";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function HandoverPointPage(props: {
  handoverPoints: HandoverPoint[];
  loading: boolean;
  error: unknown;
  canManage: boolean;
}) {
  const [filters, setFilters] = useState<HandoverFilters>({ query: "", area: "all", status: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routePoint, setRoutePoint] = useState<HandoverPointView | null>(null);
  const [mapFocusToken, setMapFocusToken] = useState(0);
  const points = useMemo(() => buildHandoverPoints(props.handoverPoints), [props.handoverPoints]);
  const filteredPoints = useMemo(() => {
    const query = normalizeText(filters.query.trim());
    return points.filter((point) => {
      const matchesQuery = !query || normalizeText(`${point.name} ${point.area} ${point.address}`).includes(query);
      const matchesArea = filters.area === "all" || point.area === filters.area;
      const matchesStatus = filters.status === "all" || point.status === filters.status;
      return matchesQuery && matchesArea && matchesStatus;
    });
  }, [filters, points]);
  const selectedPoint = useMemo(() => {
    return filteredPoints.find((point) => point.id === selectedId) ?? filteredPoints[0] ?? null;
  }, [filteredPoints, selectedId]);

  function selectPoint(point: HandoverPointView) {
    setSelectedId(point.id);
    setMapFocusToken((value) => value + 1);
  }

  function showDirections(point: HandoverPointView) {
    setSelectedId(point.id);
    setRoutePoint(point);
  }

  return (
    <div className="handover-page">
      <section className="handover-hero">
        <div>
          <span className="eyebrow">Campus operations</span>
          <h2>Điểm bàn giao</h2>
          <p>
            Xem nhanh các quầy tiếp nhận và lưu giữ đồ thất lạc trong FPT University Đà Nẵng.
            Chọn một điểm trên danh sách hoặc trực tiếp trên bản đồ campus để xem hướng dẫn.
          </p>
        </div>
        <div className="handover-hero-stats">
          <span><strong>{points.filter((point) => point.status === "active").length}</strong> đang hoạt động</span>
          <span><strong>{points.reduce((sum, point) => sum + point.storedItems, 0)}</strong> đồ đang lưu</span>
          <span><strong>{new Set(points.map((point) => point.area)).size}</strong> khu vực</span>
        </div>
      </section>

      {props.canManage && (
        <section className="handover-admin-banner">
          <span><ShieldCheck size={18} /> Chế độ Admin/Staff</span>
          <p>Quản lý tạo, sửa, tạm đóng và xóa mềm điểm bàn giao trong trang quản trị để tránh thao tác nhầm trên bản đồ công khai.</p>
        </section>
      )}

      {props.error instanceof Error && (
        <div className="notice error">
          Chưa kết nối được API điểm bàn giao. Trang đang hiển thị dữ liệu mẫu để bạn vẫn có thể xem bản đồ campus.
        </div>
      )}

      <HandoverPointFilter filters={filters} total={filteredPoints.length} onChange={setFilters} />

      <section className="handover-workbench">
        <div className="handover-list-panel">
          <HandoverPointList
            points={filteredPoints}
            selectedId={selectedPoint?.id ?? null}
            loading={props.loading}
            canManage={props.canManage}
            onSelect={selectPoint}
            onDirections={showDirections}
          />
        </div>
        <div className="handover-map-panel">
          <CampusImageMap points={filteredPoints} selectedPoint={selectedPoint} focusToken={mapFocusToken} onSelect={selectPoint} />
          {selectedPoint && (
            <HandoverPointPopup point={selectedPoint} onDirections={() => showDirections(selectedPoint)} />
          )}
          {routePoint && (
            <div className="handover-route-note">
              <Route size={18} />
              <div>
                <strong>Chỉ đường tới {routePoint.name}</strong>
                <span>{routePoint.routeHint}</span>
              </div>
              <button type="button" onClick={() => setRoutePoint(null)}>Đóng</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
