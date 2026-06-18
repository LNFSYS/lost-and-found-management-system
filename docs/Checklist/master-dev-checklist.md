# Master Dev Checklist - FPTU Lost & Found System

Last audit: 2026-06-14

File này là checklist tổng hợp từ đầu đến cuối, chia theo 5 dev. Checkbox `[x]` chỉ được tick khi repo hiện tại có code/schema/UI tương ứng rõ ràng. Các UC mới về warehouse lifecycle, DB optimization và AI model training được thêm ở cuối để không bị thiếu scope.

## Legend

| Mark | Meaning |
| --- | --- |
| `[x]` | Đã có trong code/schema/UI hiện tại |
| `[ ]` | Chưa có hoặc mới có ý tưởng/docs |
| `Partial` trong ghi chú | Có một phần nền tảng, nhưng chưa đủ flow hoàn chỉnh |

## Ownership

| Dev | Owner | Main scope |
| --- | --- | --- |
| TL | Trần Thế Lượng | Java/Spring Boot business, security extension, claim transition, handover, appointment, reputation, scheduled tasks |
| VQ | Võ Chiêu Quân | Node.js core API, auth, post, media, search, claim base, DB migrations, admin API |
| QD | Trương Quang Đạt | AI, OCR, matching, realtime, notification, AI training/model pipeline |
| AK | Phạm Nguyễn Anh Khoa | React Native mobile app |
| NP | Trần Nguyễn Phong | React web app, community UI, admin UI, dashboard/config UI |

## TL - Trần Thế Lượng - Java / Spring Boot

### Security Extension

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-002 | Validate email format/policy from config in Java | Node currently owns email policy/auth |
| [ ] | UC-008 | Refresh access token in Java | Refresh token is Node-owned |
| [ ] | UC-009 | Store/validate bcrypt password hash compatibility in Java | No Java password flow |
| [x] | UC-010 | Role authorization User/Admin/Staff via Spring Security | `SecurityConfig`, `JwtAuthenticationFilter` |

### Claim Business Validation

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-089 | Save claim evidence and validate `claim_id` / `post_id` relationship in Java | Node handles evidence upload |
| [ ] | UC-090 | Hide evidence from unrelated users in Java | Node media service has guard |
| [ ] | UC-091 | Guard finder/staff/admin access to claim evidence in Java | Not Java-owned yet |
| [x] | UC-092 | Request more claim information and move status to `NEED_MORE_INFO` | `ClaimBusinessService.requestInfo` |
| [x] | UC-093 | Accept claim with row lock and evidence guard for `NEED_MORE_INFO` | `ClaimBusinessService.accept` |
| [x] | UC-094 | Reject claim with required reason | `ClaimBusinessService.reject` |
| [x] | UC-095 | Allow claimant to cancel only when `PENDING` | `ClaimBusinessService.cancel` |
| [x] | UC-096 | Manage claim states with locked transition writes | `findByIdForUpdate`, pessimistic write |

### Handover Point Business

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-098 | Admin creates handover point | `HandoverService.create` |
| [x] | UC-099 | Admin updates handover point | `HandoverService.update` |
| [x] | UC-100 | Admin enables/disables handover point | `HandoverService.toggle` |
| [x] | UC-103 | Staff confirms item received at handover point | `HandoverService.receive` |
| [x] | UC-104 | Staff updates item status to stored | `HandoverService.store` writes storage log |
| [x] | UC-106 | Staff records item condition notes | `StorageActionRequest.conditionNotes` |
| [x] | UC-108 | Staff confirms item returned to receiver | `HandoverService.returnItem` |
| [x] | UC-109 | System writes storage log with actor, timestamp and action | `StorageLogEntity`, `StorageLogRepository` |
| [ ] | UC-111 | Scheduled task marks overdue unclaimed items | No scheduled task yet |
| [ ] | UC-178 | Manage Expired Lost Items | Planned lifecycle flow |
| [ ] | UC-179 | Configure storage retention policy by item type/value | Planned |
| [ ] | UC-180 | Notify admin about items expiring soon and expired items | Planned |
| [ ] | UC-181 | Record expired item processing report | Planned |
| [ ] | UC-182 | Manage warehouse capacity and warning threshold | Planned |
| [ ] | UC-183 | Prevent selecting full warehouse or suggest another warehouse | Planned |

