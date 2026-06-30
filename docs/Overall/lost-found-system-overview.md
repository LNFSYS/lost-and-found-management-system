# FPTU Lost & Found System Overview

Last updated: 2026-06-30

## 1. Mục Tiêu Sản Phẩm

FPTU Lost & Found System là hệ thống quản lý đồ thất lạc cho FPT University Campus Đà Nẵng. Hệ thống giúp sinh viên, giảng viên và nhân viên:

- Đăng tin mất đồ hoặc nhặt được đồ.
- Tìm kiếm và nhận gợi ý đồ tương tự bằng thuật toán matching.
- Gửi claim kèm bằng chứng sở hữu.
- Trao đổi realtime sau khi claim hợp lệ.
- Hẹn lịch bàn giao hoặc nhận lại đồ tại điểm bàn giao/kho.
- Hỗ trợ Staff/Admin quản lý kho, điểm bàn giao, báo cáo và kiểm duyệt.

AI/OCR và matching chỉ đóng vai trò hỗ trợ quyết định. Việc trả đồ vẫn cần bằng chứng và xác nhận của người có quyền.

## 2. Vai Trò Người Dùng

| Vai trò | Mô tả |
| --- | --- |
| Guest | Xem bảng tin công khai, đăng ký/đăng nhập |
| Student/Lecturer | Đăng LOST/FOUND, gửi claim, xem gợi ý matching, chat, lịch hẹn |
| Staff | Tập trung vận hành kho, điểm bàn giao, xử lý vật phẩm |
| Admin | Quản trị người dùng, danh mục, khu vực, kiểm duyệt, báo cáo, cấu hình |
| System | Tự động matching, thông báo, hết hạn bài/kho, nhắc lịch |

## 3. Phạm Vi Hiện Tại

| Nhóm chức năng | Trạng thái |
| --- | --- |
| Auth OTP, login, refresh, logout, forgot/reset password | Đã có |
| Board LOST/FOUND, search/filter/sort/detail | Đã có |
| User post create/update/close/soft-delete/report | Đã có |
| Upload ảnh bài viết, ảnh evidence, avatar | Đã có |
| Google Vision OCR/tag/category suggestion | Một phần, phụ thuộc cấu hình Vision |
| Matching text/category/location/time, explain, manual re-run | Đã có |
| Popup matching khi đăng nhập/mở web/chu kỳ 10 phút | Đã có |
| Claim evidence, confidence percentage, accept/reject/request info/cancel | Đã có |
| Handover point map image, marker coordinates, stored item count | Đã có |
| Warehouse status, retention deadline, expiry, capacity warning | Đã có phần chính |
| Appointment create/accept/reject/reschedule/cancel/complete/reminder | Đã có API và UI chính |
| Socket.IO chat/notification, seen status, chat image URL | Một phần, thiếu unread badge và upload file chat trực tiếp |
| Admin dashboard charts, moderation, CRUD, CSV export | Đã có phần chính |
| Reputation score/history | Đã có |
| Mobile app | Chưa làm, đang nằm ngoài phạm vi hiện tại |
| AI training/MLOps | Chưa làm, để riêng theo backlog AI |

## 4. Kiến Trúc

| Thành phần | Công nghệ | Trách nhiệm |
| --- | --- | --- |
| Web | React, TypeScript, Vite, TanStack Query, Socket.IO Client | UI cho Guest/User/Staff/Admin |
| Node API | Express, TypeScript, MySQL, Zod, JWT, Socket.IO | Auth, post, media, claim base, matching, realtime, admin/staff API |
| Java Service | Spring Boot, Spring Security, JPA | Business service mở rộng: claim transition, handover/config theo Java |
| Database | MySQL 8 | Dữ liệu quan hệ, migration từ Node |
| Media/AI | Cloudinary, Google Vision | Lưu ảnh, OCR/tag/category suggestion |
| Mobile | React Native | Future enhancement, not current MVP core |

## 5. Quy Tắc Nghiệp Vụ Cốt Lõi

1. User chỉ được đăng/sửa/đóng/xóa mềm bài của mình, Admin có quyền kiểm duyệt.
2. LOST post cần thông tin xác minh riêng tư; FOUND post cần vị trí đang giữ hoặc điểm bàn giao.
3. Claim chỉ áp dụng cho FOUND post đủ điều kiện; owner không được claim bài của chính mình.
4. Một user chỉ được gửi một claim cho một post.
5. Evidence/contact/chat không được hiển thị công khai.
6. Matching không tự động chấp nhận claim hoặc trả đồ.
7. Appointment chỉ tạo sau khi claim được accepted.
8. Hoàn tất appointment phải cập nhật post/kho/log/reputation khi phù hợp.
9. Vật phẩm hết hạn kho phải xử lý theo quy trình dispose/donate/transfer/extend và có log.
10. Staff không có quyền rộng như Admin; Staff tập trung vào kho và bàn giao.

## 6. Tài Liệu Canonical

Các tài liệu sau là nguồn chính, tránh tạo thêm checklist trùng:

- `docs/Checklist/master-dev-checklist.md`
- `docs/Checklist/pending-tasks.md`
- `docs/Requirements and Business Rules/requirements.md`
- `docs/Requirements and Business Rules/business-rules.md`
- `docs/Requirements and Business Rules/traceability-matrix.md`
- `docs/Overall/architecture.md`
- `docs/Overall/project-super-overview.md`
- `docs/Overall/mvp-scope-and-future-work.md`

## 7. Phần Còn Lại Ngoài AI Training Và Mobile

- Google OAuth hoặc quyết định rõ Node/Java ownership cho auth extension.
- Upload file trực tiếp trong chat và proof image cho handover/return.
- Unread badge realtime cho chat.
- Full web config page và rollback/history UI.
- Smart notification theo score tier/digest.
- Feedback sau khi hoàn trả và admin review negative feedback.
- Test/e2e cho role matrix, warehouse lifecycle, claim race condition, migration blank DB.
