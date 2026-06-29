# Business/Product/QA Issue Audit - FPTU Lost & Found System

Date created: 2026-06-25
Last updated: 2026-06-29
Audit roles: Project Manager, Scrum Master, Quality Assurance, Product Owner
Scope: Web, Node API, Java Admin Service, database, business flows, user experience, and real-world campus operations at FPTU Da Nang.

## 1. Document Objectives

This document lists business logic errors, product gaps, IT risks, and user experience issues that could affect the operation of the Lost & Found system on campus.

These are not just technical bugs. Each item is reviewed from 4 perspectives:

- Product Owner: alignment with real user needs and actual processes.
- QA: correctness, edge cases, acceptance criteria.
- Scrum Master/PM: priority, dependencies, sprint risks.
- IT/Engineering: API, database, security, performance, maintainability.

## 2. Severity Level Definitions

| Level | Meaning | Recommended Action |
| --- | --- | --- |
| Blocker | Breaks a core flow or poses data loss/exposure risk | Fix before demo/release |
| Critical | Seriously affects business logic, security, authorization, claim/return process | Include in the nearest sprint |
| High | Reduces usability, causes confusion, or is missing an important operational step | High priority |
| Medium | Does not break the flow but creates friction, lacks transparency, or increases staff effort | Schedule in backlog |
| Low | Experience improvements, documentation, polish | Address after core flows are stable |

## 3. Executive Summary

The system currently has a solid foundation: OTP auth, LOST/FOUND posts, claims, matching, notifications, handover points, warehouse, admin dashboard, and staff dashboard. However, to operate as an actual product on campus, several business gaps remain:

- Claim and return flow does not yet have a full end-to-end lifecycle: no complete appointment flow, no handover receipt, no return confirmation.
- Warehouse lacks real operational logic: missing retention deadlines, expiry handling, capacity management, processing history, and proof images.
- Staff dashboard focuses on warehouse but permissions need retesting after recent changes.
- Report/moderation does not yet have a clear user-facing report UI and lacks complete real-world actions.
- Matching/AI is functional but lacks queue mechanism, explainability, threshold UI, and retry.
- Node API and Java Admin Service both own some admin/claim/handover flows, risking rule divergence if ownership is not clearly defined.
- Mobile, realtime chat, realtime notification, reputation, and feedback remain planned and are not ready for real operations.

### Processing Status as of 2026-06-29

- [x] BIZ-WH-01: Added retention deadline `retention_deadline` for warehouse items, defaulting to 60 days if not specified, displayed and editable on Staff/Admin warehouse UI.
- [x] BIZ-APT-01: Added API to create return appointment after claim reaches `ACCEPTED` status, with appointment creation UI in FOUND post detail for authorized claim viewers.
- [x] BIZ-QA-01: Added smoke/e2e core flow script `npm run e2e:core` to test login, create LOST/FOUND, claim, and appointment guard/appointment accepted claim.
- [x] BIZ-POST-01/BIZ-POST-02: User post edit, close and soft-delete actions are available from post detail for the post owner.
- [x] BIZ-MOD-01: User-facing post report action is available from post detail.
- [x] BIZ-MATCH-02/BIZ-MATCH-04/BIZ-MATCH-05: Matching explainability, manual re-run and realtime notification/polling UX are implemented.
- [x] BIZ-CLAIM-01/BIZ-CLAIM-02/BIZ-CLAIM-03: Claim evidence view, multiple evidence upload, request info, accept, reject and cancel actions are implemented.
- [x] BIZ-CHAT-01/BIZ-CHAT-02: Claim chat room, auth guard, realtime text/media URL messaging and seen state are implemented.
- [x] BIZ-DASH-02/BIZ-DASH-03/BIZ-DASH-04: Admin dashboard has LOST/FOUND trend, return rate, category ranking, high-loss area ranking and trusted user ranking.
- [x] BIZ-REP-01/BIZ-REP-04: Reputation scoring and user-visible reputation history are implemented.
- [~] BIZ-CHAT-03/BIZ-CHAT-04: Chat unread badge and direct chat file upload are still incomplete.
- [~] BIZ-WH-04/BIZ-WH-11: Overdue processing exists, but full disposition/proof-image reporting remains incomplete.

## 4. Consolidated Issue and Risk Table by Module