### Appointment Business

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-112 | Create return appointment only after claim accepted | Table exists, service not implemented |
| [ ] | UC-113 | Validate proposed return time and avoid conflicts | Planned |
| [ ] | UC-114 | Validate return location as handover point/custom | Planned |
| [ ] | UC-115 | Validate active handover point selection | Planned |
| [ ] | UC-117 | Accept appointment and update status to `ACCEPTED` | Planned |
| [ ] | UC-118 | Reject appointment with reason | Planned |
| [ ] | UC-119 | Reschedule appointment | Planned |
| [ ] | UC-120 | Cancel appointment with reason and notify both sides | Planned |
| [ ] | UC-122 | Complete appointment | Planned |
| [ ] | UC-123 | Update post to `RESOLVED` after completed appointment | Planned |

### Reputation Service

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-136 | Add reputation points after successful return | Tables/API read exist, scoring not implemented |
| [ ] | UC-137 | Add reputation points after successful claim | Planned |
| [ ] | UC-138 | Subtract points for repeated wrong/rejected claims | Planned |
| [ ] | UC-139 | Subtract points when admin removes violating post | Planned |
| [ ] | UC-141 | Calculate reputation level | Base table exists only |
| [ ] | UC-143 | Admin views bad feedback list and flags user | Planned |

### Java Admin Configuration

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-158 | Configure email registration policy key/value | `ConfigService.update` supports config values |
| [ ] | UC-159 | Configure post expiration duration and scheduled expiration | Config possible, scheduled task missing |
| [x] | UC-160 | Configure max posts per day | Config table/service supports key updates |
| [x] | UC-161 | Configure max images per post | Config table/service supports key updates |
| [x] | UC-162 | Configure max image size | Config table/service supports key updates |
| [x] | UC-163 | Configure allowed image formats | Config table/service supports key updates |
| [ ] | UC-164 | Manage item categories in Java | Node admin owns category CRUD |
| [ ] | UC-165 | Manage campus areas/buildings in Java | Node admin owns location CRUD |
| [x] | UC-166 | Manage handover points linked to locations | Java and Node both expose handover management |
| [x] | UC-167 | Configure matching threshold | `ConfigService.update` supports config key |
| [x] | UC-168 | Configure matching weights | `ConfigService.update` supports config key |
| [ ] | UC-169 | Configure notification/email rules | Not implemented as full rule UI/service |
| [x] | UC-170 | View configuration change history | `ConfigService.history` |
| [ ] | UC-171 | Rollback configuration | Planned |

## VQ - Võ Chiêu Quân - Node.js Core Backend

### Auth API

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-001 | Register account with email/password/profile | `auth.service`, `auth.routes` |
| [x] | UC-003 | Create OTP and send email/dev log | `email.service`, OTP repository |
| [x] | UC-004 | Verify OTP and create/activate account | Register flow validates OTP |
| [x] | UC-005 | Login with bcrypt and issue JWT pair | `auth.service.login` |
| [ ] | UC-006 | Google OAuth login | Env placeholders only |
| [x] | UC-007 | Logout and revoke refresh token | `authRoutes.post('/logout')` |
| [x] | UC-008 | Refresh and rotate refresh token | `authRoutes.post('/refresh')` |
| [x] | UC-009 | Store bcrypt password hashes | `hash.ts`, bcrypt salt rounds |
| [x] | UC-011 | Get current profile | `/auth/me` |
| [x] | UC-012 | Update profile | `/auth/profile` |
| [x] | UC-013 | Upload avatar | `/auth/avatar`, Cloudinary |
| [x] | UC-014 | Return activity history | `/auth/activity` |
| [x] | UC-015 | Return reputation summary | `/auth/reputation` |
| [x] | UC-173 | Request/resend registration OTP before account creation | `/auth/register/request-otp`, `/auth/resend-otp` |
| [x] | UC-174 | Forgot/reset password with OTP and revoke tokens | `/auth/forgot-password`, `/auth/reset-password` |
| [x] | UC-175 | Assign Student/Lecturer audience role | Register schema/service |

