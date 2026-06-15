# Pending Task Checklist

Last audit: 2026-06-14


## Auth / Account

- [ ] Thêm Google OAuth login.
- [ ] Quyết định rõ Node hay Java sở hữu auth mở rộng.
- [ ] Nếu Java cần auth riêng, bổ sung validate email/password/token tương thích Node.

## User Post / Community Feed

- [ ] Thêm cron chuyển bài quá hạn sang `EXPIRED`.
- [ ] Làm màn sửa bài cho user.
- [ ] Làm nút đóng bài cho user.
- [ ] Làm nút xóa mềm bài cho user.
- [ ] Làm report vi phạm từ phía user.
- [ ] Hoàn thiện chọn/sửa AI suggested category.
- [ ] Thêm gallery/lightbox ảnh bài đăng.
- [ ] Cân nhắc category multi-select nếu cần search nâng cao.
- [ ] Kiểm tra lại index/query plan cho feed khi có nhiều dữ liệu.

## Media

- [ ] Cho phép upload ảnh trong chat.
- [ ] Tạo thumbnail/ảnh tối ưu nếu cần.
- [ ] Cho phép claim upload nhiều evidence file.

## Claim / Evidence

- [ ] Làm UI xem evidence claim cho người có quyền.
- [ ] Làm UI yêu cầu bổ sung thông tin claim.
- [ ] Làm modal accept claim.
- [ ] Làm modal reject claim kèm lý do.
- [ ] Làm nút cancel claim cho claimant.
- [ ] Nếu Java quản lý evidence, thêm guard claim/post relationship.

## Matching / Notification

- [ ] Chuyển matching nặng sang background queue.
- [ ] Thêm chức năng admin chạy lại matching thủ công.
- [ ] Thêm realtime toast khi có match tốt.
- [ ] Thêm notification khi có claim mới.
- [ ] Thêm notification khi claim accepted/rejected.
- [ ] Thêm smart notification theo score tier hoặc digest.

## Handover / Warehouse

- [ ] Thêm job đánh dấu đồ lưu kho quá hạn.
- [ ] Thêm cấu hình hạn lưu giữ theo loại đồ/giá trị.
- [ ] Cảnh báo đồ sắp quá hạn.
- [ ] Làm màn quản lý đồ quá hạn.
- [ ] Làm form biên bản xử lý đồ quá hạn.
- [ ] Cho phép xử lý quá hạn: hủy, quyên góp, chuyển giao, gia hạn.
- [ ] Thêm quản lý sức chứa kho.
- [ ] Cảnh báo kho đạt 80% sức chứa.
- [ ] Chặn chọn kho đã đầy hoặc đề xuất kho khác.
- [ ] Thêm upload ảnh biên bản/bằng chứng bàn giao.
- [ ] Làm API/UI xem vị trí lưu kho hiện tại rõ hơn.

## Appointment

- [ ] Tạo lịch hẹn sau khi claim accepted.
- [ ] Chặn tạo lịch nếu claim chưa accepted.
- [ ] Validate thời gian hẹn.
- [ ] Tránh trùng lịch tại cùng điểm bàn giao.
- [ ] Cho phép chọn điểm bàn giao làm nơi trả.
- [ ] Cho phép nhập địa điểm hẹn tùy chỉnh.
- [ ] Cho phép accept lịch hẹn.
- [ ] Cho phép reject lịch hẹn kèm lý do.
- [ ] Cho phép reschedule lịch hẹn.
- [ ] Cho phép cancel lịch hẹn.
- [ ] Cho phép mark completed.
- [ ] Sau khi completed, cập nhật post thành `RESOLVED` nếu phù hợp.
- [ ] Gửi reminder lịch hẹn qua notification/email.

## Chat / Realtime

- [ ] Tạo chat room sau khi claim accepted.
- [ ] Dựng Socket.IO server với auth/CORS.
- [ ] Cho user liên quan join room theo claim.
- [ ] Gửi tin nhắn text realtime.
- [ ] Lưu message vào DB.
- [ ] Nhận tin nhắn realtime trên web.
- [ ] Làm UI bong bóng chat.
- [ ] Gửi ảnh trong chat.
- [ ] Hiển thị trạng thái đã xem.
- [ ] Thêm unread badge realtime cho tin nhắn.