### 4.1 Auth, Account, Role

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-AUTH-01 | High | Student, Lecturer | No Google OAuth/default university SSO yet | FPTU users are accustomed to Google/university email login; manual registration reduces adoption | Complete OAuth or FPT email domain verification | User can login via Google FPT; account maps to correct role |
| BIZ-AUTH-02 | Critical | All | No mandatory university email domain policy | Outsiders can register if they have a personal email OTP | Validate email domain for student/lecturer/staff | Non-valid domain emails are blocked or require admin approval |
| BIZ-AUTH-03 | High | Admin | Admin/staff user creation lacks strong approval/audit | Risk of incorrect privilege assignment | Add audit log and confirmation for sensitive role assignments | Every role change has actor, timestamp, before/after |
| BIZ-AUTH-04 | High | Staff | Newly expanded staff permissions need regression testing | Staff may see data they shouldn't or get 403 when using warehouse | Write role matrix tests for admin routes and UI | STAFF can use warehouse, cannot use sensitive user/report/category CRUD |
| BIZ-AUTH-05 | Medium | User | OTP/login error messages may not be user-friendly enough | User doesn't know if OTP is wrong, expired, or request is rate-limited | Standardize error messages per case | UI shows clear reason and next action |
| BIZ-AUTH-06 | Medium | User | No clear resend limit/rate-limit UI | Easy to spam OTP or user clicks multiple times | Add countdown, rate limit, and clear copy | Resend button is disabled with timer, API has rate limit |
| BIZ-AUTH-07 | Medium | User | Profile/reputation endpoint still has placeholder/meaningless data | User sees a feature but it doesn't build trust | Hide or complete reputation | Profile only shows real data |

### 4.2 Community Feed and LOST/FOUND Posts

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-POST-01 | Critical | Student, Lecturer | User does not have a complete edit post flow | Incorrect information cannot be corrected, reducing item recovery chances | Add edit post for owner | Owner can edit title, description, category, location, time, contact per rules |
| BIZ-POST-02 | Critical | Student, Lecturer | User does not have a close/soft-delete button for own posts | Resolved posts remain on feed, causing excess claims | Add close/soft-delete for owner | Owner can close/soft-delete post; public feed hides deleted posts |
| BIZ-POST-03 | High | Student | LOST post requires ownership verification but UX may not clearly separate it | User may post insufficient evidence or expose sensitive info in public description | Separate "public description" and "private verification info" | Verification info is not shown publicly; only visible to claim/admin when needed |
| BIZ-POST-04 | High | Finder | FOUND post requires item holding location but validation may not be strict enough | Staff/admin cannot initialize inventory if FOUND has no holding location | Validate handover point or temporary holding location | FOUND post requires a handover point or holding location |
| BIZ-POST-05 | Medium | User | No auto-expiration job for old posts | Feed has old posts with no remaining value | Add cron expiration per config | Posts past expiry transition to EXPIRED and are properly categorized/hidden |
| BIZ-POST-06 | Medium | User | Search/filter may not be sufficient for real campus use | Users struggle to search by zone, time, category | Add clear filters with state persistence | User can filter by LOST/FOUND, category, area/building, time |
| BIZ-POST-07 | Medium | User | Single category selection may not suffice for multi-type items | E.g., "student ID inside a wallet" is hard to categorize | Consider multi-tag/secondary category | Post has primary category and optional secondary tags |
| BIZ-POST-08 | Medium | User | Missing empty state and guidance for low-data feeds | New users don't know what to do | Add empty state with CTA to post/find handover points | When no posts exist, UI provides next action |
| BIZ-POST-09 | High | User | Contact info may be overly exposed to public | Exposes student phone/email | Hide/mask contact; only show after valid claim or owner permission | Public feed does not expose sensitive contact by default |
| BIZ-POST-10 | Medium | User | No flow to report incorrect post information | Spam/false posts lack a report path | Add public report button | User can report a post with reason and evidence |

### 4.3 Media, Evidence, Cloudinary, Privacy

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-MEDIA-01 | Critical | User | Claim evidence is private but UI/API exposure needs verification | Leaks ownership info, invoices, serials, documents | Test authorization for evidence | Only claimant, owner, staff/admin can view |
| BIZ-MEDIA-02 | High | User | No complete UI for deleting photos/media | User cannot fix wrong/sensitive images | Add delete media for owner/admin | Image removed from UI and Cloudinary as needed |
| BIZ-MEDIA-03 | High | IT/Product | No clear thumbnail/optimization | Feed is slow with large images | Create thumbnails or Cloudinary transforms | Feed uses small images; detail uses full images |
| BIZ-MEDIA-04 | Medium | User | Claim may only upload 1 evidence file | Many cases need multiple evidence photos | Allow multiple evidence uploads | Claim saves and displays multiple evidence items |
| BIZ-MEDIA-05 | High | User | Evidence images and item images need clearer UI separation | User may upload evidence to public item images | UI copy and validation separates "public images" vs "private images" | Evidence images do not appear on public feed |
| BIZ-MEDIA-06 | Medium | IT | If Vision/Cloudinary fails, need clear fallback | Upload/posting may fail unnecessarily | Log AI errors, don't fail main flow | Post succeeds if AI fails but media upload succeeds |
| BIZ-MEDIA-07 | Medium | QA | No tests for file size/type/max count limits | Risk of 500 errors or UX bugs | Add API/UI upload tests | Wrong format/size returns clear 4xx error |