### Post API

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-016 | Create LOST post | `post.service.createPost` |
| [x] | UC-017 | Create FOUND post | `createPostSchema`, handover/location validation |
| [x] | UC-018 | Validate title/description/category | Zod validator |
| [x] | UC-019 | Validate and save hierarchical location | area/building IDs plus room text |
| [x] | UC-020 | Validate lost/found time | Zod/service validation |
| [x] | UC-021 | Hash secret verification for LOST | `hash.ts`, post service |
| [x] | UC-022 | Update post and trigger matching | `postRepository.update`, matching service |
| [x] | UC-023 | Close post by status update | `PATCH /posts/:id/status` |
| [x] | UC-024 | Soft-delete post | `DELETE /posts/:id` |
| [x] | UC-025 | Return post detail with media/tags/matches | `postRepository.getDetail` |
| [x] | UC-026 | Return my posts | `GET /posts/my` |
| [x] | UC-027 | Public LOST list with pagination | `GET /posts` filters |
| [x] | UC-028 | Public FOUND list with pagination | `GET /posts` filters |
| [x] | UC-029 | Update post status | `postRepository.updateStatus` |
| [ ] | UC-030 | Cron job moves expired posts to `EXPIRED` | Planned |
| [x] | UC-031 | Attach FOUND post to handover point | `handover_point_id` FK |
| [x] | UC-032 | Return current item storage location | detail includes handover/location text |

### Media, Upload And Cloudinary

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-035 | Validate image format | `media.service.assertImageFile` |
| [x] | UC-036 | Validate image size from config | `media.service`, public config |
| [x] | UC-037 | Upload post images and save metadata | `/posts/:id/media` |
| [x] | UC-038 | Upload claim evidence image | `/claims/:id/evidence` |
| [ ] | UC-039 | Upload chat image | Planned |
| [x] | UC-040 | Upload avatar and delete old asset | `media.service.uploadAvatar` |
| [x] | UC-041 | Save secure URL and public id | `post_media`, `claim_evidence` |
| [ ] | UC-042 | Generate thumbnail/optimized image | Not implemented as stored transform |
| [x] | UC-045 | Delete Cloudinary asset | `deletePostMedia` |
| [x] | UC-046 | Return claim evidence only to authorized users | `canViewClaim` |
| [x] | UC-047 | Send item image URL to Vision pipeline | `media.service.uploadPostMedia` |

### Search, Filter And Public Data

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-048 | Search posts by keyword | `listPostsQuerySchema.q` |
| [x] | UC-049 | Normalize Vietnamese text | `normalize-text.ts` |
| [x] | UC-050 | Filter by LOST/FOUND | `query.type` |
| [x] | UC-051 | Filter by category and child categories | repository query |
| [x] | UC-052 | Filter by area/building | repository query |
| [x] | UC-053 | Filter by time range | `from/to` query |
| [x] | UC-054 | Filter by status | `query.status` |
| [x] | UC-055 | Sort by latest/oldest | `query.sort` |
| [x] | UC-056 | Sort by highest matching score | `sort=highest_match` |
| [x] | UC-057 | Public board API without auth | `GET /posts`, `GET /search` |
| [x] | UC-058 | Shareable post link support | Web URL uses `?post=` and post detail can open by ID |
| [x] | UC-172 | Public config for clients | `/config/public` |

### Claim Base, Reports And Governance

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-083 | Submit claim for FOUND post | `claim.service.createClaim` |
| [x] | UC-084 | Save secret item description | `claims.secret_answer` |
| [x] | UC-085 | Save approximate lost time | `claims.approximate_lost_at` |
| [x] | UC-086 | Save approximate lost location | `claims.approximate_location` |
| [x] | UC-087 | Save ownership proof images | `claim_evidence` |
| [x] | UC-088 | Save extra evidence | evidence type supports docs/photos |
| [ ] | UC-097 | Create chat room after claim accepted | Planned |
| [ ] | UC-128 | Upload chat image for Socket.IO | Planned |
| [ ] | UC-129 | Persist chat messages by claim room | Tables exist, API missing |
| [ ] | UC-148 | User submits violation report | Admin handling exists, user submission missing |
| [x] | UC-176 | Prevent duplicate claim per post/user | service guard and unique key |
| [x] | UC-177 | Restrict sensitive admin endpoints to `ADMIN` | `admin.routes.ts` |

