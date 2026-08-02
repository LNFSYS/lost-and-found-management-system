# Đánh giá độc lập toàn diện dự án - 27/07/2026

## 1. Phạm vi và phương pháp

- Snapshot: nhánh `main`, commit `de41cbe052dcaa2e972dc6cc0e28dd253d0230ba`.
- Core được chấm: React Web + Node.js API + MySQL + Socket.IO.
- Java/Spring Boot được xem là extension tùy chọn, write-disabled mặc định và chưa thuộc runtime Compose hiện tại.
- Mobile, custom AI training/MLOps và production microservices không được tính là core hoàn thành.
- Rubric sử dụng đúng 13 tiêu chí và trọng số của audit ngày 15/07 để có thể so sánh trực tiếp.
- Ba góc review độc lập: Software Architect, Backend Architect và Code Reviewer; kết luận cuối được đối chiếu lại bằng source, CI và lệnh local.

Mức bằng chứng:

| Nhãn | Ý nghĩa |
| --- | --- |
| Verified by code | Xác minh trực tiếp từ source/migration/workflow |
| Verified by run | Đã chạy lệnh và có kết quả trong phiên audit |
| Verified by CI | GitHub Actions chạy trên đúng commit |
| External evidence missing | Cần staging/provider/credential thật, repo không tự chứng minh được |

## 2. Kết luận điều hành

Project đã vượt mức CRUD và có happy path web/backend tương đối rộng:

`LOST/FOUND -> matching -> claim/evidence -> human review -> appointment -> warehouse/handover -> realtime -> dashboard`.

Tuy nhiên, mức **MVP 9.0/10** và **production readiness 7.8/10** trong báo cáo trước đang cao hơn bằng chứng code hiện tại. Repo còn lỗi nghiệp vụ và security có thể tái hiện về mặt source, không chỉ thiếu staging hoặc benchmark.

| Mốc | Phán quyết | Điều kiện |
| --- | --- | --- |
| Bảo vệ đồ án | **Conditional Go** | Sửa warehouse bypass và appointment transition race trước ngày bảo vệ |
| MVP demo nội bộ | **Conditional Go** | Dùng seed/CI-isolated DB, không bật Java writes, không phụ thuộc live OCR/email |
| Campus pilot có giám sát | **No-Go hiện tại** | Cần xử lý toàn bộ High, staging smoke và backup/restore drill |
| Production diện rộng | **No-Go** | Cần hardening security, migration, outbox, benchmark, monitoring và vận hành |

**Điểm MVP có bằng chứng: 7.2/10.**

**Production readiness có bằng chứng: 5.9/10.**

Không phát hiện Critical đã xác nhận. Có **6 High**, **10 Medium** và **2 Low** cần theo dõi.

### Implementation follow-up cùng ngày

Sau audit, working tree đã triển khai và chạy regression cho toàn bộ 6 High cùng các Medium ưu tiên. Đây là điểm follow-up dựa trên code local chưa commit; bảng 7.2/5.9 bên dưới được giữ làm baseline trước khi sửa.

| Finding | Trạng thái sau sửa | Bằng chứng |
| --- | --- | --- |
| H-01 Warehouse policy bypass | **Đã đóng** | POST/PUT chặn terminal status; process guard chạy trong transaction/row lock; warehouse E2E pass |
| H-02 Appointment race | **Đã đóng** | CAS/row lock + named slot lock; bốn race scenarios pass trên MySQL |
| H-03 Stale role/status token | **Đã đóng** | `session_version` áp dụng cho HTTP và Socket.IO; Admin E2E xác minh token cũ nhận `401` |
| H-04 Refresh replay race | **Đã đóng** | Rotation single-use trong transaction; DB integration test xác minh đúng một request thắng |
| H-05 Google OAuth request binding | **Đã đóng** | One-time state + PKCE, Redis/local TTL store, HttpOnly callback cookie và negative tests |
| H-06 Migration integrity | **Đã đóng ở mức MVP** | MySQL named lock, SHA-256 checksum, `APPLYING/APPLIED/FAILED`; DDL partial failure được chặn để operator xử lý |
| M-01/M-02 Warehouse concurrency | **Đã đóng** | Capacity mutation serialized; `RESCHEDULED` nằm trong active appointment guard |
| M-03 Post evidence privacy | **Đã đóng** | Evidence chỉ trả authenticated proxy path; raw URL/public ID bị loại khỏi API |
| M-04 OTP race | **Đã đóng** | Conditional one-time consume; DB integration test với 10 request đồng thời |
| M-05 Appointment slot race | **Đã đóng** | Named lock theo handover point bao quanh conflict check và create/reschedule |
| M-07 Side-effect reliability | **Partial** | Matching notification có dedupe key và chỉ mark notified sau khi insert; chưa có outbox tổng quát |
| L-01 Query limit | **Đã đóng** | Zod coercion/int/range validation 1-100 |

