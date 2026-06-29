# FPTU Lost & Found System Architecture

## Goal

Build a campus-first Lost & Found platform for FPT University with public boards, verified claims, AI-assisted matching, handover points, appointments, realtime chat, reputation, and admin governance.

## Proposed Monorepo

```text
apps/
  web/                  React + TypeScript + Vite web app
  api-node/             Node.js API for auth, migrations, posts, uploads and claims
  mobile/               React Native app placeholder
  java-admin-service/   Spring Boot service for admin/business modules
shared/                 Shared TypeScript models and constants
docs/
  architecture.md       System architecture and team boundaries
```

## Service Boundaries

| Area | Owner | Responsibility |
| --- | --- | --- |
| Web App | VQ-supported implementation surface | Guest/User/Staff/Admin UI currently lives in the React web app; no dedicated UI owner is assigned in the canonical UC checklist |
| Mobile App | AK | User mobile flows: auth, posts, claims, chat, appointments |
| Node API | VQ | Core REST API, auth, user profile, posts, Cloudinary, claim base, admin/staff API, matching, Socket.IO, chat history |
| AI / Evidence / Warehouse Algorithm | QD | Vision/OCR, auto tags, evidence verification, ownership confidence percentage, overdue warehouse processing, disposal/donation algorithm |
| Java Admin Service | TL | Java business rules, claim transitions, handover lifecycle, appointments, reputation, scheduled tasks, AI training pipeline |

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
| `POST` | `/api/posts` | Create LOST/FOUND post and return match suggestions when available |
| `GET` | `/api/posts` | Public board with pagination, search, filters, latest sort and first-media `coverImageUrl` for feed cards |
| `GET` | `/api/posts/my` | Current user's posts with filters |
| `GET` | `/api/posts/:id` | Post detail with media, AI tags and matches |
| `PUT` | `/api/posts/:id` | Update owned/admin post |
| `PATCH` | `/api/posts/:id/status` | Update post status |
| `POST` | `/api/posts/:id/media` | Upload item images/evidence images to Cloudinary, save `media_kind`, run AI for item images and return match suggestions |
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
| `GET` | `/api/claims/:id/verification` | Return ownership confidence percentage and evidence breakdown |
| `PATCH` | `/api/claims/:id/more-info` | Request additional claim information |
| `PATCH` | `/api/claims/:id/accept` | Accept claim |
| `PATCH` | `/api/claims/:id/reject` | Reject claim with reason |
| `PATCH` | `/api/claims/:id/cancel` | Cancel claim with reason |
| `GET` | `/api/posts/:id/claims` | List claims for a post owner, staff or admin |
| `POST/PATCH/GET` | `/api/appointments...` | Create, accept, reject, cancel, reschedule, complete and remind return appointments |
| `GET` | `/api/config/public` | Return public config entries for web/mobile validation |
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
| `POST` | `/api/admin/warehouse-items/expire-overdue` | Mark overdue warehouse items as expired |
| `POST` | `/api/admin/warehouse-items/alert-near-expiry` | Notify staff/admin about near-expiry items |
| `GET` | `/api/admin/warehouse/capacity` | Return warehouse capacity snapshot |
| `POST` | `/api/admin/warehouse/alert-capacity` | Notify staff/admin when capacity reaches warning threshold |
| `POST` | `/api/admin/jobs/expire-posts` | Expire overdue posts |
| `GET` | `/api/admin/reports` | Admin-only report queue |
| `PATCH` | `/api/admin/reports/:id/handle` | Admin-only report handling and moderation action |
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
| `011_media_kind_and_match_threshold.sql` | Add `post_media.media_kind` and keep notification threshold at `0.8` |
| `012_indexes_and_warehouse_lifecycle.sql` | Add feed/matching/notification/log indexes and expand warehouse lifecycle statuses |
| `013_handover_map_location.sql` | Add `handover_points.map_image_url`, `map_position_x`, and `map_position_y` for campus map placement |
| `014_warehouse_retention_and_appointments.sql` | Add warehouse retention, return appointments, and chat/realtime lifecycle support |

Run migrations with:

```bash
npm run migrate:api
```

Check database connectivity before migrations or server startup with:

```bash
npm run check:db
```

The migration runner creates the configured database if needed and records applied files in `schema_migrations`.

Security and integrity notes:

- Password and LOST-post secret verification values are stored with bcrypt; default salt rounds are 12.
- Password reset revokes all active refresh tokens for that user.
- A user can submit only one claim per post, enforced by both service validation and a database unique key.
- After initial claim creation, claim status transitions are owned by the Java Admin Service so row locks and status guards are centralized.
- Sensitive admin management endpoints require `ADMIN`; `STAFF` can access only the overview-style admin surface.
- Category administration is limited to two levels: main groups and concrete categories. The API rejects nested child categories and rejects moving a group that already has children under another group.
- The Node API verifies the configured MySQL connection before listening so DB configuration failures fail fast.