### Admin API, DB And Warehouse

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-110 | Admin list stored/unclaimed warehouse items | `/admin/warehouse-items` |
| [x] | UC-144 | Admin user list | `/admin/users` |
| [x] | UC-145 | Lock/unlock user and update roles | admin status/roles endpoints |
| [x] | UC-149 | Admin report queue | `/admin/reports` |
| [x] | UC-150 | Handle report actions | `/admin/reports/:id/handle` |
| [x] | UC-151 | Admin overview dashboard API | `/admin/dashboard/overview` |
| [x] | UC-164 | Admin category CRUD | `/admin/categories` |
| [x] | UC-165 | Admin campus area/building CRUD | `/admin/locations/...` |
| [x] | UC-166 | Admin handover point CRUD | `/admin/handover-points` |
| [x] | UC-166A | Admin handover map placement | Admin can select a campus map image, drag marker coordinates and persist them on `handover_points` |
| [x] | UC-110A | Handover stored-item counts | Handover APIs count active `warehouse_items` by `handover_point_id` |
| [x] | UC-184 | Optimize DB indexes for feed/search/matching/notifications/logs | migration `012_indexes_and_warehouse_lifecycle.sql` |
| [x] | UC-185 | Expand warehouse lifecycle status enum in schema/API | migration 012, Node enum |

## QD - Trương Quang Đạt - AI, Matching, Realtime

### AI Image Recognition And OCR

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-059 | Call Google Cloud Vision API | `vision.service.analyzeImageUrl` |
| [x] | UC-060 | Detect item type from Vision labels/objects | label/object annotations |
| [x] | UC-061 | Extract OCR text from image | text annotations |
| [x] | UC-062 | Suggest tags from Vision output | `uniqueTags`, OCR tags |
| [x] | UC-063 | Suggest item category from labels | `suggestCategoriesFromTags` |
| [ ] | UC-064 | User confirms/edits AI suggested category | UI flow not complete |
| [x] | UC-065 | Save AI tags linked to post | `ai_tags` |
| [x] | UC-066 | Use AI tags in matching vector | `findMatchPostById` tag text |
| [x] | UC-067 | Fallback to manual input when Vision fails/quota missing | fallback returns empty AI result |

### Matching Engine

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-068 | Trigger matching after new post | `post.service.createPost` |
| [x] | UC-069 | Trigger re-matching after update/upload | post update/media upload |
| [x] | UC-070 | Preprocess Vietnamese text | `normalize-text.ts` |
| [x] | UC-071 | Calculate TF-IDF vector | `buildTfidfVectors` |
| [x] | UC-072 | Calculate cosine similarity | `cosineSimilarity` |
| [x] | UC-073 | Calculate TextScore | matching service |
| [x] | UC-074 | Calculate CategoryScore | `categoryScore` |
| [x] | UC-075 | Calculate LocationScore | `locationScore` |
| [x] | UC-076 | Calculate TimeScore | `timeScore` |
| [x] | UC-077 | Calculate TotalScore from weights | `loadWeights` + weighted total |
| [x] | UC-078 | Save matching result | `upsertMatchResult` |
| [x] | UC-079 | Build related match suggestions | `buildSuggestions` |
| [x] | UC-080 | Notify when match exceeds threshold | `notifyHighConfidenceMatch` |
| [ ] | UC-081 | Admin manually re-runs matching | Planned |
| [x] | UC-082 | Apply matching weights from admin config | `config_entries` |

### Realtime And Notification

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-121 | Appointment reminder notification/email | Planned |
| [ ] | UC-124 | Socket.IO server with auth/CORS | Planned |
| [ ] | UC-125 | Join room by claim ID | Planned |
| [ ] | UC-126 | Send text message, persist and broadcast | Planned |
| [ ] | UC-127 | Receive realtime message | Planned |
| [ ] | UC-130 | Seen event and seen status | Planned |
| [ ] | UC-131 | Realtime notification for new message | Planned |
| [ ] | UC-132 | Notification for new claim | Planned |
| [ ] | UC-133 | Notification for claim accepted/rejected | Planned |
| [x] | UC-134 | Notification for new matching result | persisted `MATCH_FOUND` notifications |
| [ ] | UC-135 | Smart notification by score tier/digest | Planned |

