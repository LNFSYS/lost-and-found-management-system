import { Boxes, Clock, MapPin, Navigation, UserCircle } from "lucide-react";
import type { HandoverPointView } from "./types";

export function HandoverPointPopup(props: {
  point: HandoverPointView;
  compact?: boolean;
  hideAction?: boolean;
  onDirections: () => void;
}) {
  return (
    <article className={props.compact ? "handover-popup compact" : "handover-popup"}>
      <div className="handover-popup-heading">
        <span className={`handover-status-badge ${props.point.status}`}>
          {props.point.status === "active" ? "Đang hoạt động" : "Tạm đóng"}
        </span>
        <strong>{props.point.name}</strong>
        <small>{props.point.area}</small>
      </div>
      <p>{props.point.description}</p>
      <div className="handover-popup-meta">
        <span><MapPin size={15} /> {props.point.address}</span>
        <span><Clock size={15} /> {props.point.openingHours ?? "Chưa cấu hình"}</span>
        <span><UserCircle size={15} /> {props.point.owner}</span>
        <span><Boxes size={15} /> {props.point.storedItems} đồ đang lưu giữ</span>
      </div>
      {!props.hideAction && (
        <button className="secondary-button" type="button" onClick={props.onDirections}>
          <Navigation size={16} /> Chỉ đường trong campus
        </button>
      )}
    </article>
  );
}
