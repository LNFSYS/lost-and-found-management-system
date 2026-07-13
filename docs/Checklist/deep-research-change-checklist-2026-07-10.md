# Deep Research Change Checklist - 2026-07-10

Nguồn đối chiếu: `C:\Users\ADMIN\Downloads\deep-research-report.md`.

Mục tiêu: chuyển các phát hiện trong báo cáo deep research thành checklist có bằng chứng. `[x]` là đã có code, test hoặc tài liệu trong working tree; `[~]` là đã giảm rủi ro nhưng còn bước vận hành hoặc refactor; `[ ]` là chưa hoàn tất. Theo yêu cầu hiện tại, các task Mobile không được triển khai trong đợt này.

## P0 - Bảo mật và lỗi nghiệp vụ

- [~] Rotate toàn bộ secret từng xuất hiện trong screenshot hoặc file chia sẻ.
  - Repo chỉ track `.env.example`; `.env` thật đã được ignore.
  - Hướng dẫn rotate/provision nằm trong `docs/Overall/demo-release-runbook.md`.
  - Còn lại: chủ tài khoản Aiven, Cloudinary, Google và SMTP phải revoke/rotate trên provider; code không thể tự làm thay.

- [x] Loại `.env` thật khỏi Git và chuẩn hóa secret provisioning.
  - `git ls-files` chỉ thấy `.env.example` và `apps/api-node/.env.example`.
  - Release runbook yêu cầu không đưa `.env` vào ZIP hoặc demo artifact.

- [x] Chặn claim chat khi claim chưa được chấp nhận.
  - `chatRepository.canUseClaimChat` yêu cầu trạng thái `ACCEPTED` và đúng participant, Staff hoặc Admin.
  - Join, gửi text, gửi ảnh, seen và upload/xem ảnh chat dùng cùng policy.

- [x] Thêm regression test cho chat gating.
  - Unit: `claim-chat.policy.test.ts` kiểm tra participant/reviewer và các trạng thái.
  - E2E: `npm run e2e:chat-gating` kiểm tra `PENDING`/`ACCEPTED`/`REJECTED`/`CANCELLED` và URL ảnh giả mạo.

- [x] Loại `mediaUrl` khỏi socket payload `chat:image`.
  - Web chỉ gửi `mediaPublicId`.
  - Server kiểm tra public ID thuộc folder của claim và resolve asset qua Cloudinary API.

- [x] Chặn SSRF/proxy ảnh ngoài nguồn tin cậy.
  - Protected media chỉ fetch HTTPS từ `res.cloudinary.com/<configured-cloud>/image/upload/...`.
  - Có timeout, kiểm tra MIME image và giới hạn response 15 MB.

- [x] Giới hạn API CORS cho demo/production.
  - Allowlist dùng `FRONTEND_URL`/`SOCKET_CORS_ORIGIN`; local origin chỉ mở ngoài production.
  - `credentials: true` phục vụ refresh cookie.

- [x] Chặn public access tới post `HIDDEN` và ẩn contact info trong match suggestions.

## P1 - Security, architecture và scalability

- [x] Chuyển refresh token web khỏi `localStorage`.
  - Refresh token dùng cookie `httpOnly`, `SameSite=Lax`, `Secure` trong production.
  - Access token chỉ giữ trong memory; web tự rotate/restore phiên khi reload.
  - Mobile/API client vẫn tương thích với refresh token body.

- [x] Chốt policy upload claim evidence.
  - Chỉ claimant được upload khi claim `PENDING` hoặc `NEED_MORE_INFO`.
  - Post owner/Staff/Admin được review nhưng không upload thay claimant.

- [x] Chuyển matching sang background queue.
  - Migration `020_matching_jobs.sql` tạo queue MySQL có version, retry, backoff và recovery job bị treo.
  - Create/update/media chỉ enqueue; suggestion polling chỉ đọc match đã materialize.

- [x] Tối ưu text search.
  - Query dùng FULLTEXT index `ft_posts_search`; truy vấn cực ngắn fallback sang prefix `LIKE`.

- [x] Loại N+1 trong `explainMatches()`.
  - Source và counterpart được fetch theo batch rồi map trong memory.

- [x] Thêm distributed lock cho scheduled jobs.
  - MySQL `GET_LOCK('lnfs:scheduled-jobs:v1', 0)` ngăn nhiều Node instance chạy cùng job batch.

- [~] Chốt one-writer-per-flow cho Node/Java.
  - ADR-001 và boundary matrix quy định Node là core writer, Java là extension.
  - Trước production split, gateway/feature flag phải vô hiệu writer cũ và có contract test khi chuyển flow.

- [x] Sửa Java `handover_points.room_id` schema mismatch.
  - Java build được thêm vào CI Java 21/Maven; máy local hiện tại chưa có Maven.

