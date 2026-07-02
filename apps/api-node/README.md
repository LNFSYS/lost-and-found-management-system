# Node API

Core API service owned by Võ Chiêu Quân.

## Current Structure

```text
src/
  config/         environment config
  controllers/    HTTP request/response handlers
  middlewares/    auth, error, request guards
  models/         TypeScript domain models
  repositories/   MySQL data access layer
  routes/         Express route registration
  services/       business logic
  utils/          shared helpers
  validators/     Zod request schemas
  migrations/     MySQL schema migrations and runner
```

## Auth API

Auth now follows the database design in `docs/db-auth-design.md`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register/request-otp` | Send registration OTP before account creation |
| `POST` | `/api/auth/register` | Verify OTP, create account, assign Student/Lecturer role and issue tokens |
| `POST` | `/api/auth/resend-otp` | Resend pending registration OTP |
| `POST` | `/api/auth/login` | Login with email/password and receive access/refresh tokens |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `POST` | `/api/auth/logout` | Revoke refresh token |
| `POST` | `/api/auth/forgot-password` | Send password reset OTP |
| `POST` | `/api/auth/reset-password` | Reset password and revoke active refresh tokens |
| `GET` | `/api/auth/me` | Get current user by Bearer access token |
| `PUT` | `/api/auth/profile` | Update profile |
| `POST` | `/api/auth/avatar` | Upload avatar image |
| `GET` | `/api/auth/activity` | Get activity history |
| `GET` | `/api/auth/reputation` | Get reputation score and recent logs |
| `POST` | `/api/posts` | Create LOST/FOUND post |
| `GET` | `/api/posts` | Public board with pagination, search and filters |
| `GET` | `/api/posts/my` | Get current user's posts |
| `GET` | `/api/posts/:id` | Get post detail with media, tags and matches |
| `PUT` | `/api/posts/:id` | Update owned/admin post |
| `PATCH` | `/api/posts/:id/status` | Update post status |
| `POST` | `/api/posts/:id/media` | Upload post images |
| `DELETE` | `/api/posts/:id/media/:mediaId` | Delete post media |
| `GET` | `/api/posts/:id/matches` | Get matching results |
| `GET` | `/api/posts/:id/matches/explanations` | Get tiered score reasons, matched tokens, image/OCR terms and penalties |
| `POST` | `/api/posts/:id/matches/re-run` | Admin-only matching re-run |
| `DELETE` | `/api/posts/:id` | Soft-delete owned/admin post |
| `GET` | `/api/search` | Search public posts |
| `POST` | `/api/claims` | Submit claim for a FOUND post |
| `GET` | `/api/claims/:id` | Get claim detail by claimant/post owner/staff/admin |
| `POST` | `/api/claims/:id/evidence` | Upload claim evidence image |
| `GET` | `/api/posts/:id/claims` | List claims for a post |
| `GET` | `/api/config/public` | Get public config entries |
| `GET` | `/api/categories` | Get active item categories |
| `GET` | `/api/locations/areas` | Get active campus areas |
| `GET` | `/api/locations/areas/:id/buildings` | Get active buildings in an area |
| `GET` | `/api/locations/buildings/:id/rooms` | Get active rooms in a building |
| `GET` | `/api/handover-points` | Get active handover points |
| `GET` | `/api/handover-points/:id` | Get one active handover point |
| `GET` | `/api/admin/dashboard/overview` | Staff/Admin dashboard overview |
| `GET/POST/PATCH` | `/api/admin/users...` | Admin-only user management |
| `GET/POST/PUT/PATCH` | `/api/admin/categories...` | Admin-only category management |
| `GET/POST/PUT/PATCH` | `/api/admin/locations...` | Admin-only area/building/room management |
| `GET/POST/PUT/PATCH` | `/api/admin/handover-points...` | Admin-only handover point management |
| `GET/PATCH` | `/api/admin/reports...` | Admin-only report review and moderation |
| `GET` | `/api/health` | Health check |

Example registration OTP request body:

```json
{
  "email": "student@example.com"
}
```

Example register body after OTP is delivered:

```json
{
  "email": "student@example.com",
  "password": "password123",
  "fullName": "Nguyen Van A",
  "studentCode": "SE190001",
  "accountType": "STUDENT",
  "otp": "123456"
}
```

## Run

```bash
npm install
npm run migrate:api
npm run dev:api
```

Default URL: `http://localhost:3001`.

## Notes

- Configure `.env` from `.env.example` before running migrations.
- SMTP is guarded. If `SMTP_*` variables are not configured, OTP creation succeeds and the service logs a warning instead of crashing.
- Cloudinary is guarded. Upload endpoints return a structured 503 response if `CLOUDINARY_*` variables are not configured.
- Google Vision is guarded. If `GOOGLE_VISION_API_KEY` is missing or Vision fails, post image upload returns empty AI tags/OCR text and continues.
- Matching runs after post create/update and post image upload, using configurable score tiers and weights for text, category, location, time, image tags and OCR/serial-like text.
- Matching and claim review confidence are advisory. They do not automatically verify ownership or return an item.
- Claim duplication is blocked by service validation and `uq_claim_per_post_user`.
- `posts.handover_point_id` is protected by a foreign key in migration `005_integrity_constraints.sql`.
- Sensitive admin management endpoints require `ADMIN`; `STAFF` can access warehouse-focused operational surfaces.
- Google OAuth MVP login and realtime claim chat/notifications are implemented for the current web MVP.