Điểm follow-up thận trọng sau regression:

- **MVP web/backend: khoảng 8.2/10**.
- **Production readiness: khoảng 6.6/10**.
- **Bảo vệ đồ án: Go sau một lượt CI xanh trên commit mới**.
- **Campus pilot: Conditional Go**, vẫn cần staging, backup/restore drill, monitoring và benchmark matching lớn.

Điểm chưa tăng lên 9 vì live browser-to-API core journey, transactional outbox tổng quát, large-dataset benchmark, staging operations và maintainability debt vẫn còn.

## 3. Bảng điểm có trọng số

| Tiêu chí | Trọng số | MVP /10 | Quy đổi | Production /10 | Quy đổi | Nhận xét |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Business correctness | 12% | 7.8 | 0.936 | 6.1 | 0.732 | Core flow rộng; warehouse và appointment còn lỗ hổng invariant |
| Architecture | 10% | 7.4 | 0.740 | 6.1 | 0.610 | Node owner rõ; boundary Java và module nội bộ chưa enforce |
| Security | 14% | 6.3 | 0.882 | 5.0 | 0.700 | Hashing/CORS/rate limit tốt; stale JWT, refresh race, OAuth state còn hở |
| Privacy/data protection | 7% | 7.5 | 0.525 | 6.0 | 0.420 | Claim/proof proxy tốt; post evidence còn trả raw storage metadata |
| Code quality | 8% | 7.2 | 0.576 | 6.1 | 0.488 | TypeScript sạch, SQL parameterized; check-then-act và God repositories còn nhiều |
| Maintainability | 8% | 6.6 | 0.528 | 5.6 | 0.448 | Đã tách web theo feature; Admin/CSS/API facade/repositories vẫn lớn |
| Testability/coverage | 9% | 8.0 | 0.720 | 6.8 | 0.612 | CI/E2E rộng; browser core chủ yếu mock, thiếu các race/auth tests quan trọng |
| Performance | 7% | 6.8 | 0.476 | 5.5 | 0.385 | Có prefilter/smoke; chưa đo matching end-to-end trên dataset lớn |
| Scalability | 6% | 7.0 | 0.420 | 5.8 | 0.348 | Redis adapter và durable queue tốt; chưa có outage/LB/ordering/DB budget test |
| Reliability/concurrency | 6% | 6.5 | 0.390 | 5.0 | 0.300 | Claim invariant tốt; appointment/warehouse/refresh/migration còn race |
| UX/UI | 5% | 8.0 | 0.400 | 7.0 | 0.350 | Demo journey rõ; lỗi backend cạnh tranh có thể tạo trạng thái UI mâu thuẫn |
| Documentation | 4% | 8.5 | 0.340 | 7.6 | 0.304 | Tài liệu rộng và scope AI/mobile trung thực; một số claim/checklist lệch code |
| DevOps/deployment | 4% | 7.5 | 0.300 | 5.5 | 0.220 | CI/container/release ZIP tốt; chưa deploy registry/staging/restore/alerting |
| **Tổng** | **100%** |  | **7.233** |  | **5.917** | Làm tròn: **7.2 / 5.9** |

## 4. Điểm mạnh đã xác minh

