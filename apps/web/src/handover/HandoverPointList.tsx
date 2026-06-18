import { MapPin } from "lucide-react";
import { HandoverPointCard } from "./HandoverPointCard";
import type { HandoverPointView } from "./types";

export function HandoverPointList(props: {
  points: HandoverPointView[];
  selectedId: string | null;
  loading: boolean;
  canManage: boolean;
  onSelect: (point: HandoverPointView) => void;
  onDirections: (point: HandoverPointView) => void;
}) {
  if (props.loading) {
    return (
      <div className="handover-list">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="handover-skeleton-card" key={index}>
            <span />
            <strong />
            <p />
            <p />
          </div>
        ))}
      </div>
    );
  }

  if (props.points.length === 0) {
    return (
      <div className="empty-state handover-empty">
        <MapPin size={30} />
        <strong>Chưa có điểm bàn giao phù hợp</strong>
        <span>Thử đổi từ khóa, khu vực hoặc trạng thái để xem thêm địa điểm.</span>
      </div>
    );
  }

  return (
    <section className="handover-list" aria-label="Danh sách điểm bàn giao">
      {props.points.map((point) => (
        <HandoverPointCard
          key={point.id}
          point={point}
          selected={point.id === props.selectedId}
          canManage={props.canManage}
          onSelect={props.onSelect}
          onDirections={props.onDirections}
        />
      ))}
    </section>
  );
}
