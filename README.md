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
npm run migrate:api
npm run dev:api
npm run dev:web
```

Copy `.env.example` to `.env` and fill local database/JWT/SMTP values before running migrations. The web app reads the Node API from `VITE_API_URL`.
