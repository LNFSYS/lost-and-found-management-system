# Deep Research Review - 19/07/2026

## 1. Thông tin đánh giá

**Project:** FPTU Lost & Found Management System - Campus Đà Nẵng

**Đối tượng:** working tree hiện tại trên nhánh `main` tại commit nền `16d71c6`

**Ngày đánh giá:** 19/07/2026

**Phạm vi ưu tiên:** Web + Node.js core API + Java extension; mobile không được tính là core hoàn thiện
**Cách chấm:** giữ nguyên 13 tiêu chí và trọng số của report 15/07/2026 để so sánh cùng thang đo.

Review được thực hiện theo ba góc nhìn agent:

- `engineering-code-reviewer`: correctness, security, maintainability, performance và test.
- `engineering-backend-architect`: API, database, concurrency, Redis, realtime, observability và deployment.
- `engineering-software-architect`: bounded context, Node/Java ownership, scope MVP và khả năng tiến hóa.

> Lưu ý: report này đánh giá **working tree chưa commit**. Những thay đổi chưa được push và chưa có GitHub Actions run xanh không được xem là bằng chứng release đã hoàn thành.

## 2. Executive Summary

Project hiện là một **MVP web/backend khá hoàn chỉnh và có chiều sâu nghiệp vụ**, vượt rõ mức CRUD cơ bản. Core flow có thể giải thích tốt khi bảo vệ:

`LOST/FOUND post -> hybrid matching -> claim evidence -> human review -> appointment -> warehouse/handover -> notification/realtime -> dashboard`.

Các cải thiện sau report 15/07 có giá trị thật:

- Khóa concurrency cho accepted claim và active appointment bằng transaction, row lock và DB constraint.
- Chuẩn hóa private media qua authenticated proxy; socket không gửi raw private URL cho client.
- Matching có candidate prefilter, OCR/image score, threshold tier và explanation.
- Có Redis tùy chọn cho distributed limiter và Socket.IO adapter, kèm local fallback.
- Có structured log, request ID, liveness, readiness, metrics và graceful shutdown.
- Có API/web Dockerfile, Compose migration gate, release workflow và benchmark workflow.
- Web đã dùng URL/router thật; Create Post, claim chat/verification và active Admin dashboard được tách khỏi `App.tsx`.
- API test hiện pass 25/25; dependency audit API/web không phát hiện vulnerability.

Điểm yếu lớn nhất không còn là thiếu core feature mà là **thiếu bằng chứng vận hành**:

1. Hardening mới vẫn nằm trong working tree chưa commit/push, nên CI chưa xác minh chính snapshot này.
2. Migration 024-025 và DB-backed E2E chưa được chạy trên MySQL cô lập trong phiên đánh giá.
3. Benchmark 10k/50k/100k, multi-instance Socket.IO soak, staging và backup/restore drill chưa có artifact thực tế.
4. Frontend và một số repository vẫn lớn, dù đã bắt đầu refactor đúng hướng.

### Phán quyết

| Mốc | Kết luận | Lý do |
| --- | --- | --- |
| Defense/demo có chuẩn bị dữ liệu | **Go** | Core flow, role, matching, claim, appointment và warehouse có code/test đủ thuyết phục cho đồ án |
| Campus pilot nhỏ có giám sát | **Conditional Go** | Cần migration/E2E cô lập, secret rotation, CI xanh và runbook vận hành thực tế |
| Production diện rộng | **No-Go** | Chưa có staging evidence, restore drill, benchmark lớn và multi-instance soak |

## 3. Bằng chứng kiểm tra ngày 19/07/2026

| Kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| `npm run build:api` | **Pass** | TypeScript API compile thành công |
| `npm run test:api` | **Pass 25/25** | Policy, privacy, validation, observability và Redis policy |
| `npm run build:web` | **Pass** | Vite 6 production build thành công |
| `npm run lint:web` | **Pass** | Web TypeScript `--noEmit` pass |
| `npm run e2e:web` | **3 pass, 1 skip** | Routing, API-mocked Student create-LOST và Staff permission pass; seeded login skip khi không truyền E2E credential |
| `npm run scan:secrets` | **Pass** | Không phát hiện secret trong tracked files |
| `npm run scan:text` | **Pass có cảnh báo** | Google Vision credential chưa cấu hình; OCR phải demo bằng fallback hoặc môi trường đã cấu hình |
| API/web production dependency audit | **0 vulnerability** | `npm audit --omit=dev --audit-level=moderate` |
| `GET /api/health/ready` | **HTTP 200** | DB và matching queue OK; Redis đang `local_fallback`, không phải distributed runtime proof |
| Web runtime | **HTTP 200** | Local web server phản hồi |
| `git diff --check` | **Pass** | Không có whitespace error |

