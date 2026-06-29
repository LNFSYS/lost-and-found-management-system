# Master Dev Checklist - FPTU Lost & Found System

Last audit: 2026-06-29

This file is the canonical UC checklist for the project. The old list of nearly 200 UCs has been consolidated to exactly 100 UCs. Each UC starts with a verb, has one primary owner, and is organized by current team member assignment.

## UC Rules

| Rule | Description |
| --- | --- |
| UC format | Each UC starts with a verb: Register, Verify, Create, View, Update, Submit, Receive, Approve, Manage... |
| Owner | Each UC has exactly one primary owner |
| Team | The checklist assigns work only to TL, VQ, QD, AK |
| TL | Tran The Luong is responsible for Java/Spring Boot and AI training |
| VQ | Vo Chieu Quan is responsible for Node.js backend, matching algorithm, realtime Socket.IO, and chat; not responsible for UI |
| QD | Truong Quang Dat is responsible for AI/OCR, claim evidence verification, ownership confidence percentage, overdue warehouse processing algorithm, and notification strategy |
| Scope | Do not create separate UCs for buttons/filters/modals/validations that are too granular |

## Legend

| Mark | Meaning |
| --- | --- |
| `[x]` | Has corresponding code/schema/API/service clearly present in the repo |
| `[~]` | Partially implemented; missing flow or hardening |
| `[ ]` | Not yet implemented or only at planned/docs stage |

## Members And Scope

| Code | Member | Primary Scope |
| --- | --- | --- |
| TL | Tran The Luong | Java/Spring Boot business service, claim transition, handover lifecycle, appointment lifecycle, reputation, scheduled tasks, AI training pipeline |
| VQ | Vo Chieu Quan | Node.js API, DB migration, auth, post, media, claim base, admin/staff API, matching algorithm, realtime Socket.IO, chat |
| QD | Truong Quang Dat | AI/OCR/tag extraction, evidence verification, ownership confidence score, overdue warehouse algorithm, disposal/donation workflow, notification strategy |
| AK | Pham Nguyen Anh Khoa | React Native mobile app |

## TL - Tran The Luong - Java / Spring Boot + AI Training

| Done | UC | Use case | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-001 | Authenticate JWT in Java service | `JwtAuthenticationFilter`, `SecurityConfig` |
| [x] | UC-002 | Authorize Admin/Staff/User in Java service | Spring Security role guard |
| [x] | UC-003 | Request additional claim information | `ClaimBusinessService.requestInfo` |
| [x] | UC-004 | Accept claim with row lock | `ClaimBusinessService.accept` |
| [x] | UC-005 | Reject claim with reason | `ClaimBusinessService.reject` |
| [x] | UC-006 | Cancel claim when in valid state | `ClaimBusinessService.cancel` |
| [x] | UC-007 | Lock claim writes during state transition | pessimistic write / transaction |
| [x] | UC-008 | Create handover point in Java service | `HandoverService.create` |
| [x] | UC-009 | Update handover point in Java service | `HandoverService.update` |
| [x] | UC-010 | Toggle handover point in Java service | `HandoverService.toggle` |
| [x] | UC-011 | Confirm item received at handover point | `HandoverService.receive` |
| [x] | UC-012 | Update item to stored status | `HandoverService.store` |
| [x] | UC-013 | Record item condition notes upon receipt | `StorageActionRequest.conditionNotes` |
| [x] | UC-014 | Confirm item returned to recipient | `HandoverService.returnItem` |
| [x] | UC-015 | Write storage log for warehouse operations | `StorageLogEntity`, `StorageLogRepository` |
| [x] | UC-021 | Create return appointment after accepted claim | `appointmentService.create`, `/appointments`, accepted-claim guard |
| [x] | UC-022 | Reject appointment with reason | `PATCH /appointments/:id/reject` |
| [x] | UC-023 | Reschedule or cancel return appointment | `PATCH /appointments/:id/reschedule` and `PATCH /appointments/:id/cancel` |
| [x] | UC-024 | Complete appointment and update to resolved | Complete API updates appointment, post resolved, warehouse returned |
| [x] | UC-025 | Calculate reputation score after business event | Appointment completion adds reputation logs and score updates |
| [ ] | UC-026 | Collect AI training data | Planned |
| [ ] | UC-027 | Label match correct/incorrect data | Planned |
| [ ] | UC-028 | Anonymize AI training data | Planned |
| [ ] | UC-029 | Train AI model from labeled data | Planned |
| [ ] | UC-030 | Evaluate and save AI model version | Planned |

