# Deployment And Rollback Runbook

Last updated: 2026-07-17

This runbook defines a reproducible deployment baseline for the campus MVP. It does not claim that a public production environment already exists.

## 1. Release Inputs

- Deploy only a reviewed Git commit or version tag.
- Run `npm run scan:secrets`, `npm run scan:text`, API tests, API/web builds and migration smoke before release.
- Tagged releases produce a source ZIP and SHA-256 checksum through `.github/workflows/release.yml`.
- Container images are built from `apps/api-node/Dockerfile` and `apps/web/Dockerfile`.
- Never copy a raw working directory or a real `.env` into an image or release ZIP.

## 2. Required Runtime Services

| Service | Purpose | Required |
| --- | --- | --- |
| MySQL 8 | System of record and durable matching queue | Yes |
| Node API | Core write owner and Socket.IO runtime | Yes |
| React/Nginx web | Browser client and SPA routing | Yes |
| Redis | Distributed rate limits and multi-instance Socket.IO adapter | Recommended for multi-instance deployment |
| Java extension | Optional read-only/business extension | No for the core web demo |

`docker-compose.yml` provides a production-like local topology with MySQL, Redis, a one-shot migration gate, API readiness checks and the web container.

## 3. Deployment Sequence

1. Back up the target database or create a provider snapshot.
2. Build immutable API and web images from the selected commit/tag.
3. Run the migration container once and stop if it fails.
4. Start the API and wait for `/api/health/ready` to return HTTP 200.
5. Start the web container.
6. Run core, role/privacy, runtime-hardening and performance smoke tests.
7. Record the deployed commit, image tag, migration count and smoke-test result.

Example local pilot deployment:

```bash
docker compose build
docker compose run --rm migrate
docker compose up -d api web
curl --fail http://localhost:3001/api/health/ready
```

## 4. Health And Observability

- `/api/health` and `/api/health/live` prove that the process is alive.
- `/api/health/ready` checks MySQL and matching queue access. Redis blocks readiness only when `REDIS_REQUIRED=true`; otherwise an unavailable configured Redis is reported as `local_fallback` without taking down a single-instance API.
- `/api/metrics` exposes bounded Prometheus-format HTTP, matching, scheduler, rate-limit and Socket.IO metrics.
- Configure `METRICS_TOKEN` in production. Without it, the metrics route is hidden.
- Production logs use structured JSON and include `X-Request-Id`, route, status and duration.
- Monitor at minimum: HTTP 5xx rate, P95 latency, matching queue age, failed matching jobs, rate-limit rejections and active sockets.

## 5. Application Rollback

1. Stop new deployments and preserve logs/metrics.
2. Point API and web services back to the previous immutable image tag.
3. Restart API and verify liveness/readiness.
4. Run read-only smoke checks before reopening writes.
5. Record the incident and the rollback commit/tag.

Application rollback must not silently undo database migrations.

## 6. Database Rollback

The SQL migration strategy is forward-only. MySQL DDL is not guaranteed to roll back transactionally.

- For additive compatible migrations, roll the application back only when the previous version can still read the new schema.
- For destructive or incompatible migrations, restore the pre-deploy snapshot into a separate database, validate it, then switch the application connection.
- Never run manual `DROP` or ad-hoc rollback SQL against the shared demo database without a reviewed recovery plan.
- Rehearse restore on a non-production database before calling the deployment campus pilot-ready.

## 7. Acceptance Evidence

- Clean tagged release artifact plus checksum.
- CI API/web/Java/container builds.
- Isolated MySQL migration and E2E pass.
- Redis-backed runtime-hardening smoke pass.
- Performance smoke artifact with request count, concurrency, P50/P95/P99 and error rate.
- Manual backup/restore drill record for the chosen hosting provider.

The final backup/restore drill and public staging deployment remain environment-specific work because they require real provider credentials and infrastructure.