### Chưa được xác minh trong phiên này

- Migration 024-025 trên blank/isolated MySQL.
- DB-backed `e2e:core`, role, warehouse, claim-race, media privacy và admin CRUD trên snapshot hiện tại.
- Java Maven build trên máy local.
- API/web Docker image build thực tế.
- Redis distributed runtime với nhiều API instance.
- Benchmark 10k/50k/100k và query-plan artifact.
- Google Vision, SMTP, OAuth và Cloudinary end-to-end bằng credential production-like.
- Backup/restore trên Aiven hoặc provider được chọn.

## 4. Findings theo mức độ

### Critical

Không phát hiện Critical mới có bằng chứng trực tiếp trong source hiện tại.

### High

#### H-01 - Snapshot cải thiện chưa có CI/release evidence

**Bằng chứng:** `git status` có nhiều file modified/untracked, gồm Redis, observability, workflows, Dockerfiles và frontend refactor. Commit nền vẫn là `16d71c6`.

**Tác động:** thành viên clone `main` chưa nhận được hardening mới; không thể viện dẫn GitHub Actions như bằng chứng cho working tree hiện tại.

**Đề xuất:** review diff, commit theo nhóm thay đổi rõ ràng, push và chỉ tick CI/container/runtime sau khi workflow của đúng commit xanh.

#### H-02 - Migration 024-025 chưa có runtime proof trên DB cô lập

**Bằng chứng:** `024_one_active_appointment_per_claim.sql` tạo unique active appointment; `025_matching_candidate_prefilter.sql` bổ sung nền performance. Checklist vẫn để hai migration này ở trạng thái chờ isolated DB.

**Tác động:** invariant appointment và query/index mới đúng theo code nhưng chưa được chứng minh trên blank schema/current snapshot.

**Đề xuất:** chạy migration smoke và toàn bộ DB E2E trên MySQL test riêng trước khi áp dụng shared demo DB.

#### H-03 - Chưa có bằng chứng deploy/rollback/restore thực tế

**Bằng chứng:** Dockerfile, Compose, release workflow và `deployment-and-rollback.md` đã có; container build, staging deploy và provider restore drill chưa được chạy trong phiên này.

**Tác động:** chưa thể tuyên bố production-ready hoặc đảm bảo thời gian phục hồi khi migration/deploy lỗi.

**Đề xuất:** lưu CI artifact, deploy staging, thực hiện smoke sau deploy và một lần restore sang DB tạm.

#### H-04 - Credential từng xuất hiện trong ảnh cần được coi là đã lộ

**Bằng chứng:** lịch sử làm việc có ảnh dashboard DB chứa thông tin kết nối. Report không lặp lại bất kỳ giá trị secret nào và không thể xác minh secret đã rotate.

**Tác động:** credential cũ có thể được dùng ngoài ý muốn dù repository hiện không chứa secret tracked.

**Đề xuất:** rotate DB password và các secret từng chia sẻ; cập nhật secret store của từng thành viên, không commit `.env`.

### Medium

#### M-01 - Frontend God-file và global CSS vẫn còn lớn

**Bằng chứng:** `apps/web/src/App.tsx` còn khoảng 1.7k dòng sau khi tách shared shell, board/posts, Create Post, account, claim chat/verification và Admin. `styles.css` khoảng 5.4k dòng; module Admin khoảng 1.9k dòng và post-detail/claim orchestration vẫn còn lớn.

**Tác động:** review khó, dễ conflict khi nhiều thành viên cùng sửa, regression UI khó cô lập.

**Đề xuất:** tách Post Detail/Claim theo route-level component, sau đó chia nội bộ Admin theo warehouse/config/moderation và chuyển CSS theo feature từng đợt nhỏ.

#### M-02 - Repository backend vẫn tập trung nhiều trách nhiệm

**Bằng chứng:** `post.repository.ts` khoảng 1.25k dòng và `admin.repository.ts` khoảng 1.57k dòng; trong khi `post.service.ts` đã được thu gọn đáng kể.

**Tác động:** SQL/policy mapping khó review, thay đổi một domain có thể ảnh hưởng domain khác.

**Đề xuất:** tách read model, write repository và admin repository theo warehouse/config/master-data/report; không đổi API contract trong cùng đợt.

