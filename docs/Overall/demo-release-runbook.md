# Demo And Release Runbook

Last updated: 2026-08-03

Tài liệu này dùng để chuẩn bị môi trường demo/release mà không làm bẩn database Aiven dùng chung.

## 1. Secrets

1. Không commit, gửi ZIP hoặc chụp màn hình `.env` thật.
2. Copy `.env.example` thành `.env` trên từng máy và gửi secret qua kênh riêng của nhóm.
3. Nếu password Aiven, JWT secret, SMTP, Cloudinary hoặc Google credential từng xuất hiện trong ảnh/file chia sẻ, chủ tài khoản phải rotate/revoke trước buổi bảo vệ.
4. Chỉ `.env.example` với placeholder được đưa vào Git. Kiểm tra bằng `git ls-files | rg "(^|/)\.env"`.

## 2. Tách Database

Không chạy seed/e2e trên database đang dùng làm dữ liệu demo chính.

| Database | Mục đích |
| --- | --- |
| `fptu_lost_found_demo` | Dữ liệu ổn định để trình bày |
| `fptu_lost_found_test_<member>` | Migration smoke, e2e và thử nghiệm của từng thành viên |

Với Aiven, tạo database test riêng trong cùng service nếu gói hiện tại cho phép. Nếu không, dùng MySQL local/CI. Không để nhiều thành viên chạy e2e ghi/xóa trên cùng demo database.

## 3. Chuẩn Bị Database Mới

```powershell
Copy-Item .env.example .env
npm install
npm run check:db
npm run migrate:api
npm run seed:demo
npm run smoke:migration
```

Migration `020_matching_jobs.sql` tạo hàng đợi matching nền. Migrations 034-036 thêm Private Assistance và User Recovery Assistance. Chỉ bật các feature flag mới sau khi migration smoke pass trên schema checksum-clean. Sau migrate, khởi động lại Node API để worker xử lý matching.

Migrations 035-036 khởi tạo bảy feature flag mới với giá trị `false`. Sau `smoke:migration`, chạy E2E tương ứng trên database test rồi mới bật từng flag qua cấu hình Admin; không sửa SQL hoặc migration ledger để bật nhanh.

## 4. Chạy Ứng Dụng

```powershell
npm run dev:api
npm run dev:web
```

Socket.IO dùng chung HTTP server và `API_PORT`; không có `SOCKET_PORT` riêng. Redis là dependency tùy chọn cho local/MVP một instance: đặt `REDIS_REQUIRED=false` để API fallback sang in-memory limiter và Socket.IO single-process khi Redis không chạy. Với nhiều API instance, cấu hình `REDIS_URL`, đặt `REDIS_REQUIRED=true`, đồng thời cấu hình `FRONTEND_URL` và `SOCKET_CORS_ORIGIN`.

Log `socket_adapter_ready` với `mode=single-process` và `reason=redis-unavailable` là fallback dự kiến cho local một instance, không phải lỗi startup. Không dùng trạng thái này khi scale-out nhiều API instance.

Camera trình duyệt yêu cầu secure context. Dùng `localhost` trên máy có webcam hoặc chạy web qua HTTPS/tunnel để mở bằng điện thoại. Luôn chuẩn bị gallery upload làm fallback.

## 5. Kiểm Tra Trước Demo

```powershell
npm run test:api
npm run build:api
npm run build:web
npm run smoke:migration
npm run e2e:core
npm run e2e:roles
npm run e2e:warehouse
npm run e2e:claim-race
npm run e2e:media-privacy
npm run e2e:chat-gating
npm run e2e:claim-evidence-policy
npm run e2e:private-assistance
npm run e2e:user-recovery-tools
npm run e2e:web
```

Các lệnh e2e cần API đang chạy và phải trỏ vào database test đã migrate. CI dùng MySQL service biệt lập; Java build chạy trên runner có Java 21 + Maven. Không bỏ qua checksum drift hoặc sửa migration ledger để ép pass.

## 6. Demo User Recovery Assistance

1. Đăng nhập Student, tạo một bài LOST và mở chi tiết bài.
2. Dùng Search Companion, trả lời một câu, xem score preview rồi chọn áp dụng hoặc giữ riêng.
3. Mở Finder Quick Scan, chụp/upload một ảnh, xem candidate từ 60%, chỉnh draft và publish FOUND.
4. Mở Recovery Timeline để trình bày tiến trình thực tế của post/claim/appointment.
5. Nhắc rõ mọi score là gợi ý; Staff/người nhặt vẫn xác minh claim và hoàn thành bàn giao thủ công.

## 7. Fallback

- Cloudinary lỗi: dùng ảnh seed, không demo upload live.
- Google Vision lỗi: kiểm tra `GOOGLE_VISION_API_KEY`, API, billing và key restriction. Nếu provider chưa sẵn sàng, trình bày rõ fallback; matching text/category/location/time vẫn hoạt động.
- Camera bị từ chối: dùng gallery upload hoặc ảnh mẫu; không mô tả đây là AR production.
- SMTP lỗi: dùng tài khoản seed thay vì đăng ký OTP live.
- Java không chạy: demo core Node; trình bày Java là extension và dùng build evidence từ CI.
- Aiven chậm: dùng database local/test backup và video ngắn của flow chính.
