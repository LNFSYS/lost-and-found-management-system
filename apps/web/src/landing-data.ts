import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  CalendarCheck,
  Camera,
  Handshake,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck
} from "lucide-react";

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "orange" | "blue" | "green";
}

export const features: Feature[] = [
  {
    title: "Đăng LOST/FOUND nhanh",
    description: "Biểu mẫu gom đủ ảnh, mô tả, khu vực, thời gian và đặc điểm xác minh bí mật.",
    icon: Camera,
    tone: "orange"
  },
  {
    title: "Bảng tìm kiếm công khai",
    description: "Lọc theo loại tin, danh mục, tòa nhà, thời gian và trạng thái để quét thông tin nhanh.",
    icon: Search,
    tone: "blue"
  },
  {
    title: "AI gợi ý đối sánh",
    description: "OCR, auto tag và matching score giúp nối đúng người mất với người nhặt.",
    icon: Sparkles,
    tone: "green"
  },
  {
    title: "Claim có bằng chứng",
    description: "Người nhận phải cung cấp dấu hiệu riêng, ảnh chứng minh và lịch sử liên quan.",
    icon: ShieldCheck,
    tone: "blue"
  },
  {
    title: "Điểm bàn giao campus",
    description: "Staff quản lý nơi lưu giữ, nhật ký nhận đồ và trạng thái bàn giao minh bạch.",
    icon: Handshake,
    tone: "green"
  },
  {
    title: "Nhắc lịch và thông báo",
    description: "Realtime notification, chat và appointment giúp quá trình trả đồ không bị đứt đoạn.",
    icon: BellRing,
    tone: "orange"
  }
];

export const boardItems = [
  {
    type: "FOUND",
    title: "Ví da nâu tại Alpha",
    location: "Tòa Alpha, tầng 2",
    time: "08:40 hôm nay",
    score: "92%",
    status: "Đang giữ tại Student Service"
  },
  {
    type: "LOST",
    title: "Tai nghe Sony đen",
    location: "Thư viện, khu tự học",
    time: "Chiều qua",
    score: "87%",
    status: "Có 3 tin gần khớp"
  },
  {
    type: "FOUND",
    title: "Thẻ sinh viên K19",
    location: "Sân bóng rổ",
    time: "12:15",
    score: "Xác minh",
    status: "Chờ chủ sở hữu claim"
  }
];

export const flowSteps = [
  {
    title: "1. Báo mất hoặc nhặt được",
    text: "Sinh viên thêm ảnh, vị trí, thời gian và mô tả đủ chi tiết để hệ thống hiểu bối cảnh."
  },
  {
    title: "2. Hệ thống phân tích",
    text: "AI tag, OCR và matching engine chấm điểm các tin liên quan theo text, category, location, time."
  },
  {
    title: "3. Xác minh chủ sở hữu",
    text: "Claim form yêu cầu bằng chứng riêng tư, tránh nhận nhầm và bảo vệ thông tin nhạy cảm."
  },
  {
    title: "4. Hẹn trả đồ an toàn",
    text: "Staff hoặc người nhặt chọn điểm bàn giao, xác nhận trạng thái và cập nhật reputation."
  }
];

export const stats = [
  { value: "172", label: "use case đã phân rã" },
  { value: "13", label: "nhóm nghiệp vụ" },
  { value: "5", label: "vai trò dev rõ ràng" },
  { value: "24/7", label: "public board sẵn sàng" }
];

export const roleCards = [
  {
    icon: UserCheck,
    title: "Sinh viên",
    text: "Đăng tin, tìm kiếm, claim, chat và nhận lại đồ với quy trình rõ ràng."
  },
  {
    icon: CalendarCheck,
    title: "Staff",
    text: "Xác nhận lưu giữ, điều phối lịch hẹn và cập nhật trạng thái bàn giao."
  },
  {
    icon: ShieldCheck,
    title: "Admin",
    text: "Kiểm duyệt, cấu hình hệ thống, xem dashboard và quản lý báo cáo vi phạm."
  }
];
