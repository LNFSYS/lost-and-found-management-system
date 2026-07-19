# Pending Task Checklist

Last audit: 2026-07-19

> Current delivery priority (2026-07-11): finish and harden Web + Node/Java backend first. Mobile implementation/refactor remains deferred by product decision and is not part of this work phase.

## Current Audit Summary

| Metric | Count |
| --- | ---: |
| Completed checklist items | 148 |
| Open MVP-blocking items | 0 |
| Open future/hardening items | 21 |

Open work is now concentrated in hardening/future work: advanced AI category selection, optional Java auth extension, background matching queue, notification digest/anti-noise tuning, overdue disposition paperwork, mobile hardening, custom AI inference/MLOps, and deeper automated tests.

Scope note: the current MVP should be demoed as web + Node backend with Google Vision assisted OCR/tags and rule-based/hybrid matching. Expo mobile MVP and training-data baseline scripts are present, while native mobile hardening and production custom AI inference remain future work.

## Deep Review Follow-up - 2026-07-15

- [x] Add release-safe packaging command based on clean `git archive`; add optional ignored-workspace secret scan.
- [x] Use normal workspace `tsc` resolution for reproducible API builds.
- [x] Enforce one active appointment per claim with transaction locking and a database unique generated key.
- [x] Record the real completion actor in warehouse storage logs and make concurrent completion transition-safe.
- [x] Proxy appointment proof through the trusted Cloudinary download guard.
- [x] Remove raw private storage URLs from chat history and Socket.IO payloads.
- [x] Validate JPEG/PNG/WEBP magic bytes in post, claim, chat, avatar, and appointment-proof uploads.
- [x] Preserve Lecturer selection in the legacy OTP verification endpoint.
- [x] Avoid incrementing view count for missing or unauthorized hidden posts.
- [x] Batch-load match suggestions and prefilter a bounded candidate set using category/location/time signals.
- [x] Run migrations 001-025 and database-backed E2E on isolated MySQL 8 in CI before applying new migrations to the shared demo database.
- [x] Add optional Redis-backed distributed rate limits and Socket.IO adapter while retaining a local single-process fallback.
- [x] Add structured request logs, request IDs, liveness/readiness, matching queue health and protected Prometheus-format metrics.
- [x] Add CI performance smoke with P50/P95/P99/error-rate artifact and Redis-backed runtime hardening smoke.
- [x] Add guarded 10k/50k/100k synthetic dataset benchmark workflow with `EXPLAIN ANALYZE` artifacts.
- [x] Add API/web container builds, production-like Compose topology, migration gate and tagged release ZIP/checksum workflow.
- [x] Verify Redis runtime, two-instance Socket.IO room isolation, and both container builds in GitHub Actions (`29693045128`).
- [ ] Execute and retain passing 10k/50k/100k benchmark artifacts, then run a provider-specific backup/restore drill before production claims.


## Auth / Account

- [x] Add Google OAuth login.
- [x] Decide Node/Java service boundary for the current MVP and Java extension.
- [ ] If Java later needs its own auth extension, add email/password/token validation compatible with Node.

## User Post / Community Feed

- [x] Add cron job to transition expired posts to `EXPIRED`.
- [x] Build post edit screen for users.
- [x] Open post detail through a dedicated `/posts/:id` route instead of a detail popup; preserve browser back/forward behavior.
- [x] Build close post button for users.
- [x] Build soft-delete post button for users.
- [x] Build violation report from user side.
- [x] Complete AI suggested category selection/editing with a user confirmation before applying the top Vision suggestion.
- [x] Add gallery/lightbox for post images.
- [x] Add category multi-select for advanced search while keeping the legacy single-category query compatible.
- [x] Review index/query plans for feed with large datasets.

## Frontend Architecture Hardening

The current web and mobile MVPs are demo-ready but still carry "God file" debt. Do not block the MVP on this refactor, but plan it before long-term maintenance or team scaling.

- [x] Extract shared web app types/constants/helpers, shell widgets, admin widgets, and private media widgets out of `apps/web/src/App.tsx` as the first low-risk refactor phase.
- [x] Split `apps/web/src/App.tsx` into route-level/domain components. Board/posts, Create Post, account, Post Detail, claim dialogs/workflows, claim chat/verification and Admin are extracted; `App.tsx` is now about 750 lines and retains application-shell orchestration.
- [ ] Continue splitting `apps/web/src/styles.css` into feature CSS modules or a consistent utility/component styling strategy. Account/auth/profile, create-post, and claim-chat styles now live with their features; the remaining global file is still large.
- [x] Replace manual web `view` state navigation with `react-router-dom`; board/create/account/handover/my-posts/detail now use real URLs and browser history.
- [ ] Split `apps/mobile/App.tsx` into screens/components/hooks.
- [ ] Replace manual mobile tab/modal state navigation with React Navigation or Expo Router.

