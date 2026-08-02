import { CheckCircle2, LockKeyhole, Power, ShieldCheck, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import "./ai-tools.css";

export type VerificationQuestionStatus = "DRAFT" | "APPROVED" | "DISABLED";

export interface VerificationQuestionConfiguration {
  question: string;
  status: VerificationQuestionStatus;
  hasExpectedAnswer: boolean;
  updatedAt?: string | null;
}

export interface VerificationQuestionSuggestion {
  id: string;
  question: string;
  rationale?: string;
}

export interface VerificationQuestionApproval {
  question: string;
  expectedAnswer: string;
}

export interface VerificationQuestionManagerProps {
  configuration?: VerificationQuestionConfiguration | null;
  suggestions?: readonly VerificationQuestionSuggestion[];
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  onApprove: (input: VerificationQuestionApproval) => void | Promise<void>;
  onDisable: () => void | Promise<void>;
  onDraftChange?: (draft: { question: string; hasExpectedAnswer: boolean }) => void;
}

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function VerificationQuestionManager(props: VerificationQuestionManagerProps) {
  const questionId = useId();
  const answerId = useId();
  const hintId = useId();
  const [editing, setEditing] = useState(props.configuration?.status !== "APPROVED");
  const [question, setQuestion] = useState(props.configuration?.question ?? "");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setQuestion(props.configuration?.question ?? "");
    setEditing(props.configuration?.status !== "APPROVED");
    setExpectedAnswer("");
  }, [props.configuration?.question, props.configuration?.status]);

  useEffect(() => {
    props.onDraftChange?.({ question, hasExpectedAnswer: expectedAnswer.trim().length > 0 });
  }, [expectedAnswer, props.onDraftChange, question]);

  const pending = Boolean(props.busy || localBusy);
  const approved = props.configuration?.status === "APPROVED" && !editing;
  const updatedAt = formatUpdatedAt(props.configuration?.updatedAt);

  function useSuggestion(suggestion: VerificationQuestionSuggestion) {
    setQuestion(suggestion.question);
    setEditing(true);
    setLocalError(null);
    window.requestAnimationFrame(() => document.getElementById(questionId)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    const cleanAnswer = expectedAnswer.trim();
    if (cleanQuestion.length < 6 || cleanAnswer.length < 2) {
      setLocalError("Nhập câu hỏi rõ ràng và đáp án riêng tư trước khi duyệt.");
      return;
    }

    setLocalBusy(true);
    setLocalError(null);
    try {
      await props.onApprove({ question: cleanQuestion, expectedAnswer: cleanAnswer });
      setExpectedAnswer("");
      setEditing(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Không thể duyệt câu xác minh.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function disableQuestion() {
    setLocalBusy(true);
    setLocalError(null);
    try {
      await props.onDisable();
      setExpectedAnswer("");
      setEditing(true);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Không thể tắt câu xác minh.");
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <section className="ai-tool ai-verification-manager" aria-labelledby={`${questionId}-title`}>
      <header className="ai-tool-heading">
        <div className="ai-tool-heading-icon verification" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <div>
          <span className="ai-tool-eyebrow">Kiểm chứng quyền sở hữu</span>
          <h2 id={`${questionId}-title`}>Câu hỏi xác minh</h2>
          <p>Đặt một câu hỏi về chi tiết không xuất hiện trong bài đăng. Hệ thống chỉ trả về kết quả đối chiếu, không hiển thị đáp án đã lưu.</p>
        </div>
        <span className={`ai-tool-status ${props.configuration?.status?.toLowerCase() ?? "draft"}`}>
          {props.configuration?.status === "APPROVED"
            ? "Đang bật"
            : props.configuration?.status === "DISABLED"
              ? "Đã tắt"
              : "Bản nháp"}
        </span>
      </header>

      {approved ? (
        <div className="verification-approved" role="status">
          <div className="verification-approved-copy">
            <CheckCircle2 size={20} aria-hidden="true" />
            <div>
              <strong>{props.configuration?.question}</strong>
              <span>
                <LockKeyhole size={14} aria-hidden="true" /> Đáp án riêng tư đã được thiết lập và không được hiển thị.
              </span>
              {updatedAt && <small>Cập nhật {updatedAt}</small>}
            </div>
          </div>
          <div className="ai-tool-actions">
            <button className="ai-tool-button secondary" type="button" disabled={pending || props.disabled} onClick={() => setEditing(true)}>
              Chỉnh sửa câu hỏi
            </button>
            <button className="ai-tool-button quiet-danger" type="button" disabled={pending || props.disabled} onClick={() => void disableQuestion()}>
              <Power size={16} aria-hidden="true" /> Tắt xác minh
            </button>
          </div>
        </div>
      ) : (
        <form className="verification-editor" onSubmit={(event) => void submit(event)}>
          {props.suggestions && props.suggestions.length > 0 && (
            <div className="verification-suggestions" aria-labelledby={`${questionId}-suggestions`}>
              <div className="verification-section-label">
                <Sparkles size={16} aria-hidden="true" />
                <strong id={`${questionId}-suggestions`}>Câu hỏi gợi ý</strong>
              </div>
              <div className="verification-suggestion-list">
                {props.suggestions.map((suggestion) => (
                  <button
                    className="verification-suggestion"
                    key={suggestion.id}
                    type="button"
                    disabled={pending || props.disabled}
                    onClick={() => useSuggestion(suggestion)}
                  >
                    <span>{suggestion.question}</span>
                    {suggestion.rationale && <small>{suggestion.rationale}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ai-tool-field">
            <label htmlFor={questionId}>Câu hỏi dành cho người nhận đồ</label>
            <textarea
              id={questionId}
              value={question}
              rows={3}
              minLength={6}
              maxLength={500}
              required
              disabled={pending || props.disabled}
              aria-describedby={hintId}
              placeholder="Ví dụ: Bên trong ví có loại thẻ nào mà bài đăng chưa nhắc tới?"
              onChange={(event) => setQuestion(event.target.value)}
            />
            <small id={hintId}>Không đưa số điện thoại, mật khẩu, mã OTP hoặc toàn bộ số giấy tờ vào câu hỏi.</small>
          </div>

          <div className="ai-tool-field private-answer-field">
            <label htmlFor={answerId}>
              Đáp án mong đợi <span>Riêng tư</span>
            </label>
            <input
              id={answerId}
              type="password"
              value={expectedAnswer}
              minLength={2}
              maxLength={500}
              required
              disabled={pending || props.disabled}
              autoComplete="new-password"
              placeholder={props.configuration?.hasExpectedAnswer ? "Nhập đáp án mới để thay thế" : "Nhập đáp án chỉ người giữ đồ biết"}
              onChange={(event) => setExpectedAnswer(event.target.value)}
            />
            <small><LockKeyhole size={13} aria-hidden="true" /> Sau khi duyệt, đáp án biến mất khỏi giao diện và không thể xem lại.</small>
          </div>

          {(localError || props.error) && <div className="ai-tool-notice error" role="alert">{localError || props.error}</div>}

          <div className="ai-tool-actions verification-actions">
            {props.configuration?.status === "APPROVED" && (
              <button className="ai-tool-button secondary" type="button" disabled={pending} onClick={() => {
                setQuestion(props.configuration?.question ?? "");
                setExpectedAnswer("");
                setEditing(false);
                setLocalError(null);
              }}>
                Hủy chỉnh sửa
              </button>
            )}
            <button className="ai-tool-button primary" type="submit" disabled={pending || props.disabled}>
              <ShieldCheck size={17} aria-hidden="true" /> {pending ? "Đang lưu..." : "Duyệt và bật câu hỏi"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
