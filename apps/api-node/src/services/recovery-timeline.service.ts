import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { recoveryTimelineRepository, type RecoveryTimelineRawEvent } from "../repositories/recovery-timeline.repository.js";
import { HttpError } from "../utils/http-error.js";

const eventCopy: Record<string, { title: string; message: string }> = {
  POST_CREATED: { title: "Đã tạo bài báo mất", message: "Hồ sơ tìm kiếm đã được ghi nhận." },
  SEARCH_COMPANION_ANSWERED: { title: "Đã bổ sung thông tin", message: "Search Companion đã cập nhật hồ sơ tìm kiếm riêng tư." },
  SEARCH_COMPANION_APPLIED: { title: "Đã cập nhật bài đăng", message: "Các trường an toàn đã được áp dụng sau khi người dùng xác nhận." },
  MATCH_CANDIDATE_DETECTED: { title: "Có gợi ý tương tự", message: "Hệ thống phát hiện một ứng viên cần được con người đối chiếu." },
  CLAIM_PENDING: { title: "Đã gửi yêu cầu nhận đồ", message: "Yêu cầu và bằng chứng đang chờ xem xét." },
  CLAIM_NEED_MORE_INFO: { title: "Cần bổ sung thông tin", message: "Người review yêu cầu bổ sung bằng chứng hoặc mô tả." },
  CLAIM_ACCEPTED: { title: "Yêu cầu đã được chấp nhận", message: "Có thể tiếp tục tạo lịch bàn giao." },
  CLAIM_REJECTED: { title: "Yêu cầu không được chấp nhận", message: "Quyết định được thực hiện sau bước xem xét của con người." },
  CLAIM_CANCELLED: { title: "Yêu cầu đã hủy", message: "Yêu cầu nhận đồ không còn hoạt động." },
  CLAIM_EVIDENCE_ADDED: { title: "Đã bổ sung bằng chứng", message: "Bằng chứng riêng tư đã được ghi nhận." },
  APPOINTMENT_CREATED: { title: "Đã đề xuất lịch bàn giao", message: "Lịch đang chờ bên liên quan xác nhận." },
  APPOINTMENT_ACCEPTED: { title: "Lịch bàn giao đã xác nhận", message: "Hãy đến đúng thời gian và địa điểm đã thống nhất." },
  APPOINTMENT_RESCHEDULED: { title: "Lịch bàn giao đã thay đổi", message: "Vui lòng kiểm tra thời gian mới." },
  APPOINTMENT_REJECTED: { title: "Lịch đề xuất bị từ chối", message: "Hai bên có thể đề xuất thời gian khác." },
  APPOINTMENT_CANCELLED: { title: "Lịch bàn giao đã hủy", message: "Lịch này không còn hiệu lực." },
  APPOINTMENT_COMPLETED: { title: "Đã hoàn tất bàn giao", message: "Vật phẩm đã đi qua bước bàn giao được xác nhận." },
  STORAGE_RECEIVED: { title: "Điểm bàn giao đã nhận vật phẩm", message: "Vật phẩm đã được ghi nhận tại điểm lưu giữ." },
  STORAGE_STORED: { title: "Vật phẩm đang được lưu giữ", message: "Staff đã cập nhật trạng thái kho." },
  STORAGE_RETURNED: { title: "Vật phẩm đã được hoàn trả", message: "Quy trình nhận lại đồ đã hoàn tất." },
  STORAGE_OVERDUE_MARKED: { title: "Vật phẩm quá hạn lưu giữ", message: "Staff sẽ xử lý theo chính sách của campus." },
  FEEDBACK_SUBMITTED: { title: "Đã gửi phản hồi", message: "Phản hồi sau bàn giao đã được ghi nhận." },
  POST_RESOLVED: { title: "Hành trình đã hoàn tất", message: "Bài đăng được đánh dấu đã giải quyết." }
};

function safeEvent(event: RecoveryTimelineRawEvent, viewerId: string) {
  const copy = eventCopy[event.type] ?? { title: "Trạng thái đã cập nhật", message: "Hồ sơ có thay đổi nghiệp vụ mới." };
  return {
    id: event.id,
    type: event.type,
    entityType: event.entityType,
    entityId: event.entityId,
    actor: event.actorId === viewerId ? "YOU" as const : event.actorId ? "PARTICIPANT" as const : "SYSTEM" as const,
    state: event.state,
    title: copy.title,
    message: copy.message,
    createdAt: event.createdAt
  };
}

function nextAction(events: RecoveryTimelineRawEvent[], status: string) {
  const types = new Set(events.map((event) => event.type));
  if (status === "RESOLVED") return null;
  if (types.has("APPOINTMENT_ACCEPTED")) return "Đến điểm bàn giao đúng lịch và xác nhận hoàn trả.";
  if (types.has("CLAIM_ACCEPTED")) return "Tạo hoặc xác nhận lịch bàn giao.";
  if (types.has("CLAIM_NEED_MORE_INFO")) return "Bổ sung thông tin theo yêu cầu của người review.";
  if (types.has("CLAIM_PENDING")) return "Theo dõi kết quả xác minh; không gửi thông tin bí mật qua kênh công khai.";
  if (types.has("MATCH_CANDIDATE_DETECTED")) return "Kiểm tra gợi ý và chỉ gửi claim khi bạn có bằng chứng phù hợp.";
  return "Bổ sung mô tả hoặc chờ hệ thống phát hiện bài FOUND phù hợp.";
}

export const recoveryTimelineService = {
  async get(auth: AccessTokenPayload, postId: string) {
    const post = await recoveryTimelineRepository.postContext(postId);
    if (!post) throw new HttpError(404, "Post not found");
    const reviewer = auth.roles.includes("ADMIN") || auth.roles.includes("STAFF");
    if (!reviewer && post.user_id !== auth.sub && !(await recoveryTimelineRepository.canParticipate(postId, auth.sub))) {
      throw new HttpError(403, "You do not have permission to view this recovery timeline");
    }
    const claimIds = await recoveryTimelineRepository.listClaimIds(
      postId,
      auth.sub,
      reviewer || post.user_id === auth.sub
    );
    const rawEvents = await recoveryTimelineRepository.listEvents(post, claimIds);
    const unique = new Map(rawEvents.map((event) => [event.id, event]));
    const events = Array.from(unique.values())
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
      .map((event) => safeEvent(event, auth.sub));
    return {
      postId,
      currentState: post.status,
      nextAction: nextAction(Array.from(unique.values()), post.status),
      events,
      generatedFrom: "BUSINESS_RECORDS_AND_AUDIT_LOGS",
      privateEvidenceExcluded: true
    };
  }
};

export const recoveryTimelineInternals = { safeEvent, nextAction };
