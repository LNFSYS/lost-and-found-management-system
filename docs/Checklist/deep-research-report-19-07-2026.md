# Báo cáo chất lượng hiện hành - 19/07/2026

## Phạm vi đánh giá

- Snapshot: nhánh `main`, commit `b4b6458`.
- CI evidence: GitHub Actions run `29693045128` - **pass**.
- Core được chấm: React Web + Node.js API + MySQL + Socket.IO; Java/Spring Boot là business extension read-only mặc định.
- Mobile, custom AI training/MLOps và production microservices không được tính là core hoàn thành.

Nguồn trạng thái chi tiết:

- Backlog: [pending-tasks.md](pending-tasks.md)
- Release gate: [release-checklist.md](release-checklist.md)
- Implementation evidence: [../../CODEX_IMPLEMENTATION_PLAN.md](../../CODEX_IMPLEMENTATION_PLAN.md)
- Kiến trúc: [../Overall/architecture.md](../Overall/architecture.md)

## Kết luận

Project là một **MVP web/backend có workflow nghiệp vụ xuyên suốt**, không còn ở mức CRUD cơ bản:

`LOST/FOUND -> matching -> claim/evidence -> human review -> appointment -> warehouse/handover -> realtime -> dashboard`.

| Mốc | Trạng thái | Nhận xét |
| --- | --- | --- |
| Bảo vệ đồ án | **Go** | Core flow, role, privacy, concurrency và CI đủ thuyết phục |
| Campus pilot có giám sát | **Conditional Go** | Cần hosted staging, secret rotation và backup/restore drill |
| Production diện rộng | **No-Go** | Chưa có benchmark lớn, provider restore evidence và vận hành dài hạn |

**Điểm MVP hiện tại: 8.8/10.**

**Production readiness: 7.5/10.**

Điểm chưa lên 9 không đến từ thiếu thêm module. Phần còn thiếu chủ yếu là evidence môi trường thật: benchmark 10k-100k, staging smoke, backup/restore và external-service test credentials.

## Evidence đã xác minh

GitHub Actions run `29693045128` đã pass:

- Secret scan và release packaging từ clean checkout.
- API build và 26 API unit/policy/schema tests.
- Web production build và Playwright.
- Blank MySQL 8 migrations 001-025, schema smoke và demo seed.
- Core, role/privacy, warehouse, claim-race, media-privacy, chat-gating, evidence-policy và Admin CRUD E2E.
- Redis runtime hardening.
- Hai API instance: notification đi qua Redis adapter và chỉ đến đúng user room.
- Performance smoke với P50/P95/P99/error-rate artifact.
- Java 21/Maven build.
- API và Web container build.

Local verification sau refactor:

- `npm run build:api`: pass.
- `npm run test:api`: 26/26 pass.
- `npm run build:web`: pass.
- `npm run e2e:web`: 6 pass, 1 credential-dependent skip.
- `npm run scan:secrets`: pass.
- `git diff --check`: pass.
- `npm run smoke:migration`: local database còn dưới migration 024 nên thiếu `return_appointments.active_claim_id`; blank MySQL CI 001-025 pass. Không tự động mutate database dùng chung trong phiên kiểm tra.

## Vấn đề đã đóng

- [x] Hardening đã commit/push và CI xanh đúng snapshot.
- [x] Blank migration 001-025 và toàn bộ DB E2E chạy trên MySQL cô lập.
- [x] Java build và API/Web container build chạy trong CI.
- [x] Redis adapter được kiểm tra với hai API instance.
- [x] User-room isolation được kiểm tra bằng notification riêng tư.
- [x] Browser routing/back-forward hoạt động bằng URL thật.
- [x] Browser contract phủ Student tạo LOST, mở FOUND để gửi claim, Staff review/accept và tạo appointment.
- [x] Staff không nhìn thấy tab Admin-only.
- [x] `App.tsx` giảm còn khoảng 750 dòng; post detail, claim dialogs và claim workflows đã tách theo feature.
- [x] Private claim/media URL không được serialize trực tiếp.
- [x] Accepted claim và active appointment có concurrency invariant ở service/database.

