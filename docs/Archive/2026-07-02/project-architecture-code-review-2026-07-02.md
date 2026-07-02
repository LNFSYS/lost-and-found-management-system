# Project Architecture And Code Review - 2026-07-02

Review target: current working tree, including uncommitted changes.

Review lenses used:

- `engineering-code-reviewer`
- `engineering-backend-architect`
- `engineering-software-architect`

No code fixes, commits, pushes, or production/demo DB mutations were performed for this review.

## Executive Summary

Overall readiness: **7/10 for a graduation MVP demo**, **not production-ready**.

What is solid:

- The repo has a credible MVP flow: auth, LOST/FOUND posts, matching, claim/evidence, appointment, warehouse/handover, realtime notification/chat, and admin/staff dashboards.
- Project positioning is mostly honest in docs: web/backend MVP, Node.js core API, Java/Spring Boot extension, Google Vision assisted OCR, hybrid/rule-based matching, mobile/custom AI training as future work.
- `npm run build:api`, `npm run build:web`, and migration smoke passed in this review environment.

Biggest judge/demo risks:

- Root `.env.example` contains real-looking Cloudinary/SMTP secrets. Rotate credentials and scrub before submission.
- Public post visibility and evidence media privacy still have leak paths.
- Node claim/appointment/warehouse state transitions are not atomic enough for race conditions.
- Node and Java both expose writer endpoints for overlapping domains; this must be presented as extension work, not production microservices.
- Java service currently has Aiven/MySQL SSL and schema compatibility gaps.

## Findings

### Critical

#### CR-01 - Root example env file contains real-looking secrets

Evidence:

- `.env.example:17`
- `.env.example:18`
- `.env.example:19`
- `.env.example:37`
- `.env.example:38`
- `.env.example:39`

Issue:

The root `.env.example` contains Cloudinary and SMTP values that look like real credentials. This is not safe to submit or share with the team.

Impact:

Secrets can be abused, and a judge/reviewer may treat this as a serious security hygiene failure.

Recommended fix:

- Rotate Cloudinary and SMTP credentials immediately.
- Replace root `.env.example` values with `YOUR_VALUE_HERE` placeholders.
- Check git history for exposed credentials and scrub/rotate accordingly.
- Prefer maintaining only `apps/api-node/.env.example` as the canonical sample if the root file is no longer needed.

#### CR-02 - Public post APIs can expose hidden/moderated posts

Evidence:

- `apps/api-node/src/routes/post.routes.ts:18`
- `apps/api-node/src/repositories/post.repository.ts:227`
- `apps/api-node/src/repositories/post.repository.ts:242`
- `apps/api-node/src/services/post.service.ts:137`
- `apps/api-node/src/services/post.service.ts:174`

Issue:

Public list defaults to hiding `HIDDEN`, but if a caller passes `status=HIDDEN`, the repository accepts it. Public detail also loads by id without checking public visibility.

Impact:

Moderated/hidden posts may remain publicly readable, which is a privacy and demo-breaking issue.

Recommended fix:

- In public list, ignore or reject non-public statuses unless the caller is owner/staff/admin.
- In detail, require `OPEN/MATCHED/RESOLVED/CLOSED` visibility for anonymous users and allow `HIDDEN` only to owner/staff/admin.
- Add an e2e test for `GET /posts?status=HIDDEN` and `GET /posts/:id` for a hidden post.

#### CR-03 - Evidence media can leak through public Cloudinary URLs and post detail

Evidence:

- `apps/api-node/src/controllers/media.controller.ts:27`
- `apps/api-node/src/repositories/post.repository.ts:401`
- `apps/api-node/src/repositories/post.repository.ts:432`
- `apps/api-node/src/repositories/post.repository.ts:435`
- `apps/api-node/src/services/media.service.ts:240`
- `apps/api-node/src/services/cloudinary.service.ts:65`
- `apps/api-node/src/services/cloudinary.service.ts:70`

Issue:

Evidence images are uploaded to Cloudinary and returned as `secureUrl`. Post detail returns all `post_media`, including `mediaKind = EVIDENCE`.

Impact:

Private ownership proof, receipts, serial numbers, or ID images may be exposed by URL or through public post detail.

Recommended fix:

- Filter `mediaKind = EVIDENCE` from public post detail/list responses.
- Serve evidence through an authenticated API proxy or short-lived signed URL.
- Keep claim evidence visible only to claimant, post owner, staff, and admin.
- Add tests that anonymous users cannot retrieve evidence media.

### High

#### HI-01 - Node claim transitions are check-then-update and race-prone

Evidence:

- `apps/api-node/src/services/claim.service.ts:230`
- `apps/api-node/src/services/claim.service.ts:257`
- `apps/api-node/src/services/claim.service.ts:289`
- `apps/api-node/src/repositories/claim.repository.ts:183`
- `apps/api-node/src/repositories/claim.repository.ts:191`
- `apps/api-node/src/repositories/claim.repository.ts:198`
- `apps/api-node/src/repositories/claim.repository.ts:206`

Issue:

Node reads the claim, validates status in service code, then updates by id only. The SQL update does not guard the previous status.

Impact:

Concurrent accept/reject/cancel can overwrite each other. Multiple claims for the same FOUND post can potentially be accepted in separate races.

Recommended fix:

- Use a transaction and conditional update: `UPDATE claims SET ... WHERE id = ? AND status IN (...)`.
- Check `affectedRows`; return 409 if no row changed.
- When accepting one claim, lock/reject competing claims or enforce one accepted claim per post.
- Add a concurrency test.

#### HI-02 - Appointment conflict and completion are not atomic/idempotent

Evidence:

- `apps/api-node/src/services/appointment.service.ts:78`
- `apps/api-node/src/services/appointment.service.ts:185`
- `apps/api-node/src/repositories/appointment.repository.ts:134`
- `apps/api-node/src/repositories/appointment.repository.ts:173`
- `apps/api-node/src/repositories/appointment.repository.ts:242`

Issue:

Schedule conflict is checked before insert/update without a DB lock or uniqueness constraint. Completion updates appointment/post/warehouse in a transaction, but the status update does not require `status = 'ACCEPTED'` at SQL level.

Impact:

Two users can create overlapping appointments at the same handover point. Double completion may award reputation or write logs more than once.

Recommended fix:

- Add transaction/locking for conflict check plus insert/update.
- Make completion use `UPDATE ... WHERE id = ? AND status = 'ACCEPTED'` and award reputation only if one row changed.
- Add tests for overlapping appointment creation and double completion.

#### HI-03 - Warehouse state machine is read-then-update and date fields can be reset during edit

Evidence:

- `apps/api-node/src/repositories/admin.repository.ts:270`
- `apps/api-node/src/repositories/admin.repository.ts:282`
- `apps/api-node/src/repositories/admin.repository.ts:290`
- `apps/api-node/src/repositories/admin.repository.ts:1106`
- `apps/api-node/src/repositories/admin.repository.ts:1169`
- `apps/api-node/src/repositories/admin.repository.ts:1178`

Issue:

Warehouse transition validation reads current status, then updates later. Full item update also defaults omitted `receivedAt` to `new Date()` and derives a fresh retention deadline.

Impact:

Concurrent transitions can bypass lifecycle rules/capacity checks. Editing an item can silently change received/retention dates.

Recommended fix:

- Preserve existing dates when update input omits date fields.
- Update with `WHERE id = ? AND status = ?`.
- Wrap capacity check, state transition, update, and audit log in one transaction.
- Add lifecycle tests for invalid transitions and concurrent updates.

#### HI-04 - Match suggestions can bypass contact-info redaction

Evidence:

- `apps/api-node/src/services/post.service.ts:149`
- `apps/api-node/src/services/matching.service.ts:245`
- `apps/api-node/src/repositories/post.repository.ts:175`

Issue:

Public list/detail redacts `contactInfo`, but match suggestions use full post objects from `postRepository.findByIds`.

Impact:

A user can receive another user's contact info through match suggestions even when public list/detail hides it.

Recommended fix:

- Apply the same redaction helper to all suggestion responses.
- Review create-post and media-upload responses that include `matchSuggestions`.
- Add a test that suggestions do not expose counterpart contact info.

#### HI-05 - JWT auth trusts embedded roles/status until token expiry

Evidence:

- `apps/api-node/src/middlewares/auth.middleware.ts:34`
- `apps/api-node/src/middlewares/auth.middleware.ts:57`
- `apps/api-node/src/repositories/admin.repository.ts:469`

Issue:

Role/status changes are audited, but existing access tokens still carry old roles until expiry.

Impact:

Locked users, disabled users, or demoted admins may keep access for the remaining token lifetime.

Recommended fix:

- On protected requests, verify current user status and roles from DB or add a token version/session invalidation strategy.
- Revoke/rotate tokens on role/status changes.
- Add tests for locked/demoted user access.

#### HI-06 - Java handover entity does not match Node migration schema

Evidence:

- `apps/java-admin-service/src/main/java/vn/edu/fpt/lnfs/entity/HandoverPointEntity.java:24`
- `apps/api-node/src/migrations/002_lost_found_schema.sql:162`

Issue:

Java maps `handover_points.room_id`, but Node migrations create `handover_points` without `room_id`.

Impact:

Java handover create/update can fail against the schema created by Node migrations.

Recommended fix:

- Remove `roomId` from Java handover entity and DTOs, or add a migration if the field is truly required.
- Run Java integration tests against a DB created only from Node migrations.

#### HI-07 - Java service lacks Aiven/MySQL SSL configuration

Evidence:

- `apps/api-node/src/config/mysql-ssl.ts:4`
- `apps/java-admin-service/src/main/resources/application.yml:8`
- `apps/java-admin-service/src/main/java/vn/edu/fpt/lnfs/config/JwtAuthenticationFilter.java:47`

Issue:

Node supports `DB_SSL`, but Java JDBC URL has no SSL mode/trust-store option. Java also uses `Keys.hmacShaKeyFor`, which can reject short JWT secrets.

Impact:

Java admin service may fail against Aiven/shared MySQL while Node works. Java JWT verification may fail if the secret is too short.

Recommended fix:

- Add env-driven Java JDBC SSL settings for Aiven, such as `sslMode=VERIFY_IDENTITY` or `VERIFY_CA`.
- Document CA/trust-store setup for Java.
- Require a 32+ byte `JWT_ACCESS_SECRET`.

### Medium

#### ME-01 - Node and Java expose overlapping writer endpoints

Evidence:

- `docs/Overall/node-java-service-boundary.md:58`
- `apps/api-node/src/routes/claim.routes.ts:24`
- `apps/api-node/src/routes/admin.routes.ts:22`
- `apps/api-node/src/routes/admin.routes.ts:85`
- `apps/java-admin-service/src/main/java/vn/edu/fpt/lnfs/controller/ClaimAdminController.java:27`

Issue:

Docs correctly say one writer per flow, but both services expose write endpoints for claims/config/handover domains.

Impact:

Judge may ask which service owns the business rule. In production, duplicated writers can diverge.

Recommended fix:

- For defense, state: Node owns the current web demo flow; Java is a business/admin extension.
- If routing to Java later, create an adapter and disable/avoid duplicate Node writer paths for that domain.
- Add integration tests before claiming production microservices.

#### ME-02 - Demo seed and migration commands are risky on shared Aiven DB

Evidence:

- `apps/api-node/src/migrations/run-migrations.ts:58`
- `apps/api-node/src/scripts/seed-demo.ts:36`
- `apps/api-node/src/scripts/seed-demo.ts:133`

Issue:

Migrations can mutate whatever `DB_NAME` points to, and demo seed resets known accounts/passwords.

Impact:

Team members sharing one DB can overwrite demo data or re-enable predictable demo credentials.

Recommended fix:

- Separate DBs: `lnfs_dev_<member>` and `lnfs_demo`.
- Require explicit confirmation env such as `ALLOW_DEMO_SEED=true`.
- Refuse seed/migrate when `NODE_ENV=production` or DB name is not clearly dev/demo.
- Backup demo DB before defense.

#### ME-03 - MySQL DDL migrations are not fully rollback-safe

Evidence:

- `apps/api-node/src/migrations/run-migrations.ts:89`
- `apps/api-node/src/migrations/012_indexes_and_warehouse_lifecycle.sql:14`

Issue:

Migration runner wraps SQL files in transactions, but MySQL DDL auto-commits. Some migrations use direct DDL and are not fully idempotent.

Impact:

A failed shared/Aiven migration can leave partial schema with no `schema_migrations` row; reruns can fail.

Recommended fix:

- Make DDL migrations idempotent with `information_schema` checks.
- Test migrations from a blank DB before every demo release.
- Do not run migrations casually against the demo DB.

#### ME-04 - Realtime and notification design is MVP-only

Evidence:

- `apps/api-node/src/repositories/notification.repository.ts:80`
- `apps/api-node/src/services/realtime.service.ts:143`
- `apps/api-node/src/services/scheduled-jobs.service.ts:32`

Issue:

Realtime emits from the local Node process only. Scheduled jobs can run in every Node process. Notification dedupe is not guaranteed across multiple instances.

Impact:

Works for a single demo API instance, but can duplicate notifications or miss realtime events in scaled deployment.

Recommended fix:

- Present realtime as MVP/single-instance.
- Add DB idempotency keys for scheduled notification types.
- Use a Socket.IO adapter/shared pub-sub before scaling horizontally.

#### ME-05 - In-memory rate limit is MVP-only

Evidence:

- `apps/api-node/src/middlewares/rate-limit.middleware.ts:15`
- `apps/api-node/src/app.ts:8`

Issue:

Rate limit state is process memory and keyed by request IP without explicit proxy strategy.

Impact:

Limits reset on restart, do not work across instances, and may over-throttle users behind the same proxy.

Recommended fix:

- Use Redis/DB-backed rate limits for deploy scale.
- Configure trusted proxy behavior explicitly.
- Present current limiter as MVP hardening only.

#### ME-06 - Vietnamese user-facing messages contain mojibake

Evidence:

- `apps/api-node/src/services/claim.service.ts:155`
- `apps/api-node/src/services/claim.service.ts:250`
- `apps/api-node/src/services/appointment.service.ts:91`
- `apps/api-node/src/services/appointment.service.ts:118`
- `apps/api-node/src/repositories/admin.repository.ts:1043`
- `apps/api-node/src/repositories/admin.repository.ts:1225`

Issue:

Several Vietnamese notification strings are corrupted.

Impact:

Demo looks unprofessional and users may not understand notifications.

Recommended fix:

- Replace mojibake with proper UTF-8 Vietnamese.
- Add a quick `rg "CĂ|áº|Ä‘|Æ"` check to release checklist.

#### ME-07 - Smoke tests miss highest-risk privacy/race scenarios

Evidence:

- `apps/api-node/src/scripts/e2e-role-privacy.ts:42`
- `apps/api-node/src/scripts/e2e-core-flow.ts:96`

Issue:

Existing smoke scripts do not cover hidden post visibility, evidence media privacy, contact redaction in suggestions, claim/appointment races, warehouse lifecycle, or socket room isolation.

Impact:

Critical MVP regressions can pass current automated checks.

Recommended fix:

- Add focused integration tests for those exact cases.
- Run them against a seeded local/demo DB before defense.

### Low

#### LO-01 - Optional auth can break public detail for users with stale tokens

Evidence:

- `apps/api-node/src/middlewares/auth.middleware.ts:57`
- `apps/api-node/src/routes/post.routes.ts:43`

Issue:

`optionalAuth` returns 401 on invalid/expired bearer token for a public endpoint.

Impact:

Public detail can fail for a browser with a stale token, even though anonymous access should work.

Recommended fix:

- Ignore invalid optional token on public routes, or ensure the client omits stale tokens for public reads.

#### LO-02 - Evidence viewed audit is triggered by state-change helpers

Evidence:

- `apps/api-node/src/services/claim.service.ts:165`
- `apps/api-node/src/services/claim.service.ts:174`
- `apps/api-node/src/services/claim.service.ts:230`
- `apps/api-node/src/services/claim.service.ts:257`

Issue:

`getClaim()` logs `CLAIM_EVIDENCE_VIEWED`, and accept/reject/cancel/request-info call `getClaim()`.

Impact:

Audit trail may say evidence was viewed even when the system loaded claim data only for a state transition.

Recommended fix:

- Split `loadClaimForAction()` from explicit `viewClaimDetail()`.
- Log evidence view only for explicit evidence/detail views.

#### LO-03 - API README is stale

Evidence:

- `apps/api-node/README.md:110`
- `apps/api-node/README.md:111`

Issue:

README says Staff can access overview only and Google OAuth/realtime chat are planned, but current routes and implementation show more functionality.

Impact:

Docs can confuse team members and judges.

Recommended fix:

- Update API README after fixes are completed.
- Keep `docs/Overall/project-overview.md` as canonical thesis source.

## Node.js vs Java Boundary

Current defensible boundary:

- Node.js is the current web-facing MVP runtime owner.
- Java/Spring Boot is a parallel business/admin extension.
- Both share MySQL schema and JWT contract.
- The project should not be presented as completed production microservices.

Current owner recommendation:

| Flow | Demo owner | Java role | Risk |
| --- | --- | --- | --- |
| Auth/OTP/login/refresh | Node.js | Verify Node JWT only | Low if same JWT secret is used |
| Posts/media/matching | Node.js | Read stored metadata only | Low |
| Claim creation/evidence upload/read | Node.js | Extension for stricter transitions | Medium |
| Claim accept/reject/request-info/cancel | Node.js for current web demo | Java has stricter locked implementation | High duplicate writer risk |
| Appointment lifecycle | Node.js | Future extension | Medium |
| Handover/admin CRUD | Node.js for current web demo | Java extension exists | Medium duplicate writer risk |
| Warehouse/storage logs | Node.js | Future stricter storage extension | Medium |
| Config/history | Node.js for current web demo | Java extension exists | Medium duplicate writer risk |
| Realtime chat/notification | Node.js | None | Low for MVP |

Safe thesis wording:

> The React web app uses Node.js as the core API for the current MVP demo. Java/Spring Boot is a business/admin extension that demonstrates selected stricter backend rules using the same MySQL schema and JWT contract. We do not claim this is a production microservice architecture; production would require one writer per flow, integration contracts, routing, and cross-service tests.

## Demo Risk Checklist

- Login/role: verify admin/staff/student demo accounts and rotate any exposed credentials.
- LOST/FOUND creation: verify FOUND requires handover/current holding location and LOST has private verification info.
- Matching: explain as hybrid/rule-based with Google Vision assisted OCR; do not say custom trained AI.
- Claim/evidence verification: do not expose evidence publicly; explain ownership confidence as advisory.
- Appointment: verify accepted claim can create appointment; avoid concurrent appointment demo edge cases.
- Warehouse/handover: demo normal status path only; avoid arbitrary jumps that may hit state machine gaps.
- Realtime notification/chat: demo on one Node instance; do not claim clustered production realtime.
- Shared Aiven DB: use separate dev/demo DBs, backup demo DB, and do not run seed against shared demo casually.

## Fix Before Defense

Highest value fixes before presentation:

1. Rotate and remove exposed secrets from root `.env.example`; scrub history if needed.
2. Fix public hidden-post visibility.
3. Filter/protect evidence media from public post detail and Cloudinary URL exposure.
4. Redact contact info in match suggestions.
5. Fix mojibake Vietnamese notification strings.
6. Add Java MySQL SSL config or state Java is not used in Aiven demo.
7. Fix Java `handover_points.room_id` schema mismatch or avoid Java handover demo.
8. Add shared DB guardrails: separate `lnfs_dev_*` and `lnfs_demo`, seed confirmation, demo backup.
9. Run e2e roles/core with API server running and demo data seeded.
10. Prepare a clear answer for Node vs Java one-writer boundary.

## Future Work

Do not claim these as current core:

- Native mobile app completion.
- Custom-trained AI model or MLOps pipeline.
- Production-grade microservices.
- Multi-instance Socket.IO/realtime scaling.
- Redis/shared-store rate limiting.
- Load testing and query-plan hardening.
- Advanced analytics/PDF exports.
- Full policy engine for donation/disposal/transfer with proof images.

## Verification Results

Commands run during this review:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build:api` | Passed | TypeScript API build completed |
| `npm run build:web` | Passed | Vite production build completed |
| `npm run smoke:migration` | Passed | Reported migration smoke passed on `fptu_lost_found`, 17 migrations |
| `npm run build:java` | Not run successfully | Failed because `mvn` is not installed/on PATH |
| `npm run e2e:roles` | Not run successfully | Failed with `ECONNREFUSED`; API server was not running |
| `E2E_EMAIL=adminlnf@gmail.com E2E_PASSWORD=12345678 npm run e2e:core` | Not run successfully | Failed with `ECONNREFUSED`; API server was not running |
| `git diff --check` | Passed | Only Windows LF-to-CRLF warnings |
| `git status --short` | Dirty working tree | Review intentionally targeted uncommitted working tree |

Important note:

The Aiven DB password was exposed in prior screenshots. Rotate it from the Aiven console and redistribute the new value through a private channel. Do not place it in Git, docs, screenshots, or chat logs.

