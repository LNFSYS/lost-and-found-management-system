# MVP Scope And Future Work

Last updated: 2026-06-30

## Current MVP Positioning

FPTU Lost & Found System is presented as a web-first campus Lost & Found MVP for FPT University Da Nang.

The core demo deliverable is the React web app plus the Node.js backend and MySQL schema for the main Lost/Found workflow:

1. Create LOST or FOUND post.
2. Upload item images and private evidence where needed.
3. Run rule-based/hybrid matching using title, description, category, location, time, and Google Vision assisted metadata.
4. Notify users about likely matches.
5. Submit claim with ownership evidence.
6. Review evidence and show ownership confidence as decision support.
7. Create return appointment after an accepted claim.
8. Track handover points, warehouse items, retention deadlines, and stored-item counts.
9. Use realtime chat/notifications for claim and return coordination.
10. Let Staff/Admin manage the operational dashboard, warehouse, handover points, moderation, and reports.

## AI And Matching Scope

Implemented scope:

- Google Vision assisted labels/tags/OCR when configured.
- Rule-based/hybrid matching with text similarity, category, location, time, and Vision/OCR metadata.
- Evidence verification percentage as advisory support for finder/staff review.

Not claimed as current MVP:

- Custom trained AI model.
- Production MLOps pipeline.
- Dataset labeling, model registry, deployment, or continuous retraining.

Use wording such as "AI-assisted OCR", "Google Vision assisted recognition", and "rule-based/hybrid matching" in demo slides and UI explanations.

## Mobile Scope

Mobile is a future enhancement. The current deliverable should be evaluated through the responsive web app.

Do not present the React Native folder as a completed mobile application unless the mobile auth, board, post, claim, appointment, chat, notification, secure storage, and offline/retry flows are implemented.

## Node.js And Java Boundary

For the current MVP demo, Node.js is the core runtime service used by the web app. It owns auth, posts, media, matching, notifications, handover lookup/admin APIs, warehouse APIs, appointments, and realtime Socket.IO flows.

The Java/Spring Boot service is an extension/business-service layer for selected admin/business rules. It shares the MySQL schema created by Node migrations and should be described as an extension unless the demo intentionally routes a flow through it.

Avoid presenting the project as a fully production-grade microservice system until ownership of claim transitions, handover, warehouse, appointment, and config writes is made single-source and covered by integration tests.

## Known Future Work

- Google OAuth.
- Full web configuration page and rollback UI.
- Direct chat file upload instead of URL-only image messages.
- Chat unread badge hardening.
- Smart notification tiers/digest.
- Handover proof image upload.
- Feedback after successful return and negative-feedback review.
- Background matching queue for large data.
- Role matrix, warehouse lifecycle, claim race condition, migration, and realtime room isolation tests.
- Native mobile app.
- Custom AI training/MLOps pipeline.