### Warehouse Lifecycle Support APIs

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-101 | List active handover points API | lookup route |
| [ ] | UC-102 | Finder selects handover point as dedicated API | handled inside post create, no standalone flow |
| [ ] | UC-105 | Show current storage location API | basic post detail only |
| [ ] | UC-107 | Upload handover evidence image | Planned |
| [x] | UC-110 | List stored/unclaimed items | admin warehouse API |
| [ ] | UC-116 | Create custom appointment location | Planned |
| [ ] | UC-178 | Manage expired stored items API/job | Planned |
| [ ] | UC-180 | Expiring item alert job | Planned |
| [ ] | UC-181 | Expired item processing report API | Planned |
| [ ] | UC-182 | Warehouse capacity summary API | Planned |
| [ ] | UC-183 | Full warehouse selection guard/suggestion | Planned |

### AI Model Training And MLOps - New Scope

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-186 | Collect confirmed LOST/FOUND match pairs as labeled training data | New, not implemented |
| [ ] | UC-187 | Admin labels match/non-match and correct item category | New, not implemented |
| [ ] | UC-188 | Preprocess/anonymize image/text dataset for training | New, not implemented |
| [ ] | UC-189 | Train custom image/category model from labeled campus data | New, not implemented |
| [ ] | UC-190 | Train semantic text matching or embedding model beyond TF-IDF | New, not implemented |
| [ ] | UC-191 | Evaluate model with precision/recall/F1 and threshold report | New, not implemented |
| [ ] | UC-192 | Store model versions and training metadata | New, not implemented |
| [ ] | UC-193 | Deploy model inference with fallback to Vision/TF-IDF | New, not implemented |

## AK - Phạm Nguyễn Anh Khoa - React Native Mobile

### Mobile App Foundation

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-001 | Register screen | Mobile app is placeholder only |
| [ ] | UC-004 | OTP verification screen | Not implemented |
| [ ] | UC-005 | Login screen | Not implemented |
| [ ] | UC-007 | Logout and clear token | Not implemented |
| [ ] | UC-011 | Profile screen | Not implemented |
| [ ] | UC-012 | Edit profile screen | Not implemented |
| [ ] | UC-013 | Avatar picker/upload | Not implemented |
| [ ] | UC-015 | Reputation widget | Not implemented |

### Post, Upload, Search Mobile

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-016 | Create LOST post screen | Not implemented |
| [ ] | UC-017 | Create FOUND post screen | Not implemented |
| [ ] | UC-018 | Client validation | Not implemented |
| [ ] | UC-019 | Cascading location picker | Not implemented |
| [ ] | UC-020 | Date/time picker | Not implemented |
| [ ] | UC-021 | Secret verification form | Not implemented |
| [ ] | UC-022 | Edit post screen | Not implemented |
| [ ] | UC-023 | Close post dialog | Not implemented |
| [ ] | UC-025 | Post detail screen | Not implemented |
| [ ] | UC-026 | My posts screen | Not implemented |
| [ ] | UC-027 | Public LOST list | Not implemented |
| [ ] | UC-028 | Public FOUND list | Not implemented |
| [ ] | UC-031 | Handover point picker | Not implemented |
| [ ] | UC-034 | Pick image from camera/gallery | Not implemented |
| [ ] | UC-035 | Validate image format | Not implemented |
| [ ] | UC-036 | Validate image size | Not implemented |
| [ ] | UC-037 | Upload post images | Not implemented |
| [ ] | UC-038 | Upload claim evidence | Not implemented |
| [ ] | UC-043 | Lazy-load Cloudinary images | Not implemented |
| [ ] | UC-044 | Show Cloudinary images | Not implemented |
| [ ] | UC-048 | Search screen | Not implemented |
| [ ] | UC-050 | LOST/FOUND filter | Not implemented |
| [ ] | UC-051 | Category filter | Not implemented |
| [ ] | UC-052 | Location filter | Not implemented |
| [ ] | UC-053 | Time filter | Not implemented |
| [ ] | UC-055 | Sort options | Not implemented |
| [ ] | UC-064 | Confirm/edit AI category suggestion | Not implemented |
| [ ] | UC-079 | Related posts section | Not implemented |