### 4.4 Matching, AI, Notification

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-MATCH-01 | High | User | Matching runs synchronously after create/upload, may be slow with large data | User waits long, request timeout | Move heavy matching to background queue | Posting is not delayed; matching processes async and notifies later |
| BIZ-MATCH-02 | High | User | Match score lacks explainability | User doesn't understand why they got a suggestion | Show match reasons: category, area, time, tags | Match card shows 2-4 clear reasons |
| BIZ-MATCH-03 | Medium | Admin | No UI to adjust matching threshold/weight | PO/Admin cannot tune sensitivity | Add config UI for threshold/weight | Admin can adjust threshold and changes have history |
| BIZ-MATCH-04 | Medium | Admin | No manual re-run matching | Cannot recalculate after post edits/config changes | Add re-run matching action | Admin can re-run for a single post or batch |
| BIZ-MATCH-05 | High | User | Match notification may be polling only, not realtime | User misses items if they don't refresh | Realtime notification or better refetch | User receives timely notification for high-score matches |
| BIZ-MATCH-06 | Medium | Product | No complete smart notification tiers | User may be spammed or miss medium matches | Apply tiers: high immediate, medium digest | Notification follows score tiers |
| BIZ-MATCH-07 | Critical | Product/QA | AI is advisory only, must not auto-decide claims | Risk of returning item to wrong person | Clearly state rule in UI/flow | Match never auto-accepts a claim |
| BIZ-MATCH-08 | Medium | MLOps | No dataset/model version/feedback loop | AI is hard to improve and explain | Add separate MLOps backlog | Each model has version, metrics, approval status |

### 4.5 Claim, Evidence, Ownership Verification

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-CLAIM-01 | Blocker | Student, Staff | Claim has no complete UI for staff/owner accept/reject/request info | Cannot complete real item return flow | Complete claim management UI | Owner/staff/admin can view claim, request info, accept/reject |
| BIZ-CLAIM-02 | Critical | Claimant | Claimant has no clear cancel claim button | User who sent by mistake cannot cancel | Add cancel claim when PENDING | Claimant cancels claim and action is logged |
| BIZ-CLAIM-03 | Critical | Owner/Staff | NEED_MORE_INFO requires new evidence; UI needs guidance | Claim gets stuck because user doesn't know where to add evidence | Add UI for evidence upload after request info | Claim after NEED_MORE_INFO only accepts when new evidence exists |
| BIZ-CLAIM-04 | Critical | Staff/Admin | Node and Java both handle claims; transition ownership must be defined | Rule divergence, race conditions, incorrect status updates | Claim transitions go through Java or a single service only | Node API does not transition claim.status independently |
| BIZ-CLAIM-05 | High | User | No "my claims" page | User cannot track submitted claims | Add my claims page | User can view status, evidence, and additional info requests |
| BIZ-CLAIM-06 | High | Owner | FOUND post owner needs to see claim list | Owner doesn't know who is claiming their item | Add claims list per post | Owner can view claims for their post if authorized |
| BIZ-CLAIM-07 | Critical | User | Accepted claim is not linked to chat/appointment/return | After accept, there is still no return step | Create next step after accept | After accept, appointment/chat/return guidance is available |
| BIZ-CLAIM-08 | High | QA | No e2e test for duplicate claim/race condition | Easy to create duplicate claims | Write service + DB unique tests | 2 concurrent requests create only 1 claim |
| BIZ-CLAIM-09 | Medium | Product | No evidence verification guidelines | Staff/owner decisions are subjective | Create claim verification checklist | UI has checklist for serial/description/time/location/image |
| BIZ-CLAIM-10 | Critical | Security | Evidence access may not be audited | Need to know who viewed sensitive evidence | Add audit for evidence access if needed | Evidence access is logged |

