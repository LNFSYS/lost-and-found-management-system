import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [evidence, setEvidence] = useState<File | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const claim = await api.submitClaim({
        postId: props.post.id,
        secretAnswer: formData.get("secretAnswer"),
        description: formData.get("description"),
        approximateLostAt: toDateTimeIso(formData.get("approximateLostAt")),
        approximateLocation: formData.get("approximateLocation")
      });
      if (evidence) {
        await api.uploadClaimEvidence(claim.claim.id, evidence, "OWNERSHIP_PROOF");
      }
      return claim;
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
          Mô tả bí mật
          <textarea name="secretAnswer" required minLength={3} rows={3} />
        </label>
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
        {mutation.error instanceof Error && <div className="notice error">{mutation.error.message}</div>}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={props.onClose}>Hủy</button>
          <button className="primary-button" disabled={!props.signedIn || mutation.isPending} type="submit">
            {mutation.isPending ? "Đang gửi..." : "Gửi yêu cầu nhận đồ"}
          </button>
        </div>
      </form>
    </div>
  );
}