- Claim acceptance dùng transaction và `FOR UPDATE`; invariant một accepted claim/FOUND post có guard service và database.
- Migration 024 có unique generated key cho một active appointment/claim.
- Claim secret được bcrypt hash; refresh token lưu hash; web refresh token dùng cookie `HttpOnly`, `SameSite=Lax`.
- Helmet, CORS allowlist, route-level rate limit, image magic-byte validation và trusted Cloudinary downloader đã có.
- Claim evidence và appointment proof đi qua authenticated proxy với `private, no-store`.
- Matching dùng TF-IDF + category/location/time/image/OCR, tier 45/60/75/85, explanation và MySQL-backed retry queue.
- Redis adapter, distributed limiter, readiness, metrics, request ID và graceful shutdown đã có.
- CI chạy blank MySQL 8 migrations 001-025, seed, database E2E, Redis hai instance, Java build và container build.
- Web có URL/back-forward thật; Playwright phủ LOST, FOUND, claim, Staff review, appointment, proof, feedback và match labeling ở tầng UI contract.
- Wording “hybrid/rule-based + Google Vision assisted OCR”, mobile future work và Java extension là phù hợp.

## 5. Findings

### High

#### H-01 - Có thể bỏ qua warehouse disposition policy qua full update

`warehouseSchema` cho phép `DISPOSED`, `DONATED`, `TRANSFERRED` tại `apps/api-node/src/controllers/admin.controller.ts:52`, và `PUT /admin/warehouse-items/:id` chuyển thẳng status tại `apps/api-node/src/repositories/admin.repository.ts:1222`.

Endpoint này không gọi grace-period, document-transfer, active claim/appointment guard của `/process`. Item có thể bị thanh lý/quyên góp/chuyển giao khi chưa đủ điều kiện.

**Fix:** cấm terminal status trong create/full-update; mọi terminal transition chỉ đi qua `/process`. Guard phải tính cả `RESCHEDULED` và chạy trong cùng transaction/lock. Thêm E2E cho PUT bypass và active claim/appointment.

#### H-02 - Appointment state machine có lost-update race

Service đọc trạng thái trước tại `apps/api-node/src/services/appointment.service.ts:193`, sau đó accept/reject/cancel/reschedule update chỉ với `WHERE id = ?` tại `appointment.repository.ts:263-317`.

Hai request đối nghịch có thể cùng vượt validation, cùng gửi notification và để trạng thái cuối phụ thuộc last writer.

**Fix:** dùng compare-and-set theo allowed previous statuses hoặc transaction + `FOR UPDATE`; kiểm tra `affectedRows`. Thêm race E2E accept-vs-reject, complete-vs-cancel, reschedule-vs-complete.

#### H-03 - Khóa user hoặc hạ role không vô hiệu access token hiện hành

`auth.middleware.ts:19-34` chỉ verify JWT và dùng roles trong token. Admin update status/roles chỉ sửa DB tại `admin.repository.ts:586` và `:669`.

User bị khóa hoặc Admin bị gỡ role vẫn dùng token cũ tối đa theo TTL access token, mặc định khoảng 15 phút; Socket.IO có cùng mô hình.

**Fix:** thêm `tokenVersion/sessionVersion`, tăng version và revoke refresh tokens khi status/role đổi; HTTP và Socket kiểm tra status/version hiện tại hoặc cache ngắn có invalidation. Thêm E2E token cũ bị từ chối ngay.

#### H-04 - Refresh-token rotation chưa bảo đảm single use

Token cũ được đọc ngoài transaction tại `auth.service.ts:539`; repository insert token mới rồi revoke token cũ nhưng không yêu cầu update đúng một row tại `user.repository.ts:474`.

Hai refresh đồng thời có thể cùng nhận token mới hợp lệ.

**Fix:** lock token cũ trong transaction, conditional consume trước khi insert replacement, rollback nếu affected row khác 1. Thêm concurrency test yêu cầu đúng một `200` và một `401`.

#### H-05 - Google OAuth thiếu state/PKCE

Authorization URL tại `auth.service.ts:198-208` không tạo `state` hoặc PKCE; callback đổi mọi `code` không có request binding.

Rủi ro là login CSRF/account confusion.

**Fix:** state + PKCE verifier one-time, cookie `HttpOnly/SameSite/Secure` có TTL; callback timing-safe validate và consume. Thêm test missing/mismatch/reuse.

#### H-06 - Migration runner thiếu lock/checksum và không atomic với MySQL DDL

`run-migrations.ts:67-99` chỉ lưu filename, không checksum/advisory lock. `beginTransaction` không làm MySQL DDL atomic vì DDL implicit commit.