### 4.6 Handover Point and Campus Map

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-HAND-01 | High | User | Handover point shows storedItems but doesn't clarify which items | User knows items are at the point but not which posts they relate to | Show safe public list or link to posts | Handover point shows count and related public posts |
| BIZ-HAND-02 | High | Admin | Map image may be stored as base64 in DB | DB bloats, API /handover-points becomes heavy, slow loading | Move map image to file/public URL/Cloudinary | DB stores URL only, response is lightweight |
| BIZ-HAND-03 | Medium | User | Marker hitbox/hover/click on map needs stability testing | Popup flickers/shows wrong point | Add debounced hover/click state | Hover/click doesn't flicker, popup shows correct point |
| BIZ-HAND-04 | Medium | User | "Get directions on campus" may not have real action | Fake CTA causes disappointment | Change to "View location" or add internal routing | Button has a real action |
| BIZ-HAND-05 | Medium | Admin | No version/history for map when image changes | Old markers may misalign when map image changes | Save map version/markers per image | Changing map shows warning that markers need re-verification |
| BIZ-HAND-06 | High | Staff | Staff may need to view handover points but not edit them | Appropriate for role, but UI needs to be clear | Staff read-only handover | Staff can view points and stored count, cannot see edit/delete buttons |
| BIZ-HAND-07 | Medium | User | Missing up-to-date opening hours/contact person | User arrives at wrong time | Require opening hours/contact and active status | Handover point has hours, contact, active/inactive status |

### 4.7 Warehouse and Staff Operations

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-WH-01 | Done | Staff/Admin | Item retention deadline is now implemented | Warehouse knows when to process old items | Added retentionDeadline per warehouse item | Each item has a retention deadline shown on warehouse UI |
| BIZ-WH-02 | Critical | Staff/Admin | No job to mark items as EXPIRED | Overdue items remain STORED | Add cron to expire warehouse items | Overdue items automatically transition to EXPIRED |
| BIZ-WH-03 | Critical | Staff/Admin | No overdue processing: dispose/donate/transfer/extend | Does not follow campus procedures | Add expired processing flow | EXPIRED items have actions and logs |
| BIZ-WH-04 | Critical | Staff/Admin | No disposition report for overdue items | Lacks evidence if disputed | Add disposition record + optional image | Each dispose/donate/transfer has actor, reason, image |
| BIZ-WH-05 | High | Staff/Admin | No warehouse/handover point capacity | Overloaded point still accepts items | Add capacity and 80/100% warning | 80% shows warning, 100% blocks or redirects |
| BIZ-WH-06 | High | Staff | Staff dashboard lacks advanced warehouse filter/search | Warehouse with many items is hard to operate | Add search by code, status, handover, category, date | Staff can filter items needing attention |
| BIZ-WH-07 | High | Staff | No scan/item identifier code for warehouse intake | Physical items are hard to match with system records | Generate storageCode/QR | Each item has a unique printable/stickable code |
| BIZ-WH-08 | Critical | User/Staff | Final status DISPOSED/DONATED/TRANSFERRED must block claim/return | Items no longer in warehouse could still be claimed/returned | Guard API and UI by status | Final items cannot create new appointment/return |
| BIZ-WH-09 | High | Staff | No complete storage_logs on Node warehouse UI | Warehouse has no movement history | Show item timeline | Staff can view receive, store, claim, return, processing history |
| BIZ-WH-10 | Medium | Staff | Staff may delete items if UI/route is incorrect | Loses warehouse tracking | Delete is Admin-only; staff cannot see delete button | STAFF delete request returns 403 |
| BIZ-WH-11 | Medium | Staff | No proof image for receive/return | Disputes are hard to resolve | Upload proof image for receive/return | Each return has optional proof |
| BIZ-WH-12 | High | PO | Warehouse has many statuses but no clear state machine | Staff transitions status arbitrarily | Define allowed transitions | API only allows valid transitions |
| BIZ-WH-13 | Medium | Staff | No dashboard organized by shift | Staff doesn't know today's tasks | Staff dashboard queue by approaching expiry, claimed, pending | Dashboard shows prioritized queue |
| BIZ-WH-14 | Medium | Admin | No warehouse CSV/PDF report | End-of-term reports are done manually | Export warehouse report | Admin can export by time/status/handover |

