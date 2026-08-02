# Báo Cáo Thay Đổi Và Kiểm Chứng - 2026-08-02

## 1. Phạm Vi Báo Cáo

Báo cáo này ghi lại toàn bộ nhóm thay đổi được đưa lên `main` trong commit `2c65c2a`. Phạm vi là Web + Node.js API + MySQL + tài liệu/CI. Mobile không được mở rộng trong đợt này.

Định vị sản phẩm vẫn là:

> MVP web/backend cho quy trình Lost & Found trong campus. Google Vision hỗ trợ OCR/tag; matching là hybrid/rule-based; các quyết định xác minh sở hữu và bàn giao luôn cần con người review.

## 2. Tổng Quan Hoàn Thành

| Nhóm | Trạng thái | Kết quả chính |
| --- | --- | --- |
| Auth/session | Hoàn thành | Session version, refresh/OTP concurrency, Google OAuth state + PKCE |
| Migration/database | Hoàn thành | Migration `026`-`033`, checksum, named lock, trạng thái apply/fail |
| Verification Questions | Hoàn thành MVP | Câu hỏi riêng, bcrypt answer, version pin, transaction lock |
| Campus LOST Radar | Hoàn thành MVP | Baseline/sliding window, threshold, dedupe/cooldown, disposition |
| Visual Hunt | Hoàn thành MVP | Camera/ảnh/video frame/batch, Vision metadata/OCR, fallback |
| Privacy/security | Hoàn thành core | Role guard, private media proxy, PII redaction, upload signature |
| Warehouse/appointment | Hoàn thành hardening | Transition/concurrency guard và actor-aware audit |
| API/docs | Hoàn thành | Swagger/OpenAPI, requirements, BR, traceability và demo guide |
| Automated verification | Hoàn thành local | Build/test/lint/migration/secret/text scan đều pass |
| Live Google Vision | Chưa hoàn thành môi trường | Key đã được đọc nhưng Google project còn `BILLING_DISABLED` |
| Mobile | Không thuộc đợt này | Giữ nguyên theo quyết định ưu tiên Web/backend |

## 3. Auth, Session Và Security Hardening

- Thêm `session_version` để vô hiệu hóa access token/Socket.IO session cũ sau khi đổi mật khẩu, role hoặc trạng thái tài khoản.
- Refresh-token rotation và OTP consumption dùng transaction/lock để một token hoặc OTP chỉ được tiêu thụ một lần khi có request đồng thời.
- Google OAuth dùng state một lần, PKCE S256 và cookie callback `HttpOnly`; state/verifier dùng Redis khi có hoặc TTL store giới hạn cho local một process.
- Auth middleware kiểm tra lại session hiện hành thay vì chỉ tin JWT đã ký.
- Private evidence/media được tải qua endpoint có authorization; response không trả raw Cloudinary URL/public ID cho actor không phù hợp.
- Upload tiếp tục kiểm tra MIME, kích thước và magic bytes JPEG/PNG/WEBP.

File chính:

- `apps/api-node/src/services/access-session.service.ts`
- `apps/api-node/src/services/google-oauth-request.ts`
- `apps/api-node/src/middlewares/auth.middleware.ts`
- `apps/api-node/src/repositories/session.repository.ts`
- `apps/api-node/src/services/auth.service.ts`
- `apps/api-node/src/services/media.service.ts`

## 4. Migration Và Tính Toàn Vẹn Database

| Migration | Nội dung |
| --- | --- |
| `026_user_session_version.sql` | Session invalidation version |
| `027_notification_idempotency.sql` | Dedupe/idempotency notification |
| `028_operational_guard_indexes.sql` | Index/guard phục vụ luồng vận hành |
| `029_ai_verification_questions.sql` | Câu hỏi xác minh và câu trả lời claim |
| `030_campus_event_radar.sql` | Event, alert và Radar audit |
| `031_ai_feature_flags.sql` | Ba kill switch AI-assisted độc lập |
| `032_ai_feedback_and_question_options.sql` | Multiple choice, version assignment, Visual Hunt feedback |
| `033_ai_operational_thresholds.sql` | Threshold Radar/Visual Hunt có thể cấu hình |

Migration runner hiện có:

- MySQL named lock để tránh hai process migrate đồng thời;
- SHA-256 checksum để phát hiện sửa migration đã áp dụng;
- trạng thái `APPLYING`, `APPLIED`, `FAILED`;
- smoke check cho schema/invariant mới.

Kết quả local: 36 migration records, migration smoke pass.

## 5. AI-assisted Verification Questions

### Chức năng

