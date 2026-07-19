import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Upload } from "lucide-react";
import { formNullable, formatDate, toDateTimeIso } from "../../app/helpers";
import { AppointmentProofImage, ClaimEvidenceImage } from "../../app/MediaWidgets";
import { api, hasAccessToken, type PostClaimSummary } from "../../services/api";
import { ClaimChatBox, ClaimVerificationBadge } from "./ClaimChatPanel";

export function ClaimAppointmentPanel(props: {
  claims: PostClaimSummary[];
  handoverPoints: Array<{ id: string; name: string }>;
  currentUserId?: string;
  pending: boolean;
  error: unknown;
  onCreate: (payload: Record<string, unknown>) => void;
}) {
  const acceptedClaims = props.claims.filter((claim) => claim.status === "ACCEPTED");

  function submit(event: FormEvent<HTMLFormElement>, claim: PostClaimSummary) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    props.onCreate({
      claimId: claim.id,
      proposedAt: toDateTimeIso(data.get("proposedAt")),
      handoverPointId: formNullable(data, "handoverPointId"),
      customLocation: formNullable(data, "customLocation")
    });
    event.currentTarget.reset();
  }

  return (
    <section className="detail-description-section">
      <div className="detail-description-header">Claim và lịch hẹn trả đồ</div>
      <div className="claim-appointment-list">
        {props.claims.map((claim) => (
          <article className="claim-appointment-card" key={claim.id}>
            <div>
              <span className={`status-pill claim-${claim.status.toLowerCase()}`}>{claim.status}</span>
              <strong>{claim.claimant.fullName}</strong>
              <ClaimVerificationBadge claimId={claim.id} />
              <ClaimExtraActions claim={claim} currentUserId={props.currentUserId} />
              <small>{claim.approximateLocation || "Chưa có vị trí mất gần đúng"} - {formatDate(claim.createdAt)}</small>
            </div>
            {claim.status === "ACCEPTED" && (
              <form className="claim-appointment-form" onSubmit={(event) => submit(event, claim)}>
                <input name="proposedAt" required type="datetime-local" />
                <select name="handoverPointId">
                  <option value="">Chọn điểm bàn giao</option>
                  {props.handoverPoints.map((point) => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
                <input name="customLocation" placeholder="Hoặc nhập vị trí hẹn khác" />
                <button className="primary-button" disabled={props.pending} type="submit">
                  Tạo lịch hẹn
                </button>
              </form>
            )}
            <ClaimAppointmentTimeline claimId={claim.id} />
            {claim.status === "ACCEPTED" && (
              <ClaimChatBox claimId={claim.id} currentUserId={props.currentUserId} />
            )}
          </article>
        ))}
        {acceptedClaims.length === 0 && <small>Chưa có yêu cầu nhận đồ nào được chấp nhận để tạo lịch hẹn.</small>}
        {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      </div>
    </section>
  );
}

function ClaimAppointmentTimeline(props: { claimId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const appointmentsQuery = useQuery({
    queryKey: ["claim-appointments", props.claimId],
    queryFn: () => api.claimAppointments(props.claimId),
    enabled: hasAccessToken(),
    retry: false
  });
  const feedbackMutation = useMutation({
    mutationFn: (input: { appointmentId: string; rating: number; comment?: string | null }) =>
      api.submitAppointmentFeedback(input.appointmentId, {
        rating: input.rating,
        comment: input.comment
      }),
    onSuccess: async () => {
      setMessage("Đã gửi feedback sau bàn giao.");
      await queryClient.invalidateQueries({ queryKey: ["claim-appointments", props.claimId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-return-feedback"] });
    }
  });
  const proofMutation = useMutation({
    mutationFn: (input: { appointmentId: string; file: File; note?: string | null }) =>
      api.uploadAppointmentProof(input.appointmentId, input.file, input.note),
    onSuccess: async () => {
      setMessage("Đã tải chứng từ bàn giao.");
      await queryClient.invalidateQueries({ queryKey: ["claim-appointments", props.claimId] });
    }
  });

  function submitFeedback(event: FormEvent<HTMLFormElement>, appointmentId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    feedbackMutation.mutate({
      appointmentId,
      rating: Number(data.get("rating") ?? 5),
      comment: formNullable(data, "comment")
    });
    event.currentTarget.reset();
  }

  function submitProof(event: FormEvent<HTMLFormElement>, appointmentId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = event.currentTarget.elements.namedItem("proof") as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      setMessage("Chọn một ảnh chứng từ bàn giao trước khi lưu.");
      return;
    }
    proofMutation.mutate({
      appointmentId,
      file,
      note: formNullable(data, "note")
    });
    event.currentTarget.reset();
  }

  const appointments = appointmentsQuery.data?.appointments ?? [];
  if (appointmentsQuery.isLoading) {
    return <small>Đang tải lịch bàn giao...</small>;
  }
  if (appointments.length === 0) {
    return null;
  }

  return (
    <div className="claim-appointment-list nested">
      {message && <div className="notice">{message}</div>}
      {appointments.map((appointment) => (
        <article className="claim-appointment-card" key={appointment.id}>
          <div>
            <span className={`status-pill claim-${appointment.status.toLowerCase()}`}>{appointment.status}</span>
            <strong>{appointment.handoverPoint?.name ?? appointment.customLocation ?? "Campus"}</strong>
            <small>{formatDate(appointment.proposedAt)}</small>
          </div>
          {appointment.proof && (
            <div className="appointment-proof-preview">
              <AppointmentProofImage appointmentId={appointment.id} alt="Chứng từ bàn giao" />
              <div>
                <strong>Chứng từ bàn giao</strong>
                <small>
                  {appointment.proof.uploadedBy?.fullName ? `${appointment.proof.uploadedBy.fullName} · ` : ""}
                  {appointment.proof.uploadedAt ? formatDate(appointment.proof.uploadedAt) : "Đã tải lên"}
                </small>
                {appointment.proof.note && <small>{appointment.proof.note}</small>}
              </div>
            </div>
          )}
          {(appointment.status === "ACCEPTED" || appointment.status === "COMPLETED") && (
            <form className="appointment-proof-form" onSubmit={(event) => submitProof(event, appointment.id)}>
              <input name="proof" type="file" accept="image/png,image/jpeg,image/webp" />
              <input name="note" placeholder="Ghi chú chứng từ bàn giao" />
              <button className="secondary-button" disabled={proofMutation.isPending} type="submit">
                Tải chứng từ
              </button>
            </form>
          )}
          {appointment.status === "COMPLETED" && (
            <form className="claim-appointment-form" onSubmit={(event) => submitFeedback(event, appointment.id)}>
              <select name="rating" defaultValue="5">
                <option value="5">5 sao - hài lòng</option>
                <option value="4">4 sao</option>
                <option value="3">3 sao - bình thường</option>
                <option value="2">2 sao - cần xem lại</option>
                <option value="1">1 sao - có vấn đề</option>
              </select>
              <input name="comment" placeholder="Ghi chú sau bàn giao" />
              <button className="secondary-button" disabled={feedbackMutation.isPending} type="submit">
                Gửi feedback
              </button>
            </form>
          )}
        </article>
      ))}
      {proofMutation.error instanceof Error && <div className="notice error">{proofMutation.error.message}</div>}
      {feedbackMutation.error instanceof Error && <div className="notice error">{feedbackMutation.error.message}</div>}
    </div>
  );
}

function ClaimExtraActions(props: { claim: PostClaimSummary; currentUserId?: string }) {
  const { claim } = props;
  const queryClient = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionForm, setActionForm] = useState<"more-info" | "reject" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canReview = Boolean(props.currentUserId && props.currentUserId === claim.postOwnerId);
  const canCancel = Boolean(props.currentUserId && (props.currentUserId === claim.claimant.id || canReview));
  const canUploadEvidence = Boolean(
    props.currentUserId === claim.claimant.id && (claim.status === "PENDING" || claim.status === "NEED_MORE_INFO")
  );

  const detailQuery = useQuery({
    queryKey: ["claim-detail", claim.id],
    queryFn: () => api.getClaim(claim.id),
    enabled: detailOpen,
    retry: false
  });

  const actionMutation = useMutation({
    mutationFn: (input: { action: "accept" | "more-info" | "reject" | "cancel"; reason?: string }) => {
      if (input.action === "accept") return api.acceptClaim(claim.id);
      if (input.action === "more-info") return api.requestClaimMoreInfo(claim.id, input.reason ?? "");
      if (input.action === "cancel") return api.cancelClaim(claim.id, input.reason ?? "");
      return api.rejectClaim(claim.id, input.reason ?? "");
    },
    onSuccess: async (_result, input) => {
      setActionForm(null);
      setMessage(input.action === "accept" ? "Đã chấp nhận yêu cầu nhận đồ." : "Đã cập nhật trạng thái yêu cầu nhận đồ.");
      await queryClient.invalidateQueries({ queryKey: ["post-claims", claim.postId] });
      await queryClient.invalidateQueries({ queryKey: ["claim-detail", claim.id] });
      await queryClient.invalidateQueries({ queryKey: ["claim-verification", claim.id] });
    }
  });

  const evidenceMutation = useMutation({
    mutationFn: async (input: { files: File[]; evidenceType: string }) => {
      for (const file of input.files) {
        await api.uploadClaimEvidence(claim.id, file, input.evidenceType);
      }
      return { uploaded: input.files.length };
    },
    onSuccess: async (result) => {
      setMessage(`Đã tải ${result.uploaded} bằng chứng.`);
      setDetailOpen(true);
      await queryClient.invalidateQueries({ queryKey: ["claim-detail", claim.id] });
      await queryClient.invalidateQueries({ queryKey: ["claim-verification", claim.id] });
    }
  });

  function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionForm) return;
    const data = new FormData(event.currentTarget);
    actionMutation.mutate({ action: actionForm, reason: String(data.get("reason") ?? "").trim() });
  }

  function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = event.currentTarget.elements.namedItem("evidence") as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (files.length === 0) {
      setMessage("Chọn ít nhất 1 file bằng chứng.");
      return;
    }
    evidenceMutation.mutate({
      files,
      evidenceType: String(data.get("evidenceType") ?? "OWNERSHIP_PROOF")
    });
    event.currentTarget.reset();
  }

  const detail = detailQuery.data;

  return (
    <div className="claim-extra-actions">
      {claim.moreInfoRequest && <small>Yêu cầu bổ sung: {claim.moreInfoRequest}</small>}
      {claim.rejectionReason && <small>Lý do từ chối: {claim.rejectionReason}</small>}
      <div className="claim-action-row">
        <button className="secondary-button" type="button" onClick={() => setDetailOpen((value) => !value)}>
          <Eye size={15} /> {detailOpen ? "Ẩn bằng chứng" : "Xem bằng chứng"}
        </button>
        {canReview && (claim.status === "PENDING" || claim.status === "NEED_MORE_INFO") && (
          <>
            <button className="secondary-button" disabled={actionMutation.isPending} type="button" onClick={() => actionMutation.mutate({ action: "accept" })}>Chấp nhận</button>
            <button className="secondary-button" type="button" onClick={() => setActionForm("more-info")}>Yêu cầu thêm</button>
            <button className="secondary-button danger" type="button" onClick={() => setActionForm("reject")}>Từ chối</button>
          </>
        )}
        {canCancel && claim.status !== "ACCEPTED" && claim.status !== "REJECTED" && claim.status !== "CANCELLED" && (
          <button className="secondary-button danger" type="button" onClick={() => setActionForm("cancel")}>Hủy yêu cầu</button>
        )}
      </div>

      {actionForm && (
        <form className="claim-action-form" onSubmit={submitAction}>
          <textarea name="reason" required rows={3} minLength={3} placeholder={actionForm === "more-info" ? "Cần bổ sung thông tin gì?" : "Nhập lý do"} />
          <button className="primary-button" disabled={actionMutation.isPending} type="submit">Lưu</button>
        </form>
      )}

      {canUploadEvidence && (
        <form className="claim-evidence-upload" onSubmit={submitEvidence}>
          <select name="evidenceType" defaultValue="OWNERSHIP_PROOF">
            <option value="OWNERSHIP_PROOF">Bằng chứng sở hữu</option>
            <option value="ADDITIONAL_DOC">Tài liệu bổ sung</option>
            <option value="PHOTO">Ảnh bổ sung</option>
          </select>
          <input name="evidence" type="file" accept="image/*" multiple />
          <button className="secondary-button" disabled={evidenceMutation.isPending} type="submit">
            <Upload size={15} /> Tải bằng chứng
          </button>
        </form>
      )}

      {detailOpen && (
        <div className="claim-evidence-panel">
          {detailQuery.isLoading && <small>Đang tải bằng chứng...</small>}
          {detail?.claim.description && <p>{detail.claim.description}</p>}
          {detail?.evidence.map((item) => (
            <figure key={item.id}>
              <ClaimEvidenceImage claimId={claim.id} evidenceId={item.id} alt={item.evidenceType} />
              <figcaption>{item.evidenceType}{item.description ? ` - ${item.description}` : ""}</figcaption>
            </figure>
          ))}
          {detail && detail.evidence.length === 0 && <small>Claim chưa có file bằng chứng.</small>}
          {detailQuery.error instanceof Error && <div className="notice error">{detailQuery.error.message}</div>}
        </div>
      )}

      {message && <div className="notice">{message}</div>}
      {actionMutation.error instanceof Error && <div className="notice error">{actionMutation.error.message}</div>}
      {evidenceMutation.error instanceof Error && <div className="notice error">{evidenceMutation.error.message}</div>}
    </div>
  );
}
