# FPTU Lost & Found System Architecture

Last updated: 2026-07-27

## Goal

Build a campus-first Lost & Found platform for FPT University with public boards, verified claims, AI-assisted matching, handover points, appointments, realtime chat, reputation, and admin governance.

## Proposed Monorepo

```text
apps/
  web/                  React + TypeScript + Vite web app
  api-node/             Node.js core web-facing API for the current MVP demo flow
  mobile/               Expo React Native mobile MVP
  java-admin-service/   Spring Boot business/admin extension
shared/                 Shared TypeScript models and constants
docs/
  Overall/              System architecture, MVP scope and team boundaries
```

## Service Boundaries

| Area | Owner | Responsibility |
| --- | --- | --- |
| Web App | VQ-supported implementation surface | Guest/User/Staff/Admin UI currently lives in the React web app; no dedicated UI owner is assigned in the canonical UC checklist |
| Mobile App | AK | Expo React Native MVP for auth, board, post creation, image upload, matching feedback, claims, appointments, handover points, notifications, chat, profile, and staff snapshots |
| Node API | VQ | Core web-facing REST API, auth, user profile, posts, Cloudinary, claim base, admin/staff API, matching, Socket.IO, chat history, and current web demo orchestration |
| AI / Evidence / Warehouse Algorithm | QD | Vision/OCR, auto tags, evidence verification, advisory review-confidence percentage, overdue warehouse processing, disposal/donation algorithm |
| Java Admin Service | TL | Parallel Spring Boot business/admin extension for selected rule-heavy operations; not presented as a complete production microservice split until flow ownership is single-source |

For demo positioning, the React web app talks primarily to the Node API. Java should be described as a business-service extension unless a specific demo flow is intentionally routed through Java.

Detailed Node/Java ownership is documented in [node-java-service-boundary.md](node-java-service-boundary.md). The short version is: Node owns the current web MVP runtime; Java can run in parallel for selected business/admin rules and future service split work.

## Backend API Foundation

`apps/api-node` now uses a standard Express structure:

```text
src/
  models/
  repositories/
  controllers/
  routes/
  services/
  middlewares/
  validators/
  config/
  migrations/
```

