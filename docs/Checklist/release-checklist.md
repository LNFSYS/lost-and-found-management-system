# Release Checklist

Last audit: 2026-07-15

Use this checklist before demo, merge, or submission. Keep evidence screenshots/logs when a step is important for grading.

## 1. Environment

- [x] Confirm only `.env.example` files are tracked; real `.env` files are ignored.
- [ ] Run `npm run package:release` from a clean committed tree and distribute that ZIP instead of compressing the working directory.
- [ ] Run `npm run scan:secrets:workspace` before manually sharing a working-directory copy; a local `.env` finding is expected and means the raw copy must not be shared.
- [ ] Rotate any Aiven/JWT/SMTP/Cloudinary/Google secret that appeared in screenshots, files, or shared artifacts.
- [ ] Confirm `FRONTEND_URL`, `API_PORT`, and `SOCKET_CORS_ORIGIN` match the demo environment. Socket.IO shares `API_PORT`; Redis is not required by the current MVP.
- [ ] Confirm API CORS allowlist covers the deployed web origin; local development origins are allowed only outside production.
- [ ] Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are configured.
- [ ] Confirm Cloudinary and Google Vision credentials are either configured or the fallback behavior is acceptable for demo; if Cloudinary is missing, live upload will show a friendly 503 and the demo should use seeded images.
- [ ] If `npm run quality:release` prints a Google Vision warning, present OCR/tagging as configured/fallback-dependent and do not rely on live OCR in the demo.
- [ ] Confirm registration uses OTP with any valid email; do not require FPT/edu email for students.
- [x] Confirm web refresh tokens use an `httpOnly` cookie and legacy localStorage token keys are removed on auth/session restore.

## 2. Database

- [ ] Run `npm run migrate:api` for migrations 024-025 on an isolated/test database first.
- [ ] Run `npm run smoke:migration` and verify all 25 migrations plus the active-appointment unique key.
- [ ] Run `npm run seed:demo` only on a fresh demo/test database, never on the shared primary demo data by accident.
- [ ] Verify demo accounts for Student/Lecturer/Staff/Admin can log in.
- [ ] Run `npm run repair:encoding` against a copy of the demo database if old records display mojibake; review output before using `npm run repair:encoding -- --apply`.
- [x] GitHub Actions migrates/seeds isolated MySQL 8 and runs core/role/warehouse/claim-race/chat-gating E2E.

## 3. Build and Smoke

- [ ] Run `npm run quality:release` after migrations 024-025 are verified/applied on the intended database; the 2026-07-15 local run is intentionally pending because shared DB remains at migration 023.
- [x] GitHub Actions CI runs release text/config scan, API build, web build, and mobile typecheck on pushes/PRs to `main`.
- [x] GitHub Actions also runs isolated MySQL migration smoke, Java 21/Maven build, and advisory dependency audit.
- [x] Run `npm run test:api` for policy and image-signature tests (20 tests passed on 2026-07-15).
- [x] Run public Playwright routing/back-forward smoke; authenticated session smoke is configured for isolated CI.
- [x] Run `npm run build:api` (passed on 2026-07-15).
- [x] Run `npm run build:web` (passed on 2026-07-15).
- [x] Run `npm run typecheck:mobile`.
- [x] Run `npm run e2e:core` when the local API/database are ready.
- [x] Run `npm run e2e:roles` to verify Staff vs Admin permissions.
- [x] Run `npm run e2e:warehouse` to verify warehouse lifecycle and terminal-state guards.
- [x] Run `npm run e2e:claim-race` to verify concurrent claim decisions cannot both win.
- [x] Run `npm run e2e:media-privacy` when API + Cloudinary are ready to verify public post detail does not expose evidence media.
- [x] Run `npm run e2e:chat-gating` to verify PENDING/REJECTED/CANCELLED claims cannot chat, ACCEPTED can chat, and client image URLs are rejected.
- [x] Run `npm run e2e:claim-evidence-policy` to verify reviewer upload denial and accepted-claim evidence lock.
- [ ] Run `npm run e2e:admin-crud` on an isolated test database; do not run it on shared demo data because it intentionally creates admin resources.
- [ ] Run `npm run build:java` on a machine with Maven installed; current Windows shell does not have `mvn` in PATH.
- [ ] Open the web app and check the browser console for repeated 4xx/5xx errors.

## 4. Core Demo Flow

- [ ] Student creates a LOST post.
- [ ] Student or Staff creates a FOUND post.
- [ ] Matching suggestions appear with explainable score reasons.
- [ ] Owner submits a claim with evidence.
- [ ] Owner/Staff/Admin verifies evidence confidence and accepts/rejects/request-info.
- [ ] Accepted claim creates an appointment and opens claim chat.
- [ ] A second active appointment for the same claim returns `409`; verify through isolated `e2e:core` after migration 024.
- [ ] Accepted or completed appointment can store a handover/return proof image.
- [ ] Staff manages warehouse/handover point and status transitions.
- [ ] Admin views dashboard, config, users, and reports with the correct permissions.
- [ ] Realtime notification/chat behavior is checked in two browser sessions.

## 5. Privacy and Audit

- [ ] Public post list/detail does not show private contact info to unauthenticated users.
- [ ] Claim evidence is visible only to claimant, owner, Staff, or Admin.
- [x] Claim evidence upload is allowed only for the claimant while status is `PENDING` or `NEED_MORE_INFO` (`e2e:claim-evidence-policy` passed).
- [ ] Post evidence images are hidden from public post detail and only visible to owner, Staff, or Admin.
- [ ] Appointment proof, claim evidence, and chat images load through authenticated media endpoints.
- [ ] Protected media proxying rejects non-Cloudinary/private-network URLs; chat socket payload sends only `mediaPublicId`.
- [ ] Claim evidence view writes an activity audit event.
- [ ] Admin role/status changes write activity audit metadata.
- [ ] Warehouse create/update/status/process/delete operations are logged.
- [ ] Invalid warehouse status transitions return 409.
- [ ] Terminal overdue actions use the dedicated disposition form/API and cannot bypass active claim/appointment guards through the generic status endpoint.

## 6. Presentation Safety

- [ ] Describe the system as an MVP/campus pilot-ready web/backend, not a full production platform.
- [ ] Describe matching as hybrid/rule-based with Google Vision assisted OCR, not a custom trained AI model.
- [ ] Describe native mobile and custom AI training as future work unless the code is complete.
- [ ] Prepare a fallback demo path if Google Vision, Cloudinary, or email delivery is unavailable: seeded posts/images, pre-created claims, and a script-free walkthrough of OCR/matching fallback behavior.
