import type { AdminWarehouseStatus, PostType } from "../services/api";

export const statusLabels: Record<string, string> = {
  OPEN: "Đang mở",
  MATCHED: "Có gợi ý",
  RESOLVED: "Đã trả",
  CLOSED: "Đã đóng",
  EXPIRED: "Hết hạn",
  HIDDEN: "Ẩn"
};

export const typeLabels: Record<PostType, string> = {
  LOST: "Đồ bị mất",
  FOUND: "Đồ nhặt được"
};

export const MATCH_SUGGESTION_CHECK_INTERVAL_MS = 10 * 60 * 1000;

export const warehouseStatuses: AdminWarehouseStatus[] = [
  "PENDING_APPROVAL",
  "RECEIVED",
  "STORED",
  "CLAIMED",
  "RETURNED",
  "EXPIRED",
  "DISPOSED",
  "DONATED",
  "TRANSFERRED"
];

export const warehouseStatusLabels: Record<AdminWarehouseStatus, string> = {
  PENDING_APPROVAL: "Chờ duyệt nhập kho",
  RECEIVED: "Đã nhận",
  STORED: "Đang lưu kho",
  CLAIMED: "Đang có yêu cầu",
  RETURNED: "Đã trả",
  EXPIRED: "Quá hạn",
  DISPOSED: "Đã hủy/thanh lý",
  DONATED: "Đã quyên góp",
  TRANSFERRED: "Đã chuyển giao"
};