Current Node API endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register/request-otp` | Send registration OTP before account creation |
| `POST` | `/api/auth/register` | Verify registration OTP, create account, assign USER plus Student/Lecturer role and issue tokens |
| `POST` | `/api/auth/resend-otp` | Resend OTP for pending registration flows |
| `POST` | `/api/auth/login` | Login with email/password and receive access/refresh tokens |
| `POST` | `/api/auth/refresh` | Rotate refresh token and issue a new token pair |
| `POST` | `/api/auth/logout` | Revoke refresh token |
| `POST` | `/api/auth/forgot-password` | Send password reset OTP |
| `POST` | `/api/auth/reset-password` | Verify reset OTP, update password and revoke active refresh tokens |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `PUT` | `/api/auth/profile` | Update full name, student code and phone number |
| `POST` | `/api/auth/avatar` | Upload avatar to Cloudinary and replace old asset |
| `GET` | `/api/auth/activity` | Return user activity history |
| `GET` | `/api/auth/reputation` | Return reputation score and recent reputation logs |
| `GET` | `/api/auth/notifications` | Return current user's notifications |
| `PATCH` | `/api/auth/notifications/:id/read` | Mark one notification as read |
| `PATCH` | `/api/auth/notifications/read-all` | Mark all current user's notifications as read |
| `POST` | `/api/posts` | Create LOST/FOUND post and enqueue background matching |
| `GET` | `/api/posts` | Public board with pagination, search, filters, latest sort and first-media `coverImageUrl` for feed cards |
| `GET` | `/api/posts/my` | Current user's posts with filters |
| `GET` | `/api/posts/:id` | Post detail with media, AI tags and matches |
| `PUT` | `/api/posts/:id` | Update owned/admin post |
| `PATCH` | `/api/posts/:id/status` | Update post status |
| `POST` | `/api/posts/:id/media` | Upload item/evidence images, run assisted OCR/tags and enqueue matching after metadata changes |
| `DELETE` | `/api/posts/:id/media/:mediaId` | Delete post media asset and metadata |
| `GET` | `/api/posts/:id/matches` | Return saved matching results for a post |
| `GET` | `/api/posts/:id/matches/explanations` | Return score summary and match reasons |
| `POST` | `/api/posts/:id/matches/re-run` | Admin manual matching re-run |
| `POST` | `/api/posts/:id/report` | User-facing post report |
| `DELETE` | `/api/posts/:id` | Soft-delete owned/admin post |
| `GET` | `/api/search` | Search public posts by normalized keyword, filters and `sort=highest_match` |
| `POST` | `/api/claims` | Submit claim for a FOUND post |
| `GET` | `/api/claims/:id` | Get claim detail with permission guard |
| `POST` | `/api/claims/:id/evidence` | Upload claim evidence image to Cloudinary private folder |
| `GET` | `/api/claims/:id/verification` | Return advisory review confidence and evidence breakdown; never auto-confirm ownership |
| `PATCH` | `/api/claims/:id/more-info` | Request additional claim information |
| `PATCH` | `/api/claims/:id/accept` | Accept claim |
| `PATCH` | `/api/claims/:id/reject` | Reject claim with reason |
| `PATCH` | `/api/claims/:id/cancel` | Cancel claim with reason |
| `GET` | `/api/posts/:id/claims` | List claims for a post owner, staff or admin |
| `POST/PATCH/GET` | `/api/appointments...` | Create, accept, reject, cancel, reschedule, complete, collect return feedback and remind return appointments |
| `GET` | `/api/config/public` | Return public config entries for web/mobile validation |
| `GET` | `/api/admin/config` | Admin-only config list for operational settings |
| `PUT` | `/api/admin/config/:key` | Admin-only typed config update with history |
| `GET` | `/api/admin/config/history` | Admin-only config history |
| `POST` | `/api/admin/config/history/:id/rollback` | Admin-only rollback of a config change with audit history |
| `GET` | `/api/categories` | Return active item categories |
| `GET` | `/api/locations/areas` | Return active campus areas |
| `GET` | `/api/locations/areas/:id/buildings` | Return active buildings in an area |
| `GET` | `/api/handover-points` | Return active handover points |
| `GET` | `/api/handover-points/:id` | Return one active handover point |
| `GET` | `/api/admin/dashboard/overview` | Staff/Admin overview metrics |
| `GET` | `/api/admin/users` | Admin-only user management list |
| `POST` | `/api/admin/users` | Admin-only user creation |
| `PATCH` | `/api/admin/users/:id/status` | Admin-only user status update |
| `PATCH` | `/api/admin/users/:id/roles` | Admin-only role update |
| `GET/POST/PUT/PATCH` | `/api/admin/categories...` | Admin-only category CRUD and active toggle |
| `GET/POST/PUT/PATCH` | `/api/admin/locations/...` | Admin-only area and building CRUD |
| `GET/POST/PUT/PATCH` | `/api/admin/handover-points...` | Admin-only handover point CRUD, map image/marker coordinates and stored-item counts |
| `GET/POST/PUT/PATCH/DELETE` | `/api/admin/warehouse-items...` | Admin-only warehouse item list, create, update, status update and soft delete |
| `GET` | `/api/admin/warehouse-items/export.csv` | Staff/Admin warehouse CSV export |
| `POST` | `/api/admin/warehouse-items/expire-overdue` | Mark overdue warehouse items as expired |
| `POST` | `/api/admin/warehouse-items/alert-near-expiry` | Notify staff/admin about near-expiry items |
| `GET` | `/api/admin/warehouse/capacity` | Return warehouse capacity snapshot |
| `POST` | `/api/admin/warehouse/alert-capacity` | Notify staff/admin when capacity reaches warning threshold |
| `POST` | `/api/admin/jobs/expire-posts` | Expire overdue posts |
| `GET` | `/api/admin/reports` | Admin-only report queue |
| `PATCH` | `/api/admin/reports/:id/handle` | Admin-only report handling and moderation action |
| `GET` | `/api/admin/return-feedback` | Staff/Admin review queue for feedback after completed handovers |
| `PATCH` | `/api/admin/return-feedback/:id/review` | Admin-only update of return-feedback review status |
| `GET` | `/api/health` | API health check |

All Node API responses use `{ success, data?, error?, message? }`.

## Database Foundation

`apps/api-node/src/migrations` contains MySQL 8 migrations for:

| File | Scope |
| --- | --- |
| `001_auth_schema.sql` | Users, roles, user roles, OTPs, OAuth accounts, refresh tokens, login audit logs and user activity logs |
| `002_lost_found_schema.sql` | Posts, media, AI tags, matching, claims, handover points, storage logs, appointments, chat, notifications, reputation, reports, moderation and admin config |
| `003_auth_recovery_schema.sql` | Password reset OTP support |
| `004_user_audience_roles.sql` | Student/Lecturer audience role backfill |
| `005_integrity_constraints.sql` | FK for post handover point and unique claim per post/user |
| `006_appointment_status_accepted.sql` | Normalize appointment enum to `ACCEPTED` |
| `007_posts_contact_and_room_text.sql` | Add post contact info and free-text room/location detail |
| `008_seed_item_categories.sql` | Seed two-level item categories |
| `009_seed_campus_locations.sql` | Seed campus areas and concrete locations |
| `010_notifications_and_warehouse.sql` | Add match notification threshold config and `warehouse_items` |
| `011_media_kind_and_match_threshold.sql` | Add `post_media.media_kind` and normalize matching notification threshold |
| `012_indexes_and_warehouse_lifecycle.sql` | Add feed/matching/notification/log indexes and expand warehouse lifecycle statuses |
| `013_handover_map_location.sql` | Add `handover_points.map_image_url`, `map_position_x`, and `map_position_y` for campus map placement |
| `014_warehouse_retention_and_appointments.sql` | Add warehouse retention, return appointments, and chat/realtime lifecycle support |
| `015_matching_and_warehouse_policy.sql` | Add matching score tiers, image/OCR weights, auto-match safety flag, and warehouse retention/disposition policy config |
| `016_ai_training_feedback.sql` | Add match feedback, suggestion impression logging, persisted score explanations, and export-friendly training data fields |
| `017_media_derivatives.sql` | Add thumbnail and optimized media URLs for faster web/mobile image rendering |
| `018_return_feedback.sql` | Add return feedback after completed appointments and Admin/Staff review queue |
| `019_appointment_return_proof.sql` | Add proof image, uploader, timestamp and note metadata to return appointments |
| `020_matching_jobs.sql` | Add retryable MySQL-backed background matching queue |
| `021_matching_jobs_utc.sql` | Normalize pending matching-job availability to UTC for cloud MySQL timezones |
| `022_claim_secret_privacy.sql` | Hash private claim answers and remove the legacy plaintext column |
| `023_one_accepted_claim_per_post.sql` | Enforce one accepted claim for each FOUND post |
| `024_one_active_appointment_per_claim.sql` | Enforce one active appointment for each accepted claim |
| `025_matching_candidate_prefilter.sql` | Add bounded matching candidate settings and supporting index |
| `026_user_session_version.sql` | Add per-user session version so role, status and password changes invalidate existing access tokens |
| `027_notification_idempotency.sql` | Add optional notification dedupe keys for retry-safe matching notifications |
| `028_operational_guard_indexes.sql` | Add claim and appointment guard indexes used by warehouse lifecycle checks |
| `029_ai_verification_questions.sql` | Add private item-specific questions and claim answer records without plaintext expected answers |
| `030_campus_event_radar.sql` | Add sourced campus events, aggregate anomaly alerts and Radar audit logs |
| `031_ai_feature_flags.sql` | Add independent public kill switches for verification questions, Radar and Visual Hunt |
| `032_ai_feedback_and_question_options.sql` | Add multiple-choice metadata, version-pinned claim assignments and Visual Hunt feedback |
| `033_ai_operational_thresholds.sql` | Add bounded Admin-editable Radar and Visual Hunt candidate thresholds |

Run migrations with:

```bash
npm run migrate:api
```

Check database connectivity before migrations or server startup with:

```bash
npm run check:db
```

The migration runner creates the configured database if needed, takes a MySQL named lock, records a SHA-256 checksum and explicit `APPLYING/APPLIED/FAILED` status in `schema_migrations`, and stops on checksum drift or a partial DDL failure that requires operator review.

Security and integrity notes:

- The Node API uses Helmet and route-level rate limiting for sensitive auth/write/upload flows. Rate limits use Redis when available and fall back to process-local buckets for single-instance development. `REDIS_REQUIRED=true` turns Redis failure into a startup/readiness failure for scaled deployments; its local default is `false`.
- API CORS is restricted to `FRONTEND_URL` and comma-separated `SOCKET_CORS_ORIGIN`, with localhost-style origins allowed only outside production.
- Web refresh tokens use an `httpOnly`, `SameSite=Lax` cookie; the short-lived access token is kept in web memory and restored through token rotation after reload. Rotation consumes a refresh token once inside a transaction, so concurrent replay has one winner. Mobile/API clients may continue sending refresh tokens in the request body.
- Access tokens carry the user's `session_version`. HTTP middleware and Socket.IO re-check the active account and current version; password reset and Admin role/status changes increment the version and revoke refresh tokens.
- Google OAuth authorization uses a one-time state value and PKCE S256. State/verifier data uses Redis when configured and a bounded TTL store for single-process development; the browser binding cookie is `HttpOnly`.
- Registration and password-reset OTPs are consumed with a conditional one-time update so concurrent requests cannot reuse one valid code.
- Password and LOST-post secret verification values are stored with bcrypt; default salt rounds are 12.
- Password reset revokes all active refresh tokens for that user.
- A user can submit only one claim per post, enforced by both service validation and a database unique key.
- Claim status transitions must have one runtime owner in the selected deployment. The current web MVP primarily uses Node endpoints; Java implementations are treated as extension/business-service coverage unless routed explicitly.
- Sensitive admin management endpoints require `ADMIN`; `STAFF` can access only the overview-style admin surface.
- Category administration is limited to two levels: main groups and concrete categories. The API rejects nested child categories and rejects moving a group that already has children under another group.
- The Node API verifies the configured MySQL connection before listening so DB configuration failures fail fast.
- Production logs are structured JSON with request IDs and bounded route labels. Liveness, dependency-aware readiness and protected Prometheus-compatible metrics are available under `/api/health*` and `/api/metrics`.
- Socket.IO uses the Redis adapter when configured; otherwise the API clearly reports single-process mode. CI runs Redis-backed runtime smoke coverage.

## Known Architecture Debt

These issues are not blockers for the current MVP demo, but they should be acknowledged honestly if a judge asks about maintainability:

| Area | Current state | Recommended next step |
| --- | --- | --- |
| Web frontend | `apps/web/src/App.tsx` is about 750 lines after board/posts, Create Post, account, Post Detail, claim dialogs/workflows, claim chat/verification and Admin were extracted. `styles.css` and the Admin feature module remain large. | Split Admin and CSS internally by domain in small verified steps |
| Web navigation | Public board, my posts, create, handover, account and post detail use real URLs through a small browser History API adapter with back/forward and deep-link smoke coverage | Add route-level lazy loading only when bundle/performance measurement justifies it |
| Mobile frontend | `apps/mobile/App.tsx` still contains many screens and modal flows | Deferred by the current product decision; do not include it in the active Web/backend hardening phase |
| Node post domain | Post controller/service/repository remain large because posts connect matching, media, claims, reports, and admin moderation | Split by subdomain once demo flow is stable: post CRUD, media, matching, moderation, and search |
| Testing depth | API unit/policy tests, smoke/e2e scripts, isolated MySQL/Redis CI, performance smoke and Java/container build gates exist. Playwright covers routing, Student LOST/FOUND creation, Student FOUND claim, Staff review/appointment/proof/completion/feedback and permission boundaries; Redis CI verifies two-instance notification isolation. | Retain large-dataset load artifacts and add hosted staging rehearsal evidence before a broad campus rollout |

## AI And Matching

Post item image upload sends each Cloudinary `secure_url` through Google Vision when Vision is configured. Claim/post evidence images also run OCR where supported so evidence verification can use extracted text, but evidence remains private and AI remains advisory. The Node API stores label/object/OCR tags in `ai_tags`, returns suggested categories in the upload response, and falls back to empty tags/OCR text if Vision is not configured or fails.

Post create/update/media changes enqueue a MySQL-backed matching job. A Node worker claims jobs in batches, retries failures with backoff, and writes materialized match results; suggestion polling only reads saved results. Candidate IDs are bounded by category/location/time before tag aggregation, so OCR/image tags are loaded only for the selected candidate set. The engine builds TF-IDF vectors from normalized title, description, Vision/image tags and OCR text, then combines text, category, location, time, image-tag and OCR/serial-like scores. Config keys define score tiers: weak candidate, user suggestion, notification, and high-confidence advisory. Explanation details include matched tokens, image/OCR terms, location reason, time difference and score caps/penalties. High scores notify users, but never approve ownership or return an item automatically. Automatic `MATCHED` status changes are disabled by default.

### AI-assisted operational tools

These tools are Node-owned extensions of the modular monolith and share the same authorization, audit, configuration and MySQL boundaries. They are not separate production AI microservices.

| Tool | Actual implementation | Guardrails and current limit |
| --- | --- | --- |
| Verification questions | Deterministic item/category/OCR-aware templates; FOUND owner or Staff creates/approves a question; bcrypt stores the expected answer; a versioned assignment pins it to each claim | Advisory reviewer confidence only; no claimant correctness oracle; five attempts; acceptance is blocked while a required assigned answer is missing; answer writes lock and recheck the claim state in one transaction |
| Campus Lost Event Radar | Statistical 60-minute sliding windows with a 15-minute step, 28-day area/category baseline, Admin-editable bounded thresholds, dedupe and cooldown; alert scope can return public LOST summaries | LOST aggregates only; Admin events require a declared source; no automatic weather/event causation; no contact, evidence or personal OCR enters clustering/results |
| Visual Hunt | Explicit camera/image/video-frame/batch capture sent to a rate-limited Node endpoint; Google Vision labels, objects, OCR, color and saved post metadata rank LOST candidates above a bounded Admin-editable threshold | No continuous video upload, no face recognition, no raw scan persistence, no exact-instance claim, no automatic post/claim state transition |

Each tool has an independent public config flag: `ai.verification_questions_enabled`, `ai.campus_radar_enabled`, and `ai.visual_hunt_enabled`. Backend middleware enforces the flag even if a client calls the endpoint directly. Radar and Visual Hunt numeric thresholds are bounded consistently during Admin update and rollback, while runtime clamping remains defense in depth. Radar alerts and Visual Hunt feedback expose aggregate operational metrics; provider/runtime metrics remain meaningful only in an environment with a configured `GOOGLE_VISION_API_KEY`.

Warehouse retention now uses policy defaults from config: general items 60 days, electronics/high-value items 90 days, documents/cards 120 days, and perishable/hygiene/unsafe items 1-7 days depending on configuration. Disposal/donation/transfer is blocked while related claims or return appointments are pending/accepted, and document/card items must be transferred rather than donated or disposed.

## Java Admin Service Foundation

`apps/java-admin-service` now uses Spring Boot Security with JWT bearer tokens signed by the Node API `JWT_ACCESS_SECRET`. Implemented admin APIs cover claim state transitions, handover point management, storage logs, and typed configuration updates/history. The service maps directly to the MySQL tables created by the Node migrations and keeps Hibernate `ddl-auto=none`.

Because Node currently also implements several demo-critical APIs, including admin config for the web demo, the Java service should be presented as a parallel extension/business-service layer. Do not claim a production-grade microservice architecture without an integration contract that prevents double-writing the same claim, appointment, handover, warehouse, or config state.

## Core Data Modules

| Module | Key Entities |
| --- | --- |
| Identity | User, Role, Session, OTP, ActivityLog |
| Posts | LostFoundPost, Category, CampusLocation, PostMedia, SecretVerification |
| Matching | MatchResult, MatchScoreBreakdown, AiTag, OcrText, MatchingJob |
| AI Operations | VerificationQuestion, ClaimVerificationAssignment, RadarEvent, RadarAlert, VisualHuntFeedback |
| Claims | Claim, ClaimEvidence, ClaimDecision, ClaimStateLog, VerificationAnswer |
| Handover | HandoverPoint, WarehouseItem, WarehouseCapacity, ExpiredItemDisposition, StorageLog, ItemCustodyStatus |
| Appointment | ReturnAppointment, AppointmentProof, AppointmentParticipant, Reminder |
| Communication | ChatRoom, ChatMessage, Notification |
| Governance | Report, ModerationAction, ReputationScore, ReturnFeedback, ConfigEntry, ConfigHistory |

## Project Documents

| Module | Status | Document |
| --- | --- | --- |
| Project Overview | Main product/repository overview | [project-overview.md](project-overview.md) |
| MVP Scope | Current deliverable and future work boundary | [mvp-scope-and-future-work.md](mvp-scope-and-future-work.md) |
| Node/Java Boundary | Service ownership and safe thesis explanation | [node-java-service-boundary.md](node-java-service-boundary.md) |
| Master Dev Checklist | Canonical 100-UC checklist | [../Checklist/master-dev-checklist.md](../Checklist/master-dev-checklist.md) |
| Pending Tasks | Granular open task list | [../Checklist/pending-tasks.md](../Checklist/pending-tasks.md) |
| Requirements | FR/NFR status | [../Requirements and Business Rules/requirements.md](../Requirements%20and%20Business%20Rules/requirements.md) |
| Business Rules | Business policy status | [../Requirements and Business Rules/business-rules.md](../Requirements%20and%20Business%20Rules/business-rules.md) |

## Integration Flow

1. User creates LOST or FOUND post from the core web client; Expo remains an optional prototype client.
2. Node API validates input, stores post/media and enqueues matching for the affected post.
3. The matching worker prefilters a bounded opposite-post candidate set, analyzes saved text/OCR/tag metadata, and materializes match results; user suggestion reads are batch-loaded.
4. In-app notifications are persisted for likely owners/finders when score passes the notification threshold.
5. Claimant submits evidence; finder/staff/admin reviews it.
6. Only an accepted claim can join/send/read claim chat; chat images are resolved from a server-validated Cloudinary public ID. The accepted flow can then create a return appointment.
7. Each claim has at most one active appointment. Completion records the acting user and updates return state, post/warehouse status, notifications and reputation where applicable.
8. Users can submit feedback after completed handovers; Staff/Admin can monitor it and Admin can mark items reviewed, flagged or dismissed.
9. Scheduled Node jobs use a MySQL named lock before handling overdue posts/items, near-expiry alerts, capacity alerts and appointment reminders.
10. Optional Redis coordinates distributed rate limits and Socket.IO rooms across API instances; health and metrics expose runtime mode and queue pressure.

## Frontend Foundation

`apps/web` now starts as an operational web app, not a marketing page. The first screen is the public Lost & Found board with API-backed search, filters, sorting, first-image feed covers, post detail, claim flow and account actions.

| Route | Purpose |
| --- | --- |
| In-app board view | Public LOST/FOUND board with keyword, type, one-or-more category, area, status, date and match-score filters |
| In-app create view | Create LOST/FOUND post and upload images |
| In-app account view | Register, OTP verification, login/logout, profile edit, avatar upload, activity and reputation |
| `/posts/:id` | Dedicated post detail page with gallery, AI tags, match explanations and FOUND-post claim submission |

## Brand Direction

Use a restrained FPT University-inspired palette:

- Orange `#F37124` for primary CTA and high-energy accents.
- Blue `#0651A0` and `#008DDE` for trust, navigation, technology, and AI.
- Green `#53B848` for campus, resolved status, and handover success.
- Keep surfaces mostly white/off-white with crisp borders for a modern university system rather than a playful consumer app.

