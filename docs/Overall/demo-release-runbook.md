# Demo And Release Runbook

Last updated: 2026-07-10

Tài liệu này dùng để chuẩn bị môi trường demo/release mà không làm bẩn database Aiven dùng chung.

## 1. Secrets

1. Không commit, gửi ZIP hoặc chụp màn hình `.env` thật.
2. Copy `.env.example` thành `.env` trên từng máy và điền secret qua kênh riêng của nhóm.
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

Migration `020_matching_jobs.sql` tạo hàng đợi matching nền. Sau migrate, khởi động lại Node API để worker bắt đầu xử lý.

## 4. Chạy Ứng Dụng

```powershell
npm run dev:api
npm run dev:web
```

Socket.IO dùng chung HTTP server và `API_PORT`; không có `SOCKET_PORT` riêng. Redis không phải dependency của MVP hiện tại. Cấu hình origin web bằng `FRONTEND_URL` và `SOCKET_CORS_ORIGIN`.

## 5. Kiểm Tra Trước Demo

```powershell
npm run test:api
npm run quality:release
npm run e2e:core
npm run e2e:roles
npm run e2e:warehouse
npm run e2e:claim-race
npm run e2e:media-privacy
npm run e2e:chat-gating
npm run e2e:claim-evidence-policy
npm run e2e:web
```

Các lệnh e2e cần API đang chạy và phải trỏ vào database test. CI dùng MySQL service biệt lập để migrate/smoke; Java build được chạy trên runner có Java 21 + Maven.

## 6. Fallback

- Cloudinary lỗi: dùng ảnh seed, không demo upload live.
- Google Vision lỗi: trình bày OCR/tag là assisted/fallback-dependent; matching text/category/location/time vẫn hoạt động.
- SMTP lỗi: dùng tài khoản seed thay vì đăng ký OTP live.
- Java không chạy: demo core Node; trình bày Java là extension và dùng build evidence từ CI.
- Aiven chậm: có database local/test backup và video ngắn của flow chính.