Hai migration runners có thể chạy đồng thời; schema drift hoặc DDL hoàn thành một phần khó phát hiện/reconcile.

**Fix:** lấy MySQL named lock cho migration, lưu SHA-256 checksum, fail khi checksum drift, thiết kế mỗi migration idempotent và backup trước DDL rủi ro.

### Medium

#### M-01 - Warehouse capacity/state update vẫn là check-then-act

Capacity và previous status được đọc ngoài transaction; insert/update không có conditional status. Request đồng thời có thể vượt capacity hoặc ghi đè state.

#### M-02 - Warehouse guard bỏ sót appointment `RESCHEDULED`

Guard tại `admin.repository.ts:446` chỉ kiểm tra `PENDING`, `ACCEPTED`, trong khi migration 024 và business rule xem `RESCHEDULED` là active.

#### M-03 - Post evidence còn trả raw storage metadata

`post.repository.ts:478` trả `secure_url`, derivatives và `public_id`; service chỉ lọc viewer. Claim evidence/proof đã proxy nhưng post evidence chưa đồng nhất.

**Fix:** authenticated proxy riêng cho post evidence; response chỉ trả app path, không trả raw URL/public ID.

#### M-04 - OTP consume và reset/register chưa atomic

Đọc OTP, tăng attempt, verify và consume qua nhiều query riêng; hai request đồng thời có thể dùng cùng OTP hoặc vượt attempt policy.

#### M-05 - Appointment schedule conflict là check-then-insert

Conflict check và insert không chung transaction/slot lock; hai claim khác nhau có thể đặt cùng handover point trong cửa sổ 30 phút.

#### M-06 - Multi-file upload/count chưa atomic

Media count được đọc trước rồi upload/insert từng file. Concurrent upload có thể vượt max; lỗi giữa chừng có thể để lại record/asset một phần.

#### M-07 - Side effect/audit chưa dùng outbox hoặc cùng transaction

Matching đánh dấu notified trước khi insert notifications. Claim state và audit log, appointment completion và reputation/notification cũng có transaction boundary khác nhau.

#### M-08 - Browser core journey chủ yếu dùng API mock

`web-core-mocked.spec.ts` intercept toàn bộ `**/api/**`. Live browser test mới chủ yếu xác minh login/session; API E2E và UI E2E đang chạy tách rời.

**Fix:** thêm một live Playwright journey Student -> claim -> Staff -> appointment -> proof -> complete trên MySQL CI.

#### M-09 - Benchmark lớn chưa đo matching end-to-end

Workflow 10k/50k/100k chưa có run. Script HTTP smoke đo `/health` và `/posts`, chưa đo queue wait, matching throughput hay job completion latency.

#### M-10 - Maintainability và contract drift

- `AdminDashboardView.tsx`: khoảng 1.884 dòng.
- `styles.css`: khoảng 5.015 dòng.
- `api.ts`: khoảng 1.074 dòng.
- `admin.repository.ts`: khoảng 1.565 dòng.
- `post.repository.ts`: khoảng 1.245 dòng.
- `shared` chưa được app import và thiếu status `HIDDEN`.
- Runtime docs dùng `openapi.ts`, nhưng `swagger.yaml` vẫn tồn tại mà không có drift check.

### Low

#### L-01 - Query limit chưa validate chặt

`auth.controller.ts:186` dùng `Number()` trực tiếp; `NaN`, âm hoặc vô hạn có thể đi xuống repository và gây `500`.

#### L-02 - Traceability/checklist chưa luôn đồng bộ với test evidence

Traceability hiện chủ yếu nối BR-FR-UC, chưa nối source/endpoint/test. Một số ô `[x]` chỉ chứng minh có code, không đồng nghĩa invariant đã được concurrency test.

## 6. Node.js và Java boundary

| Flow | Runtime owner hiện tại | Đánh giá |
| --- | --- | --- |
| Auth/Post/Matching/Claim/Appointment/Warehouse | Node.js | Core write owner |
| Notification/Chat | Node.js + Socket.IO | Core runtime |
| Java Admin | Write-disabled mặc định | Optional/dormant extension, build-only trong topology hiện tại |