### Claim, Handover, Appointment, Chat Mobile

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-083 | Submit claim screen | Not implemented |
| [ ] | UC-084 | Secret item description form | Not implemented |
| [ ] | UC-085 | Approximate lost time picker | Not implemented |
| [ ] | UC-086 | Approximate lost location picker | Not implemented |
| [ ] | UC-087 | Upload ownership proof | Not implemented |
| [ ] | UC-088 | Upload extra evidence | Not implemented |
| [ ] | UC-091 | View received claim evidence | Not implemented |
| [ ] | UC-093 | Accept claim confirmation | Not implemented |
| [ ] | UC-094 | Reject claim with reason | Not implemented |
| [ ] | UC-095 | Cancel claim confirmation | Not implemented |
| [ ] | UC-101 | Handover point list screen | Not implemented |
| [ ] | UC-102 | Handover point picker | Not implemented |
| [ ] | UC-105 | Show storage location | Not implemented |
| [ ] | UC-112 | Create appointment screen | Not implemented |
| [ ] | UC-113 | Proposed time picker | Not implemented |
| [ ] | UC-114 | Proposed location picker | Not implemented |
| [ ] | UC-115 | Select handover point | Not implemented |
| [ ] | UC-116 | Custom location input | Not implemented |
| [ ] | UC-117 | Accept appointment | Not implemented |
| [ ] | UC-119 | Reschedule appointment | Not implemented |
| [ ] | UC-120 | Cancel appointment | Not implemented |
| [ ] | UC-122 | Mark appointment completed | Not implemented |
| [ ] | UC-124 | Connect Socket.IO client | Not implemented |
| [ ] | UC-125 | Join claim chat room | Not implemented |
| [ ] | UC-126 | Send text message | Not implemented |
| [ ] | UC-127 | Receive realtime message | Not implemented |
| [ ] | UC-128 | Send image in chat | Not implemented |
| [ ] | UC-130 | Show seen status | Not implemented |
| [ ] | UC-131 | Unread badge on tab bar | Not implemented |
| [ ] | UC-132 | New claim notification | Not implemented |
| [ ] | UC-133 | Claim status notification | Not implemented |
| [ ] | UC-134 | Matching notification | Not implemented |
| [ ] | UC-136 | Reputation change indicator | Not implemented |
| [ ] | UC-140 | Reputation history screen | Not implemented |
| [ ] | UC-141 | Reputation level badge | Not implemented |
| [ ] | UC-142 | Feedback after return | Not implemented |
| [ ] | UC-195 | Mobile feedback signal for AI retraining | New, not implemented |

## NP - Trần Nguyễn Phong - React Web

### Auth And Profile Web

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-001 | Register UI | `RegisterForm` |
| [x] | UC-004 | OTP input in register flow | `RegisterForm` OTP fields |
| [x] | UC-005 | Login UI | `LoginForm` |
| [ ] | UC-006 | Google OAuth button | Planned |
| [x] | UC-007 | Logout flow | `UserMenu`, token clear |
| [x] | UC-011 | Profile UI | `AccountView`, profile data |
| [x] | UC-012 | Edit profile UI | `ProfileForm` |
| [x] | UC-013 | Avatar upload with preview | `AvatarForm` |
| [x] | UC-014 | Activity history UI | `activityQuery` |
| [x] | UC-015 | Reputation widget | `reputationQuery` |
| [x] | UC-173 | Request registration OTP in form | Register OTP button |
| [x] | UC-174 | Forgot/reset password UI | Account auth modes |
| [x] | UC-175 | Student/Lecturer selector | Register role field |

