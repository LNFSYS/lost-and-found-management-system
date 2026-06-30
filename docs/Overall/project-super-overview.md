# FPTU Lost & Found System - Project Super Overview

Last updated: 2026-06-29

This file is the high-level repository map. Detailed UC status belongs in `docs/Checklist/master-dev-checklist.md`; granular unfinished work belongs in `docs/Checklist/pending-tasks.md`.

## 1. One-Line Summary

FPTU Lost & Found System is a campus Lost & Found platform for FPT University Da Nang with LOST/FOUND posts, AI-assisted matching, claim evidence verification, handover points, warehouse tracking, appointments, realtime chat/notifications, reputation, and admin/staff operations.

## 2. Workspace Structure

```text
apps/
  api-node/             Node.js REST API, migrations, matching, realtime
  web/                  React + TypeScript + Vite web app
  java-admin-service/   Spring Boot business/admin extension
  mobile/               Planned/future mobile support
shared/                 Shared TypeScript types
docs/                   Architecture, requirements, business rules, checklists
```

## 3. Main Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install workspace dependencies |
| `npm run check:db` | Check Node API database connection |
| `npm run migrate:api` | Run MySQL migrations |
| `npm run dev:api` | Start Node API, default port `3001` |
| `npm run dev:web` | Start Vite web app, default port `5173` |
| `npm run build:api` | Compile Node API |
| `npm run build:web` | Build web app |
| `npm run build:java` | Build Spring Boot service |

## 4. Service Ownership

| Area | Owner | Current responsibility |
| --- | --- | --- |
| Web app | Implementation surface, no separate UC owner | Guest/User/Staff/Admin UI |
| Mobile app | AK | Planned/future mobile support, not current MVP core |
| Node API | VQ | Auth, posts, media, claim base, matching, realtime, admin/staff API |
| Java service | TL | Spring Boot business/admin extension where intentionally routed |
| AI/OCR/evidence/warehouse algorithm | QD | Vision/OCR, ownership confidence, warehouse disposition logic |

## 5. Database And Migrations

The Node migration runner owns schema creation and records files in `schema_migrations`.

| Migration | Scope |
| --- | --- |
| `001_auth_schema.sql` | Users, roles, OTP, OAuth, refresh tokens, activity/audit |
| `002_lost_found_schema.sql` | Posts, media, AI tags, matching, claims, handover, appointments, chat, notifications, reports, config |
| `003_auth_recovery_schema.sql` | Forgot/reset password OTP |
| `004_user_audience_roles.sql` | Student/Lecturer roles |
| `005_integrity_constraints.sql` | FK/unique claim constraints |
| `006_appointment_status_accepted.sql` | Appointment enum normalization |
| `007_posts_contact_and_room_text.sql` | Contact and free-text location |
| `008_seed_item_categories.sql` | Item category seed |
| `009_seed_campus_locations.sql` | Campus area/building seed |
| `010_notifications_and_warehouse.sql` | Notifications and warehouse base |
| `011_media_kind_and_match_threshold.sql` | Media kind and threshold config |
| `012_indexes_and_warehouse_lifecycle.sql` | Hot indexes and expanded warehouse statuses |
| `013_handover_map_location.sql` | Campus map URL and marker coordinates |
| `014_warehouse_retention_and_appointments.sql` | Retention deadline, appointment/chat/warehouse lifecycle support |

## 6. Implemented Web Surfaces

| Surface | Status |
| --- | --- |
| Public board | Search/filter/sort, post cards, post detail, gallery |
| My posts | Owner can edit, close, soft-delete |
| Create post | LOST/FOUND fields, item images, private evidence images |
| Matching popup | Opens on login/web open and 10-minute polling; dismiss is respected |
| Claim panel | View evidence, upload multiple evidence files, request info, accept/reject/cancel |
| Handover | Campus map image, marker popup, filters, stored item counts |
| Staff dashboard | Warehouse-focused access |
| Admin dashboard | Charts, moderation, categories, locations, handover, warehouse, users, reports |
| Account | Auth, profile, avatar, activity, reputation history |
| Realtime | Notification toast, claim chat, seen state, chat image URL |

## 7. Main API Groups

| Group | Examples |
| --- | --- |
| Auth/Profile | `/auth/register/request-otp`, `/auth/login`, `/auth/me`, `/auth/reputation` |
| Posts | `/posts`, `/posts/my`, `/posts/:id`, `/posts/:id/status`, `/posts/:id/report` |
| Media | `/posts/:id/media`, `/posts/:id/media/:mediaId`, `/claims/:id/evidence` |
| Matching | `/posts/:id/matches`, `/posts/:id/matches/explanations`, `/posts/:id/matches/re-run` |
| Claims | `/claims`, `/claims/:id`, `/claims/:id/verification`, `/claims/:id/accept`, `/claims/:id/reject` |
| Appointments | `/appointments`, `/appointments/:id/reschedule`, `/appointments/:id/complete`, reminder job |
| Lookup | `/categories`, `/locations/areas`, `/handover-points` |
| Admin | dashboard, users, categories, locations, handover, warehouse, reports, jobs |
| Realtime | Socket.IO JWT auth, `claim:join`, `chat:message`, `chat:image`, `chat:seen`, `notification:new` |

## 8. Current Known Gaps

These are intentionally not hidden in overview because they affect project planning:

- Mobile app is still planned.
- AI training/MLOps is still planned.
- Current MVP uses Google Vision assisted OCR/tags plus rule-based/hybrid matching. It should not be described as a custom trained AI model.
- Java is an extension/business-service layer. The web demo primarily uses Node APIs unless a flow is explicitly routed through Java.
- Google OAuth is not implemented.
- Chat can send image URLs, but direct chat file upload is not complete.
- Chat unread badge is still partial.
- Full web configuration page and rollback UI are not complete.
- Smart notification tiers/digest are not complete.
- Handover/return proof image upload is not complete.
- Feedback after successful return and admin negative-feedback review are not complete.
- Automated tests need expansion: role matrix, claim race condition, warehouse lifecycle, appointment, notification/matching, blank DB migration.

## 9. Documentation Map

| File | Purpose |
| --- | --- |
| `docs/Checklist/master-dev-checklist.md` | Canonical 100-UC assignment and status |
| `docs/Checklist/pending-tasks.md` | Granular remaining tasks |
| `docs/Checklist/business-product-qa-issue-audit.md` | Product/QA/business risk audit |
| `docs/Requirements and Business Rules/requirements.md` | FR/NFR requirements |
| `docs/Requirements and Business Rules/business-rules.md` | Business rules |
| `docs/Requirements and Business Rules/traceability-matrix.md` | BR/FR/NFR/UC mapping |
| `docs/Overall/architecture.md` | Architecture/service boundaries |
| `docs/Overall/lost-found-system-overview.md` | Clean product overview |
| `docs/Overall/mvp-scope-and-future-work.md` | Current MVP scope and future work boundary |

## 10. Runbook For A Fresh Clone

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d
npm run check:db
npm run migrate:api
npm run dev:api
npm run dev:web
```

Build before submission:

```powershell
npm run build:api
npm run build:web
```