## VQ - Vo Chieu Quan - Node.js Backend, Matching, Realtime

| Done | UC | Use case | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-031 | Request registration OTP via email | `/auth/register/request-otp` |
| [x] | UC-032 | Verify OTP and create account | register flow |
| [x] | UC-033 | Log in with email and password | `auth.service.login` |
| [x] | UC-034 | Refresh access token | `POST /auth/refresh` |
| [x] | UC-035 | Log out and revoke refresh token | `POST /auth/logout` |
| [x] | UC-036 | Reset password via OTP | forgot/reset password flow |
| [x] | UC-037 | Provide user profile API | `/auth/me`, `/auth/profile` |
| [x] | UC-038 | Provide user avatar API | `/auth/avatar` |
| [x] | UC-039 | Provide activity history and reputation API | `/auth/activity`, `/auth/reputation` |
| [x] | UC-040 | Create lost item post via API | `post.service.createPost` |
| [x] | UC-041 | Create found item post via API | `createPostSchema`, handover/location validation |
| [x] | UC-042 | Update post via API | `postRepository.update` |
| [x] | UC-043 | Close or soft-delete post via API | status/delete APIs |
| [x] | UC-044 | Return post detail via API | `postRepository.getDetail` |
| [x] | UC-045 | Return current user's posts | `GET /posts/my` |
| [x] | UC-046 | Return public Lost & Found board | `GET /posts` |
| [x] | UC-047 | Search, filter, and sort posts | query filters/sort |
| [x] | UC-048 | Upload post images | `/posts/:id/media` |
| [x] | UC-049 | Upload claim evidence images | `/claims/:id/evidence` |
| [x] | UC-050 | Delete post images from Cloudinary | `deletePostMedia` |
| [x] | UC-051 | Provide public config for client validation | `/config/public` |
| [x] | UC-052 | Submit claim for a FOUND post | `claim.service.createClaim` |
| [x] | UC-053 | Prevent duplicate claims for same post | duplicate claim guard |
| [x] | UC-054 | Control claim evidence view permissions | `canViewClaim` |
| [x] | UC-055 | Provide handover point list API | handover lookup route |
| [x] | UC-056 | Manage handover points via Admin API | `/admin/handover-points` |
| [x] | UC-057 | Store campus map image and handover point marker coordinates | handover map fields |
| [x] | UC-058 | Count stored items at handover point | handover stored-item counts |
| [x] | UC-059 | Manage warehouse items via API | `/admin/warehouse-items` |
| [x] | UC-060 | Update warehouse item status | warehouse status API |
| [x] | UC-061 | Save warehouse item retention deadline | `retentionDeadline` |
| [x] | UC-062 | Restrict staff permissions below admin | staff/admin route guard |
| [x] | UC-063 | Manage users via Admin API | `/admin/users` |
| [x] | UC-064 | Manage item categories via Admin API | `/admin/categories` |
| [x] | UC-065 | Manage campus areas and buildings via Admin API | `/admin/locations/...` |
| [x] | UC-066 | Moderate posts and handle reports via Admin API | moderation/report APIs |
| [x] | UC-067 | Provide admin dashboard overview data | `/admin/dashboard/overview` |
| [x] | UC-068 | Run matching after post create or update | post create/update/media upload |
| [x] | UC-069 | Normalize Vietnamese text for matching algorithm | `normalize-text.ts` |
| [x] | UC-070 | Calculate match score by text, category, location, and time | matching service |
| [x] | UC-071 | Save matching results | `upsertMatchResult` |
| [x] | UC-072 | Return similar item suggestions | `buildSuggestions`, match suggestion API |
| [x] | UC-073 | Send notification when new match found | `MATCH_FOUND` notifications |
| [x] | UC-074 | Check match suggestions on 10-minute cycle | `my-match-suggestions` polling plus realtime notification invalidation |
| [x] | UC-075 | Re-run matching manually for admin | `POST /posts/:id/matches/re-run`, `matchingService.runForPost` |
| [x] | UC-076 | Explain why two posts match | `GET /posts/:id/matches/explanations` returns score summary and reasons |
| [x] | UC-077 | Set up Socket.IO server | `setupRealtimeServer(server)` attached to Node HTTP server |
| [x] | UC-078 | Authenticate socket via JWT | Socket middleware verifies access token and joins `user:{id}` room |
| [x] | UC-079 | Create and join chat room by claim | `claim:join` guards claim access and joins `claim:{roomId}` |
| [x] | UC-080 | Send and receive realtime messages | `chat:message` persists and broadcasts text messages |
| [x] | UC-081 | Send images in realtime chat | `chat:image` persists image message metadata and broadcasts it |
| [~] | UC-082 | Display seen status and unread count in realtime | Web chat UI receives messages and `chat:seen` persists read time; full unread badge UI still planned |
| [x] | UC-083 | Send realtime notifications for chat, claim, and appointment | Notification repository emits `notification:new` to user room for matching, claim, appointment, and warehouse alerts |
| [x] | UC-084 | Export statistics report via API | `GET /admin/dashboard/export.csv` |
| [x] | UC-085 | Manage system configuration via API | Java `ConfigAdminController`, `ConfigService.update`, config history |