### 4.8 Appointment and Return Flow

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-APT-01 | Done | Claimant, Finder, Staff | Return appointment flow after accepted claim is implemented | Accepted claim can create an appointment | Appointment after ACCEPTED is implemented | Accepted claim can create appointment |
| BIZ-APT-02 | Done | Staff/User | Appointment creation is guarded by accepted claim status | Prevents scheduling with the wrong person | API checks `claim.status === ACCEPTED` before creating appointment | Only accepted claims can create appointments |
| BIZ-APT-03 | High | User | No reschedule/cancel/accept appointment | Real schedules change constantly | Add full appointment lifecycle | User can reschedule/cancel/confirm appointment |
| BIZ-APT-04 | High | Staff | No conflict check for same handover point schedule | Overload at the counter | Check slot conflict | Cannot create appointment at same point/time if config blocks it |
| BIZ-APT-05 | Critical | Staff/Admin | Completed appointment does not update post/warehouse | Item returned but post still open/warehouse still stored | Transaction complete return | Completed -> post RESOLVED, warehouse RETURNED, log created |
| BIZ-APT-06 | Medium | User | No reminder before appointment time | User forgets the schedule | Notification/email reminder | Reminder sent N hours before per config |
| BIZ-APT-07 | High | Product | No process for claimant no-show | Staff doesn't know what to do with no-shows | Add NO_SHOW/RESCHEDULE rule | After no-show, actions and logging are available |

### 4.9 Chat and Realtime

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-CHAT-01 | High | Claimant, Owner | No chat after claim/accepted | User must communicate outside the system, losing audit trail | Implement chat room per claim | Only related users can join room |
| BIZ-CHAT-02 | High | Security | Chat needs strict auth and room guard | Info leaks if wrong room is joined | Socket auth + DB permission | Users outside the claim cannot join |
| BIZ-CHAT-03 | Medium | User | No realtime unread badge | Missed messages | Add unread count | Badge updates when new message arrives |
| BIZ-CHAT-04 | Medium | User | No image upload in chat | Hard to send supplementary evidence | Upload images in private chat | Chat images are only in the room |
| BIZ-CHAT-05 | Medium | QA | No test for realtime reconnect/offline | Mobile/web disconnections cause errors easily | Test reconnect/retry | Reconnect does not lose messages |

### 4.10 Report, Moderation, Governance

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-MOD-01 | Critical | User | No report button on public UI for posts | Spam/fraud posts are hard to report | Add report entry on post/detail | User submits report with reason |
| BIZ-MOD-02 | High | Admin | Report actions are incomplete: warn/hide/ban/delete | Admin can only do general review | Complete moderation actions | Actions create moderation logs |
| BIZ-MOD-03 | High | Admin | No moderation history per user/post | Hard to resolve disputes | Add moderation timeline | Admin can see who processed what |
| BIZ-MOD-04 | Critical | User | Ban/lock user must affect session/token | Banned user can still use old token if not revoked | Revoke refresh/access with practical strategy | Locked user cannot continue sensitive operations |
| BIZ-MOD-05 | Medium | Admin | No priority queue for severe reports | Admin doesn't process by priority | Add report severity | High-risk reports appear first |
| BIZ-MOD-06 | Medium | Product | No clear content policy | User doesn't know which posts get hidden | Write concise policy | UI shows reason when post is hidden/closed |

### 4.11 Admin Dashboard and Staff Dashboard

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-DASH-01 | High | Staff | New staff dashboard needs role matrix testing | May get 403 or see wrong tabs | Test with STAFF account | STAFF can enter dashboard, manage warehouse, cannot see admin-only features |
| BIZ-DASH-02 | Medium | Admin | Dashboard overview lacks time-based charts | PM/PO cannot report progress | Add LOST/FOUND/resolved charts | Admin can view trends by day/week |
| BIZ-DASH-03 | Medium | Admin | Missing heatmap for high-loss areas | Campus doesn't know hotspots | Add report by area/building | Admin can view top areas |
| BIZ-DASH-04 | Medium | Admin | Missing top trusted users | No incentive for good behavior | Connect reputation | Dashboard shows top users when data is available |
| BIZ-DASH-05 | Medium | Staff | Warehouse list lacks bulk actions | Many items needing update is time-consuming | Add bulk status/export | Staff can select multiple items and update in batch |
| BIZ-DASH-06 | Low | User/Admin | UI copy in some places has encoding/inconsistency issues | Reduces professionalism | Standardize UTF-8/copy | UI displays text correctly with proper encoding |