#### M-03 - Browser E2E chưa phủ full core workflow

**Bằng chứng:** Playwright đã phủ routing/back-forward, API-mocked Student đăng nhập và tạo LOST post, cùng Staff đăng nhập và kiểm tra không thấy tab Admin-only. Seeded login vẫn phụ thuộc credential; claim review, appointment và return chưa có browser journey đầy đủ.

**Tác động:** API có coverage tốt hơn UI, nhưng lỗi nối form -> API -> status -> notification vẫn có thể lọt.

**Đề xuất:** mở rộng tiếp FOUND -> claim -> Staff review -> appointment -> return trên isolated seed DB; giữ mock-contract tests để phản hồi nhanh trên mọi máy.

#### M-04 - Scale-out mới có implementation, chưa có load evidence

**Bằng chứng:** Redis adapter và distributed rate limiter đã có; local readiness hiện báo `local_fallback`.

**Tác động:** chưa biết reconnect, room isolation và limiter consistency khi chạy từ hai API instance trở lên.

**Đề xuất:** chạy Compose/CI với Redis bắt buộc, sau đó soak hai API instance với Socket.IO clients.

#### M-05 - Matching tốt hơn nhưng chưa có corpus campus đủ lớn

**Bằng chứng:** matching có text/category/location/time/image/OCR score, tier 45/60/75/85%, caps và explanation; benchmark lớn và labeled dataset thật chưa có.

**Tác động:** chưa thể khẳng định precision/recall thực tế hoặc gọi đây là custom trained AI.

**Đề xuất:** giữ wording “rule-based/hybrid matching with Google Vision assisted OCR”, thu feedback và đánh giá top-k trên dữ liệu đã ẩn danh.

#### M-06 - Node/Java boundary đúng hướng nhưng shared schema vẫn là debt

**Bằng chứng:** Node là write owner; Java mặc định `JAVA_WRITES_ENABLED=false` và dùng cùng MySQL schema.

**Tác động:** nếu bật Java write mà không chuyển owner theo flow, có thể phát sinh state divergence/race condition.

**Đề xuất:** duy trì one-writer-per-flow; Java chỉ read/extension cho tới khi có contract và integration test rõ.

### Low

Không còn finding Low đang mở trong đợt tài liệu này. Các report ngày 10, 13 và 15/07 đã được chuyển sang `docs/Archive/`; report này và ba checklist canonical là nguồn trạng thái hiện hành.

## 5. Đánh giá kiến trúc

### Kiến trúc phù hợp hiện tại

**Khuyến nghị:** modular monolith Node.js + Java business extension read-only mặc định.

| Context | Owner hiện tại | Nhận xét |
| --- | --- | --- |
| Auth/profile/role | Node.js | Core web API owner |
| Posts/media/report | Node.js | Core write owner |
| Matching/feedback | Node.js | MySQL-backed queue, rule/hybrid engine |
| Claims/evidence | Node.js | Human review; không auto xác nhận ownership |
| Appointment | Node.js | Có transaction và active appointment invariant |
| Warehouse/handover | Node.js | Staff/Admin lifecycle owner |
| Notification/chat | Node.js + Socket.IO | Redis adapter tùy chọn cho scale-out |
| Admin Java | Java extension | Read-only mặc định; chưa phải independent production microservice |

Không nên tách microservices trong giai đoạn đồ án. Việc có giá trị hơn là tiếp tục modular hóa trong Node, giữ transaction boundary và chứng minh bằng test.

## 6. Bảng điểm chi tiết

Công thức: `Tổng = Σ(điểm × trọng số)`.