### Community Post Web

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-016 | Create LOST post page | `CreatePostView` |
| [x] | UC-017 | Create FOUND post page | `CreatePostView` |
| [x] | UC-018 | Client validation for required fields | form + API errors |
| [x] | UC-019 | Area/building dropdown | `buildingsQuery` |
| [x] | UC-020 | Lost/found date/time input | create form |
| [x] | UC-021 | Ownership verification detail field | create form |
| [ ] | UC-022 | Edit post page | Not implemented as full user edit UI |
| [ ] | UC-023 | Close post modal | Not implemented |
| [ ] | UC-024 | Delete post modal | Admin moderation delete exists, user modal missing |
| [x] | UC-025 | Post detail drawer | `PostDrawer` |
| [x] | UC-026 | My posts page | view `my-posts` |
| [x] | UC-027 | Public LOST board | board filters |
| [x] | UC-028 | Public FOUND board | board filters |
| [x] | UC-031 | Handover point dropdown | create form |
| [x] | UC-032 | Show storage/location text | `storageLocationText` |

### Upload, Search And Matching Web

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-033 | Multi-file picker | `selectFiles` |
| [x] | UC-035 | Client image format validation | `validateImageFiles` |
| [x] | UC-036 | Client image size validation | public config rules |
| [x] | UC-037 | Upload post images with preview | item/evidence previews, upload call |
| [x] | UC-038 | Upload claim evidence image | `ClaimDialog` |
| [ ] | UC-039 | Chat image preview | Planned |
| [ ] | UC-043 | Lightbox/lazy image gallery | Basic images only |
| [x] | UC-048 | Search/filter input | board search field |
| [x] | UC-049 | Vietnamese normalized search UI support | backend support consumed |
| [x] | UC-050 | LOST/FOUND filter | board filter |
| [ ] | UC-051 | Category multi-select | single category/cascading only |
| [x] | UC-052 | Location cascading dropdown | area/building |
| [x] | UC-053 | Date range filter | board filters |
| [x] | UC-054 | Status filter | board filters |
| [x] | UC-055 | Sort by latest | board sort |
| [x] | UC-056 | Sort by highest match | board sort |
| [x] | UC-057 | Public Lost & Found Board | `BoardView` |
| [x] | UC-058 | Copy/share post link | `copyShareLink` |
| [ ] | UC-064 | Confirm/edit AI suggested category | Not complete |
| [x] | UC-079 | Related match suggestions UI | `MatchSuggestionsDialog`, detail matches |

### Claim, Handover And Warehouse Web

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [x] | UC-083 | Submit claim UI | `ClaimDialog` |
| [x] | UC-084 | Secret item description textarea | `ClaimDialog` |
| [x] | UC-085 | Approximate lost time picker | `ClaimDialog` |
| [x] | UC-086 | Approximate lost location text/input | claim form input |
| [x] | UC-087 | Upload ownership proof | `ClaimDialog` evidence file |
| [ ] | UC-088 | Multiple extra evidence files | single evidence upload only |
| [ ] | UC-091 | View received claim evidence UI | Planned |
| [ ] | UC-092 | Request more information UI | Planned |
| [ ] | UC-093 | Accept claim modal | Planned |
| [ ] | UC-094 | Reject claim modal | Planned |
| [ ] | UC-095 | Cancel claim button | Planned |
| [x] | UC-101 | Handover point list page | `HandoverView` |
| [x] | UC-102 | Handover point selector | create form |
| [ ] | UC-105 | Dedicated storage location page | Basic detail only |
| [x] | UC-110 | Admin stored/unclaimed item list | `AdminWarehousePanel` |
| [ ] | UC-112 | Create appointment page | Planned |
| [ ] | UC-113 | Proposed time picker | Planned |
| [ ] | UC-114 | Proposed location dropdown | Planned |
| [ ] | UC-115 | Select handover point as return location | Planned |
| [ ] | UC-116 | Custom appointment location input | Planned |
| [ ] | UC-117 | Accept appointment button | Planned |
| [ ] | UC-118 | Reject appointment with reason | Planned |
| [ ] | UC-119 | Reschedule appointment page | Planned |
| [ ] | UC-120 | Cancel appointment modal | Planned |
| [ ] | UC-122 | Mark appointment completed | Planned |
| [x] | UC-185 | Display expanded warehouse lifecycle statuses | status dropdown/labels/styles |
| [ ] | UC-178 | Admin expired item management page | Planned |
| [ ] | UC-181 | Expired item processing report form | Planned |
| [ ] | UC-182 | Warehouse capacity indicators | Planned |
| [ ] | UC-183 | Disable full warehouse selection | Planned |