## AI And Matching

Post item image upload sends each Cloudinary `secure_url` through Google Vision when Vision is configured. Claim/post evidence images also run OCR where supported so evidence verification can use extracted text, but evidence remains private and AI remains advisory. The Node API stores label/object/OCR tags in `ai_tags`, returns suggested categories in the upload response, and falls back to empty tags/OCR text if Vision is not configured or fails.

The matching engine runs after post create/update and after post image tags are saved. It builds TF-IDF vectors from normalized title, description and AI tags, calculates cosine text score plus category/location/time scores, applies weights from `config_entries`, and upserts rows into `match_results` when the total score passes `matching.threshold`. When `total_score >= matching.notification_threshold`, it marks the pair as `MATCHED`, persists `MATCH_FOUND` notifications for both users, marks the match as notified, and returns match suggestions to the UI for LOST posts.

## Java Admin Service Foundation

`apps/java-admin-service` now uses Spring Boot Security with JWT bearer tokens signed by the Node API `JWT_ACCESS_SECRET`. Implemented admin APIs cover claim state transitions, handover point management, storage logs, and typed configuration updates/history. The service maps directly to the MySQL tables created by the Node migrations and keeps Hibernate `ddl-auto=none`.

## Core Data Modules

| Module | Key Entities |
| --- | --- |
| Identity | User, Role, Session, OTP, ActivityLog |
| Posts | LostFoundPost, Category, CampusLocation, PostMedia, SecretVerification |
| Matching | MatchResult, MatchScoreBreakdown, AiTag, OcrText |
| Claims | Claim, ClaimEvidence, ClaimDecision, ClaimStateLog |
| Handover | HandoverPoint, WarehouseItem, WarehouseCapacity, ExpiredItemDisposition, StorageLog, ItemCustodyStatus |
| Appointment | ReturnAppointment, AppointmentParticipant, Reminder |
| Communication | ChatRoom, ChatMessage, Notification |
| Governance | Report, ModerationAction, ReputationScore, ConfigEntry, ConfigHistory |

## Project Documents

| Module | Status | Document |
| --- | --- | --- |
| Project Overview | Clean product overview | [lost-found-system-overview.md](lost-found-system-overview.md) |
| Master Dev Checklist | Canonical 100-UC checklist | [../Checklist/master-dev-checklist.md](../Checklist/master-dev-checklist.md) |
| Pending Tasks | Granular open task list | [../Checklist/pending-tasks.md](../Checklist/pending-tasks.md) |
| Requirements | FR/NFR status | [../Requirements and Business Rules/requirements.md](../Requirements%20and%20Business%20Rules/requirements.md) |
| Business Rules | Business policy status | [../Requirements and Business Rules/business-rules.md](../Requirements%20and%20Business%20Rules/business-rules.md) |

## Integration Flow

1. User creates LOST or FOUND post from web/mobile.
2. Node API validates input, stores post/media, then runs matching for the affected post.
3. AI/matching service analyzes item images/text and saves match results.
4. In-app notifications are persisted for likely owners/finders when score passes the notification threshold.
5. Claimant submits evidence; finder/staff/admin reviews it.
6. Accepted claim creates chat room and return appointment.
7. Appointment completion updates return state, post/warehouse status, notifications and reputation where applicable.
8. Scheduled Node jobs handle overdue posts, overdue warehouse items, near-expiry alerts, capacity alerts and appointment reminders.

## Frontend Foundation

`apps/web` now starts as an operational web app, not a marketing page. The first screen is the public Lost & Found board with API-backed search, filters, sorting, first-image feed covers, post detail, claim flow and account actions.

| Route | Purpose |
| --- | --- |
| In-app board view | Public LOST/FOUND board with keyword, type, category, area, status, date and match-score filters |
| In-app create view | Create LOST/FOUND post and upload images |
| In-app account view | Register, OTP verification, login/logout, profile edit, avatar upload, activity and reputation |
| Modal/drawer flows | Post detail, AI tags, matches and FOUND-post claim submission |

## Brand Direction

Use a restrained FPT University-inspired palette:

- Orange `#F37124` for primary CTA and high-energy accents.
- Blue `#0651A0` and `#008DDE` for trust, navigation, technology, and AI.
- Green `#53B848` for campus, resolved status, and handover success.
- Keep surfaces mostly white/off-white with crisp borders for a modern university system rather than a playful consumer app.