### 4.12 Reputation and Feedback

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-REP-01 | High | User | Reputation endpoint/UI has no real scoring logic | Feature is visible but provides no value | Implement scoring or hide | Score increases/decreases based on real events |
| BIZ-REP-02 | High | Product | No feedback after item return | Cannot measure success and attitude | Add feedback flow | After return, user rates experience |
| BIZ-REP-03 | Medium | Admin | No flag for users with many incorrect claims | Wastes staff time | Track rejected claims/no-shows | Admin sees user risk indicators |
| BIZ-REP-04 | Medium | User | No reputation history | User doesn't understand why score changed | Add reputation log UI | User can see events that added/deducted points |
| BIZ-REP-05 | Critical | Product | Feedback must not auto-decide item returns | Risk of incorrect business logic | Keep feedback as secondary signal only | Feedback does not directly change claim/return status |

### 4.13 Mobile, Responsive, Accessibility

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-MOB-01 | High | Student | Mobile app is placeholder only | Students primarily use phones; low adoption without mobile | Prioritize mobile-responsive web first, native later | Core flow works well on mobile browser |
| BIZ-MOB-02 | High | User | Camera upload on mobile needs testing | Creating FOUND/LOST posts is inconvenient if broken | Test camera/gallery on mobile | Image upload on mobile passes |
| BIZ-MOB-03 | Medium | User | Map handover needs responsive/pinch/scroll | User has difficulty viewing location on mobile | Check mobile map UX | Markers/popups don't obstruct content |
| BIZ-MOB-04 | Medium | Accessibility | Keyboard/focus/aria for modals/menus unclear | Difficult for keyboard users | Add accessibility pass | Modals trap focus, buttons have aria labels |
| BIZ-MOB-05 | Medium | User | No offline/retry support | Weak campus network causes form data loss | Draft local/retry upload if needed | User does not lose content when request fails |

### 4.14 Security, Privacy, Compliance

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-SEC-01 | Blocker | All | .env/.env.example may contain real secrets | Credential exposure | Check, rotate, replace with placeholders | No real secrets in repo |
| BIZ-SEC-02 | Critical | User | Contact info and evidence need clear privacy rules | Phone/email/evidence exposure | Data classification and UI masking | Public views don't show private fields |
| BIZ-SEC-03 | High | IT | Missing rate limit for auth/upload/claim | OTP spam, claim spam, upload abuse | Add rate limits | Sensitive APIs have limits |
| BIZ-SEC-04 | High | IT | CORS/JWT between Java and Node needs synchronization | Token valid in one service, fails in the other | Shared JWT config and testing | Same token works per valid role |
| BIZ-SEC-05 | High | Admin | Audit log does not cover all sensitive operations | Hard to trace back during disputes | Log role, moderation, warehouse, evidence access | Audit can trace actor/action/time |
| BIZ-SEC-06 | Medium | IT | No data retention/privacy policy | Old data stored indefinitely | Define retention for post/media/evidence | Policy exists with corresponding jobs/ops |
| BIZ-SEC-07 | Medium | IT | File upload needs virus/content scanning for production | Risk of malicious files/inappropriate images | At minimum validate MIME and size; add moderation | Wrong MIME is blocked |

### 4.15 Architecture, Integration, Database

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-ARCH-01 | Critical | Engineering | Node and Java share DB; service ownership must be clear | Two services updating same tables causes rule divergence | Create ownership matrix | Each table/flow has an owner service |
| BIZ-ARCH-02 | High | Engineering | Claim transition is owned by Java but Node still has claim endpoints | Easy to update incorrectly | Node creates/reads/evidence; Java transitions | Test that Node does not transition claims |
| BIZ-ARCH-03 | High | Engineering | Handover/warehouse logic exists in both Node and Java | Receive/store/return rules may diverge | Choose 1 service owner for storage lifecycle | API docs state owner and deprecate duplicate endpoints |
| BIZ-ARCH-04 | High | Engineering | Migration from blank DB needs verification after map/staff changes | New clones may 500 if not migrated | Add smoke test for migration | New DB migrates and builds/runs API OK |
| BIZ-ARCH-05 | Medium | Engineering | Some queries need indexes when data grows | Feed/warehouse/admin becomes slow | Review query plans | Hot queries have indexes and pagination |
| BIZ-ARCH-06 | Medium | Engineering | /handover-points response may be very large if map is base64 | Slow web, high bandwidth | Store map as URL image | Response list is lightweight, images load via static/CDN |
| BIZ-ARCH-07 | Medium | Engineering | Shared package has few types; web/api have their own types | Type drift between FE/BE | Increase shared DTOs or OpenAPI generation | Important types are not duplicated |