- FOUND owner hoặc Staff/Admin có thể yêu cầu gợi ý câu hỏi theo category/item/OCR metadata.
- Người review nhập expected answer; database chỉ lưu bcrypt hash.
- Hỗ trợ `TEXT`, `MASKED_SERIAL`, `MULTIPLE_CHOICE`, `VISUAL_DETAIL`.
- Câu hỏi approved được pin theo version vào claim, nên thay câu hỏi mới không làm đổi câu hỏi của claim cũ.
- Claimant không nhận expected answer, hash hoặc kết quả đúng/sai từng lần.
- Reviewer chỉ nhận review signal hỗ trợ; hệ thống không tự xác nhận chủ sở hữu.
- Giới hạn năm lần thử.
- Claim chưa trả lời câu hỏi bắt buộc không thể được accept.
- Khi lưu answer, repository lock claim và kiểm tra claimant/status/assignment trong cùng transaction; claim terminal không thể nhận answer do race.

### Endpoint

- `POST /api/posts/:id/verification-questions/suggest`
- `GET /api/posts/:id/verification-questions`
- `POST /api/posts/:id/verification-questions`
- `PATCH /api/posts/:id/verification-questions/:questionId/status`
- `GET /api/claims/:id/verification-questions`
- `POST /api/claims/:id/verification-questions/:questionId/answer`

### File chính

- `verification-question.controller.ts`
- `verification-question.service.ts`
- `verification-question.repository.ts`
- `VerificationQuestionManager.tsx`
- `e2e-verification-questions.ts`

## 6. Campus Lost Event Radar

### Thuật toán hiện tại

- Chỉ phân tích dữ liệu LOST tổng hợp, không theo dõi thiết bị/người dùng.
- Cửa sổ quan sát 60 phút, bước trượt 15 phút.
- Baseline 28 ngày theo phạm vi khu vực/category.
- Dùng observed count, expected mean, standard deviation, z-score và observed ratio.
- Có minimum count, threshold, fingerprint dedupe và cooldown.
- Alert có `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED` cùng lý do disposition.
- Category filter hiển thị đúng count ngay cả khi không có alert `ALL_CATEGORIES`, đồng thời tránh cộng trùng alert tổng và alert con.
- Endpoint bài liên quan chỉ trả public LOST summary; không trả contact, evidence, media hoặc OCR riêng tư.

### Endpoint

- `GET/POST /api/admin/radar/events`
- `POST /api/admin/radar/events/:id/analyze`
- `GET /api/admin/radar/alerts`
- `GET /api/admin/radar/alerts/:id/posts`
- `PATCH /api/admin/radar/alerts/:id/status`
- `GET /api/admin/radar/audit`

### Giới hạn trung thực

- Không tự kết luận một vụ mất đồ là do mưa hoặc sự kiện.
- Weather/event phải có nguồn được Admin nhập.
- Chưa có weather/calendar adapter tự động.

## 7. Visual Hunt Web/PWA

### Chức năng

- Staff/Admin có thể dùng camera browser, một ảnh, frame từ video quay sẵn hoặc batch tối đa năm ảnh.
- Browser chỉ mở camera sau thao tác người dùng; không gửi stream liên tục 30-60 FPS.
- Node gửi một frame/ảnh rõ ràng đến Google Vision khi provider hoạt động.
- Ranking kết hợp Vision label, object, OCR, màu và metadata bài đã lưu.
- Raw scan buffer không được lưu; buffer được giải phóng sau xử lý.
- Có Safe Search, OCR PII redaction, role guard, rate limit và image signature validation.
- Candidate chỉ là gợi ý; không tự đổi post/claim/warehouse status.
- Staff có thể ghi feedback `CANDIDATE` hoặc `NOT_RELEVANT`.

### Endpoint

- `POST /api/admin/visual-hunt`
- `POST /api/admin/visual-hunt/feedback`

### Provider và fallback

- Cấu hình bằng `GOOGLE_VISION_API_KEY` trong `.env` cục bộ.
- Google Cloud project phải enable Cloud Vision API, liên kết Billing và cho phép API trong key restriction.
- Provider error được log bằng HTTP status, provider status, reason và message giới hạn độ dài; API key được redact.
- Runtime ngày 2026-08-02 đã xác định `PERMISSION_DENIED/BILLING_DISABLED`; đây là việc cấu hình Google Cloud còn lại, không phải lỗi thuật toán trong repo.
- Khi provider lỗi, endpoint trả fallback có ghi rõ, không giả vờ đã phân tích hình ảnh đầy đủ.

### Giới hạn trung thực

- Chưa có exact-instance recognition.
- Chưa có bounding box ổn định.
- Không dùng face recognition.
- Chưa có embedding/custom-trained image model production.

## 8. Config, Feature Flag Và Observability

Feature flags:

- `ai.verification_questions_enabled`
- `ai.campus_radar_enabled`
- `ai.visual_hunt_enabled`

Operational config:

- `ai.radar.minimum_observed_count`: `3..50`
- `ai.radar.minimum_z_score`: `1..10`
- `ai.radar.minimum_observed_ratio`: `1.1..10`
- `ai.visual_hunt.candidate_threshold`: `0..1`

API update và rollback đều từ chối giá trị ngoài range; Web config có `min`, `max`, `step` tương ứng. Runtime clamp vẫn được giữ như defense in depth.

Metrics/log hiện ghi request ID, latency, matching queue, verification answer, Radar analysis/emission/disposition và Visual Hunt provider/result/feedback.

