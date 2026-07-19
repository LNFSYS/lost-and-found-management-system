import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Calendar, ChevronLeft, ChevronRight, Flag, MapPin, MoreVertical, Share2, X } from "lucide-react";
import { formNullable, locationText } from "../../app/helpers";
import { api, hasAccessToken, type BoardPost } from "../../services/api";
import { ClaimAppointmentPanel } from "../claims/ClaimWorkflowPanels";

export function PostDetailPage(props: {
  loading: boolean;
  detail?: Awaited<ReturnType<typeof api.getPost>>;
  handoverPoints: Array<{ id: string; name: string }>;
  currentUserId?: string;
  canReviewClaims: boolean;
  onClose: () => void;
  onClaim: (post: BoardPost) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const post = props.detail?.post;
  const queryClient = useQueryClient();
  const claimsQuery = useQuery({
    queryKey: ["post-claims", post?.id],
    queryFn: () => api.postClaims(post!.id),
    enabled: Boolean(post?.id && hasAccessToken() && post.type === "FOUND"),
    retry: false
  });
  const appointmentMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.createAppointment(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["claim-appointments"] });
    }
  });
  const reportMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.reportPost(post!.id, input),
    onSuccess: () => {
      setReportMessage("Đã gửi báo cáo. Admin sẽ kiểm tra nội dung này.");
      setReportOpen(false);
    }
  });
  const editMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.updatePost(post!.id, input),
    onSuccess: async () => {
      setActionMessage("Đã cập nhật bài viết.");
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["post", post?.id] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["my-posts"] });
    }
  });
  const postActionMutation = useMutation<unknown, Error, "close" | "delete">({
    mutationFn: (action: "close" | "delete") => {
      if (!post) {
        throw new Error("Post not ready");
      }
      return action === "close" ? api.updatePostStatus(post.id, "CLOSED") : api.deletePost(post.id);
    },
    onSuccess: async (_result, action) => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["post", post?.id] });
      if (action === "delete") {
        props.onClose();
      } else {
        setActionMessage("Đã đóng bài viết.");
      }
    }
  });

  useEffect(() => {
    setCurrentImageIndex(0);
    setReportOpen(false);
    setReportMessage(null);
    setEditOpen(false);
    setActionMessage(null);
  }, [post?.id]);

  const images = useMemo(() => {
    const list: string[] = [];
    if (props.detail?.media && props.detail.media.length > 0) {
      props.detail.media.forEach((m) => {
        if (m.optimizedUrl || m.secureUrl) list.push(m.optimizedUrl ?? m.secureUrl);
      });
    } else if (post?.coverImageUrl) {
      list.push(post.coverImageUrl);
    }
    return list;
  }, [props.detail?.media, post?.coverImageUrl]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (activeImageUrl) {
          setActiveImageUrl(null);
        } else {
          props.onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageUrl, props.onClose]);

  useEffect(() => {
    if (activeImageUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeImageUrl]);

  async function copyShareLink() {
    if (!post) {
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) {
      return;
    }
    if (!hasAccessToken()) {
    setReportMessage("Bạn cần đăng nhập để báo cáo bài viết.");
      return;
    }
    const data = new FormData(event.currentTarget);
    reportMutation.mutate({
      reason: String(data.get("reason")),
      details: formNullable(data, "details")
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) {
      return;
    }
    const data = new FormData(event.currentTarget);
    editMutation.mutate({
      title: String(data.get("title") ?? "").trim(),
      description: String(data.get("description") ?? "").trim(),
      contactInfo: formNullable(data, "contactInfo"),
      roomText: formNullable(data, "roomText"),
      customLocation: formNullable(data, "customLocation")
    });
  }

  const modalDate = post?.lostFoundAt ? (() => {
    const date = new Date(post.lostFoundAt);
    const weekday = date.toLocaleDateString("vi-VN", { weekday: "long" });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${capitalizedWeekday}, ${day} tháng ${month}, ${year}`;
  })() : "Chưa rõ thời gian";

  const canManagePost = Boolean(post && props.currentUserId === post.userId);

  return (
    <>
      <section className="post-detail-page">
        <div className="post-detail-page-shell">
          {props.loading && <div className="notice">Đang tải chi tiết...</div>}
          {props.detail && post && (
            <>
              <div className="detail-modal-header">
                <span className={`detail-type-badge ${post.type.toLowerCase()}`}>
                  {post.type === "FOUND" ? "Vật nhặt được" : "Vật bị mất"}
                </span>
                <button className="detail-close-btn" type="button" onClick={props.onClose} aria-label="Đóng">
                  <X size={20} />
                </button>
              </div>

              {images.length > 0 && (
                <div className="detail-image-container">
                  <img
                    src={images[currentImageIndex]}
                    alt={post.title}
                    style={{ cursor: "zoom-in" }}
                    onClick={() => setActiveImageUrl(images[currentImageIndex])}
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="carousel-control prev"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                        }}
                        aria-label="Ảnh trước"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <button
                        type="button"
                        className="carousel-control next"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                        }}
                        aria-label="Ảnh sau"
                      >
                        <ChevronRight size={20} />
                      </button>

                      <div className="carousel-indicators">
                        {images.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`indicator-dot ${idx === currentImageIndex ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(idx);
                            }}
                            aria-label={`Ảnh ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <h2 className="detail-title">{post.title}</h2>

              <div className="detail-tags-row">
                {post.category?.name && (
                  <span className="detail-tag">
                    <Boxes size={14} />
                    <span>{post.category.name}</span>
                  </span>
                )}
                <span className="detail-tag">
                  <MapPin size={14} />
                  <span>{locationText(post)}</span>
                </span>
              </div>

              <div className="detail-description-section">
                <div className="detail-description-header">Mô tả</div>
                <div className="detail-description-body">{post.description}</div>
              </div>

              <div className="detail-info-boxes">
                <div className="detail-info-box">
                  <div className="detail-info-box-icon">
                    <Calendar size={18} />
                  </div>
                  <div className="detail-info-box-content">
                    <span className="detail-info-box-label">Thời gian</span>
                    <span className="detail-info-box-value">{modalDate}</span>
                  </div>
                </div>

                <div className="detail-info-box">
                  <div className="detail-info-box-icon">
                    <MapPin size={18} />
                  </div>
                  <div className="detail-info-box-content">
                    <span className="detail-info-box-label">Vị trí</span>
                    <span className="detail-info-box-value">{locationText(post)}</span>
                  </div>
                </div>
              </div>

              {/* Extra images thumbnails indicator below */}
              {images.length > 1 && (
                <div className="detail-thumbnails-row">
                  {images.map((url, idx) => (
                    <div
                      key={idx}
                      className={`detail-thumbnail-wrapper ${idx === currentImageIndex ? "active" : ""}`}
                      onClick={() => setCurrentImageIndex(idx)}
                    >
                      <img src={url} alt="" />
                    </div>
                  ))}
                </div>
              )}

              {/* AI tags */}
              {props.detail?.tags && props.detail.tags.length > 0 && (
                <div className="detail-meta-section">
                  <h4 style={{ margin: "12px 0 6px" }}>AI tags</h4>
                  <div className="tag-list" style={{ marginBottom: "8px" }}>
                    {props.detail.tags.map((tag) => (
                      <span key={tag.id}>{tag.tag} · {Math.round(tag.confidence * 100)}%</span>
                    ))}
                  </div>
                </div>
              )}

              {post.type === "FOUND" && claimsQuery.data?.claims && claimsQuery.data.claims.length > 0 && (
                <ClaimAppointmentPanel
                  claims={claimsQuery.data.claims}
                  handoverPoints={props.handoverPoints}
                  currentUserId={props.currentUserId}
                  canReviewClaims={props.canReviewClaims}
                  pending={appointmentMutation.isPending}
                  error={appointmentMutation.error}
                  onCreate={(payload) => appointmentMutation.mutate(payload)}
                />
              )}

              <div className="detail-modal-footer-actions">
                <button className="secondary-button" type="button" onClick={() => void copyShareLink()}>
                  <Share2 size={16} /> {copied ? "Đã sao chép liên kết" : "Sao chép liên kết"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setReportOpen((value) => !value)}>
                  <Flag size={16} /> Báo cáo
                </button>
                {canManagePost && (
                  <>
                    <button className="secondary-button" type="button" onClick={() => setEditOpen((value) => !value)}>
                      <MoreVertical size={16} /> Sửa bài
                    </button>
                    {(post.status === "OPEN" || post.status === "MATCHED") && (
                      <button
                        className="secondary-button"
                        disabled={postActionMutation.isPending}
                        type="button"
                        onClick={() => postActionMutation.mutate("close")}
                      >
                        Đóng bài
                      </button>
                    )}
                    <button
                      className="secondary-button danger"
                      disabled={postActionMutation.isPending}
                      type="button"
                      onClick={() => {
                        if (window.confirm("Xóa mềm bài viết này?")) {
                          postActionMutation.mutate("delete");
                        }
                      }}
                    >
                      Xóa mềm
                    </button>
                  </>
                )}
                {post.type === "FOUND" && (
                  <button className="primary-button" type="button" onClick={() => props.onClaim(post)}>
                    Claim đồ này
                  </button>
                )}
              </div>
              {editOpen && (
                <form className="post-edit-form" onSubmit={submitEdit}>
                  <input name="title" required minLength={3} maxLength={255} defaultValue={post.title} placeholder="Tiêu đề" />
                  <textarea name="description" required minLength={10} rows={4} defaultValue={post.description} placeholder="Mô tả" />
                  <input name="contactInfo" defaultValue={post.contactInfo ?? ""} placeholder="Thông tin liên hệ" />
                  <div className="post-edit-grid">
                    <input name="roomText" defaultValue={post.location.roomText ?? ""} placeholder="Phòng/khu vực cụ thể" />
                    <input name="customLocation" defaultValue={post.location.customLocation ?? ""} placeholder="Vị trí tùy chỉnh" />
                  </div>
                  <button className="primary-button" disabled={editMutation.isPending} type="submit">
                    Lưu thay đổi
                  </button>
                </form>
              )}
              {reportOpen && (
                <form className="post-report-form" onSubmit={submitReport}>
                  <input name="reason" required minLength={3} maxLength={255} placeholder="Lý do báo cáo" />
                  <textarea name="details" rows={3} maxLength={2000} placeholder="Mô tả thêm cho quản trị viên" />
                  <button className="primary-button" disabled={reportMutation.isPending} type="submit">
                    Gửi báo cáo
                  </button>
                </form>
              )}
              {reportMessage && <div className="notice">{reportMessage}</div>}
              {actionMessage && <div className="notice">{actionMessage}</div>}
              {reportMutation.error instanceof Error && <div className="notice error">{reportMutation.error.message}</div>}
              {editMutation.error instanceof Error && <div className="notice error">{editMutation.error.message}</div>}
              {postActionMutation.error instanceof Error && <div className="notice error">{postActionMutation.error.message}</div>}
            </>
          )}
        </div>
      </section>

      {activeImageUrl && (
        <div className="lightbox-overlay" onClick={() => setActiveImageUrl(null)}>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img src={activeImageUrl} alt="Xem ảnh đầy đủ" />
            <button type="button" className="lightbox-close" onClick={() => setActiveImageUrl(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
