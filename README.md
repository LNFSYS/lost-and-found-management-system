# FPTU Lost & Found System

AI-powered Lost & Found Management System for FPT University Da Nang Campus with automatic matching, image recognition, real-time communication, and smart claim verification.

## Structure

```text
apps/web                  React + Vite web app for board, auth, posting, media and claims
apps/api-node             Node.js core API with MySQL migrations and auth foundation
apps/mobile               React Native app placeholder
apps/java-admin-service   Spring Boot admin/business service placeholder
shared                    Shared TypeScript models
docs/architecture.md      Base architecture notes
```

## Run

```bash
npm install
npm run check:db
npm run migrate:api
npm run dev:api
npm run dev:web
```

Copy `.env.example` to `.env` and fill local database/JWT/SMTP values before running migrations. The web app reads the Node API from `VITE_API_URL`.

## Current Implementation Notes

- The Node API checks the configured MySQL connection before starting.
- The community board displays the first uploaded post image as the feed cover image.
- LOST post creation asks for ownership-proof details such as private marks, serials, invoice clues or other convincing evidence.
- Admin moderation can open post detail from the moderation list.
- Admin category management uses two levels only: main groups and concrete categories. Nested subcategories are blocked.
- Admin category, area and specific-location forms hide icon/sort-order fields from the UI.