## Finding còn mở

### High

#### H-01 - Credential từng chia sẻ cần được rotate

Không lặp lại secret trong tài liệu. Team cần rotate DB/JWT/SMTP/Cloudinary/Google credential từng xuất hiện trong ảnh hoặc artifact và cập nhật secret store riêng.

#### H-02 - Chưa có staging và backup/restore evidence

Container, migration gate và runbook đã có nhưng chưa deploy hosted staging hoặc restore backup sang database tạm. Vì vậy không được dùng wording “production-ready”.

### Medium

#### M-01 - Global CSS và Admin module còn lớn

`styles.css` và `AdminDashboardView.tsx` vẫn là technical debt. Tách từng domain CSS/Admin panel, mỗi lát phải giữ build và Playwright xanh; không cần big-bang refactor trước bảo vệ.

#### M-02 - Backend repository còn tập trung

`post.repository.ts` và `admin.repository.ts` vẫn chứa nhiều SQL/read-write mapping. Nên tách read model/write repository theo domain mà không đổi REST contract.

#### M-03 - Browser E2E chưa phủ chứng từ và completed return

API E2E đã phủ sâu và Playwright đã đi qua Staff review -> appointment. Phần proof upload -> completed return -> feedback chưa có browser journey đầy đủ.

#### M-04 - Chưa có benchmark lớn được lưu

Performance smoke đã pass, candidate prefilter đã có, nhưng chưa có artifact 10k/50k/100k. Không khẳng định khả năng chịu tải campus lớn trước khi chạy workflow benchmark.

#### M-05 - Matching chưa có corpus campus đủ lớn

Matching hiện là hybrid/rule-based với text/category/location/time/image/OCR, tier 45/60/75/85 và explanation. Chưa đủ labeled dataset để khẳng định precision/recall thực tế hoặc gọi là custom-trained AI.

#### M-06 - Shared schema Node/Java vẫn là debt

Node là write owner. Java phải giữ `JAVA_WRITES_ENABLED=false` trừ khi team chuyển ownership một flow bằng contract và integration test rõ ràng.

## Node.js và Java boundary

| Flow | Owner |
| --- | --- |
| Auth/profile/role | Node.js |
| Posts/media/report | Node.js |
| Matching/feedback | Node.js |
| Claims/evidence | Node.js |
| Appointment | Node.js |
| Warehouse/handover | Node.js |
| Notification/chat | Node.js + Socket.IO |
| Java Admin | Read-only business extension mặc định |

Cách trình bày an toàn: **modular Node.js core API với Java business extension**, không gọi là production microservices.

## Điều kiện thực tế để tiến gần 9.0

- [ ] Rotate toàn bộ credential từng được chia sẻ.
- [ ] Chạy benchmark 10k/50k/100k và lưu latency, error rate, query plan.
- [ ] Deploy một staging environment và chạy core smoke sau deploy.
- [ ] Thực hiện backup/restore drill sang database tạm.
- [ ] Thêm Playwright cho proof upload -> completed return -> feedback.
- [ ] Tách thêm Admin/CSS/repository theo từng lát nhỏ.
- [ ] Kiểm tra Google Vision, SMTP, OAuth và Cloudinary bằng test credential riêng.

## Wording bảo vệ

Nên nói:

> Nhóm xây dựng MVP web/backend cho quy trình Lost & Found trong campus. Matching là hybrid/rule-based có Google Vision hỗ trợ OCR/tag khi được cấu hình. Quyết định sở hữu và trả đồ luôn cần người có thẩm quyền review.

Không nên nói:

- Production-ready trên diện rộng.
- Custom trained AI model đã hoàn thiện.
- Native mobile đã hoàn thiện.
- Production microservices hoàn chỉnh.
