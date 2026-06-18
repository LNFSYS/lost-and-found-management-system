# FPTU Lost & Found System - Project Super Overview

Last updated: 2026-06-14

This document is the single high-level map of the whole repository. It summarizes what the project is, how it is structured, what each service owns, the current database, API surface, frontend screens, main flows, run commands, and known gaps.

## 1. One-Line Summary

FPTU Lost & Found System is a campus Lost & Found platform for FPT University, with community-style lost/found posts for students and lecturers, admin management for operations, AI-assisted matching, OTP-based auth, claim evidence, handover points, warehouse tracking, notifications, and planned chat/appointment/reputation flows.

## 2. Current Repository Snapshot

Files scanned excluding `.git`, `node_modules`, `dist`, `target`, `build`, and `coverage`:

| Area | File count | Purpose |
| --- | ---: | --- |
| Root | 10 | Workspace scripts, env example, Docker Compose, README |
| `apps/api-node` | 69 | Node.js core API, migrations, auth, posts, claims, admin CRUD |
| `apps/web` | 20 | React + Vite web app |
| `apps/java-admin-service` | 38 | Spring Boot admin/business service |
| `apps/mobile` | 1 | React Native placeholder |
| `shared` | 2 | Shared TypeScript types |
| `docs` | 8 | Architecture, requirements, BRs, UC checklist, overview |

Important note: `requirements.md` and `traceability-matrix.md` currently live under:

```text
docs/Requirements and Business Rules/
```

Git currently sees those as moved from the old root `docs/` location.

## 3. Tech Stack

| Layer | Tech |
| --- | --- |
| Monorepo | npm workspaces |
| Web | React 18, TypeScript, Vite, TanStack Query, lucide-react, Three.js |
| Node API | Express, TypeScript, tsx, MySQL2, Zod, JWT, bcryptjs, Multer, Nodemailer, Cloudinary |
| Java Admin Service | Java 21, Spring Boot 3.3, Spring Security, JPA/Hibernate, MySQL Connector, springdoc OpenAPI |
| Database | MySQL 8, utf8mb4 |
| Infra dev | Docker Compose for MySQL and Redis |
| AI/Image | Google Vision API planned/optional, Cloudinary upload |
| Realtime | Redis/Socket.IO planned, not fully implemented |

## 4. Workspace Structure

```text
.
├── apps/
│   ├── api-node/             # Main REST API and DB migrations
│   ├── web/                  # User/Admin web UI
│   ├── java-admin-service/   # Spring Boot admin/business service
│   └── mobile/               # Placeholder for React Native app
├── shared/                   # Shared TypeScript models
├── docs/                     # Project docs and requirements
├── docker-compose.yml        # MySQL + Redis
├── package.json              # Root workspace scripts
└── .env.example              # Environment variable template
```

## 5. Root Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install workspace dependencies |
| `npm run check:db` | Check Node API database connection |
| `npm run migrate:api` | Run MySQL migrations from `apps/api-node/src/migrations` |
| `npm run dev:api` | Start Node API on `API_PORT`, default `3001` |
| `npm run dev:web` | Start Vite web app, default `5173` |
| `npm run build:api` | Compile Node API |
| `npm run build:web` | Build web app |
| `npm run build:java` | Build Spring Boot service with Maven |

## 6. Environment Variables

The project reads env vars from `.env`. Do not commit real secrets.

Main groups:

| Group | Keys |
| --- | --- |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_VISION_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` |
| Node/Web | `NODE_ENV`, `API_PORT`, `FRONTEND_URL`, `VITE_API_URL`, `BCRYPT_SALT_ROUNDS` |
| Java | `JAVA_SERVICE_PORT`, `JAVA_JWT_SECRET` or shared `JWT_ACCESS_SECRET` |
| Redis/Socket | `REDIS_URL`, `SOCKET_PORT` |

Security note: if `.env.example` contains any real-looking API keys, SMTP passwords, or Cloudinary secrets, rotate those credentials and replace the template with placeholders.

## 7. Database Overview

Current local database from `.env`: `fptu_lost_found`

Current table count: 32 base tables. Business table count: 31, because `schema_migrations` is a technical migration ledger.

| Domain | Tables |
| --- | --- |
| Auth/User | `users`, `roles`, `user_roles`, `email_verification_otps`, `refresh_tokens`, `oauth_accounts`, `login_audit_logs`, `user_activity_logs` |
| Posts/Lookup | `posts`, `post_media`, `item_categories`, `campus_areas`, `campus_buildings` |
| AI/Matching | `ai_tags`, `match_results` |
| Claims | `claims`, `claim_evidence`, `claim_state_logs` |
| Handover/Warehouse | `handover_points`, `warehouse_items`, `storage_logs` |
| Appointment/Chat | `return_appointments`, `chat_rooms`, `chat_messages` |
| Notification | `notifications` |
| Governance | `reports`, `moderation_actions`, `reputation_scores`, `reputation_logs` |
| Config/Migration | `config_entries`, `config_history`, `schema_migrations` |

### Migration Files

| File | Purpose |
| --- | --- |
| `001_auth_schema.sql` | Users, roles, OTP, OAuth, refresh tokens, audit/activity |
| `002_lost_found_schema.sql` | Posts, media, AI tags, matching, claims, handover, appointments, chat, notifications, reports, config |
| `003_auth_recovery_schema.sql` | Password reset OTP support |
| `004_user_audience_roles.sql` | Student/Lecturer audience roles |
| `005_integrity_constraints.sql` | FK for post handover point and unique claim per post/user |
| `006_appointment_status_accepted.sql` | Normalize appointment status enum to `ACCEPTED` |
| `007_posts_contact_and_room_text.sql` | Contact info and free-text room/location detail |
| `008_seed_item_categories.sql` | Two-level item category seed |
| `009_seed_campus_locations.sql` | Campus areas and specific locations |
| `010_notifications_and_warehouse.sql` | Notification threshold config and `warehouse_items` |
| `011_media_kind_and_match_threshold.sql` | `post_media.media_kind` and match notification threshold |
| `012_indexes_and_warehouse_lifecycle.sql` | Hot-query indexes and expanded warehouse lifecycle statuses |
| `013_handover_map_location.sql` | Adds handover map image URL/data and percentage marker coordinates |

## 8. Roles And Users

Supported roles:

| Role | Meaning |
| --- | --- |
| `USER` | Generic user role, mostly legacy/base role |
| `STUDENT` | Student audience user |
| `LECTURER` | Lecturer audience user |
| `STAFF` | Operational staff with limited admin/operation access |
| `ADMIN` | Full admin management role |

Current direction:

- Students/lecturers use a community feed, not an admin dashboard.
- Admin uses a separate dashboard/sidebar.
- Sensitive Node admin routes use `ADMIN`; overview-style endpoints may allow `STAFF`.

## 9. Node API Overview

Path: `apps/api-node`

Entrypoints:

| File | Purpose |
| --- | --- |
| `src/server.ts` | Checks DB connection, starts Express |
| `src/app.ts` | Express app setup, middleware, `/api` routes |
| `src/config/env.ts` | Loads `.env` and maps config |
| `src/config/db.ts` | MySQL pool and connection check |
| `src/migrations/run-migrations.ts` | Creates DB if needed and applies ordered SQL migrations |

### Node API Route Groups

Base prefix: `/api`

| Group | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/register/request-otp`, `POST /auth/verify-otp`, `POST /auth/resend-otp`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/refresh`, `POST /auth/logout` |
| Profile | `GET /auth/me`, `PUT /auth/profile`, `POST /auth/avatar`, `GET /auth/activity`, `GET /auth/reputation` |
| Notifications | `GET /auth/notifications`, `PATCH /auth/notifications/read-all`, `PATCH /auth/notifications/:id/read` |
| Posts | `POST /posts`, `GET /posts`, `GET /posts/my`, `GET /posts/:id`, `PUT /posts/:id`, `PATCH /posts/:id/status`, `DELETE /posts/:id` |
| Post Media/Matches | `POST /posts/:id/media`, `DELETE /posts/:id/media/:mediaId`, `GET /posts/:id/matches` |
| Post Claims | `GET /posts/:id/claims` |
| Search | `GET /search` |
| Claims | `POST /claims`, `GET /claims/:id`, `POST /claims/:id/evidence` |
| Public Config | `GET /config/public` |
| Lookup | `GET /categories`, `GET /locations/areas`, `GET /locations/areas/:id/buildings`, `GET /handover-points`, `GET /handover-points/:id` |
| Docs | `GET /docs` |
| Admin Dashboard | `GET /admin/dashboard/overview` |
| Admin Users | `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/roles` |
| Admin Categories | `GET /admin/categories`, `POST /admin/categories`, `PUT /admin/categories/:id`, `PATCH /admin/categories/:id/active` |
| Admin Locations | `GET/POST/PUT/PATCH /admin/locations/areas...`, `GET/POST/PUT/PATCH /admin/locations/buildings...` |
| Admin Handover | `GET/POST/PUT/PATCH /admin/handover-points...` |
| Admin Warehouse | `GET /admin/warehouse-items`, `POST /admin/warehouse-items`, `PUT /admin/warehouse-items/:id`, `PATCH /admin/warehouse-items/:id/status`, `DELETE /admin/warehouse-items/:id` |
| Admin Reports | `GET /admin/reports`, `PATCH /admin/reports/:id/handle` |

### Node API Internal Modules

| Layer | Files |
| --- | --- |
| Controllers | `auth.controller.ts`, `post.controller.ts`, `media.controller.ts`, `claim.controller.ts`, `lookup.controller.ts`, `config.controller.ts`, `admin.controller.ts` |
| Services | `auth.service.ts`, `post.service.ts`, `media.service.ts`, `claim.service.ts`, `matching.service.ts`, `vision.service.ts`, `email.service.ts`, `cloudinary.service.ts`, `config.service.ts` |
| Repositories | `user.repository.ts`, `post.repository.ts`, `claim.repository.ts`, `lookup.repository.ts`, `admin.repository.ts`, `notification.repository.ts`, `config.repository.ts` |
| Validators | `auth.validator.ts`, `post.validator.ts`, `claim.validator.ts`, `media.validator.ts` |
| Middleware | `auth.middleware.ts`, `upload.middleware.ts`, `error.middleware.ts` |
| Utilities | `hash.ts`, `normalize-email.ts`, `normalize-text.ts`, `duration.ts`, `http-error.ts`, `api-response.ts`, `configured.ts` |

## 10. Java Admin Service Overview

Path: `apps/java-admin-service`

Purpose: Spring Boot service for admin/business operations that need Java ownership, such as claim transitions, handover operations, config management/history, and scheduled/business validation.

Runtime:

- Java 21
- Spring Boot 3.3.5
- MySQL shared database
- `ddl-auto=none`; schema is created by Node migrations
- JWT uses `JWT_ACCESS_SECRET` or `JAVA_JWT_SECRET`
- Swagger UI path: `/admin/docs`

### Java Routes

| Controller | Base path | Endpoints |
| --- | --- | --- |
| `ClaimAdminController` | `/admin/claims` | `POST /:id/request-info`, `POST /:id/accept`, `POST /:id/reject`, `POST /:id/cancel` |
| `HandoverAdminController` | `/admin/handover-points` | `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/toggle`, `POST /:id/receive`, `POST /:id/store`, `POST /:id/return` |
| `ConfigAdminController` | `/admin/config` | `GET /`, `PUT /:key`, `GET /history` |

### Java Packages

| Package | Purpose |
| --- | --- |
| `config` | Security, JWT filter, global exception handling |
| `controller` | REST controllers |
| `service` | Business logic and auth context |
| `repository` | Spring Data JPA repositories |
| `entity` | JPA entities/enums mapped to MySQL tables |
| `dto` | Request/response DTOs |

## 11. Web App Overview

Path: `apps/web`

Primary app file: `src/App.tsx`

Key supporting files:

| File | Purpose |
| --- | --- |
| `src/main.tsx` | React entry |
| `src/App.tsx` | Main UI, user views, admin views, forms, dialogs |
| `src/services/api.ts` | Typed API client |
| `src/styles.css` | App styling |
| `src/ThreeCampusScene.tsx` | 3D/visual campus scene |
| `src/landing-data.ts` | Landing/support data |
| `scripts/visual-check.mjs` | Visual check helper |

### User Views

The user-facing app is intentionally a community board/social feed, not an admin CRUD dashboard.

| View | Purpose |
| --- | --- |
| `board` | Public community feed with filters/search |
| `my-posts` | Current user's own posts |
| `create` | Create LOST/FOUND post, upload item/evidence images |
| `handover` | View active handover points on an interactive campus map |
| `account` | Login/register/forgot password/profile/activity/reputation |

### Admin Views

Admin tab type:

```ts
"overview" | "moderation" | "categories" | "locations" | "handover" | "warehouse" | "users" | "reports"
```

| Admin tab | Purpose |
| --- | --- |
| Dashboard | Metrics and overview lists |
| Moderation | Manage posts, mark complete, hide/delete/restore state |
| Categories | Two-level item category CRUD |
| Locations | Area/building CRUD, no room table |
| Handover | Handover point CRUD, campus map image selection, draggable marker placement, stored-item counts |
| Warehouse | `warehouse_items` CRUD/status management |
| Users | User management, status and roles |
| Reports | Report queue and moderation action handling |

### Web Features Implemented

- Guest navbar shows login/register instead of account.
- Login redirects to community board.
- Register has OTP request inside the form.
- Forgot password UI exists.
- Create post includes contact info, category hierarchy, area/building, free-text room/detail.
- Image upload supports multiple item images and evidence images.
- Post detail shows media, AI tags, matches, contact, claim flow.
- Notifications menu shows unread count and read/read-all actions.
- Admin sidebar contains Dashboard, Kiểm duyệt, Danh mục, Khu vực, Bàn giao, Kho đồ, Người dùng, Báo cáo.
- Handover page uses API-backed handover points, map image/marker coordinates, status badges, filters, popup details, and warehouse item counts.
- Admin handover form lets staff/admin choose a campus map image and drag/click a location marker before saving the point.

## 12. Mobile App

Path: `apps/mobile`

Status: placeholder README only.

Planned flows:

- Register/login
- Create LOST/FOUND posts with image upload
- Search public board
- Submit claim evidence
- Handover and appointment flows
- Chat and notifications

## 13. Shared Package

Path: `shared`

Currently exports shared TypeScript types:

- `PostType`: `LOST`, `FOUND`
- `PostStatus`: `OPEN`, `MATCHED`, `RESOLVED`, `CLOSED`, `EXPIRED`
- `ClaimStatus`: `PENDING`, `NEED_MORE_INFO`, `ACCEPTED`, `REJECTED`, `CANCELLED`
- `UserRole`: `USER`, `STUDENT`, `LECTURER`, `STAFF`, `ADMIN`

## 14. Core Business Flows

### Auth And Registration

1. User requests registration OTP by email.
2. User fills register form with OTP.
3. System creates user only when OTP is valid.
4. User selects audience role: `STUDENT` or `LECTURER`.
5. Login returns access/refresh tokens.
6. Forgot password uses OTP and revokes active refresh tokens after reset.

### Lost/Found Posting

1. User creates `LOST` or `FOUND` post.
2. Required fields include title, description, category, time, location info and contact info.
3. `LOST` post includes ownership-verification detail.
4. `FOUND` post includes where the item is currently held: handover point or user-held location details.
5. System runs matching after create/update/upload and may return `matchSuggestions`.

### Media And AI

1. User uploads `images` and optionally `evidenceImages`.
2. Media is stored in `post_media`.
3. `media_kind` is `ITEM` or `EVIDENCE`.
4. Google Vision/AI only analyzes `ITEM` images.
5. Tags/OCR go into `ai_tags`.

### Matching And Notification

1. Matching compares opposite post type: LOST vs FOUND.
2. Scores include text, category, location and time.
3. Weights and thresholds come from `config_entries`.
4. Results are upserted into `match_results`.
5. If score reaches `matching.notification_threshold` (currently 0.8), system creates `MATCH_FOUND` notifications for both users and marks pair as notified.

### Claim Flow

1. Claimant submits claim for a `FOUND` post.
2. Duplicate claim by same user/post is blocked by service and DB unique key.
3. Claim evidence can be uploaded.
4. Staff/admin/finder can request more info, accept or reject depending on role and status.
5. `NEED_MORE_INFO` can only be accepted when new evidence exists.
6. Java service locks claim row during transitions to avoid race conditions.

### Handover And Warehouse

1. Handover points are active locations for item storage/return.
2. Admin manages handover points.
3. Staff/admin can record receive/store/return actions.
4. `warehouse_items` tracks stored/unclaimed items.
5. Current warehouse statuses: `RECEIVED`, `STORED`, `CLAIMED`, `RETURNED`, `DISPOSED`.
6. Expanded lifecycle statuses available in schema/API/UI: `PENDING_APPROVAL`, `RECEIVED`, `STORED`, `CLAIMED`, `RETURNED`, `EXPIRED`, `DISPOSED`, `DONATED`, `TRANSFERRED`.
7. Retention deadlines, capacity checks and disposition reports are still planned.

### Expired Lost Item Lifecycle - Planned

Use case: `UC-178 - Manage Expired Lost Items / Quản lý đồ thất lạc quá hạn lưu trữ`

Planned behavior:

- Normal items: retain 30-60 days.
- High-value items: retain 90 days.
- Personal documents/student cards: prioritize contact or transfer to CTSV/security.
- Warn admin 7 days before expiration.
- Warn when warehouse capacity reaches 80%.
- Block/select alternative when warehouse reaches 100%.
- Expired item handling must record reason, actor, date, final status, note and optional proof image.

## 15. Documentation Map

| File | Purpose |
| --- | --- |
| `docs/project-super-overview.md` | This one-file whole-project map |
| `docs/architecture.md` | Architecture and service boundaries |
| `docs/lost-found-system-overview.md` | Thesis-style project overview and full UC catalog |
| `docs/Requirements and Business Rules/business-rules.md` | Business rules BR-01 onward |
| `docs/Requirements and Business Rules/requirements.md` | Functional/non-functional requirements by module |
| `docs/Requirements and Business Rules/traceability-matrix.md` | BR to FR/NFR to UC traceability |
| `docs/master-dev-checklist.md` | Master dev-owned UC checklist |
| `docs/db-auth-design.md` | Auth DB design |
| `docs/MASTER_AGENT_PROMPT.md` | Large implementation prompt/spec snapshot |

## 16. Implemented vs Planned At A Glance

### Implemented Or Partially Implemented

- Node auth, OTP registration, forgot/reset password.
- JWT access/refresh token handling.
- User profile/avatar/activity/reputation endpoint placeholders/data.
- Public board, post CRUD, my posts, search/filter.
- Multiple post images and item/evidence split.
- Claim creation, duplicate guard, evidence upload.
- AI tag storage and optional Vision integration.
- Matching engine and match notification persistence.
- Admin dashboard shell and CRUD tabs.
- Category/location/handover/user/report/admin warehouse management.
- Java claim transitions, handover operations, config update/history.
- Database migrations up to `011`.

### Planned Or Not Complete

- Mobile app implementation.
- Realtime Socket.IO chat.
- Realtime notification streaming.
- Appointment UI/API completion.
- Reputation scoring business logic.
- Export PDF/CSV reports.
- Full expired warehouse lifecycle and capacity management.
- Admin manual re-run matching.
- Google OAuth.
- Background queue for matching at large scale.

## 17. Known Technical Notes And Risks

| Topic | Note |
| --- | --- |
| Secrets | `.env.example` should contain placeholders only. Rotate any real-looking credentials if they were committed. |
| DB migration location | `requirements.md` and traceability docs are moved under `docs/Requirements and Business Rules/`; be consistent when linking. |
| Matching execution | Matching currently runs after save/upload to return suggestions; background queue remains planned. |
| Node + Java shared DB | Both services use the same MySQL schema; claim status transitions are owned by Java after Node creates the initial claim. |
| Warehouse lifecycle | Schema/API/UI now support expanded lifecycle statuses; retention deadlines, capacity checks and processing reports are still planned. |
| Rooms | Room table was removed; posts use free-text `room_text`/location detail. |
| Admin vs Staff | Sensitive Node admin endpoints require `ADMIN`; keep this strict when adding new routes. |
| Cloudinary/Vision | Upload should not fail hard just because Vision is missing or errors. |

## 18. Quick Runbook

First setup:

```powershell
npm install
Copy-Item .env.example .env
```

Start MySQL/Redis with Docker:

```powershell
docker compose up -d
```

Check DB and run migrations:

```powershell
npm run check:db
npm run migrate:api
```

Start Node API:

```powershell
npm run dev:api
```

Start Web:

```powershell
npm run dev:web
```

Build:

```powershell
npm run build:api
npm run build:web
npm run build:java
```

Useful DB checks:

```sql
SHOW TABLES;
SELECT * FROM schema_migrations ORDER BY applied_at;
SHOW TABLES LIKE 'warehouse_items';
```

## 19. Where To Edit Common Features

| Need | Main files |
| --- | --- |
| Add Node endpoint | `apps/api-node/src/routes/*`, controller, service, repository, validator |
| Add DB table/column | New SQL in `apps/api-node/src/migrations` |
| Add web API call | `apps/web/src/services/api.ts` |
| Add user/admin UI | `apps/web/src/App.tsx`, `apps/web/src/styles.css` |
| Add Java admin business logic | Controller/service/repository/entity under `apps/java-admin-service/src/main/java/vn/edu/fpt/lnfs` |
| Update requirements | `docs/Requirements and Business Rules/requirements.md` |
| Update business rules | `docs/Requirements and Business Rules/business-rules.md` |
| Update UC checklist | `docs/master-dev-checklist.md` |
| Update traceability | `docs/Requirements and Business Rules/traceability-matrix.md` |

## 20. Suggested Next Development Order

1. Stabilize docs paths after moving requirements/traceability.
2. Replace real-looking secrets in `.env.example` with placeholders.
3. Finish admin warehouse lifecycle: expiration date, expired status, disposition report, capacity.
4. Complete appointment flow after accepted claim.
5. Add report submission from user UI.
6. Move matching to background queue when data grows.
7. Implement realtime chat/notifications.
8. Start mobile app only after web/API flows are stable.
