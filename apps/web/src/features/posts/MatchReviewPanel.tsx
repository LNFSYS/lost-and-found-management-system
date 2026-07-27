import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Info, ShieldCheck } from "lucide-react";
import {
  api,
  type MatchFeedbackLabel,
  type MatchResult
} from "../../services/api";
import "./match-review.css";

const feedbackOptions: Array<{ value: MatchFeedbackLabel; label: string }> = [
  { value: "TRUE_MATCH", label: "Khớp đúng" },
  { value: "FALSE_MATCH", label: "Không khớp" },
  { value: "UNCERTAIN", label: "Chưa chắc chắn" },
  { value: "DUPLICATE", label: "Bài đăng trùng" },
  { value: "INSUFFICIENT_EVIDENCE", label: "Chưa đủ bằng chứng" }
];

function scoreTier(score: number) {
  if (score >= 0.85) return { label: "Tin cậy cao", className: "high" };
  if (score >= 0.75) return { label: "Nên kiểm tra", className: "review" };
  if (score >= 0.6) return { label: "Gợi ý", className: "suggestion" };
  return { label: "Tín hiệu yếu", className: "weak" };
}

function percent(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function MatchReviewPanel(props: {
  postId: string;
  matches: MatchResult[];
}) {
  const [labels, setLabels] = useState<Record<string, MatchFeedbackLabel>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null);

  const explanationQuery = useQuery({
    queryKey: ["match-explanations", props.postId],
    queryFn: () => api.getMatchExplanations(props.postId),
    enabled: props.matches.length > 0,
    retry: false
  });
  const feedbackMutation = useMutation({
    mutationFn: (input: { matchId: string; label: MatchFeedbackLabel; note?: string | null }) =>
      api.recordMatchFeedback(props.postId, input.matchId, {
        label: input.label,
        note: input.note
      }),
    onSuccess: (_result, input) => {
      setSavedMatchId(input.matchId);
    }
  });

  if (props.matches.length === 0) {
    return null;
  }

  const explanations = new Map(
    (explanationQuery.data?.explanations ?? []).map((item) => [item.matchId, item])
  );

  return (
    <section className="match-review-panel" aria-labelledby="match-review-heading">
      <header>
        <div>
          <p className="match-review-eyebrow">Matching hỗ trợ</p>
          <h3 id="match-review-heading">Đánh giá kết quả tương đồng</h3>
        </div>
        <ShieldCheck aria-hidden="true" size={22} />
      </header>
      <p className="match-review-disclaimer">
        Điểm số chỉ hỗ trợ sàng lọc. Hệ thống không tự xác nhận quyền sở hữu hoặc tự bàn giao vật phẩm.
      </p>

      <div className="match-review-list">
        {props.matches.map((match) => {
          const tier = scoreTier(match.totalScore);
          const explanation = explanations.get(match.id);
          const label = labels[match.id] ?? "UNCERTAIN";
          const isSaving = feedbackMutation.isPending && feedbackMutation.variables?.matchId === match.id;
          const isSaved = savedMatchId === match.id;

          return (
            <article className="match-review-item" key={match.id}>
              <div className="match-review-summary">
                <div>
                  <strong>Kết quả tương đồng {percent(match.totalScore)}</strong>
                  <span className={`match-tier ${tier.className}`}>{tier.label}</span>
                </div>
                <small>
                  Nội dung {percent(match.textScore)} · Danh mục {percent(match.categoryScore)} ·
                  Vị trí {percent(match.locationScore)} · Thời gian {percent(match.timeScore)}
                </small>
              </div>

              {explanation && (
                <div className="match-review-explanation">
                  <Info aria-hidden="true" size={16} />
                  <div>
                    <strong>{explanation.summary}</strong>
                    {explanation.reasons.length > 0 && (
                      <ul>
                        {explanation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div className="match-review-controls">
                <label>
                  Kết luận review
                  <select
                    value={label}
                    onChange={(event) => {
                      setSavedMatchId(null);
                      setLabels((current) => ({
                        ...current,
                        [match.id]: event.target.value as MatchFeedbackLabel
                      }));
                    }}
                  >
                    {feedbackOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Ghi chú
                  <input
                    value={notes[match.id] ?? ""}
                    placeholder="Lý do ngắn gọn (không bắt buộc)"
                    onChange={(event) => {
                      setSavedMatchId(null);
                      setNotes((current) => ({ ...current, [match.id]: event.target.value }));
                    }}
                  />
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => feedbackMutation.mutate({
                    matchId: match.id,
                    label,
                    note: notes[match.id]?.trim() || null
                  })}
                >
                  {isSaved ? <CheckCircle2 aria-hidden="true" size={16} /> : null}
                  {isSaving ? "Đang lưu..." : isSaved ? "Đã lưu" : "Lưu đánh giá"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {explanationQuery.isError && (
        <p className="match-review-message error">Không tải được phần giải thích chi tiết.</p>
      )}
      {feedbackMutation.isError && (
        <p className="match-review-message error">{feedbackMutation.error.message}</p>
      )}
    </section>
  );
}