`JAVA_WRITES_ENABLED=false` là guard tốt, nhưng chỉ là boolean toàn cục. Khi bật, nhiều Java writers mở cùng lúc trong khi Node writers vẫn hoạt động. Java chưa có test source, không nằm trong Compose runtime và claim/handover rules chưa tương đương Node.

Wording an toàn:

> Hệ thống hiện là layered Node.js monolith đang được modular hóa; Java/Spring Boot là optional business extension, write-disabled mặc định và chưa phải production microservice.

## 7. Bằng chứng đã chạy

### Local

| Command | Kết quả |
| --- | --- |
| `npm run build:api` | Pass |
| `npm run test:api` | Pass, 29/29 |
| `npm run build:web` | Pass; bundle JS 406.80 kB, gzip 113.89 kB |
| `npm run e2e:web` | Pass, 10; skip 1 credential-dependent |
| `npm run typecheck:mobile` | Pass; mobile không tính vào core |
| `npm run scan:secrets` | Pass, 300 tracked files |
| `npm run scan:text` | Pass; cảnh báo Google Vision credential chưa cấu hình |
| `npm audit --workspace apps/api-node --workspace apps/web --omit=dev --audit-level=high` | 0 vulnerabilities |
| `npm run package:release` | Pass; archive từ clean tracked `HEAD` |
| `npm run build:java` | Local fail do máy không có Maven; CI Java job pass |
| `git diff --check` | Pass |

Không chạy migration/E2E DB local vì database workstation đang dưới migration 024 và không được tự ý mutate shared DB.

### CI

GitHub Actions run `30251105421` trên đúng commit `de41cbe` kết luận **success**:

- `build-and-check`: success.
- `database-smoke`: success.
- `java-build`: success.
- `container-build`: success.

Performance benchmark workflow 10k/50k/100k hiện chưa có run/artifact.

## 8. Thứ tự sửa để tăng điểm nhanh nhất

### P0 - Trước ngày bảo vệ

- [x] Chặn terminal warehouse status ở create/full-update; thêm guard `RESCHEDULED` và transaction.
- [x] Chuyển appointment transitions sang atomic CAS/row lock; thêm race tests.
- [x] Thêm OAuth state/PKCE.
- [x] Làm refresh-token rotation single-use bằng transaction.
- [x] Vô hiệu token cũ khi user status/roles thay đổi.
- [ ] Thêm một live full-stack Playwright core journey.

### P1 - Trước campus pilot

- [x] Thêm migration named lock + checksum drift detection.
- [x] Proxy post evidence và bỏ raw storage metadata.
- [x] Làm OTP consume one-time bằng conditional update và concurrency test.
- [x] Khóa schedule slot và warehouse capacity/state transitions.
- [ ] Thêm transactional outbox/idempotent side effects.
- [ ] Chạy benchmark 10k/50k/100k có matching queue/job metrics.
- [ ] Deploy staging, rotate credential và diễn tập backup/restore.

### P2 - Maintainability

- [ ] Tách Admin UI, web API facade, admin/post repositories theo bounded context.
- [ ] Chọn một OpenAPI source of truth và thêm contract drift check.
- [ ] Chỉ bật Java write theo từng flow sau khi có Node adapter và integration tests.

## 9. Kết luận cuối

Đây là một đồ án có **scope nghiệp vụ tốt, CI mạnh và nhiều quyết định đúng hơn CRUD thông thường**. Điểm yếu hiện tại không nằm ở số lượng tính năng mà ở các transaction/security boundary chưa khóa hoàn toàn.

Cách trình bày trung thực:

> Nhóm xây dựng MVP web/backend cho quy trình Lost & Found campus. Matching là hybrid/rule-based có Google Vision hỗ trợ OCR/tag khi được cấu hình. Quyết định sở hữu và bàn giao luôn cần con người review. Hệ thống đã có CI và E2E trên MySQL/Redis cô lập, nhưng vẫn cần hardening concurrency, OAuth/session revocation và staging operations trước campus pilot.

Sau regression local, điểm MVP follow-up hợp lý là khoảng **8.2/10**. Muốn bảo vệ mức **9.0**, project vẫn cần live full-stack journey, benchmark matching lớn, staging/restore evidence và giảm technical debt ở Admin/repositories.
