# FPTU Lost & Found System

Campus Lost & Found MVP for FPT University Da Nang with LOST/FOUND posts, rule-based/hybrid matching, Google Vision assisted OCR/tagging, claim evidence verification, handover points, warehouse tracking, appointments, and realtime notifications/chat.

## Structure

```text
apps/web                  React + Vite web app for board, auth, posts, claims, handover, warehouse and admin/staff UI
apps/api-node             Node.js core web-facing API for the current MVP demo flow
apps/mobile               Planned/future mobile support, not a current core deliverable
apps/java-admin-service   Spring Boot business/admin extension for selected rule-heavy flows
shared                    Shared TypeScript models
docs/Overall              Architecture, MVP scope and project overview
docs/Checklist            Canonical UC checklist, pending tasks and QA notes
```

## Run

```bash
npm install
npm run check:db
npm run migrate:api
npm run seed:demo
npm run smoke:migration
npm run dev:api
npm run dev:web
```

Copy `.env.example` to `.env` and fill local database/JWT/SMTP values before running migrations. The web app reads the Node API from `VITE_API_URL`.

## Current Implementation Notes

- The Node API checks the configured MySQL connection before starting.
- The community board displays the first uploaded post image as the feed cover image.
- LOST post creation asks for ownership-proof details such as private marks, serials, invoice clues or other convincing evidence.
- Matching is rule-based/hybrid: text, category, location, time and Vision/OCR metadata support the decision, but do not automatically approve ownership.
- Google Vision/OCR is an assisted recognition feature. The repo does not claim a custom trained AI model as part of the current MVP.
- Google OAuth MVP login is available when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` are configured.
- `npm run seed:demo` creates demo admin/staff/student accounts plus sample handover/warehouse data.
- `npm run e2e:roles` checks key Admin vs Staff permission boundaries when the API is running.
- Mobile is documented as planned/future enhancement unless the React Native flows are completed later.
- Admin moderation can open post detail from the moderation list.
- Admin category management uses two levels only: main groups and concrete categories. Nested subcategories are blocked.
- Admin category, area and specific-location forms hide icon/sort-order fields from the UI.

For the documentation entry point, read `docs/README.md`.
For the main product/repository overview, read `docs/Overall/project-overview.md`.
For scope boundaries and demo positioning, read `docs/Overall/mvp-scope-and-future-work.md`.
For Node.js/Java parallel development boundaries, read `docs/Overall/node-java-service-boundary.md`.