## Media

- [x] Allow image upload in chat.
- [x] Create thumbnail/optimized images if needed.
- [x] Allow claim to upload multiple evidence files.

## Claim / Evidence

- [x] Build UI to view claim evidence for authorized users.
- [x] Build UI to request additional claim information.
- [x] Build accept claim modal.
- [x] Build reject claim modal with reason.
- [x] Build cancel claim button for claimant.
- [ ] If Java manages evidence, add claim/post relationship guard.

## Matching / Notification

- [x] Move heavy matching to a retryable MySQL-backed background queue; suggestion reads use materialized results.
- [x] Add admin manual re-run matching feature.
- [x] Add realtime toast when a good match is found.
- [x] Add notification when a new claim is submitted.
- [x] Add notification when claim is accepted/rejected.
- [x] Add score-tiered matching notification thresholds.
- [ ] Add digest/anti-noise notification batching if campus traffic grows.

## Handover / Warehouse

- [x] Add job to mark overdue warehouse items.
- [x] Add configurable retention period by item type/policy.
- [x] Alert for items nearing expiry.
- [x] Build overdue item management screen.
- [x] Build overdue item disposition form and require terminal actions to use the guarded process API.
- [x] Allow overdue processing: dispose, donate, transfer, extend.
- [x] Block overdue disposal/donation/transfer while active claims or accepted/pending appointments exist.
- [x] Add warehouse capacity management.
- [x] Alert when warehouse reaches 80% capacity.
- [x] Block selecting a full warehouse or suggest alternatives.
- [x] Add handover/proof image upload.
- [x] Build API/UI to view current storage location more clearly.

## Appointment

- [x] Create appointment after claim is accepted.
- [x] Block appointment creation if claim is not accepted.
- [x] Validate appointment time.
- [x] Prevent scheduling conflicts at the same handover point.
- [x] Allow selecting a handover point as the return location.
- [x] Allow entering a custom meeting location.
- [x] Allow accepting an appointment.
- [x] Allow rejecting an appointment with reason.
- [x] Allow rescheduling an appointment.
- [x] Allow canceling an appointment.
- [x] Allow marking appointment as completed.
- [x] After completion, update post to `RESOLVED` if appropriate.
- [x] Send appointment reminder via notification.

## Chat / Realtime

- [x] Create chat room after claim is accepted.
- [x] Set up Socket.IO server with auth/CORS.
- [x] Allow related users to join room by claim.
- [x] Send text messages in realtime.
- [x] Save messages to DB.
- [x] Receive realtime messages on web.
- [x] Build chat bubble UI.
- [x] Send image messages in chat.
- [x] Display seen/read status.
- [x] Add realtime unread badge for messages.
- [x] Gate claim chat to `ACCEPTED` status and reject client-supplied image URLs.
- [x] Add unit and e2e regression coverage for claim chat status gating.
- [x] Add two-instance Redis/Socket.IO E2E that verifies cross-instance notification delivery and unrelated user-room isolation.

## Admin Dashboard / Report / Config

- [x] Add chart for LOST/FOUND posts over time.
- [x] Add chart for successful return rate.
- [x] Add chart by category.
- [x] Add heatmap for high-loss areas.
- [x] Add top trusted users table.
- [x] Export report as CSV.
- [x] Build full config page on web.
- [x] Add config rollback.
- [x] Add UI for post expiration configuration.
- [x] Add UI for matching threshold configuration.
- [x] Add UI for matching weight adjustment.
- [x] Add UI for notification/email rule configuration.
- [x] Complete config history page if deeper operations are needed.

## Reputation / Feedback

- [x] Add points after successful item return.
- [x] Add points after successful claim.
- [x] Deduct points after multiple incorrect claims.
- [x] Deduct points when a post is deleted by admin for violation.
- [x] Calculate reputation level.
- [x] Build reputation history page.
- [x] Build feedback form after item return.
- [x] Build admin screen to review negative feedback and flag users.

## Mobile App

