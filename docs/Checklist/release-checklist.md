# Release Checklist

Last audit: 2026-07-27

Use this checklist before demo, merge, or submission. Keep evidence screenshots/logs when a step is important for grading.

## 1. Environment

- [x] Confirm only `.env.example` files are tracked; real `.env` files are ignored.
- [x] Verify `npm run package:release` from a clean committed checkout in CI; use that command when producing the submission ZIP.
- [ ] Run `npm run scan:secrets:workspace` before manually sharing a working-directory copy; a local `.env` finding is expected and means the raw copy must not be shared.
- [ ] Rotate any Aiven/JWT/SMTP/Cloudinary/Google secret that appeared in screenshots, files, or shared artifacts.
- [ ] Confirm `FRONTEND_URL`, `API_PORT`, and `SOCKET_CORS_ORIGIN` match the demo environment. Socket.IO shares `API_PORT`; configure `REDIS_URL` for multi-instance deployment.
- [ ] Configure `METRICS_TOKEN`, `TRUST_PROXY` and JSON logging for a hosted environment.
- [ ] Confirm API CORS allowlist covers the deployed web origin; local development origins are allowed only outside production.
- [ ] Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are configured.
- [ ] Confirm Cloudinary and Google Vision credentials are either configured or the fallback behavior is acceptable for demo; if Cloudinary is missing, live upload will show a friendly 503 and the demo should use seeded images.
- [ ] If `npm run quality:release` prints a Google Vision warning, present OCR/tagging as configured/fallback-dependent and do not rely on live OCR in the demo.
- [ ] Confirm registration uses OTP with any valid email; do not require FPT/edu email for students.
- [x] Confirm web refresh tokens use an `httpOnly` cookie and legacy localStorage token keys are removed on auth/session restore.

## 2. Database

- [x] Run migrations 001-025 from a blank isolated MySQL 8 database in CI.
- [x] Run `npm run smoke:migration` and verify all 25 migrations plus the active-appointment unique key in CI.
- [x] Run `npm run seed:demo` only on the isolated CI database; the workflow does not seed the shared primary demo database.
- [x] Verify demo accounts for Student/Lecturer/Staff/Admin can log in through the isolated API E2E suite.
- [ ] Run `npm run repair:encoding` against a copy of the demo database if old records display mojibake; review output before using `npm run repair:encoding -- --apply`.
- [x] GitHub Actions migrates/seeds isolated MySQL 8 and runs core/role/warehouse/claim-race/chat-gating E2E.

## 3. Build and Smoke

- [ ] Run `npm run quality:release` after migrations 024-025 are verified/applied on the intended database; the 2026-07-15 local run is intentionally pending because shared DB remains at migration 023.
- [x] GitHub Actions CI runs release text/config scan, API build, web build, and mobile typecheck on pushes/PRs to `main`.
- [x] GitHub Actions also runs isolated MySQL migration smoke, Java 21/Maven build, and advisory dependency audit.
- [x] API tests include policy, migration schema, image-signature, JSON-column compatibility, rate-limit, request-ID and metrics coverage (29 tests passed locally on 2026-07-27).
- [x] API + web runtime dependency audit reports 0 vulnerabilities after updating transitive `body-parser`/`postcss` and removing the unused React Router dependency; Expo/mobile advisories remain deferred with the mobile workstream.
- [x] Confirm CI passes Redis-backed runtime hardening, two-instance Socket.IO isolation, performance artifact and API/web container builds (`29693045128`).
- [x] Run Playwright routing/back-forward smoke plus API-mocked Student create-LOST/create-FOUND, Student FOUND-detail-to-claim, Staff claim review/appointment lifecycle, proof upload/completion/feedback, match feedback, Staff permission/warehouse and Admin navigation flows; database-backed login remains conditional on demo credentials.
- [x] Run `npm run build:api` (passed on 2026-07-27).
- [x] Run `npm run build:web` (passed on 2026-07-27).
- [x] Run `npm run typecheck:mobile`.
- [x] Run `npm run e2e:core` when the local API/database are ready.
- [x] Run `npm run e2e:roles` to verify Staff vs Admin permissions.
- [x] Run `npm run e2e:warehouse` to verify warehouse lifecycle and terminal-state guards.
- [x] Run `npm run e2e:claim-race` to verify concurrent claim decisions cannot both win.
- [x] Run `npm run e2e:media-privacy` when API + Cloudinary are ready to verify public post detail does not expose evidence media.
- [x] Run `npm run e2e:chat-gating` to verify PENDING/REJECTED/CANCELLED claims cannot chat, ACCEPTED can chat, and client image URLs are rejected.
- [x] Run `npm run e2e:claim-evidence-policy` to verify reviewer upload denial and accepted-claim evidence lock.
- [x] Run `npm run e2e:admin-crud` on the isolated CI database; do not run it on shared demo data because it intentionally creates admin resources.
- [x] Run `npm run build:java` in the Java 21/Maven CI job; Maven remains unavailable on the current Windows workstation.
- [ ] Open the web app and check the browser console for repeated 4xx/5xx errors.
- [ ] Apply migrations 024-025 deliberately to the intended local/demo database after backup; the current workstation smoke correctly fails because `return_appointments.active_claim_id` is absent.
- [x] Confirm the bounded CI performance smoke passes its P95/error-rate thresholds; retain large-dataset benchmark runs separately.
- [ ] Run the backup/restore drill in [deployment-and-rollback.md](../Overall/deployment-and-rollback.md) for the chosen provider.

