# Java Admin Service

Spring Boot service owned by the Java/backend team member.

This service runs in parallel with the Node.js core web API. It is a business/admin extension for selected rule-heavy modules, not a standalone replacement for the Node web-facing API.

Current architecture positioning:

- Node.js is the core web-facing API for the MVP demo.
- Java verifies JWT tokens issued with the same `JWT_ACCESS_SECRET`.
- Java shares the MySQL schema created by Node migrations.
- A deployment should choose one writer per business flow to avoid duplicated state transitions.

See `docs/Overall/node-java-service-boundary.md` for the ownership matrix.

This service can extend the Node API with enterprise/business modules:

- Admin configuration and config history as an extension when routed explicitly
- Admin moderation and reports
- Dashboard statistics and export
- Handover point business flow
- Return appointment state machine
- Reputation score and feedback
- Scheduled tasks for expiration, unclaimed items, and reminders

## Implemented Foundation

The service now includes:

| Area | Endpoints |
| --- | --- |
| Claim business | `POST /admin/claims/{id}/request-info`, `/accept`, `/reject`, `/cancel` |
| Handover points | `GET/POST /admin/handover-points`, `PUT /admin/handover-points/{id}`, `PATCH /admin/handover-points/{id}/toggle` |
| Storage logs | `POST /admin/handover-points/{id}/receive`, `/store`, `/return` |
| Configuration extension | `GET /admin/config`, `PUT /admin/config/{key}`, `GET /admin/config/history` |

All admin endpoints return `{ success, data?, error?, message? }` and authenticate JWT access tokens signed by the Node API `JWT_ACCESS_SECRET`.

Claim state transitions run inside transactions and load the claim with a write lock. Accepting a `NEED_MORE_INFO` claim requires new claim evidence after the information request timestamp.

For thesis/demo wording, describe these endpoints as a Java business-service extension unless the web demo is explicitly routed through them. The current React web demo uses the Node admin config API unless the team intentionally switches the route.

## Run

Set the same DB/JWT variables as the Node API, then run:

```bash
mvn -f apps/java-admin-service/pom.xml spring-boot:run
```

Swagger UI is exposed at `http://localhost:8080/admin/docs` when the service is running.