- [x] Xóa config drift `SOCKET_PORT` và Redis.
  - Socket.IO dùng chung `API_PORT`; Redis không phải dependency của MVP nên đã bỏ khỏi env example, Docker Compose và runtime env.

- [x] Cập nhật runtime dependencies có CVE cao trực tiếp: `multer@2.2.0`, `nodemailer@9.0.3`.

- [~] Theo dõi audit còn lại mà không ép breaking upgrade.
  - CI chạy `npm audit` ở chế độ advisory.
  - Vite/Expo transitive issues cần major upgrade riêng; Expo/Mobile được loại khỏi đợt này.

## P2 - Maintainability, CI và testability

- [x] Thêm CI build/quality cơ bản.
- [x] Thêm MySQL 8 service riêng trong CI để migrate, seed, smoke schema và chạy core/role/warehouse/claim-race/chat-gating E2E.
- [x] Thêm Java 21/Maven build vào CI.
- [x] Thêm API unit test bằng Node test runner cho permission policy.
- [x] Thêm dependency audit vào CI ở mức advisory có lý do.
- [~] Thêm Playwright browser automation.
  - Đã có routing/back-forward và login/refresh-cookie session smoke, chạy trong CI cùng isolated API/DB.
  - Còn lại: mở rộng browser automation cho create/matching/claim/appointment/warehouse; API E2E đã phủ các flow này.
- [~] Giảm God File web giai đoạn một: đã tách types/constants/helpers/shell/admin/media widgets.
- [~] Tách tiếp `apps/web/src/App.tsx` theo pages/features.
  - Đã chuyển navigation sang `react-router-dom`, tách `features/posts/PostCard.tsx`, `features/posts/BoardView.tsx`, và tách toàn bộ `features/account` gồm view/forms.
  - `App.tsx` giảm còn khoảng 4.2k dòng; Create/Admin/Claim vẫn cần tách tiếp.
  - Còn lại: tách Create/Admin/Claim thành module độc lập.
- [~] Tách `apps/web/src/styles.css` theo feature/design-token strategy.
  - Account/auth/profile styles đã chuyển sang `features/account/account.css`.
  - Global stylesheet vẫn còn khoảng 5.6k dòng; cần tiếp tục tách theo Board/Admin/Claim/Handover.
- [ ] Mobile refactor/navigation/device test: bỏ qua theo yêu cầu hiện tại.

## P3 - Process, docs và runbook

- [x] Tạo ADR cho Node/Java write ownership: `docs/Overall/adr-001-node-java-write-ownership.md`.
- [x] Cập nhật release checklist về secret rotation, shared Socket port, Redis, dependency audit, chat/media guard và database test.
- [x] Tạo demo/release runbook với database demo/test tách biệt: `docs/Overall/demo-release-runbook.md`.
- [x] Thêm logging/measurement tối thiểu.
  - Matching worker log post, attempt, số match, batch duration.
  - Scheduled jobs log lock ownership và duration.
  - Production observability tập trung vẫn là future work.

## Bổ sung sau khi đối chiếu code

- [x] Khóa terminal warehouse disposition khỏi generic status endpoint.
- [x] Thêm form biên bản xử lý quá hạn cho donate/transfer/dispose; vẫn kiểm tra grace period, claim và appointment.
- [x] Thêm UI xác nhận áp dụng category do Google Vision gợi ý; không tự thay category im lặng.
- [x] Update core E2E để chờ kết quả background matching tối đa 30 giây.
- [x] Sửa lệch timezone Aiven trong queue bằng UTC insert và migration `021_matching_jobs_utc.sql`; core E2E đã pass sau sửa.
- [x] Thêm `e2e:claim-evidence-policy` cho claimant-only/status guard.
- [x] Giữ migration `016`, `017` idempotent và thêm migration `020` vào schema smoke.

## Việc còn lại sau đợt này

1. Chủ tài khoản rotate secret trên các provider và lưu bằng chứng hoàn tất.
2. Chạy `npm run migrate:api` trên database test/demo mới để áp dụng migration 020; không chạy E2E trên database demo dùng chung.
3. Chạy các E2E khi API và database test đang hoạt động.
4. Hoàn thiện Playwright browser flow.
5. Tiếp tục tách web God File/CSS theo từng feature, không refactor một lần quá lớn. Router cho các màn công khai đã dùng URL thật.
6. Khi chuyển một flow sang Java, thêm gateway/feature flag và integration test để enforce one-writer bằng runtime.

## Lệnh verify

```bash
npm run test:api
npm run build:api
npm run build:web
npm run smoke:migration
npm run e2e:chat-gating
npm run e2e:core
npm run e2e:roles
npm run e2e:warehouse
npm run e2e:claim-race
npm run e2e:media-privacy
npm run build:java
git diff --check
```

Lưu ý: local hiện tại không có Docker/Maven; CI là nơi xác minh blank MySQL và Java build. E2E cần API đang chạy với database test đã migrate/seed.
