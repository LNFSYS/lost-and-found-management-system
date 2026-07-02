# Release Checklist

Last audit: 2026-07-01

Use this checklist before demo, merge, or submission. Keep evidence screenshots/logs when a step is important for grading.

## 1. Environment

- [ ] Confirm `.env` files exist locally and no real secrets are committed.
- [ ] Confirm `FRONTEND_URL`, `API_PORT`, `SOCKET_PORT`, and `SOCKET_CORS_ORIGIN` match the demo environment.
- [ ] Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are configured.
- [ ] Confirm Cloudinary and Google Vision credentials are either configured or the fallback behavior is acceptable for demo.
- [ ] Confirm registration uses OTP with any valid email; do not require FPT/edu email for students.

## 2. Database

- [ ] Run `npm run migrate:api`.
- [ ] Run `npm run smoke:migration`.
- [ ] Run `npm run seed:demo` when preparing a fresh demo database.
- [ ] Verify demo accounts for Student/Lecturer/Staff/Admin can log in.

## 3. Build and Smoke

- [ ] Run `npm run build:api`.
- [ ] Run `npm run build:web`.
- [ ] Run `npm run e2e:core` when the local API/database are ready.
- [ ] Run `npm run e2e:roles` to verify Staff vs Admin permissions.
- [ ] Open the web app and check the browser console for repeated 4xx/5xx errors.

## 4. Core Demo Flow

- [ ] Student creates a LOST post.
- [ ] Student or Staff creates a FOUND post.
- [ ] Matching suggestions appear with explainable score reasons.
- [ ] Owner submits a claim with evidence.
- [ ] Owner/Staff/Admin verifies evidence confidence and accepts/rejects/request-info.
- [ ] Accepted claim creates an appointment and opens claim chat.
- [ ] Staff manages warehouse/handover point and status transitions.
- [ ] Admin views dashboard, config, users, and reports with the correct permissions.
- [ ] Realtime notification/chat behavior is checked in two browser sessions.

## 5. Privacy and Audit

- [ ] Public post list/detail does not show private contact info to unauthenticated users.
- [ ] Claim evidence is visible only to claimant, owner, Staff, or Admin.
- [ ] Claim evidence view writes an activity audit event.
- [ ] Admin role/status changes write activity audit metadata.
- [ ] Warehouse create/update/status/process/delete operations are logged.
- [ ] Invalid warehouse status transitions return 409.

## 6. Presentation Safety

- [ ] Describe the system as an MVP/campus pilot-ready web/backend, not a full production platform.
- [ ] Describe matching as hybrid/rule-based with Google Vision assisted OCR, not a custom trained AI model.
- [ ] Describe native mobile and custom AI training as future work unless the code is complete.
- [ ] Prepare a fallback demo path if Google Vision, Cloudinary, or email delivery is unavailable.
