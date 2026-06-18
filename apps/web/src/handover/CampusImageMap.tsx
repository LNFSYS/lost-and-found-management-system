import { MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HandoverPointPopup } from "./HandoverPointPopup";
import type { HandoverPointView } from "./types";

const CAMPUS_MAP_SOURCES = [
  "/fpt-campus-map.jpg",
  "/fpt-campus-map.jpeg",
  "/fpt-campus-map.png",
  "/fpt-campus-map.webp",
  "/campus-map.jpg",
  "/campus-map.png"
];

export function CampusImageMap(props: {
  points: HandoverPointView[];
  selectedPoint: HandoverPointView | null;
  focusToken: number;
  onSelect: (point: HandoverPointView) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const configuredImage = props.selectedPoint?.mapImageUrl ?? props.points.find((point) => point.mapImageUrl)?.mapImageUrl;
  const imageSrc = configuredImage || CAMPUS_MAP_SOURCES[imageIndex];
  const imageFailed = !imageSrc;
  const popupPoint = useMemo(() => {
    return props.points.find((point) => point.id === hoveredId) ?? null;
  }, [hoveredId, props.points]);

  useEffect(() => {
    if (!props.selectedPoint || props.focusToken === 0) return;
    hostRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [props.focusToken, props.selectedPoint]);

  return (
    <section className="campus-map-shell" aria-label="Bản đồ campus FPTU Đà Nẵng">
      <div className="campus-map-toolbar">
        <div>
          <strong>Bản đồ campus</strong>
          <span>Click marker để xem điểm bàn giao gần khu vực đó</span>
        </div>
        <span className="campus-map-live">{props.selectedPoint?.area ?? "FPTU Đà Nẵng"}</span>
      </div>
      <div className="campus-image-map" ref={hostRef}>
        {!imageFailed ? (
          <img
            src={imageSrc}
            alt="Bản đồ khuôn viên FPT University Đà Nẵng"
            onError={() => setImageIndex((value) => value + 1)}
          />
        ) : (
          <div className="campus-map-missing">
            <MapPin size={30} />
            <strong>Chưa có ảnh bản đồ campus</strong>
            <span>
              Lưu ảnh vào apps/web/public với tên fpt-campus-map.jpg, fpt-campus-map.png
              hoặc campus-map.jpg rồi refresh trang.
            </span>
          </div>
        )}

        {props.points.map((point) => (
          <button
            className={`campus-map-marker ${point.id === props.selectedPoint?.id ? "selected" : ""} ${point.status}`}
            key={point.id}
            style={{ left: `${point.mapPosition.x}%`, top: `${point.mapPosition.y}%` }}
            type="button"
            onClick={() => props.onSelect(point)}
            onFocus={() => setHoveredId(point.id)}
            onBlur={() => setHoveredId((current) => (current === point.id ? null : current))}
            onPointerEnter={() => setHoveredId(point.id)}
            onPointerLeave={() => setHoveredId((current) => (current === point.id ? null : current))}
            aria-label={`Xem ${point.name}`}
          >
            <MapPin size={20} />
            <span>{point.storedItems}</span>
          </button>
        ))}

        {popupPoint && (
          <div
            className="campus-map-popup"
            style={{
              left: `${popupPoint.mapPosition.x}%`,
              top: `${popupPoint.mapPosition.y}%`
            }}
          >
            <HandoverPointPopup point={popupPoint} compact hideAction onDirections={() => props.onSelect(popupPoint)} />
          </div>
        )}
      </div>
    </section>
  );
}
