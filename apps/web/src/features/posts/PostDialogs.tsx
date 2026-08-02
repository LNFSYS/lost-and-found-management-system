import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Camera } from "lucide-react";
import { acceptAttribute, formatDate, locationText, toDateTimeIso, validateImageFiles } from "../../app/helpers";
import type { ImageUploadRules } from "../../app/types";
import { api, type BoardPost, type PostMatchSuggestion } from "../../services/api";

export function MatchSuggestionsDialog(props: {
  suggestions: PostMatchSuggestion[];
  onClose: () => void;
  onSelect: (postId: string) => void;
}) {
  return (
    <div className="drawer-backdrop" onClick={props.onClose}>
      <section className="dialog match-suggestions-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Matching tự động</span>
            <h2>Có vật nhặt được giống bài của bạn</h2>
          </div>
          <Bell size={18} />
        </div>
        <p>
          Hệ thống tìm thấy {props.suggestions.length} bài nhặt được có nhiều điểm tương đồng. Bạn có thể mở từng bài để xem ảnh, vị trí và gửi yêu cầu nhận đồ nếu đúng vật của mình.
        </p>
        <div className="match-suggestion-list">
          {props.suggestions.map((suggestion) => (
            <article className="match-suggestion-card" key={suggestion.match.id}>
              {suggestion.post.coverImageUrl ? (
                <img src={suggestion.post.coverImageUrl} alt="" />
              ) : (
                <div className="match-suggestion-placeholder">
                  <Camera size={22} />
                </div>
              )}
              <div>
                <span className="status-pill">{Math.round(suggestion.match.totalScore * 100)}% giống nhau</span>
                <strong>{suggestion.post.title}</strong>
                <small>{locationText(suggestion.post)} · {formatDate(suggestion.post.createdAt)}</small>
                <span className="match-breakdown">
                  text {Math.round(suggestion.match.textScore * 100)}% · danh mục {Math.round(suggestion.match.categoryScore * 100)}% · vị trí {Math.round(suggestion.match.locationScore * 100)}%
                </span>
              </div>
              <button className="primary-button" type="button" onClick={() => props.onSelect(suggestion.post.id)}>
                Xem bài
              </button>
            </article>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={props.onClose}>Đóng</button>
        </div>
      </section>
    </div>
  );
}

export function ClaimDialog(props: {
  post: BoardPost;
  signedIn: boolean;
  imageRules: ImageUploadRules;
  verificationQuestionsEnabled: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [evidence, setEvidence] = useState<File | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);
  const answeredQuestionIds = useRef(new Set<string>());
  const evidenceUploaded = useRef(false);
  const questionsQuery = useQuery({
    queryKey: ["post-verification-questions", props.post.id],
    queryFn: () => api.postVerificationQuestions(props.post.id),
    enabled: props.signedIn && props.verificationQuestionsEnabled,
    retry: false
  });
  const questionsReady = !props.verificationQuestionsEnabled || questionsQuery.isSuccess;
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      let claimId = createdClaimId;
      if (!claimId) {
        const claim = await api.submitClaim({
          postId: props.post.id,
          secretAnswer: formData.get("secretAnswer"),
          description: formData.get("description"),
          approximateLostAt: toDateTimeIso(formData.get("approximateLostAt")),
          approximateLocation: formData.get("approximateLocation")
        });
        claimId = claim.claim.id;
        setCreatedClaimId(claimId);
      }
      for (const question of questionsQuery.data?.questions ?? []) {
        if (answeredQuestionIds.current.has(question.id)) continue;
        const answer = String(formData.get(`verificationAnswer:${question.id}`) ?? "").trim();
        if (!answer) throw new Error("Vui lòng trả lời đầy đủ câu hỏi xác minh riêng.");
        await api.answerClaimVerificationQuestion(claimId, question.id, answer);
        answeredQuestionIds.current.add(question.id);
      }
      if (evidence && !evidenceUploaded.current) {
        await api.uploadClaimEvidence(claimId, evidence, "OWNERSHIP_PROOF");
        evidenceUploaded.current = true;
      }
      return { claimId };
    },
    onSuccess: props.onCreated
  });

  function selectEvidence(file: File | undefined) {
    setEvidenceError(null);
    if (!file) {
      setEvidence(null);
      return;
    }

    const validationErrors = validateImageFiles([file], props.imageRules, 1);
    if (validationErrors.length > 0) {
      setEvidence(null);
      setEvidenceError(validationErrors[0]);
      return;
    }
    setEvidence(file);
  }

  return (
    <div className="drawer-backdrop" onClick={props.onClose}>
      <form className="dialog" onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(new FormData(event.currentTarget));
      }}>
        <h2>Claim: {props.post.title}</h2>
        {!props.signedIn && <div className="notice error">Bạn cần đăng nhập trước khi gửi yêu cầu nhận đồ.</div>}
        <label>
          Mô tả bí mật bổ sung
          <textarea name="secretAnswer" required minLength={3} rows={3} />
        </label>
        {(questionsQuery.data?.questions ?? []).map((question) => (
          <label key={question.id}>
            {question.prompt}
            {question.questionType === "MULTIPLE_CHOICE" && (question.options?.length ?? 0) > 1 ? (
              <select name={`verificationAnswer:${question.id}`} required={!answeredQuestionIds.current.has(question.id)} defaultValue="">
                <option value="" disabled>Chọn câu trả lời</option>
                {question.options?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input
                name={`verificationAnswer:${question.id}`}
                type={question.questionType === "MASKED_SERIAL" ? "password" : "text"}
                required={!answeredQuestionIds.current.has(question.id)}
                minLength={1}
                maxLength={500}
                autoComplete="off"
              />
            )}
            <small>Đáp án được đối chiếu riêng và không hiển thị lại cho người gửi.</small>
          </label>
        ))}
        {questionsQuery.isLoading && <div className="notice">Đang tải câu hỏi xác minh...</div>}
        {questionsQuery.error instanceof Error && (
          <div className="notice error">Không thể tải câu hỏi xác minh: {questionsQuery.error.message}</div>
        )}
        <label>
          Mô tả thêm
          <textarea name="description" rows={3} />
        </label>
        <label>
          Thời gian mất ước lượng
          <input name="approximateLostAt" type="datetime-local" />
        </label>
        <label>
          Vị trí mất ước lượng
          <input name="approximateLocation" required />
        </label>
        <label>
          Bằng chứng ảnh
          <input type="file" accept={acceptAttribute(props.imageRules)} onChange={(event) => selectEvidence(event.target.files?.[0])} />
        </label>
        {evidence && <div className="notice success">Đã chọn {evidence.name}</div>}
        {evidenceError && <div className="notice error">{evidenceError}</div>}
        {mutation.error instanceof Error && (
          <div className="notice error">
            {createdClaimId && "Claim đã được tạo; hệ thống sẽ chỉ thử lại phần xác minh hoặc bằng chứng còn thiếu. "}
            {mutation.error.message}
          </div>
        )}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={props.onClose}>Hủy</button>
          <button className="primary-button" disabled={!props.signedIn || !questionsReady || mutation.isPending} type="submit">
            {mutation.isPending ? "Đang gửi..." : "Gửi yêu cầu nhận đồ"}
          </button>
        </div>
      </form>
    </div>
  );
}