## QD - Truong Quang Dat - AI/OCR, Evidence Verification, Warehouse Algorithm

| Done | UC | Use case | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-016 | Check warehouse item retention deadline | `POST /admin/warehouse-items/expire-overdue` checks `retention_deadline` |
| [x] | UC-017 | Determine eligibility for overdue item processing | Active warehouse statuses transition to `EXPIRED` when overdue |
| [x] | UC-018 | Create overdue item disposal order | `POST /admin/warehouse-items/:id/process` supports `DISPOSED` with note |
| [x] | UC-019 | Create donation batch for items | `POST /admin/warehouse-items/:id/process` supports `DONATED` with note |
| [x] | UC-020 | Send warehouse alerts to staff/admin | Overdue expiration creates `WAREHOUSE_OVERDUE` notifications |
| [x] | UC-086 | Analyze item images with Google Vision | `vision.service.analyzeImageUrl` runs for `ITEM` post media |
| [x] | UC-087 | Extract OCR from evidence images | Vision OCR now runs for post evidence and claim evidence uploads |
| [x] | UC-088 | Suggest tags and categories from item images | `uniqueTags`, `suggestCategoriesFromTags` |
| [x] | UC-089 | Verify claim evidence uploaded by claimant | `GET /claims/:id/verification` combines evidence, match, text, location, time |
| [x] | UC-090 | Calculate ownership verification percentage | Claim verification returns `ownershipConfidence` and breakdown |
| [x] | UC-091 | Use AI tags as metadata for matching | `findMatchPostById` tag text |
| [x] | UC-092 | Display verification percentage to finder | Web claim panel shows system verification percentage |

## AK - Pham Nguyen Anh Khoa - React Native Mobile

| Done | UC | Use case | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-093 | Register, log in, and store token securely on mobile | Planned |
| [ ] | UC-094 | View and update profile, avatar, activity, and reputation on mobile | Planned |
| [ ] | UC-095 | View board, search, filter, sort, and open post detail on mobile | Planned |
| [ ] | UC-096 | Create and manage LOST/FOUND posts on mobile | Planned |
| [ ] | UC-097 | Upload images from camera/gallery with mobile validation | Planned |
| [ ] | UC-098 | Submit claim, upload evidence, and view claim status on mobile | Planned |
| [ ] | UC-099 | View handover map/points and create return appointment on mobile | Planned |
| [ ] | UC-100 | Chat realtime, receive notifications, and handle offline/retry on mobile | Planned |

## Summary

| Metric | Value |
| --- | --- |
| Total UCs after consolidation | 100 |
| ID range | UC-001 through UC-100 |
| Active team members | TL, VQ, QD, AK |