### 4.16 Observability, Testing, Release

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-QA-01 | Done | Team | Smoke/e2e for core flow post -> claim -> appointment guard is implemented | Demo/release has basic automated verification | Added API smoke/e2e script | Core happy path runs with `npm run e2e:core` when test env is available |
| BIZ-QA-02 | Critical | Team | Missing role matrix tests for Admin/Staff/User | Easy permission regression | API tests for each route/role | Sensitive routes return correct 401/403/200 |
| BIZ-QA-03 | High | Team | Missing warehouse lifecycle tests | Warehouse is a critical flow but status changes are error-prone | Unit/API transition tests | Invalid status transitions are blocked |
| BIZ-QA-04 | High | Team | Missing claim race condition tests | Claim may be accepted/rejected simultaneously | Concurrency test for Java service | Only 1 transition succeeds |
| BIZ-QA-05 | Medium | Team | Missing stable demo seed | Demo depends on local DB | Create demo seed | One command seeds accounts/posts/warehouse/demo |
| BIZ-QA-06 | Medium | Team | No release checklist | Easy to forget migrate/build/env | Add release checklist | Each release checks build, migrate, smoke, role |
| BIZ-QA-07 | Medium | Team | API error logging is not user-friendly enough | 500 errors are hard to debug | Log request id and safe error | Client receives clear message, server has trace |
| BIZ-QA-08 | Medium | Team | No monitoring/job health | Cron expire/matching failures go unnoticed | Add health/log for jobs | Job failures have log/alert |

### 4.17 Documentation, Scrum, Product Management

| ID | Severity | User Group | Issue/Risk | Product Impact | Remediation | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| BIZ-PM-01 | High | Team | Requirements/Business Rules have many planned items but no implemented status | Team cannot tell what is done | Add status per BR/FR: Done/Partial/Planned | Each BR has status and owner |
| BIZ-PM-02 | High | Team | Backlog is not split by product priority per sprint | Team may polish UI before core flow | Split backlog by MVP/P1/P2 | Sprint backlog has clear priorities |
| BIZ-PM-03 | Medium | Team | Definition of Done is unclear per feature | Features merge but lack tests/docs | Add DoD | Feature is done when it has tests/build/docs if needed |
| BIZ-PM-04 | Medium | Team | Acceptance criteria per flow are insufficient | QA cannot pass/fail | Write AC for auth/post/claim/warehouse | Each story has Given/When/Then |
| BIZ-PM-05 | Medium | Team | No risk register | Node/Java, AI, privacy risks are not tracked | Create risk register | Each risk has owner and mitigation |
| BIZ-PM-06 | Medium | Stakeholder | No end-to-end demo script | Demo is disjointed | Write demo script by role | Demo has Admin/Staff/Student accounts and clear flow |

## 5. Bugs by Real User Journey

### 5.1 Student Who Lost an Item

1. Registration/login may not enforce FPT domain.
2. LOST post risks exposing verification info if UI doesn't separate private/public.
3. After system suggests a match, user doesn't understand the match reason.
4. After submitting a claim for a FOUND post, there is still no dedicated "my claims" tracking page.
5. If claim is accepted, appointment/chat flow now exists, but no-show handling and feedback remain incomplete.
6. After receiving the item back, reputation updates exist, but feedback flow remains incomplete.

### 5.2 Student Who Found an Item

1. FOUND post may lack item holding location if validation is not strict.
2. User doesn't know whether to hold the item or bring it to which handover point.
3. Contact info may be overly public.
4. When a claim arrives, finder/owner can process it, but reviewer guidance/checklist can be clearer.
5. In-system chat/appointment exists after accepted claim, but unread badge and no-show handling remain incomplete.

### 5.3 Warehouse Staff

1. Needs to manage warehouse but new permissions need regression testing.
2. Retention deadlines, approaching expiry and expired status exist, but lifecycle tests are still needed.
3. Handover point/warehouse capacity management exists, but capacity policy UI can be improved.
4. No item identifier code/QR for physical matching.
5. No receipt/return/overdue processing report with images.
6. No state machine to prevent arbitrary status transitions.

### 5.4 Admin/PO

1. Dashboard has core charts, but deeper historical analytics still need richer API data.
2. Report/moderation has incomplete actions and audit.
3. Config UI for matching, notification, expiration is missing.
4. CSV report export exists; PDF/deeper operational export remains optional.
5. Risk register/DoD exists in this audit, but automated test coverage still needs expansion.

## 6. Recommended Sprint Priorities

### Priority Sprint 1 - Finalize MVP for Real Operations

