# Private Assistance Implementation Report - 2026-08-03

## Scope

This delivery adds four web/Node.js MVP capabilities: AI-assisted draft, private FOUND details, Private Proof Vault and Evidence Consistency Map. Node.js remains the write owner; Java and mobile are unchanged. No custom-trained model or automatic ownership approval is claimed.

## Delivered

1. **Private Proof Vault**
   - Owner-scoped CRUD/archive, six proof types, bcrypt hash for secret values and masked display.
   - Authenticated application media proxy; API never returns raw Cloudinary URLs/public IDs.
   - Claimant-only transactional attach/detach while claim is editable.
   - Claim snapshots survive proof archival; claim participants and Staff/Admin reviewers have role-scoped read access.

2. **Private FOUND mode**
   - `PUBLIC` remains the backward-compatible default; `PRIVATE_DETAILS` is accepted only for FOUND.
   - Public list/detail/search/match suggestions hide identifying title/description, exact building/room, contact, handover point, original media and OCR.
   - Matching uses complete internal data. Realtime notifications use generic wording for private FOUND records.

3. **AI-assisted draft**
   - One validated JPG/PNG/WEBP is analyzed in memory with Google Vision assisted OCR/tags.
   - Output includes editable type/title/description, category candidates, tags, redacted OCR, privacy warnings, missing fields, explanations and provider/fallback status.
   - Safe Search blocks likely unsafe content. Image buffer is cleared after processing. User must review and call the normal create-post API.

4. **Evidence Consistency Map**
   - Preserves existing `ownershipConfidence` and adds rule-based, AI/OCR, user-provided and human-review signals.
   - Claimants see only `UNDER_REVIEW`, `EVIDENCE_RECEIVED` or `NEEDS_MORE_INFO`.
   - Detailed map is limited to FOUND owner/Staff/Admin. Every response states human decision is required.

## Database and Configuration

- `034_private_proof_vault_and_found_privacy.sql`: `posts.visibility_mode`, `private_proofs`, `claim_private_proofs`, indexes and foreign keys.
- `035_private_assistance_feature_flags.sql`: four independent public kill switches enforced by backend middleware/service rules.

## API Contract

- `POST /api/posts/ai-draft`
- `GET|POST /api/proof-vault`
- `PATCH|DELETE /api/proof-vault/:id`
- `POST|GET /api/proof-vault/:id/media`
- `GET /api/claims/:id/proof-vault`
- `POST|DELETE /api/claims/:id/proof-vault/:proofId`
- `GET /api/claims/:id/proof-vault/:proofId/media`
- `GET /api/claims/:id/consistency-map`
- Existing post create/update accepts `visibilityMode`; existing verification response remains backward compatible.

## Security Invariants

- Ownership is checked in SQL/service boundaries, not only in the web UI.
- Secret/hash/storage fields are omitted from DTOs, logs and Socket.IO payloads.
- Protected images are downloaded only from trusted Cloudinary sources and returned with `private, no-store`.
- Proof attach and archive serialize on locked rows; archive is non-destructive.
- Scores are advisory and cannot transition a claim automatically.

## Verification

Verified on 2026-08-03:

- `npm run test:api`: passed (62 passed, 0 failed, 2 opt-in database tests skipped).
- `npm run lint:web`: passed.
- `npm run build:api`: passed.
- `npm run build:web`: passed.
- `npm run scan:secrets`: passed.
- `npm run scan:text`: passed.
- `git diff --check`: passed.

The database-backed `e2e:private-assistance` script was added and covers cross-user access, media proxy privacy, private FOUND redaction, attach/archive history, role-aware consistency and fake MIME rejection. It has **not** passed against the current local database: migration execution stops safely on checksum drift in the existing `031_ai_feature_flags.sql` ledger entry, so migrations 034-035 are not applied and `npm run smoke:migration` correctly reports the missing `private_proofs` table. The local database user also cannot create an isolated test schema. Resolve the migration ledger from a reviewed backup or run all migrations on a blank, authorized MySQL schema before checking the database/E2E release gates. Do not edit a shared migration checksum merely to bypass this guard.

## Runtime Dependency

The code has an honest fallback when Google Vision is unavailable. The current project still needs valid Google Cloud billing/quota to demonstrate the live provider path; this is an external runtime dependency, not a custom-trained model.

The four new features remain disabled until migrations 034-035 are applied and their feature flags are enabled. This fail-closed state is intentional.

## Rollback

1. Disable the affected feature flag(s).
2. Deploy the previous API/web artifact; existing posts remain compatible because visibility defaults to `PUBLIC`.
3. Keep migration 034/035 applied during ordinary rollback because they are additive. Drop new tables/column only in a separately reviewed destructive maintenance migration after confirming no proof history is needed.
