# FPTU Lost & Found System - Project Overview

Last updated: 2026-07-19

## 1. One-Line Summary

FPTU Lost & Found System is a web/backend MVP for managing Lost & Found inside FPT University Da Nang campus. It supports LOST/FOUND posts, rule-based/hybrid matching with Google Vision assisted OCR/tags, evidence review confidence, appointments, handover points, warehouse tracking, realtime chat/notifications, reputation, and Admin/Staff operations.

The current project should be presented as a campus pilot/MVP, not as a full production-ready web + mobile + custom AI training system.

## 2. Product Goal

The system helps Students, Lecturers, Staff and Admins:

- Create LOST or FOUND posts with item information, location and time.
- Upload public item images and private evidence images where needed.
- Receive similar-item suggestions from the matching algorithm.
- Submit claims with ownership evidence.
- Review evidence with an advisory review confidence percentage.
- Schedule return appointments and use handover points/warehouse tracking.
- Coordinate through realtime notification and claim chat.
- Manage campus Lost & Found operations through Staff/Admin dashboards.

AI/OCR and matching are advisory. The system must not automatically approve ownership or return an item without human review and valid evidence.

## 3. Current Roles

| Role | Main capability |
| --- | --- |
| Guest | View public board, register, login |
| Student/Lecturer | Create LOST/FOUND posts, search, claim, upload evidence, chat, manage own posts |
| Staff | Warehouse-focused dashboard, handover/warehouse operations, selected operational views |
| Admin | Full governance: users, categories, areas/buildings, handover, warehouse, moderation, reports, config |
| System | Matching, notifications, expiration jobs, warehouse alerts, appointment reminders |

## 4. Workspace Structure

```text
apps/
  api-node/             Node.js core web-facing API, migrations, matching, realtime
  web/                  React + TypeScript + Vite web app
  java-admin-service/   Spring Boot business/admin extension
  mobile/               Expo React Native MVP/prototype; native hardening remains future work
shared/                 Shared TypeScript types
docs/                   Canonical thesis/project documentation
```

## 5. Main Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install workspace dependencies |
| `npm run check:db` | Check Node API database connection |
| `npm run migrate:api` | Run MySQL migrations |
| `npm run seed:demo` | Seed demo admin/staff/student accounts and sample handover/warehouse data |
| `npm run smoke:migration` | Verify important tables/columns after migrations |
| `npm run quality:release` | Scan text regressions, check media/OCR env presence, build API/web/mobile, and run migration smoke |
| `npm run dev:api` | Start Node API, default port `3001` |
| `npm run dev:web` | Start Vite web app, default port `5173` |
| `npm run build:api` | Compile Node API |
| `npm run build:web` | Build web app |
| `npm run lint:web` | Type-check web app |
| `npm run e2e:web` | Run Playwright routing, mocked Student LOST creation, FOUND claim, Staff review/appointment and permission flows; optional seeded login uses E2E credentials |
| `npm run e2e:socket-scaleout` | Verify Redis-backed notification delivery and user-room isolation across two API instances |
| `npm run e2e:core` | Smoke-check LOST/FOUND, claim, appointment, completion, and feedback when API is running |
| `npm run e2e:roles` | Smoke-check selected Admin vs Staff permission boundaries when API is running |
| `npm run e2e:warehouse` | Smoke-check warehouse lifecycle and terminal-state guards when API is running |
| `npm run e2e:media-privacy` | Smoke-check public post contact/evidence filtering when API + Cloudinary are ready |

Fresh clone runbook:

```powershell
npm install
Copy-Item .env.example .env
npm run check:db
npm run migrate:api
npm run seed:demo
npm run smoke:migration
npm run quality:release
npm run dev:api
npm run dev:web
```

## 6. Service Ownership

| Area | Current responsibility |
| --- | --- |
| Web app | Guest/User/Staff/Admin UI |
| Node API | Current MVP runtime owner: auth, posts, media, matching, claims, appointments, handover, warehouse, admin/staff API, Socket.IO |
| Java service | Parallel business/admin extension for selected rule-heavy operations when intentionally routed |
| AI/OCR/evidence support | Google Vision assisted OCR/tags plus rule-based/hybrid matching and evidence review confidence support |
| Mobile app | Expo MVP/prototype; native push/offline/device hardening remains future enhancement |

For detailed Node/Java boundaries, see `node-java-service-boundary.md`.

## 7. Current Implemented Surfaces

