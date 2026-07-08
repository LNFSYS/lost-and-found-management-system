# Release Checklist

Last audit: 2026-07-08

Use this checklist before demo, merge, or submission. Keep evidence screenshots/logs when a step is important for grading.

## 1. Environment

- [ ] Confirm `.env` files exist locally and no real secrets are committed.
- [ ] Confirm `FRONTEND_URL`, `API_PORT`, `SOCKET_PORT`, and `SOCKET_CORS_ORIGIN` match the demo environment.
- [ ] Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are configured.
- [ ] Confirm Cloudinary and Google Vision credentials are either configured or the fallback behavior is acceptable for demo.
- [ ] If `npm run quality:release` prints a Google Vision warning, present OCR/tagging as configured/fallback-dependent and do not rely on live OCR in the demo.
- [ ] Confirm registration uses OTP with any valid email; do not require FPT/edu email for students.

## 2. Database

- [x] Run `npm run migrate:api`.
- [x] Run `npm run smoke:migration`.
- [ ] Run `npm run seed:demo` when preparing a fresh demo database.
- [ ] Verify demo accounts for Student/Lecturer/Staff/Admin can log in.

## 3. Build and Smoke

- [x] Run `npm run quality:release` before demo/merge to scan text, verify media/OCR env presence, build API/web/mobile, and run migration smoke.
- [x] Run `npm run build:api`.
- [x] Run `npm run build:web`.
- [x] Run `npm run typecheck:mobile`.
- [x] Run `npm run e2e:core` when the local API/database are ready.
- [x] Run `npm run e2e:roles` to verify Staff vs Admin permissions.
- [x] Run `npm run e2e:warehouse` to verify warehouse lifecycle and terminal-state guards.
- [x] Run `npm run e2e:claim-race` to verify concurrent claim decisions cannot both win.
- [x] Run `npm run e2e:media-privacy` when API + Cloudinary are ready to verify public post detail does not expose evidence media.
- [ ] Run `npm run build:java` on a machine with Maven installed; current Windows shell does not have `mvn` in PATH.
- [ ] Open the web app and check the browser console for repeated 4xx/5xx errors.

## 4. Core Demo Flow

- [ ] Student creates a LOST post.
- [ ] Student or Staff creates a FOUND post.
- [ ] Matching suggestions appear with explainable score reasons.
- [ ] Owner submits a claim with evidence.
- [ ] Owner/Staff/Admin verifies evidence confidence and accepts/rejects/request-info.
- [ ] Accepted claim creates an appointment and opens claim chat.
- [ ] Accepted or completed appointment can store a handover/return proof image.
- [ ] Staff manages warehouse/handover point and status transitions.
- [ ] Admin views dashboard, config, users, and reports with the correct permissions.
- [ ] Realtime notification/chat behavior is checked in two browser sessions.

## 5. Privacy and Audit

- [ ] Public post list/detail does not show private contact info to unauthenticated users.
- [ ] Claim evidence is visible only to claimant, owner, Staff, or Admin.
- [ ] Post evidence images are hidden from public post detail and only visible to owner, Staff, or Admin.
- [ ] Appointment proof, claim evidence, and chat images load through authenticated media endpoints.
- [ ] Claim evidence view writes an activity audit event.
- [ ] Admin role/status changes write activity audit metadata.
- [ ] Warehouse create/update/status/process/delete operations are logged.
- [ ] Invalid warehouse status transitions return 409.

## 6. Presentation Safety

- [ ] Describe the system as an MVP/campus pilot-ready web/backend, not a full production platform.
- [ ] Describe matching as hybrid/rule-based with Google Vision assisted OCR, not a custom trained AI model.
- [ ] Describe native mobile and custom AI training as future work unless the code is complete.
- [ ] Prepare a fallback demo path if Google Vision, Cloudinary, or email delivery is unavailable.