## Private Assistance Boundary (2026-08-03)

- Node.js remains the only write owner for private proofs, post visibility and claim-proof attachments.
- `private_proofs` stores owner-scoped records; secret values are bcrypt-hashed and private media identifiers never leave the API.
- `claim_private_proofs` stores an immutable descriptive snapshot so archiving a Vault record does not break claim history. Attach/archive uses row locks.
- `PRIVATE_DETAILS` FOUND posts are redacted by backend serializers for public list/detail/search/match suggestions. Matching still reads full internal signals.
- AI-assisted draft analyzes an ephemeral in-memory image with Google Vision assisted OCR/tags and returns an editable draft. It never creates a post automatically.
- Evidence Consistency Map extends review confidence without automatic claim decisions. Detailed signals are reviewer-only; claimants receive a general review state.

## User Recovery Assistance Boundary (2026-08-03)

- Node.js remains the write owner for `lost_search_profiles`, `finder_scan_sessions`, post creation and match job enqueueing. Java does not write these flows.
- Search Companion persists owner-private answers separately from the public LOST post. Its preview calls the existing matching calculation without saving match rows, changing state or sending notifications. Only public-safe fields can be applied to the post.
- Recovery Timeline is a derived read model over existing persisted workflow records. It does not own workflow state and excludes raw evidence/media identifiers, private answers and internal notes.
- Finder Quick Scan analyzes one explicitly captured/uploaded frame in memory. The stored session contains only safe draft/candidate snapshots; the raw image and raw OCR are not persisted.
- Finder publish locks the scan session and inserts the FOUND post plus publish marker in one transaction. Repeated requests with the same session return the existing post.
- Existing `notification:new` Socket.IO delivery invalidates the timeline cache, with a 30-second authenticated polling fallback. No public or cross-user Socket room is introduced.
- Migrations 035-036 create all new feature flags with value `false`. Deployment must pass isolated migration smoke and the corresponding E2E before an operator enables them.
- Finder draft preparation accepts only `ANALYZED` or `DRAFT_READY`; terminal `PUBLISHED`/`EXPIRED` sessions fail with `409`.