| Surface | Current status |
| --- | --- |
| Auth | OTP registration, email/password login, Google OAuth MVP, refresh/logout, forgot/reset password |
| Public board | Search/filter/sort, post cards, dedicated detail route, gallery |
| My posts | Owner edit, close and soft-delete |
| Create post | LOST/FOUND fields, item images, private verification/evidence |
| Matching | Tiered matching score, image/OCR score support, explanation reasons, matching popup on login/open and 10-minute interval, dismiss remembered, manual admin re-run |
| Claim | Claim creation, evidence upload/view, review confidence percentage, request info, accept/reject/cancel |
| Handover | Campus map image, marker coordinates, popup, filters, stored item counts |
| Warehouse | Status, policy-based retention deadline, expiry jobs, capacity warning, overdue processing guards, dispose/donate/transfer base |
| Appointment | Create after accepted claim, accept/reject/reschedule/cancel/complete/reminder, handover proof image upload, feedback after completed handover |
| Realtime | Notification toast, claim chat, seen state, unread badge, direct chat image upload |
| Staff dashboard | Warehouse-focused staff access |
| Admin dashboard | Charts, moderation, users, categories, locations, handover, warehouse CSV export, reports, return feedback, config |
| Reputation | Score, user-visible history, and post-return feedback review |

## 8. Main API Groups

| Group | Examples |
| --- | --- |
| Auth/Profile | `/auth/register/request-otp`, `/auth/login`, `/auth/google`, `/auth/me`, `/auth/reputation` |
| Posts | `/posts`, `/posts/my`, `/posts/:id`, `/posts/:id/status`, `/posts/:id/report` |
| Media | `/posts/:id/media`, `/posts/:id/media/:mediaId`, `/claims/:id/evidence`, `/claims/:id/evidence/:evidenceId/image`, `/claims/:id/chat-image` |
| Matching | `/posts/:id/matches`, `/posts/:id/matches/explanations`, `/posts/:id/matches/re-run` |
| Claims | `/claims`, `/claims/:id`, `/claims/:id/verification`, `/claims/:id/accept`, `/claims/:id/reject` |
| Appointments | `/appointments`, `/appointments/:id/reschedule`, `/appointments/:id/complete`, `/appointments/:id/proof`, `/appointments/:id/feedback`, reminder job |
| Lookup | `/categories`, `/locations/areas`, `/handover-points` |
| Admin | dashboard, users, categories, locations, handover, warehouse, reports, config, jobs |
| Realtime | Socket.IO JWT auth, `claim:join`, `chat:message`, `chat:image`, `chat:seen`, `notification:new` |

## 9. Scope Boundaries And Known Gaps

Current MVP scope:

- Responsive web app plus Node.js backend and MySQL schema.
- Google Vision assisted OCR/tags when configured.
- Rule-based/hybrid matching, not a self-trained AI model.
- Realtime notification/chat for MVP, with JWT event revalidation and optional Redis adapter for multi-instance delivery; deeper reconnect/offline testing remains.
- Java service as business/admin extension, not a complete production microservice split.

Known remaining work:

- Stronger enrollment verification can be added later through student-code/admin approval, but FPT/edu email must not be mandatory for current students.
- Notification digest and anti-noise tuning beyond current score tiers.
- Larger 10k/100k dataset benchmarks and query-plan snapshots beyond the bounded CI performance smoke.
- More browser-level workflow coverage, reconnect testing and provider-specific backup/restore drills.
- Native mobile hardening: push notifications, offline retry, device testing and packaging.
- Custom AI training/MLOps pipeline.

## 10. Canonical Documentation Map

| File | Purpose |
| --- | --- |
| `docs/README.md` | Documentation index and cleanup policy |
| `docs/Overall/project-overview.md` | Main product/repository overview |
| `docs/Overall/architecture.md` | Technical architecture/service/API/migration overview |
| `docs/Overall/mvp-scope-and-future-work.md` | Scope boundary, AI/mobile/future work |
| `docs/Overall/node-java-service-boundary.md` | Node.js and Java ownership matrix |
| `docs/Overall/thesis-defense-guide-2026.md` | Defense script, demo flow, judge Q&A |
| `docs/Checklist/master-dev-checklist.md` | Canonical UC assignment/status |
| `docs/Checklist/pending-tasks.md` | Remaining implementation/testing backlog |
| `docs/Checklist/release-checklist.md` | Pre-demo/pre-release technical and product checks |
| `docs/Archive/` | Dated audit/review evidence; not the current source of truth |
| `docs/Requirements and Business Rules/requirements.md` | FR/NFR requirements |
| `docs/Requirements and Business Rules/business-rules.md` | Business rules |
| `docs/Requirements and Business Rules/traceability-matrix.md` | BR/FR/NFR/UC traceability |
