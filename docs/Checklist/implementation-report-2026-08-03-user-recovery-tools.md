# User Recovery Tools Implementation Report

Date: 2026-08-03

## Scope

This delivery adds three web/Node.js MVP capabilities: Search Companion, Recovery Timeline and Finder Quick Scan. Node.js remains the only write owner. Java and mobile are unchanged. Google Vision assisted OCR/tags and the existing hybrid/rule-based matcher are reused; no custom-trained model, automatic ownership verification or automatic return is claimed.

## Delivered Capabilities

### Search Companion

- Owner-only for active LOST posts.
- Deterministic item-context questions with answer, skip and undo.
- Private profile stores supplemental search context; serial input retains only the final four characters.
- Read-only before/after preview uses the existing matching calculation without saving match rows, changing post status or sending notifications.
- Applying suggestions updates only public-safe fields selected by the owner.

### Recovery Timeline

- Derives events from persisted post, match, claim, evidence, appointment, warehouse and feedback records.
- Allows the post owner, related claimant and authorized Staff/Admin; a claimant sees only the relevant claim scope.
- Omits evidence URLs, raw storage identifiers, private answers and internal notes.
- Uses `notification:new` to invalidate the web cache and a 30-second polling fallback.

### Finder Quick Scan

- Accepts one explicit camera capture or uploaded image through existing media validation and Safe Search policy.
- Calls Google Vision once when configured; fallback filtering is reported honestly.
- Does not persist the raw frame or raw OCR.
- Keeps 45-59% candidates as hidden weak signals, shows 60%+, and never changes LOST/claim/ownership state.
- Produces an editable FOUND draft. Publish locks the scan session and writes the post plus publish marker atomically; retries return the same post.

## Schema And Feature Flags

Migration `036_search_companion_timeline_and_finder_scan.sql` adds:

- `lost_search_profiles`
- `finder_scan_sessions`
- `ai.search_companion_enabled`
- `ai.finder_quick_scan_enabled`
- `recovery.timeline_enabled`

All flags fail closed and must remain disabled until migration smoke passes on the target schema.

## API Contract

- `GET /api/posts/:id/search-companion`
- `POST /api/posts/:id/search-companion/answers`
- `POST /api/posts/:id/search-companion/skip`
- `POST /api/posts/:id/search-companion/undo`
- `POST /api/posts/:id/search-companion/recalculate`
- `POST /api/posts/:id/search-companion/apply`
- `GET /api/posts/:id/recovery-timeline`
- `POST /api/posts/finder-quick-scan`
- `POST /api/posts/finder-quick-scan/:sessionId/create-draft`
- `POST /api/posts/finder-quick-scan/:sessionId/publish`

Runtime OpenAPI and `apps/api-node/swagger.yaml` include these routes.

## Verification Evidence

| Command | Result |
| --- | --- |
| `npm run test:api` | Pass: 71 tests, 69 pass, 2 conditional MySQL integration tests skipped, 0 fail |
| `npm run lint:web` | Pass: TypeScript no-emit check |
| `npm run build:api` | Pass |
| `npm run build:web` | Pass |
| `npm run scan:text` | Pass |
| `npm run scan:secrets` | Pass for tracked working-copy files |
| `npm run scan:secrets:workspace` | Expected local-only failure: the ignored `.env` exists and contains a Google key; no secret value was printed or copied, and no additional finding was reported |
| `git diff --check` | Pass; only line-ending normalization warnings |
| `npm run smoke:migration` | Fail-safe: current schema is missing `private_proofs` because pre-existing migration 031 checksum drift prevents applying migrations 034-036 |
| `npm run e2e:user-recovery-tools` | Added, but not claimed passed until run against an isolated checksum-clean migrated database |

New unit tests cover threshold tiers, Safe Search rejection, Search Companion privacy/serial handling and Recovery Timeline private-field suppression. The database E2E covers owner/role denial, profile persistence, advisory preview, scan publish idempotency, no automatic LOST state change and timeline access/privacy.

## Remaining Release Gates

1. Audit the local migration ledger against a reviewed backup or use a blank authorized MySQL schema. Do not edit checksum history to bypass the guard.
2. Apply migrations 034-036 and pass `npm run smoke:migration`.
3. Start API against that isolated schema and pass `npm run e2e:user-recovery-tools` plus `npm run e2e:private-assistance`.
4. Rehearse phone-camera capture over HTTPS and keep gallery upload/provider-fallback screenshots.
5. Enable the three flags only after these checks pass.

## Rollback

- Disable the three migration-036 feature flags first; existing core LOST/FOUND, matching and claim flows remain available.
- Keep migration 036 applied during normal rollback because it is additive and may contain user profiles/session audit data.
- Remove schema only through a separately reviewed destructive migration after retention requirements are confirmed.
