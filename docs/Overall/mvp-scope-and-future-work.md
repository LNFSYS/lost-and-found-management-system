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

## Verification Model

The project can be explained with a three-layer verification model, but only Layer 1 and Layer 3 are current MVP scope:

| Layer | Current status | Explanation |
| --- | --- | --- |
| Layer 1 - Rule-based/hybrid matching | Implemented | TF-IDF/cosine text similarity plus category, location, time, Vision tags/OCR and configurable weights |
| Layer 2 - Custom trained AI model | Future work | Would require labeled data, model registry, evaluation metrics, inference endpoint and fallback strategy |
| Layer 3 - Human evidence verification | Implemented as decision support | Claim evidence and ownership confidence support reviewer decisions; the system must not auto-approve ownership |

Current Layer 1 scoring uses:

| Component | Default weight |
| --- | ---: |
| Text/title/description/OCR tags | 40% |
| Category | 30% |
| Location | 20% |
| Time proximity | 10% |

Important defense wording:

- "The system suggests likely matches; it does not decide ownership automatically."
- "The verification percentage is advisory and must be reviewed with claimant evidence."
- "Custom AI training is future work after enough labeled campus data is collected."

## Mobile Scope

Mobile is a future enhancement. The current deliverable should be evaluated through the responsive web app.

Do not present the React Native folder as a completed mobile application unless the mobile auth, board, post, claim, appointment, chat, notification, secure storage, and offline/retry flows are implemented.

## Node.js And Java Boundary

For the current MVP demo, Node.js is the core web-facing runtime service used by the React app. It owns auth, posts, media, matching, notifications, handover lookup/admin APIs, warehouse APIs, appointments, and realtime Socket.IO flows.

The Java/Spring Boot service is a parallel extension/business-service layer for selected admin/business rules. It shares the MySQL schema created by Node migrations and verifies the same JWT secret. It should be described as a Java business extension unless the demo intentionally routes a flow through it.

Avoid presenting the project as a fully production-grade microservice system until ownership of claim transitions, handover, warehouse, appointment, and config writes is made single-source and covered by integration tests.

See [node-java-service-boundary.md](node-java-service-boundary.md) for the ownership matrix and safe defense wording.

## Known Future Work

- Config rollback UI.
- FPT/university email-domain policy hardening for Google OAuth.
- Realtime chat reconnect/offline/socket-room isolation hardening.
- Smart notification tiers/digest.
- Handover proof image upload.
- Feedback after successful return and negative-feedback review.
- Background matching queue for large data.
- Role matrix, warehouse lifecycle, claim race condition, migration, and realtime room isolation tests.
- Native mobile app.
- Custom AI training/MLOps pipeline.