Expo React Native MVP exists in `apps/mobile`. Remaining work is hardening, native push, offline behavior, and optional Flutter as a separate app.

Status for the current work phase: deferred by product decision; keep these items unchanged while Web/backend is the active priority.

- [x] Build mobile auth: register, OTP, login, logout.
- [x] Build mobile profile/edit profile, activity, and reputation.
- [x] Build mobile LOST/FOUND feed.
- [x] Build mobile create LOST/FOUND post.
- [x] Build mobile image upload from gallery.
- [x] Build mobile search/filter/sort.
- [x] Build mobile claim and evidence upload.
- [x] Build mobile handover point list.
- [x] Build mobile appointment flow.
- [x] Build mobile realtime chat.
- [x] Build mobile notification list.
- [x] Store mobile token using secure storage.
- [x] Add camera-first capture flow for post and claim evidence images.
- [ ] Add native push notification delivery.
- [x] Add basic retry handling for mobile read requests.
- [ ] Add offline queue handling for mobile write/upload actions.
- [ ] Add device/emulator e2e test matrix.
- [ ] Build separate Flutter app only if the team chooses a second mobile codebase.

## Custom AI Model Training / MLOps

Future enhancement, not current MVP core. Current code uses Google Vision assisted OCR/tags plus rule-based/hybrid matching.

Recommended order is documented in `docs/Overall/ai-training-roadmap.md`: collect explicit labels, structure/redact data, export versioned datasets, evaluate lightweight rankers, then add optional inference with rule-based fallback.

- [x] Collect training data from posts, images, AI tags, matches, and feedback.
- [x] Add explicit match feedback table for true match, false match, uncertain, duplicate, and insufficient evidence.
- [x] Log match suggestion impressions and prepare action fields for clicks, dismissals, claim starts, and outcomes.
- [x] Persist image/OCR scores, penalties, explanation JSON, score tier, and matcher version for each match.
- [ ] Build admin tool for labeling category/tag/match correct/incorrect.
- [x] Build dataset export pipeline for redacted JSONL match-training data.
- [x] Clean and anonymize dataset before training.
- [ ] Train image/category classification model.
- [x] Add small logistic regression training script for match reranking from labeled JSONL exports.
- [ ] Train or fine-tune semantic matching model after enough labeled campus data exists.
- [ ] Add AI Lens for item name recognition, image description, OCR/text, brand/logo.
- [ ] Add direct image comparison between LOST and FOUND.
- [x] After AI returns metadata, re-run rule-based matching for double-check.
- [x] Evaluate model with precision/recall/F1/top-k.
- [x] Save model version, dataset snapshot, and training metadata.
- [ ] Add model status registry: draft, approved, deployed.
- [ ] Deploy inference endpoint for custom model.
- [ ] Fallback to Google Vision/rule matching when custom model fails.
- [ ] Build dashboard for tracking dataset/training/model metrics.
- [x] Record correct/incorrect feedback for retraining.
- [x] Filter spam/dirty feedback before adding to dataset.

## Testing / Hardening

- [ ] Add OTP mailbox/provider e2e; login, post creation and claim are already covered by `e2e:core`.
- [x] Add GitHub Actions CI for release text/config scan, API build, web build, and mobile typecheck.
- [x] Add database-backed CI for migration, seed, schema smoke, core flow, role, warehouse, claim-race, and chat-gating using isolated MySQL.
- [x] Add Java 21/Maven build to CI quality gates.
- [x] Add API policy unit tests with Node's built-in test runner.
- [x] Add validation regression coverage for category multi-select query parsing and legacy compatibility.
- [x] Add Playwright routing/auth smoke plus API-mocked Student create-LOST, Student FOUND-detail-to-claim, Staff review/accept/appointment, and Staff warehouse/permission flows; CI retains the optional database-backed login scenario.
- [x] Add isolated-CI E2E for admin CRUD of categories/areas/buildings/handover/users and report handling.
- [x] Add role/privacy smoke test for Admin vs Staff permissions.
- [x] Add media privacy smoke test for public post evidence/contact filtering.
- [x] Write tests for claim transition and race condition.
- [x] Write tests for warehouse lifecycle.
- [x] Write tests for appointment when implemented.
- [x] Write tests for notification/matching threshold and score tiers.
- [x] Standardize demo seed data.
- [x] Add migration smoke verification script.
- [x] Verify blank-schema migration automatically in CI MySQL; rerun locally before final submission when Docker/MySQL is available.
- [x] Verify full build before submission.