- [x] BIZ-CLAIM-01: Claim management UI accept/reject/request info.
- [x] BIZ-APT-01: Appointment after accepted claim.
- [x] BIZ-APT-03 through BIZ-APT-05: Appointment lifecycle and complete return flow.
- [x] BIZ-WH-01: Warehouse item retention deadline.
- [x] BIZ-WH-02/BIZ-WH-03: Expire job and overdue processing.
- BIZ-WH-04: Full disposition report/proof image remains open.
- [x] BIZ-QA-01: Smoke/e2e core flow.
- BIZ-QA-02: Role matrix.
- BIZ-SEC-01, BIZ-SEC-02: Secret/privacy/contact/evidence.

### Priority Sprint 2 - Stabilize Campus Operations

- [x] BIZ-WH-05: Capacity warning/blocking.
- BIZ-WH-07/BIZ-WH-09: QR/storage code and movement timeline still need hardening.
- [x] BIZ-MOD-01: Public report action.
- BIZ-MOD-02 through BIZ-MOD-04: Moderation history/session invalidation still need hardening.
- [x] BIZ-POST-01/BIZ-POST-02/BIZ-POST-04: Edit/close/delete post and FOUND holding validation.
- BIZ-POST-03/BIZ-POST-09: Public/private copy and contact masking still need product review.
- BIZ-HAND-02, BIZ-HAND-05: Map image URL and version markers.

### Priority Sprint 3 - Enhance Experience and Trust

- [x] BIZ-MATCH-02/BIZ-MATCH-04/BIZ-MATCH-05: Explainability, manual re-run and realtime notification UX.
- BIZ-MATCH-01/BIZ-MATCH-03/BIZ-MATCH-06: Queue, config UI and notification tiers remain open.
- [x] BIZ-CHAT-01/BIZ-CHAT-02: Chat per claim and room guard.
- BIZ-CHAT-03/BIZ-CHAT-04: Unread badge and direct file upload remain open.
- [x] BIZ-REP-01/BIZ-REP-04: Reputation scoring/history.
- BIZ-REP-02/BIZ-REP-03: Feedback and risk review remain open.
- [x] BIZ-DASH-02/BIZ-DASH-04: Core charts and trusted users.
- BIZ-DASH-05: Bulk warehouse actions remain open.

### Priority Sprint 4 - Product Expansion

- Mobile web polish/native mobile.
- AI/MLOps dataset/model version/feedback loop.
- Advanced analytics/heatmap.
- Offline/retry support.

## 7. Definition of Done to Prevent Recurring Business Logic Bugs

A feature should only be considered done when:

- Has clear acceptance criteria per user role.
- Has frontend and backend validation.
- Has role-based permissions tested.
- Has empty/error/loading states.
- Has audit log if it is a sensitive operation.
- Has migration/seed if DB changes are involved.
- Has smoke test or e2e for the main flow.
- Has updated docs if business rules/APIs change.
- Does not expose private data on public UI.
- Web and API build pass before merging.

## 8. Condensed Risk Register

| Risk | Severity | Description | Mitigation |
| --- | --- | --- | --- |
| Wrong person receives item | Critical | Claim/return lacks sufficient verification and audit | Claim checklist, private evidence, staff approval, appointment completed log |
| Personal information exposure | Critical | Contact/evidence/images may be public | Data classification, masking, authorization tests |
| Warehouse loses track of items | Critical | No code/QR/timeline/disposition reports | Storage code, storage logs, proof images |
| Staff granted excessive permissions | High | Staff dashboard/API recently expanded | Role matrix tests and UI guards |
| API slow with large data | Medium | Synchronous matching, base64 map images, feed queries | Queue, URL images, indexes |
| Node/Java business logic divergence | High | Two services touch claim/handover | Ownership matrix and deprecate duplicate flows |
| Demo failure due to DB/migration | Medium | New clones forget to migrate or schema drifts | Runbook, smoke migration, demo seed |

## 9. PO/QA Conclusion

The current MVP can demonstrate the main screens, but to operate as a real Lost & Found system on campus, the following end-to-end lifecycles must be prioritized:

1. Post LOST/FOUND correctly and safely.
2. Matching is advisory only; claims are the verification mechanism.
3. Accepted claims must proceed to appointment/return.
4. Completed returns must update post, warehouse, and logs.
5. Warehouse must have retention deadlines, expiry handling, capacity, and disposition reports.
6. Staff must have sufficient permissions for warehouse operations without accessing sensitive Admin features.

If only the UI is polished without fixing these flows, the product will look good but cannot be used in real campus operations.