| Tiêu chí | Trọng số | MVP /10 | Quy đổi MVP | Production /10 | Quy đổi Production | Nhận xét |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Business correctness | 12% | 8.8 | 1.056 | 7.8 | 0.936 | Core invariant tốt; migration/E2E snapshot còn chờ |
| Architecture | 10% | 8.6 | 0.860 | 7.2 | 0.720 | Node owner rõ, Java extension hợp scope; shared schema còn debt |
| Security | 14% | 8.5 | 1.190 | 7.5 | 1.050 | Helmet, CORS allowlist, limiter, auth/privacy guard; secret rotation/ops evidence còn thiếu |
| Privacy/data protection | 7% | 8.6 | 0.602 | 7.6 | 0.532 | Private proxy và evidence guard tốt; cần runtime authorization suite trên snapshot |
| Code quality | 8% | 8.0 | 0.640 | 7.0 | 0.560 | App shell nhỏ hơn; Admin/repository và CSS vẫn lớn |
| Maintainability | 8% | 7.9 | 0.632 | 6.5 | 0.520 | Bounded feature extraction rõ hơn nhưng chưa hoàn tất |
| Testability/coverage | 9% | 8.8 | 0.792 | 7.4 | 0.666 | 25 API tests, nhiều E2E scripts và ba browser checks độc lập credential |
| Performance | 7% | 7.8 | 0.546 | 6.2 | 0.434 | Candidate prefilter tốt; chưa có benchmark lớn được lưu |
| Scalability | 6% | 7.8 | 0.468 | 5.8 | 0.348 | Redis path đã có; chưa multi-instance soak |
| Reliability/concurrency | 6% | 8.6 | 0.516 | 7.2 | 0.432 | Locks, constraints, durable queue, readiness; chưa restore/incident drill |
| UX/UI | 5% | 7.7 | 0.385 | 6.9 | 0.345 | Core route rõ, UI khá đầy đủ; detail/admin internals vẫn khó bảo trì |
| Documentation | 4% | 9.0 | 0.360 | 8.3 | 0.332 | Scope/boundary/runbook tốt; cần gắn evidence CI/deploy thật |
| DevOps/deployment | 4% | 8.2 | 0.328 | 6.2 | 0.248 | CI/container/release code có; staging/rollback/restore chưa chạy |
| **Tổng** | **100%** |  | **8.375** |  | **7.123** |  |

**Điểm MVP hiện tại: 8.4/10**

**Điểm production readiness: 7.1/10**

So với mốc 8.2 ngày 17/07, mức tăng đến từ refactor frontend theo domain và browser contract tests. Không tăng các tiêu chí performance/scale/DevOps vì chưa có artifact runtime mới.

## 7. Điều kiện để đạt 9.0 có thể bảo vệ

### Bắt buộc trước khi tự chấm 9

- [ ] Commit/push snapshot hiện tại và có CI xanh cho đúng commit.
- [ ] Chạy migration 001-025 từ blank MySQL và lưu kết quả.
- [ ] Chạy toàn bộ DB E2E trên isolated DB, gồm claim race và active appointment conflict.
- [ ] Chạy API/web container build thực tế.
- [ ] Chạy benchmark 10k và 100k, lưu P50/P95/P99, error rate và query plan.
- [ ] Chạy Socket.IO hai instance với Redis, kiểm tra reconnect và room isolation.
- [ ] Deploy staging và thực hiện backup/restore drill.
- [x] Bổ sung Playwright authenticated-role contract tests cho Student create-LOST và Staff permission/warehouse.
- [ ] Tách tiếp Post Detail và Claim khỏi `App.tsx`, rồi chia nội bộ module Admin theo domain.
- [ ] Rotate toàn bộ credential từng xuất hiện trong ảnh/tài liệu chia sẻ.

### Không cần để bảo vệ MVP

- Native mobile hoàn chỉnh.
- Flutter app thứ hai.
- Custom image/semantic model production.
- Kubernetes hoặc production microservices.
- Analytics nâng cao quy mô lớn.

## 8. Thứ tự ưu tiên tiếp theo

1. **Đóng snapshot:** review diff, commit/push và chờ CI xanh.
2. **Chứng minh DB invariants:** blank migration + core/race/privacy E2E trên MySQL cô lập.
3. **Chứng minh packaging:** Docker build, release ZIP audit và checksum.
4. **Chứng minh performance:** benchmark 10k trước, sau đó 50k/100k.
5. **Chứng minh vận hành:** staging, metrics, backup/restore và Redis multi-instance soak.
6. **Giảm technical debt:** tách Post Detail/Claim, chia nhỏ Admin/repository theo domain và tiếp tục đưa CSS về từng feature.

## 9. Kết luận reviewer

Đây không còn là một project “ít chức năng”. Điểm mạnh thật sự nằm ở workflow nghiệp vụ xuyên suốt, concurrency invariant, privacy media, matching explainability, warehouse lifecycle và role separation. Với cách positioning là **campus Lost & Found web/backend MVP**, project đủ mạnh để bảo vệ tốt.

Điểm 8.4 là hợp lý cho code hiện tại. Điểm chưa lên 9 không phải vì thiếu thêm module, mà vì thiếu **evidence của chính snapshot release**: CI, isolated migration/E2E, benchmark, staging và restore. Hướng đúng tiếp theo là chứng minh những gì đã có hoạt động ổn định, không mở rộng thêm mobile hoặc gắn nhãn custom AI/production microservices.
