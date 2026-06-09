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
| `POST` | `/api/auth/register` | Register with any valid email, password, full name and create OTP |
| `POST` | `/api/auth/verify-otp` | Verify OTP and activate account |
| `POST` | `/api/auth/login` | Login with email/password and receive access/refresh tokens |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `POST` | `/api/auth/logout` | Revoke refresh token |
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
| `GET` | `/api/health` | Health check |

Example register body:

```json
{
  "email": "student@example.com",
  "password": "password123",
  "fullName": "Nguyen Van A",
  "studentCode": "SE190001"
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
- Matching runs after post create/update and post image upload, using weights from public/admin config.
- Google OAuth and realtime chat are planned next.
