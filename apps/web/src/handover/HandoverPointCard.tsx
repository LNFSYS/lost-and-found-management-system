import { Boxes, Clock, Edit3, Eye, MapPin, Navigation, Power, Trash2, UserCircle } from "lucide-react";
import type { HandoverPointView } from "./types";

export function HandoverPointCard(props: {
  point: HandoverPointView;
  selected: boolean;
  canManage: boolean;
  onSelect: (point: HandoverPointView) => void;
  onDirections: (point: HandoverPointView) => void;
}) {
  return (
    <article className={`handover-point-card ${props.selected ? "selected" : ""}`}>
      <button className="handover-card-main" type="button" onClick={() => props.onSelect(props.point)}>
        <div className="handover-card-topline">
          <span className={`handover-status-badge ${props.point.status}`}>
            {props.point.status === "active" ? "Đang hoạt động" : "Tạm đóng"}
          </span>
          <span className="handover-item-count"><Boxes size={14} /> {props.point.storedItems}</span>
        </div>
        <h3>{props.point.name}</h3>
        <p>{props.point.description}</p>
        <div className="handover-card-meta">
          <span><MapPin size={15} /> {props.point.area} · {props.point.address}</span>
          <span><Clock size={15} /> {props.point.openingHours ?? "Chưa cấu hình giờ"}</span>
          <span><UserCircle size={15} /> {props.point.owner}</span>
        </div>
      </button>
      <div className="handover-card-actions">
        <button className="secondary-button" type="button" onClick={() => props.onSelect(props.point)}>
          <Eye size={16} /> Xem chi tiết
        </button>
        <button className="primary-button" type="button" onClick={() => props.onDirections(props.point)}>
          <Navigation size={16} /> Xem vị trí
        </button>
      </div>
      {props.canManage && (
        <div className="handover-admin-actions" aria-label="Thao tác quản trị điểm bàn giao">
          <button type="button"><Edit3 size={15} /> Sửa</button>
          <button type="button"><Power size={15} /> {props.point.status === "active" ? "Tạm đóng" : "Mở lại"}</button>
          <button type="button" className="danger"><Trash2 size={15} /> Xóa mềm</button>
        </div>
      )}
    </article>
  );
}