## Admin Dashboard / Report / Config

- [ ] Thêm biểu đồ số bài LOST/FOUND theo thời gian.
- [ ] Thêm biểu đồ tỷ lệ trả đồ thành công.
- [ ] Thêm biểu đồ theo danh mục.
- [ ] Thêm heatmap khu vực hay mất đồ.
- [ ] Thêm bảng top trusted users.
- [ ] Export báo cáo PDF/CSV.
- [ ] Làm trang chỉnh config đầy đủ trên web.
- [ ] Thêm rollback config.
- [ ] Thêm UI cấu hình expiration bài đăng.
- [ ] Thêm UI cấu hình matching threshold.
- [ ] Thêm UI chỉnh matching weight.
- [ ] Thêm UI cấu hình notification/email rule.
- [ ] Hoàn thiện trang lịch sử config nếu cần thao tác sâu hơn.

## Reputation / Feedback

- [ ] Cộng điểm sau khi trả đồ thành công.
- [ ] Cộng điểm sau khi claim thành công.
- [ ] Trừ điểm khi claim sai nhiều lần.
- [ ] Trừ điểm khi bài bị admin xóa vì vi phạm.
- [ ] Tính reputation level.
- [ ] Làm trang lịch sử reputation.
- [ ] Làm form feedback sau khi trả đồ.
- [ ] Làm màn admin xem feedback xấu và flag user.

## Mobile App

- [ ] Làm mobile auth: đăng ký, OTP, login, logout.
- [ ] Làm mobile profile/edit profile/avatar.
- [ ] Làm mobile feed LOST/FOUND.
- [ ] Làm mobile tạo bài LOST/FOUND.
- [ ] Làm mobile upload ảnh từ camera/gallery.
- [ ] Làm mobile search/filter/sort.
- [ ] Làm mobile claim và upload evidence.
- [ ] Làm mobile handover point list.
- [ ] Làm mobile appointment flow.
- [ ] Làm mobile chat realtime.
- [ ] Làm mobile notification.
- [ ] Lưu token mobile bằng secure storage.
- [ ] Thêm retry/offline handling cho mobile.

## AI Model Training / MLOps

- [ ] Thu thập dữ liệu training từ bài đăng, ảnh, AI tags, match và feedback.
- [ ] Làm công cụ admin label category/tag/match đúng-sai.
- [ ] Làm pipeline export dataset.
- [ ] Làm sạch và ẩn danh dataset trước khi train.
- [ ] Train model phân loại ảnh/category.
- [ ] Train hoặc fine-tune model semantic matching.
- [ ] Thêm AI Lens nhận diện item name, mô tả ảnh, OCR/text, brand/logo.
- [ ] Thêm so sánh trực tiếp ảnh LOST và FOUND.
- [ ] Sau khi AI trả metadata, chạy lại rule-based matching để double-check.
- [ ] Đánh giá model bằng precision/recall/F1/top-k.
- [ ] Lưu model version, dataset snapshot và training metadata.
- [ ] Thêm registry trạng thái model: draft, approved, deployed.
- [ ] Deploy inference endpoint cho model riêng.
- [ ] Fallback về Google Vision/rule matching khi model riêng lỗi.
- [ ] Làm dashboard theo dõi dataset/training/model metrics.
- [ ] Ghi nhận feedback đúng-sai để retraining.
- [ ] Chống spam/dirty feedback trước khi đưa vào dataset.

## Testing / Hardening

- [ ] Viết e2e test cho đăng ký OTP, login, đăng bài, claim.
- [ ] Viết test cho admin CRUD danh mục/khu vực/bàn giao/user/report.
- [ ] Viết test cho claim transition và race condition.
- [ ] Viết test cho warehouse lifecycle.
- [ ] Viết test cho appointment khi implement.
- [ ] Viết test cho notification/matching threshold.
- [ ] Chuẩn hóa seed data demo.
- [ ] Kiểm tra lại migration từ DB trắng.
- [ ] Kiểm tra lại build toàn bộ trước khi nộp.
