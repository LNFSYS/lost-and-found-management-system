# CODEX Implementation Plan

Last updated: 2026-07-19

## Scope and gates

- Node.js remains the core write owner.
- `java-admin-service` remains read-only by default.
- Complete Phase 0 and Phase 1 before starting Phase 2.
- A task is complete only after implementation, relevant tests, regression checks, and recorded evidence.
- Never expose, copy, log, or commit real secrets.

## Phase 0 - Security and core integrity

### [x] P0-01 - Enforce repository secret hygiene

Ensure real `.env` files and key material are ignored, add a CI secret-pattern scan that fails on tracked secret files or credential-shaped values, and keep example values synthetic.

Evidence:

- Files changed: `scripts/secret-scan.mjs`, `package.json`, `.github/workflows/ci.yml`.
- Migration: none.
- Tests added: tracked-file secret-pattern gate with redacted findings.
- Commands: `npm run scan:secrets`, `npm run scan:text`.
- Result: pass; 209 tracked files scanned, text/config regression scan pass.

### [x] P0-02 - Protect claim `secretAnswer`

Hash the submitted answer before persistence, remove plaintext storage, API serialization, and logging, migrate existing claim rows away from plaintext, and preserve only non-reversible advisory metadata needed by evidence scoring.

Evidence:

- Files changed: claim validator/service/repository contract, `claim-secret.service.ts`, Node policy tests, Java claim entity, Web/Mobile response types, migration smoke.
- Migration: `022_claim_secret_privacy.sql`; applied successfully, plaintext column removed, hash and non-reversible signal columns verified.
- Tests added: bcrypt/non-private-signal policy tests; claim E2E asserts response omits the answer and field name.
- Commands: `npm install`, `npm run build:api`, `npm run build:web`, `npm run typecheck:mobile`, `npm run test:api`, `npm run migrate:api`, `npm run smoke:migration`.
- Result: builds/typecheck pass, 8/8 API policy tests pass, migration smoke pass with 25 applied migration records.

### [x] P0-03 - Authorize match and explanation reads

Allow per-post match results and explanations only for the post owner, Staff, or Admin. Preserve Admin-only manual re-run.

Evidence:

- Files changed: `post-match.policy.ts`, policy tests, `post.service.ts`, `post.controller.ts`, `e2e-media-privacy.ts`.
- Migration: none.
- Tests added: owner/Staff/Admin policy matrix and live owner-vs-unrelated-user endpoint checks for both match APIs.
- Commands: `npm run test:api`, `npm run build:api`, `npm run e2e:media-privacy`.
- Result: 10/10 API policy tests pass; API build pass; live privacy E2E pass with unrelated user receiving `403`.

### [x] P0-04 - Enforce one accepted claim per FOUND post

Accept claims in one transaction with row locking and a database invariant so concurrent reviewers cannot accept two claims for the same FOUND post. The losing request must return `409`.

Evidence:

- Files changed: `claim.repository.ts`, `claim.service.ts`, `e2e-claim-race.ts`, `smoke-migration.ts`.
- Migration: `023_one_accepted_claim_per_post.sql`; generated accepted-post key plus unique index applied successfully after checking existing data had no duplicate accepted claims.
- Tests added: live two-claim concurrent accept test using two distinct claimant accounts and a database assertion that exactly one claim is accepted.
- Commands: `npm run test:api`, `npm run build:api`, `npm run migrate:api`, `npm run smoke:migration`, `npm run e2e:claim-race`.
- Result: 10/10 API policy tests pass; API build and migration smoke pass; concurrent requests return one `200` and one `409` with one accepted row persisted.

## Phase 1 - State, privacy, mobile auth, and CI regression gates

### [x] P1-01 - Validate the final merged post state

For post updates, merge persisted and requested values and run the same cross-field business validation used by create. Do not validate only the partial payload.

Evidence:

- Files changed: `post.validator.ts`, `post.repository.ts`, `post.service.ts`, `post-final-state.policy.test.ts`.
- Migration: none.
- Tests added: final-state cases for clearing FOUND holding location, clearing contact information, and preserving/requiring LOST secret verification after merge.
- Commands: `npm run test:api`, `npm run build:api`.
- Result: 14/14 API policy tests pass and API TypeScript build passes; update now validates the persisted-plus-requested state before writing.

### [x] P1-02 - Centralize the post status state machine

Define legal transitions and actor rules in one backend policy. Reject arbitrary or invalid transitions and prevent post type changes after creation.

Evidence:

- Files changed: `post-state.policy.ts`, `post-state.policy.test.ts`, `post.service.ts`.
- Migration: none.
- Tests added: owner close/reopen, forbidden owner moderation transitions, Admin lifecycle boundaries, and unrelated-user denial.
- Commands: `npm run test:api`, `npm run build:api`.
- Result: 18/18 API policy tests pass and API build passes; post type changes return `409` and manual statuses go through one backend policy.

### [x] P1-03 - Remove raw private-evidence storage URLs from APIs

Return an authenticated application proxy URL or evidence identifier only. Never serialize raw Cloudinary/storage URLs for private claim evidence.

Evidence:

- Files changed: `claim.repository.ts`, `media.service.ts`, Web/Mobile claim DTOs, mobile claim image rendering, `e2e-claim-evidence-policy.ts`.
- Migration: none.
- Tests added: live evidence upload assertion rejects raw URL/storage identifiers and requires an authenticated application proxy path.
- Commands: `npm run build:api`, `npm run build:web`, `npm run typecheck:mobile`, `npm run e2e:claim-evidence-policy`.
- Result: all builds/typecheck pass; claim evidence policy E2E passes and private storage URLs are available only to the internal authorized streaming query.

### [x] P1-04 - Make mobile refresh single-flight

When multiple mobile requests receive `401`, perform exactly one refresh request, replay waiters once, and fail the session cleanly if refresh fails.

Evidence:

- Files changed: mobile `api.ts`, `single-flight.ts`, `single-flight.test.ts`, mobile/root package scripts, CI workflow.
- Migration: none.
- Tests added: 12 concurrent waiters share one operation; rejected refresh resets the gate for a later attempt.
- Commands: `npm install`, `npm run typecheck:mobile`, `npm run test:mobile`, `npm run build:api`.
- Result: mobile typecheck and API build pass; 2/2 mobile concurrency tests pass; failed refresh clears stored tokens and each request retries at most once.

### [x] P1-05 - Gate media privacy in CI

Run a real database/API media privacy E2E in isolated CI. The test must fail on raw private URL exposure or unauthorized evidence access.

Evidence:

- Files changed: `e2e-media-privacy.ts`, `seed-demo.ts`, `.github/workflows/ci.yml`.
- Migration: none; isolated CI continues to migrate before seeding.
- Tests added: three-party private evidence flow checks safe serialization, unrelated Lecturer `403`, and authorized owner image streaming.
- Commands: `npm run seed:demo`, `npm run build:api`, `npm run e2e:media-privacy`.
- Result: API build passes and the live privacy E2E passes; CI now invokes the same non-optional test against its isolated MySQL/API job.

### [x] P1-06 - Gate multi-claim concurrency in CI

Replace the insufficient same-claim accept/reject race with a real two-claim concurrent accept test and run it in isolated CI.

Evidence:

- Files changed: `e2e-claim-race.ts`, `.github/workflows/ci.yml` (existing mandatory invocation retained).
- Migration: enforced by `023_one_accepted_claim_per_post.sql` from P0-04.
- Tests added: two distinct users claim one FOUND post, concurrent accepts must produce one `200`, one `409`, and exactly one persisted `ACCEPTED` claim.
- Commands: `npm run e2e:claim-race`, `npm run test:api`, `npm run test:mobile`.
- Result: live two-claim race passes; 18/18 API tests and 2/2 mobile concurrency tests pass; CI runs the race without `|| true` or an always-success stub.

## Phase 2 - In progress

- [~] Modular-monolith extraction by bounded context. Web shell, board/posts, Create Post, account, claim chat/verification and Admin are extracted; `App.tsx` is about 1.7k lines. Post-detail/claim orchestration, Admin internals and large global CSS remain.
- [x] Distributed rate limiting and Socket.IO Redis adapter with an explicit local single-process fallback. `REDIS_REQUIRED=true` enforces Redis for scaled deployments.
- [x] Structured logging, request IDs, liveness, DB/queue/Redis-aware readiness, protected metrics and graceful shutdown.
- [x] Matching candidate prefilter, durable MySQL job queue, performance smoke/query-plan scripts and guarded benchmark workflow. Large-dataset artifacts are still release evidence, not an implementation blocker.

Phase 0/1 gates are complete. Phase 2 changes must continue in small, independently verified slices; do not reopen mobile work in the current Web/backend phase.

## Phase 2 verification update - 2026-07-19

- Passed locally: API build, 25/25 API tests, Web build/lint, strict unused-local TypeScript check, tracked-secret scan and text/config scan.
- Passed browser checks: URL/back-forward routing, API-mocked Student create-LOST flow and Staff warehouse/permission boundary. Seeded login remains credential-dependent.
- CI definitions now include Redis runtime smoke, performance artifact generation, container builds and tagged release packaging; the exact working-tree snapshot still needs a green remote CI run after commit/push.
- Runtime evidence still pending: isolated migrations 024-025, full database E2E for this snapshot, container build, multi-instance Redis/Socket soak, 10k/50k/100k benchmark and provider backup/restore drill.

## Final Phase 0/1 verification - 2026-07-13

- Passed: secret scan, release text scan, API build, Web build, Web lint/typecheck, Mobile typecheck, API tests (18/18), Mobile tests (2/2), migration smoke, core E2E, role/privacy E2E, warehouse E2E, two-claim race E2E, media privacy E2E, chat gating E2E, claim evidence policy E2E, Admin CRUD E2E, and Web Playwright E2E (2/2 with explicit demo credentials).
- CI updated: Mobile auth concurrency test, media privacy E2E, and real two-claim race are mandatory; no `|| true` or always-success substitute is used.
- Additional regression fixed: login rate limiting now combines per-account and broader per-IP buckets so the isolated CI suite does not exhaust one shared 20-request IP bucket while brute-force controls remain active.
- Environment limitation: local Java build was not executed because `mvn` is unavailable on this workstation. The CI Java 21/Maven job remains the verification owner for `java-admin-service`.
- Environment warning: Google Vision credentials are not configured locally, so OCR/tagging uses its documented fallback during tests.
- Dependency audit note: `npm install` reports 12 dependency advisories (11 moderate, 1 high); remediation requires a separate compatibility review and is not silently forced in this security pass.
