import { Check, Circle, Clock3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

export function RecoveryTimelinePanel(props: { postId: string; enabled: boolean }) {
  const timelineQuery = useQuery({
    queryKey: ["recovery-timeline", props.postId],
    queryFn: () => api.recoveryTimeline(props.postId),
    enabled: props.enabled,
    retry: false,
    refetchInterval: 30_000
  });
  if (!props.enabled) return null;
  return (
    <section className="recovery-timeline" aria-labelledby="recovery-timeline-title">
      <div className="feature-heading"><div><Clock3 size={19} /><div><strong id="recovery-timeline-title">Hành trình tìm lại đồ</strong><small>Cập nhật từ hồ sơ nghiệp vụ</small></div></div><span>{timelineQuery.data?.currentState ?? "..."}</span></div>
      {timelineQuery.isLoading && <><div className="skeleton-line" /><div className="skeleton-line short" /></>}
      {timelineQuery.error instanceof Error && <div className="notice error">{timelineQuery.error.message}</div>}
      {timelineQuery.data && (
        <>
          <ol>
            {timelineQuery.data.events.map((event, index) => (
              <li key={event.id}>
                <div className="timeline-marker">{index === timelineQuery.data!.events.length - 1 ? <Check size={14} /> : <Circle size={10} />}</div>
                <div><strong>{event.title}</strong><p>{event.message}</p><small>{new Date(event.createdAt).toLocaleString("vi-VN")} · {event.actor === "YOU" ? "Bạn" : event.actor === "SYSTEM" ? "Hệ thống" : "Bên liên quan"}</small></div>
              </li>
            ))}
          </ol>
          {timelineQuery.data.nextAction && <div className="timeline-next"><strong>Bước tiếp theo</strong><span>{timelineQuery.data.nextAction}</span></div>}
        </>
      )}
    </section>
  );
}