Redis là tùy chọn cho local một API instance. Log `socket_adapter_ready mode=single-process reason=redis-unavailable` là fallback dự kiến. Scale-out nhiều API instance phải cấu hình Redis và đặt `REDIS_REQUIRED=true`.

## 9. Appointment, Warehouse Và Notification Hardening

- Appointment transition dùng compare-and-set/transaction guard.
- Một claim chỉ có tối đa một active appointment.
- Slot handover xung đột được serialize.
- Warehouse terminal disposition bị chặn khi còn claim/appointment active, gồm `RESCHEDULED`.
- Completion/storage log ghi đúng actor thực hiện.
- Matching notification có idempotency key và chỉ đánh dấu notified sau khi notification được persist.
- Private appointment/chat/evidence media tiếp tục đi qua application proxy có authorization.

## 10. Frontend Và UX

- Thêm navigation Staff/Admin cho Visual Hunt và Radar theo feature flag.
- Verification Question Manager được tích hợp vào FOUND post/claim flow.
- Radar có map aggregate, filter category/thời gian/khu vực, alert disposition và danh sách bài liên quan.
- Visual Hunt có camera permission state, image/video/batch fallback, candidate cards và feedback.
- UI sử dụng wording `AI-assisted`, `review confidence`, `candidate`; không dùng wording tự xác minh sở hữu.
- Playwright đã kiểm tra camera bị từ chối, camera không khả dụng, video-frame fallback, batch upload và Radar category count.

## 11. API Contract Và CI

- `apps/api-node/swagger.yaml` và runtime `/api/docs` đã thêm endpoint mới.
- Runtime OpenAPI tự bảo đảm mọi `{pathParam}` có khai báo required path parameter.
- Visual Hunt feedback contract đồng bộ status `200` với controller.
- CI thêm verification-question E2E cùng các gate migration, role/privacy, Redis runtime, Java build và container build hiện có.

## 12. Bằng Chứng Kiểm Tra

### Chạy ngày 2026-08-02

| Command | Kết quả |
| --- | --- |
| `npm run build:api` | Pass |
| `npm run test:api` | 56 pass, 2 opt-in MySQL tests skipped |
| `npm run lint:web` | Pass |
| `npm run build:web` | Pass |
| `npm run smoke:migration` | Pass, 36 migration records |
| `npm run scan:secrets` | Pass, staged snapshot không có secret thật |
| `npm run scan:text` | Pass |
| `git diff --check` | Pass trước commit |

### Chạy ngày 2026-08-01

| Command | Kết quả |
| --- | --- |
| `npm run e2e:verification-questions` | Pass |
| `npm run e2e:roles` | Pass |
| `npm run e2e:web` | 13 pass, 1 credential-dependent login test skipped |
| Swagger YAML parse | Pass |
| Runtime OpenAPI path parameter validation | Pass |

## 13. Checklist Sau Triển Khai

### Đã hoàn thành

- [x] Migration `026`-`033` và migration integrity.
- [x] Verification Questions đầy đủ API/UI/privacy/concurrency guard.
- [x] Campus LOST Radar đầy đủ API/UI/statistical guard/audit.
- [x] Visual Hunt đầy đủ API/UI/input fallback/privacy guard.
- [x] Feature flags, bounded config và metrics.
- [x] Session/OAuth/OTP/refresh hardening.
- [x] Appointment/warehouse/notification concurrency hardening.
- [x] Swagger/OpenAPI, requirements, business rules và traceability.
- [x] Build/unit/migration/role/privacy/Playwright checks nêu trên.

### Chưa hoàn thành hoặc cần môi trường thật

- [ ] Bật Billing cho Google Cloud project và chạy lại một Visual Hunt request để xác nhận Vision OCR/tag live.
- [ ] Rehearse camera điện thoại qua HTTPS trên Wi-Fi/ngày bảo vệ.
- [ ] Giữ ảnh/video upload làm fallback bắt buộc.
- [ ] Chờ GitHub Actions của commit mới chạy xanh trên blank MySQL/Redis/container/Java jobs.
- [ ] Thực hiện backup/restore drill trên provider database trước campus pilot.
- [ ] Thực hiện benchmark 10k/50k/100k và lưu artifact nếu dùng để tuyên bố scalability.
- [ ] Mobile tiếp tục deferred; không tính là phần hoàn thành của đợt này.

## 14. Cách Trình Bày An Toàn

Nên nói:

> Nhóm đã triển khai ba công cụ AI-assisted trên nền Node modular monolith: câu hỏi xác minh theo ngữ cảnh, Radar thống kê LOST và Visual Hunt dùng Google Vision OCR/tag kết hợp rule-based similarity. Tất cả kết quả chỉ hỗ trợ người review và không tự xác nhận quyền sở hữu hoặc tự trả đồ.

Không nên nói:

- custom-trained AI production model;
- exact-instance computer vision;
- hệ thống tự xác minh chủ sở hữu;
- production microservices hoàn chỉnh;
- mobile native đã hoàn thiện.
