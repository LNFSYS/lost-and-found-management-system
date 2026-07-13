# MVP Scope And Future Work

> Delivery note (2026-07-10): the team is prioritizing Web + Node/Java backend completion. Mobile remains a prototype/extension and is intentionally not part of the current implementation sprint.

Last updated: 2026-07-08

## Current MVP Positioning

FPTU Lost & Found System is presented as a web-first campus Lost & Found MVP for FPT University Da Nang.

The core demo deliverable is the React web app plus the Node.js backend and MySQL schema for the main Lost/Found workflow:

1. Create LOST or FOUND post.
2. Upload item images and private evidence where needed.
3. Run rule-based/hybrid matching using title, description, category, location, time, image tags, and OCR/serial-like metadata.
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
- Rule-based/hybrid matching with text similarity, category, location, time, Vision/image tags, OCR text, score tiers, and explanation reasons.
- Evidence review confidence as advisory support for finder/staff review.

Not claimed as current MVP:

- Production custom trained AI model.
- Production MLOps pipeline.
- Model registry, deployed inference endpoint, or continuous retraining.

Use wording such as "AI-assisted OCR", "Google Vision assisted recognition", and "rule-based/hybrid matching" in demo slides and UI explanations.

See [ai-training-roadmap.md](ai-training-roadmap.md) for the future custom AI training order: data foundation, explicit feedback labels, redacted exports, lightweight model evaluation, optional inference, and rule-based fallback.

## Verification Model

The project can be explained with a three-layer verification model, but only Layer 1 and Layer 3 are current MVP scope:

| Layer | Current status | Explanation |
| --- | --- | --- |
| Layer 1 - Rule-based/hybrid matching | Implemented | TF-IDF/cosine text similarity plus category, location, time, Vision/image tags, OCR/serial-like tokens, configurable weights, score tiers, and explanation reasons |
| Layer 2 - Custom trained AI model | Future work | Would require labeled data, model registry, evaluation metrics, inference endpoint and fallback strategy |
| Layer 3 - Human evidence verification | Implemented as decision support | Claim evidence and review confidence support reviewer decisions; the system must not auto-approve ownership |

Current Layer 1 scoring uses configurable defaults:

| Component | Default weight |
| --- | ---: |
| Text/title/description | 30% |
| Category | 20% |
| Location | 15% |
| Time proximity | 10% |
| Vision/image tags | 15% |
| OCR/serial-like text | 10% |

Current score tiers:

| Score | Behavior |
| --- | --- |
| `< 45%` | Ignored; stale match rows are removed on re-run |
| `45-59%` | Saved as weak internal candidate |
| `60-74%` | Shown as user suggestion |
| `75-84%` | Sends lightweight match notification |
| `>= 85%` | High-confidence advisory match; still not ownership approval |

Important defense wording:

- "The system suggests likely matches; it does not decide ownership automatically."
- "The review confidence percentage is advisory and must be reviewed with claimant evidence."
- "Custom AI training is future work after enough labeled campus data is collected."

## Mobile Scope

An Expo React Native mobile MVP is now available in `apps/mobile`.

Implemented mobile scope:

- Login, register OTP, logout, and secure token storage.
- LOST/FOUND board, search, filter, sort, and post detail.
- Create LOST/FOUND posts and upload item images from the gallery.
- Match suggestions with feedback labels for future training data.
- Submit claims, upload claim evidence, view verification confidence, create appointments, and submit post-return feedback after completed handovers.
- Handover point list, notifications, profile, activity, reputation, staff dashboard, warehouse/report snapshots, and Socket.IO claim chat.

Still not claimed as fully production mobile:

- Native push notification delivery.
- Offline queue/retry and reconnect test matrix.
- Deeper mobile upload validation.
- App store release, device farm testing, and mobile observability.
- Separate Flutter app. Flutter is a different stack from Expo and should be tracked as a separate project only if the team chooses to build it.

## Node.js And Java Boundary

For the current MVP demo, Node.js is the core web-facing runtime service used by the React app. It owns auth, posts, media, matching, notifications, handover lookup/admin APIs, warehouse APIs, appointments, and realtime Socket.IO flows.

The Java/Spring Boot service is a parallel extension/business-service layer for selected admin/business rules. It shares the MySQL schema created by Node migrations and verifies the same JWT secret. It should be described as a Java business extension unless the demo intentionally routes a flow through it.

Avoid presenting the project as a fully production-grade microservice system until ownership of claim transitions, handover, warehouse, appointment, and config writes is made single-source and covered by integration tests.

See [node-java-service-boundary.md](node-java-service-boundary.md) for the ownership matrix and safe defense wording.

## Known Future Work

- Stronger enrollment verification can be added later through student-code/admin approval, but FPT/edu email must not be mandatory for current students.
- Realtime chat reconnect/offline/socket-room isolation hardening.
- Notification digest and anti-noise tuning beyond current score tiers.
- Overdue disposition paperwork/report forms for real campus approval workflows.
- Background matching queue for large data.
- More automated coverage for OTP registration, admin CRUD, blank-DB migration rehearsal, realtime room isolation, reconnect and offline behavior.
- Native mobile hardening: push notifications, offline retry, device testing, app store packaging, and optional separate Flutter app.
- Production custom AI training/MLOps pipeline.
