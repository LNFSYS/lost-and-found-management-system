# Java Admin Service

Spring Boot service owned by DEV 5.

This service extends the Node API with enterprise/business modules:

- Admin configuration and config history
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
| Configuration | `GET /admin/config`, `PUT /admin/config/{key}`, `GET /admin/config/history` |

All admin endpoints return `{ success, data?, error?, message? }` and authenticate JWT access tokens signed by the Node API `JWT_ACCESS_SECRET`.

## Run

Set the same DB/JWT variables as the Node API, then run:

```bash
mvn -f apps/java-admin-service/pom.xml spring-boot:run
```

Swagger UI is exposed at `http://localhost:8080/admin/docs` when the service is running.
