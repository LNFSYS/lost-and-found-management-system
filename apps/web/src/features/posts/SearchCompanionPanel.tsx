import { RotateCcw, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SearchCompanionField } from "../../services/api";

export function SearchCompanionPanel(props: { postId: string; enabled: boolean }) {
  const queryClient = useQueryClient();
  const [answer, setAnswer] = useState("");
  const stateQuery = useQuery({
    queryKey: ["search-companion", props.postId],
    queryFn: () => api.searchCompanion(props.postId),
    enabled: props.enabled,
    retry: false
  });
  const saveMutation = useMutation({
    mutationFn: (input: { field: SearchCompanionField; value: string | string[] }) => api.answerSearchCompanion(props.postId, input),
    onSuccess: (state) => { queryClient.setQueryData(["search-companion", props.postId], state); setAnswer(""); }
  });
  const skipMutation = useMutation({
    mutationFn: (field: SearchCompanionField) => api.skipSearchCompanion(props.postId, field),
    onSuccess: (state) => { queryClient.setQueryData(["search-companion", props.postId], state); setAnswer(""); }
  });
  const undoMutation = useMutation({
    mutationFn: () => api.undoSearchCompanion(props.postId),
    onSuccess: (state) => queryClient.setQueryData(["search-companion", props.postId], state)
  });
  const previewMutation = useMutation({ mutationFn: () => api.recalculateSearchCompanion(props.postId) });
  const applyMutation = useMutation({
    mutationFn: () => api.applySearchCompanion(props.postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", props.postId] });
      await queryClient.invalidateQueries({ queryKey: ["search-companion", props.postId] });
    }
  });
  const next = stateQuery.data?.nextQuestion;
  useEffect(() => setAnswer(""), [next?.field]);
  if (!props.enabled) return null;

  const pending = saveMutation.isPending || skipMutation.isPending || undoMutation.isPending;
  const error = stateQuery.error ?? saveMutation.error ?? skipMutation.error ?? undoMutation.error ?? previewMutation.error ?? applyMutation.error;
  return (
    <section className="search-companion" aria-labelledby="search-companion-title">
      <div className="feature-heading">
        <div><Sparkles size={19} /><div><strong id="search-companion-title">AI Search Companion</strong><small>Hồ sơ riêng tư hỗ trợ tìm ứng viên phù hợp hơn</small></div></div>
        <span>{stateQuery.data?.completionPercent ?? 0}%</span>
      </div>
      <div className="companion-progress"><span style={{ width: `${stateQuery.data?.completionPercent ?? 0}%` }} /></div>
      {stateQuery.isLoading && <div className="skeleton-line" />}
      {next ? (
        <div className="companion-question">
          <div><strong>{next.prompt}</strong>{next.sensitive && <span title="Chỉ bạn và người review được xem"><ShieldCheck size={15} /> Riêng tư</span>}</div>
          <small>{next.help}</small>
          <input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={next.field === "routeAreas" ? "Alpha, thư viện, Beta" : "Nhập câu trả lời"} />
          <div className="companion-actions">
            <button className="primary-button" disabled={!answer.trim() || pending} type="button" onClick={() => saveMutation.mutate({ field: next.field, value: next.field === "routeAreas" ? answer.split(",").map((item) => item.trim()).filter(Boolean) : answer })}>Lưu và tiếp tục</button>
            <button className="secondary-button" disabled={pending} type="button" onClick={() => skipMutation.mutate(next.field)}>Bỏ qua</button>
            <button className="icon-button" disabled={pending || Object.keys(stateQuery.data?.profile.answers ?? {}).length === 0} title="Hoàn tác câu trả lời gần nhất" type="button" onClick={() => undoMutation.mutate()}><RotateCcw size={17} /></button>
          </div>
        </div>
      ) : stateQuery.data && <div className="notice success">Hồ sơ tìm kiếm đã đủ các bước. Bạn vẫn có thể hoàn tác câu trả lời gần nhất.</div>}

      <div className="companion-footer-actions">
        <button className="secondary-button" disabled={previewMutation.isPending || (stateQuery.data?.profile.revision ?? 0) === 0} type="button" onClick={() => previewMutation.mutate()}><TrendingUp size={16} /> {previewMutation.isPending ? "Đang tính lại..." : "Xem điểm mới"}</button>
        <button className="secondary-button" disabled={applyMutation.isPending || (stateQuery.data?.profile.revision ?? 0) <= (stateQuery.data?.profile.appliedRevision ?? 0)} type="button" onClick={() => applyMutation.mutate()}>{applyMutation.isPending ? "Đang áp dụng..." : "Áp dụng trường an toàn vào bài"}</button>
      </div>
      {error instanceof Error && <div className="notice error">{error.message}</div>}
      {previewMutation.data && (
        <div className="companion-preview">
          <small>{previewMutation.data.advisory}</small>
          {previewMutation.data.candidates.length === 0 && <div className="empty-inline">Chưa có ứng viên vượt ngưỡng matching.</div>}
          {previewMutation.data.candidates.slice(0, 5).map((item) => (
            <article key={item.candidateId}>
              <div><strong>{item.candidate.title}</strong><small>{item.candidate.category?.name ?? "Chưa phân loại"}</small></div>
              <span>{Math.round(item.beforeScore * 100)}% <b>→ {Math.round(item.afterScore * 100)}%</b></span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