### Chat, Notification And Admin Web

| Done | UC | Task | Evidence / note |
| --- | --- | --- | --- |
| [ ] | UC-124 | Connect Socket.IO client | Planned |
| [ ] | UC-125 | Join claim chat room | Planned |
| [ ] | UC-126 | Chat UI bubbles | Planned |
| [ ] | UC-127 | Receive realtime message | Planned |
| [ ] | UC-128 | Upload/send chat image | Planned |
| [ ] | UC-130 | Seen status UI | Planned |
| [x] | UC-131 | Unread notification badge | notification menu badge |
| [ ] | UC-132 | Toast for new claim | Planned |
| [ ] | UC-133 | Toast for claim accepted/rejected | Planned |
| [ ] | UC-134 | Realtime toast for new matching | In-app notification list exists, realtime toast missing |
| [ ] | UC-140 | Reputation history page | Basic account widget only |
| [ ] | UC-141 | Reputation level widget | Basic reputation exists |
| [ ] | UC-142 | Feedback form | Planned |
| [ ] | UC-148 | Report violation modal | Planned |
| [x] | UC-144 | User management page | `AdminUsersPanel` |
| [x] | UC-145 | Lock/unlock account button | admin users row |
| [x] | UC-146 | Post management/moderation page | `AdminModerationPanel` |
| [x] | UC-147 | Hide/delete post moderation action | moderation row actions |
| [x] | UC-149 | Report review queue | `AdminReportsPanel` |
| [x] | UC-150 | Report handling UI | report action form |
| [x] | UC-151 | Admin dashboard overview | metric cards |
| [ ] | UC-152 | LOST/FOUND by period chart | Planned |
| [ ] | UC-153 | Return rate chart | Planned |
| [ ] | UC-154 | Category chart | Planned |
| [ ] | UC-155 | Lost-location heatmap | Planned |
| [ ] | UC-156 | Top trusted users table | Planned |
| [ ] | UC-157 | Export PDF/CSV button | Planned |
| [ ] | UC-158 | Email policy config page | Backend only |
| [ ] | UC-159 | Post expiration config page | Planned |
| [ ] | UC-160 | Max posts/day config page | Planned |
| [ ] | UC-161 | Max images config page | Planned |
| [ ] | UC-162 | Max image size config page | Planned |
| [ ] | UC-163 | Allowed image formats config page | Planned |
| [x] | UC-164 | Category management page | `AdminCategoryPanel` |
| [x] | UC-165 | Campus location management page | `AdminLocationPanel` |
| [x] | UC-166 | Handover point management page | `AdminHandoverPanel` |
| [ ] | UC-167 | Matching threshold config UI | Planned |
| [ ] | UC-168 | Matching weight sliders | Planned |
| [ ] | UC-169 | Notification/email rule UI | Planned |
| [ ] | UC-170 | Config history page | Planned |
| [ ] | UC-171 | Rollback config button | Planned |
| [x] | UC-172 | Consume public config for form pre-validation | image rules |
| [ ] | UC-194 | Admin AI dataset/model training dashboard | New, not implemented |
| [ ] | UC-195 | Web feedback signals for AI retraining | New, not implemented |

## New UC Summary

| UC | Owner | Status | Summary |
| --- | --- | --- | --- |
| UC-184 | VQ | Done | DB index optimization for hot queries |
| UC-185 | VQ/NP | Done | Warehouse lifecycle enum/status support in DB/API/UI |
| UC-186 | QD | Planned | Collect labeled AI training data |
| UC-187 | QD/NP | Planned | Admin label match/category examples |
| UC-188 | QD | Planned | Preprocess/anonymize training dataset |
| UC-189 | QD | Planned | Train custom image/category model |
| UC-190 | QD | Planned | Train semantic matching/embedding model |
| UC-191 | QD | Planned | Evaluate model metrics and thresholds |
| UC-192 | QD | Planned | Model versioning/registry |
| UC-193 | QD/VQ | Planned | Deploy inference endpoint and fallback integration |
| UC-194 | NP | Planned | Admin AI training dashboard |
| UC-195 | AK/NP | Planned | User feedback signals for retraining |