## 4. Core Demo Flow

- [x] Student creates a LOST post (`e2e:web` and `e2e:core`).
- [x] Student creates a FOUND post (`e2e:web`); API creation is also covered in `e2e:core`.
- [x] Matching suggestions appear with explainable score reasons and authorized feedback labels (`e2e:core`, `e2e:web`, `e2e:media-privacy`).
- [x] Owner submits a claim with private evidence (`e2e:web`, `e2e:claim-evidence-policy`, `e2e:media-privacy`).
- [x] Owner/Staff/Admin verifies evidence confidence and accepts/rejects/request-info through guarded claim actions (`e2e:web`, `e2e:claim-race`, policy tests).
- [x] Accepted claim creates an appointment and opens claim chat (`e2e:core`, `e2e:chat-gating`).
- [x] A second active appointment for the same claim returns `409` (`e2e:core` on isolated migration 024+ schema).
- [x] Accepted appointment stores a handover proof image without exposing a Cloudinary URL/public ID (`e2e:core`).
- [x] Staff/Admin manages warehouse/handover point and guarded status transitions (`e2e:warehouse`, `e2e:admin-crud`, `e2e:roles`).
- [x] Admin sees dashboard, config, users, and reports while Staff remains restricted (`e2e:web`, `e2e:roles`, `e2e:admin-crud`).
- [x] Realtime notification/chat isolation is checked with two authenticated Socket.IO clients across two API instances (`e2e:socket-scaleout`); retain a two-browser visual check for the defense rehearsal.

## 5. Privacy and Audit

- [x] Public/non-owner post detail masks private contact information (`e2e:media-privacy`).
- [x] Claim evidence rejects unrelated users and is streamed to an authorized owner through the authenticated proxy (`e2e:media-privacy`); role access also uses the centralized claim reviewer policy.
- [x] Claim evidence upload is allowed only for the claimant while status is `PENDING` or `NEED_MORE_INFO` (`e2e:claim-evidence-policy` passed).
- [x] Post evidence images are hidden from non-owner detail and visible to the owner (`e2e:media-privacy`); Staff/Admin use the same reviewer policy.
- [x] Appointment proof, claim evidence, and chat images use authenticated application media endpoints (`e2e:core`, `e2e:media-privacy`, `e2e:chat-gating`).
- [x] Protected downloads use trusted Cloudinary guards; chat rejects client-supplied URLs and sends only `mediaPublicId` (`e2e:chat-gating`).
- [x] Claim evidence view writes `CLAIM_EVIDENCE_VIEWED` activity (`e2e:media-privacy`).
- [x] Admin role/status changes write actor-aware activity metadata (`e2e:admin-crud`).
- [x] Warehouse create/status/process/delete operations write entity-scoped activity events (`e2e:warehouse`); update logging is implemented in the same repository boundary.
- [x] Invalid warehouse status transitions return `409` (`e2e:warehouse`).
- [x] Terminal overdue actions require the dedicated process API; generic terminal status updates return `409` and active claim/appointment guards remain enforced (`e2e:warehouse` plus repository policy tests).

## 6. Presentation Safety

- [x] Describe the system as an MVP/campus pilot-ready web/backend, not a full production platform.
- [x] Describe matching as hybrid/rule-based with Google Vision assisted OCR, not a custom trained AI model.
- [x] Describe native mobile and custom AI training as future work unless the code is complete.
- [x] Use the fallback path in `docs/Overall/demo-release-runbook.md` when Google Vision, Cloudinary, or email delivery is unavailable.
