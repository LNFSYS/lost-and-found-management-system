# Dev-Owned Use Case Checklist

> File này dùng để chia việc theo từng dev. Mỗi checkbox là một deliverable riêng của đúng dev đó, không dùng kiểu một dòng giao chung nhiều người. Nếu cùng một mã UC xuất hiện ở nhiều dev, nghĩa là mỗi dev làm một phần riêng biệt: Web UI, Mobile UI, Node API, Java business hoặc AI/realtime.

## Ownership Rule

- `TL` owns Java/Spring Boot business, security extension, admin, handover, appointment, reputation, scheduled task.
- `VQ` owns Node.js core API: auth API, post API, Cloudinary, search, claim base, chat persistence.
- `QD` owns AI, matching, Socket.IO, notification and realtime services.
- `AK` owns React Native mobile screens and mobile interactions.
- `NP` owns React web screens, admin web, dashboard and web interactions.
- Checkbox `[x]` means that dev deliverable is completed, not merely designed.

## TL - Trần Thế Lượng - Java / Spring Boot

Tech stack: Spring Boot, Spring Security, JPA/Hibernate, Jakarta Validation, MySQL, Scheduled Task.

### Security Extension

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-002 | Validate email format/policy from config; no fixed FPT/FE/EDU suffix required |
| [ ] | UC-008 | Refresh access token: verify refresh token and issue new token |
| [ ] | UC-009 | Store and validate bcrypt password hash compatibility |
| [x] | UC-010 | Role authorization User/Admin/Staff via Spring Security |

### Claim Business Validation

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-089 | Save claim evidence and validate `claim_id` / `post_id` relationship |
| [ ] | UC-090 | Hide evidence from unrelated users with permission guard |
| [ ] | UC-091 | Guard finder/staff/admin access to claim evidence |
| [x] | UC-092 | Request more claim information and move status to `NEED_MORE_INFO` |
| [x] | UC-093 | Accept claim with valid state transition |
| [x] | UC-094 | Reject claim with required reason |
| [x] | UC-095 | Allow claimant to cancel only when claim is still `PENDING` |
| [x] | UC-096 | Manage claim states: PENDING, NEED_MORE_INFO, ACCEPTED, REJECTED, CANCELLED |

### Handover Point Business

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-098 | Admin creates handover point with name, address and opening hours |
| [x] | UC-099 | Admin updates handover point information |
| [x] | UC-100 | Admin enables/disables handover point |
| [x] | UC-103 | Staff confirms item received at handover point |
| [ ] | UC-104 | Staff updates item status to `STORED_AT_POINT` |
| [x] | UC-106 | Staff records item condition notes |
| [x] | UC-108 | Staff confirms item returned to receiver |
| [x] | UC-109 | System writes storage log with actor, timestamp and status |
| [ ] | UC-111 | Scheduled task marks overdue unclaimed items |

### Appointment Business

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-112 | Create return appointment only after claim is accepted |
| [ ] | UC-113 | Validate proposed return time and avoid schedule conflicts |
| [ ] | UC-114 | Validate return location as handover point or custom location |
| [ ] | UC-115 | Validate active handover point selection |
| [ ] | UC-117 | Accept appointment and update status to `CONFIRMED` |
| [ ] | UC-118 | Reject appointment with reason |
| [ ] | UC-119 | Reschedule appointment by creating a new proposal |
| [ ] | UC-120 | Cancel appointment with reason and notify both sides |
| [ ] | UC-122 | Complete appointment after required confirmations |
| [ ] | UC-123 | Update post to `RESOLVED` after completed appointment |

### Reputation Service

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-136 | Add reputation points after successful return |
| [ ] | UC-137 | Add reputation points after successful claim |
| [ ] | UC-138 | Subtract points for repeated wrong/rejected claims |
| [ ] | UC-139 | Subtract points when admin removes violating post |
| [ ] | UC-141 | Calculate reputation level: New, Trusted, Reliable, Excellent |
| [ ] | UC-143 | Admin views bad feedback list and flags user |

### Admin Moderation & Dashboard

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-144 | Admin lists users with pagination, search and filters |
| [ ] | UC-145 | Admin locks/unlocks user account |
| [ ] | UC-146 | Admin lists posts with type/status/time filters |
| [ ] | UC-147 | Admin hides/deletes violating post and writes moderation log |
| [ ] | UC-149 | Admin views pending report queue |
| [ ] | UC-150 | Admin handles report: warn, hide post, ban user |
| [ ] | UC-151 | Admin overview dashboard API |
| [ ] | UC-152 | Statistics for LOST/FOUND posts by week/month |
| [ ] | UC-153 | Successful return rate statistics |
| [ ] | UC-154 | Most lost item categories statistics |
| [ ] | UC-155 | High-risk lost-item location statistics for heatmap |
| [ ] | UC-156 | Top trusted users API |
| [ ] | UC-157 | Export statistics report as PDF/CSV |

### Admin Configuration

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-158 | Configure email registration policy without fixed domain whitelist |
| [ ] | UC-159 | Configure post expiration duration and scheduled expiration |
| [x] | UC-160 | Configure max posts per user per day |
| [x] | UC-161 | Configure max images per post |
| [x] | UC-162 | Configure max image size |
| [x] | UC-163 | Configure allowed image formats |
| [ ] | UC-164 | Manage item categories |
| [ ] | UC-165 | Manage campus areas, buildings and rooms |
| [x] | UC-166 | Manage handover points linked to campus locations |
| [x] | UC-167 | Configure matching threshold |
| [x] | UC-168 | Configure Text/Category/Location/Time matching weights |
| [ ] | UC-169 | Configure notification/email rules |
| [x] | UC-170 | View configuration change history |
| [ ] | UC-171 | Rollback configuration to previous value |

## VQ - Võ Chiêu Quân - Node.js Core Backend

Tech stack: Node.js, Express, TypeScript, Auth, Post, Cloudinary, Search, Claim API base, Chat persistence.

### Auth API

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-001 | Register account with normal email, password, name and profile data |
| [x] | UC-003 | Create OTP and send through email service |
| [x] | UC-004 | Verify OTP and mark email as verified |
| [x] | UC-005 | Login with email/password, verify bcrypt, issue JWT access/refresh token |
| [ ] | UC-006 | Google OAuth login with any valid email |
| [x] | UC-007 | Logout by revoking refresh token |
| [x] | UC-011 | Get current profile by JWT |
| [x] | UC-012 | Update profile with validation |
| [x] | UC-013 | Upload avatar to Cloudinary and save URL/public_id |
| [x] | UC-014 | Return user activity history |
| [x] | UC-015 | Return reputation score, level and recent log |
| [x] | UC-173 | Request registration OTP before account creation and resend when needed |
| [x] | UC-174 | Forgot password and reset password with OTP |
| [x] | UC-175 | Assign Student/Lecturer audience role during registration |

### Post API

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-016 | Create LOST post with DTO validation |
| [x] | UC-017 | Create FOUND post with handover point reference |
| [x] | UC-018 | Validate title, description and category |
| [x] | UC-019 | Validate and save hierarchical location |
| [x] | UC-020 | Validate lost/found time |
| [x] | UC-021 | Save encrypted secret verification info for LOST post |
| [x] | UC-022 | Update post and trigger re-matching when needed |
| [x] | UC-023 | Close post by setting status to `CLOSED` |
| [x] | UC-024 | Soft-delete post with owner/admin permission |
| [x] | UC-025 | Return post detail with images, tags and matching |
| [x] | UC-026 | Return my posts with type/status filters |
| [x] | UC-027 | Return public LOST list with pagination |
| [x] | UC-028 | Return public FOUND list with pagination |
| [x] | UC-029 | Update post status OPEN/MATCHED/RESOLVED/CLOSED |
| [ ] | UC-030 | Cron job moves expired posts to `EXPIRED` |
| [x] | UC-031 | Attach FOUND post to handover point |
| [ ] | UC-032 | Return current item storage location |

### Cloudinary Media API

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-035 | Validate image format JPG/PNG/WEBP before upload |
| [x] | UC-036 | Validate image size by public/admin config |
| [x] | UC-037 | Upload post images to Cloudinary and save metadata |
| [x] | UC-038 | Upload claim evidence images to private folder |
| [ ] | UC-039 | Upload chat image and return secure URL |
| [x] | UC-040 | Upload avatar and delete old public_id when needed |
| [x] | UC-041 | Save secure_url and public_id into media table |
| [ ] | UC-042 | Generate thumbnail/optimized image via Cloudinary transform |
| [x] | UC-045 | Delete Cloudinary asset by public_id |
| [x] | UC-046 | Return claim evidence URL only to authorized users |
| [x] | UC-047 | Send uploaded image URL to Google Vision pipeline |

### Search & Filter API

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-048 | Search posts by keyword |
| [x] | UC-049 | Normalize Vietnamese text for accent-insensitive search |
| [x] | UC-050 | Filter by LOST/FOUND |
| [x] | UC-051 | Filter by category |
| [x] | UC-052 | Filter by area/building/room |
| [x] | UC-053 | Filter by time range |
| [x] | UC-054 | Filter by post status |
| [x] | UC-055 | Sort by latest |
| [x] | UC-056 | Sort by highest matching score |
| [x] | UC-057 | Public Lost & Found Board API without auth |
| [ ] | UC-058 | Create/share post link |

### Claim API Base & Chat Persistence

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-083 | Submit claim for FOUND post |
| [x] | UC-084 | Save secret item description in claim |
| [x] | UC-085 | Save approximate lost time in claim |
| [x] | UC-086 | Save approximate lost location in claim |
| [x] | UC-087 | Save Cloudinary ownership proof images |
| [x] | UC-088 | Save extra documents, invoices or old photos |
| [ ] | UC-097 | Create chat room after claim accepted |
| [ ] | UC-128 | Upload chat image and return URL for Socket.IO |
| [ ] | UC-129 | Persist chat messages by claim/chat room |
| [ ] | UC-148 | Submit violation report |
| [x] | UC-172 | Return public config for Web/Mobile validation |

## QD - Trương Quang Đạt - AI, Matching, Realtime

Tech stack: Google Vision, OCR, TF-IDF, Cosine Similarity, Socket.IO, Notification.

### AI Image Recognition & OCR

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-059 | Call Google Cloud Vision API with Cloudinary URL |
| [x] | UC-060 | Detect item type from Vision labels |
| [x] | UC-061 | Extract text from image with OCR |
| [x] | UC-062 | Suggest tags from Vision output |
| [x] | UC-063 | Suggest item category from labels |
| [x] | UC-065 | Save AI tags linked to post_id |
| [x] | UC-066 | Use AI tags to improve matching vector |
| [x] | UC-067 | Fallback to manual input when Vision fails/quota is exceeded |

### Matching Engine

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-068 | Trigger async matching after new post |
| [x] | UC-069 | Trigger re-matching after post update |
| [x] | UC-070 | Preprocess Vietnamese text |
| [x] | UC-071 | Calculate TF-IDF vector |
| [x] | UC-072 | Calculate Cosine Similarity |
| [x] | UC-073 | Calculate TextScore |
| [x] | UC-074 | Calculate CategoryScore |
| [x] | UC-075 | Calculate LocationScore |
| [x] | UC-076 | Calculate TimeScore |
| [x] | UC-077 | Calculate TotalScore from weighted components |
| [x] | UC-078 | Save matching result |
| [ ] | UC-080 | Send notification when match exceeds threshold |
| [ ] | UC-081 | Admin manually re-runs matching |
| [x] | UC-082 | Apply matching weights from Admin Configuration |

### Socket.IO Chat Realtime

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-124 | Build Socket.IO server with namespace, CORS and auth middleware |
| [ ] | UC-125 | Join room by claim_id |
| [ ] | UC-126 | Send text message, persist and broadcast |
| [ ] | UC-127 | Receive realtime message in correct room/socket |
| [ ] | UC-130 | Handle seen event and emit seen status |

### Notification

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-121 | Send appointment reminder notification/email |
| [ ] | UC-131 | Realtime in-app notification for new message |
| [ ] | UC-132 | Notification for new claim |
| [ ] | UC-133 | Notification for claim accepted/rejected |
| [ ] | UC-134 | Notification for new matching result |
| [ ] | UC-135 | Smart notification by score tier |

### Supporting APIs

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-101 | API: list active handover points |
| [ ] | UC-102 | API: finder selects handover point |
| [ ] | UC-105 | API: show current storage location |
| [ ] | UC-107 | API: upload handover evidence image |
| [ ] | UC-110 | API: list stored/unclaimed items |
| [ ] | UC-116 | API: create custom appointment location |
| [ ] | UC-140 | API: reputation history |
| [ ] | UC-142 | API: submit feedback after return |

## AK - Phạm Nguyễn Anh Khoa - React Native Mobile

Tech stack: React Native, TypeScript, React Navigation, React Hook Form, Socket.IO Client.

### Auth & Profile Mobile

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-001 | Register screen with email, password, name and student code |
| [ ] | UC-004 | OTP verification screen |
| [ ] | UC-005 | Login screen |
| [ ] | UC-007 | Logout and clear local token |
| [ ] | UC-011 | Profile screen |
| [ ] | UC-012 | Edit profile screen |
| [ ] | UC-013 | Pick and upload avatar with preview |
| [ ] | UC-015 | Show reputation score, level and progress bar |

### Post Mobile

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-016 | Create LOST post screen |
| [ ] | UC-017 | Create FOUND post screen |
| [ ] | UC-018 | Client validate title/description/category |
| [ ] | UC-019 | Cascading location picker |
| [ ] | UC-020 | Lost/found DateTimePicker |
| [ ] | UC-021 | Secret verification form |
| [ ] | UC-022 | Edit post screen |
| [ ] | UC-023 | Close post confirm dialog |
| [ ] | UC-025 | Post detail screen |
| [ ] | UC-026 | My posts screen |
| [ ] | UC-027 | Public LOST list |
| [ ] | UC-028 | Public FOUND list |
| [ ] | UC-031 | Handover point picker for FOUND post |
| [ ] | UC-032 | Show item storage location |

### Upload Mobile

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-034 | Pick image from camera/gallery |
| [ ] | UC-035 | Client validate image format |
| [ ] | UC-036 | Client validate image size by public config |
| [ ] | UC-037 | Upload post images with progress |
| [ ] | UC-038 | Upload claim evidence image |
| [ ] | UC-039 | Upload chat image and preview thumbnail |
| [ ] | UC-043 | Lazy load Cloudinary images |
| [ ] | UC-044 | Show Cloudinary images in list/detail |

### Search & Matching Mobile

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-048 | Search screen |
| [ ] | UC-050 | LOST/FOUND filter |
| [ ] | UC-051 | Category filter |
| [ ] | UC-052 | Location filter |
| [ ] | UC-053 | Time filter |
| [ ] | UC-055 | Latest/highest match sort |
| [ ] | UC-064 | Confirm/edit AI suggested category |
| [ ] | UC-079 | Related posts section |

### Evidence Claim Mobile

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-083 | Submit claim screen |
| [ ] | UC-084 | Secret item description form |
| [ ] | UC-085 | Approximate lost time picker |
| [ ] | UC-086 | Approximate lost location picker |
| [ ] | UC-087 | Upload ownership proof |
| [ ] | UC-088 | Upload extra evidence |
| [ ] | UC-091 | View received claim evidence |
| [ ] | UC-093 | Accept claim confirmation |
| [ ] | UC-094 | Reject claim with reason |
| [ ] | UC-095 | Cancel claim confirmation |

### Handover & Appointment Mobile

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-101 | Handover point list screen |
| [ ] | UC-102 | Handover point picker |
| [ ] | UC-105 | Show storage location in post detail |
| [ ] | UC-112 | Create return appointment screen |
| [ ] | UC-113 | Proposed time picker |
| [ ] | UC-114 | Proposed location picker |
| [ ] | UC-115 | Select handover point as return location |
| [ ] | UC-116 | Enter custom location |
| [ ] | UC-117 | Accept appointment |
| [ ] | UC-119 | Reschedule appointment screen |
| [ ] | UC-120 | Cancel appointment |
| [ ] | UC-122 | Confirm appointment completed |

### Chat & Notification Mobile

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-124 | Connect Socket.IO client |
| [ ] | UC-125 | Join claim chat room |
| [ ] | UC-126 | Send text message |
| [ ] | UC-127 | Receive realtime message |
| [ ] | UC-128 | Send image in chat |
| [ ] | UC-130 | Show seen status |
| [ ] | UC-131 | Unread badge on tab bar |
| [ ] | UC-132 | Show new claim notification |
| [ ] | UC-133 | Show claim accepted/rejected notification |
| [ ] | UC-134 | Show new matching notification |
| [ ] | UC-136 | Show reputation change |
| [ ] | UC-140 | Reputation history screen |
| [ ] | UC-141 | Reputation level badge |
| [ ] | UC-142 | Feedback screen after successful return |

## NP - Trần Nguyễn Phong - React Web

Tech stack: React, TypeScript, Vite, TailwindCSS, TanStack Query, Recharts, Socket.IO Client.

### Auth & Profile Web

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-001 | Register page with email validation |
| [x] | UC-004 | OTP verification page |
| [x] | UC-005 | Login page |
| [ ] | UC-006 | Google OAuth login button |
| [x] | UC-007 | Logout flow |
| [x] | UC-011 | Profile page |
| [x] | UC-012 | Edit profile page |
| [x] | UC-013 | Avatar upload with preview |
| [x] | UC-014 | Activity history page |
| [x] | UC-015 | Reputation score widget |
| [x] | UC-173 | Request registration OTP button inside register form |
| [x] | UC-174 | Forgot password and reset password form |
| [x] | UC-175 | Student/Lecturer selector in registration form |

### Post Web

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-016 | Create LOST post page |
| [x] | UC-017 | Create FOUND post page |
| [x] | UC-018 | Client validate title/description/category |
| [x] | UC-019 | Cascading location dropdown |
| [x] | UC-020 | Lost/found DateTimePicker |
| [x] | UC-021 | Secret verification form |
| [ ] | UC-022 | Edit post page |
| [ ] | UC-023 | Close post confirm modal |
| [ ] | UC-024 | Delete post confirm modal |
| [x] | UC-025 | Post detail page |
| [x] | UC-026 | My posts page |
| [x] | UC-027 | Public LOST board |
| [x] | UC-028 | Public FOUND board |
| [x] | UC-031 | Handover point dropdown |
| [x] | UC-032 | Show item storage location |

### Upload Web

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-033 | File picker with multi-select |
| [x] | UC-035 | Client validate image format |
| [x] | UC-036 | Client validate image size |
| [ ] | UC-037 | Upload post images with progress and preview |
| [x] | UC-038 | Upload claim evidence image |
| [ ] | UC-039 | Upload chat image preview |
| [ ] | UC-043 | Lazy load and lightbox Cloudinary image |

### Search, Filter & Matching Web

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-048 | Search page with autocomplete |
| [ ] | UC-049 | Accent-insensitive Vietnamese search UI |
| [x] | UC-050 | LOST/FOUND filter toggle |
| [ ] | UC-051 | Category multi-select |
| [x] | UC-052 | Location cascading dropdown |
| [x] | UC-053 | Date range filter |
| [x] | UC-054 | Status filter |
| [x] | UC-055 | Sort by latest |
| [x] | UC-056 | Sort by highest match score |
| [x] | UC-057 | Public Lost & Found Board |
| [x] | UC-058 | Copy/share post link |
| [ ] | UC-064 | Confirm/edit AI suggested category |
| [x] | UC-079 | Related posts section |

### Evidence Claim Web

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-083 | Submit claim page |
| [x] | UC-084 | Secret item description textarea |
| [x] | UC-085 | Approximate lost time picker |
| [ ] | UC-086 | Approximate lost location dropdown |
| [x] | UC-087 | Upload ownership proof |
| [ ] | UC-088 | Upload extra evidence |
| [ ] | UC-091 | View received claim evidence |
| [ ] | UC-092 | Request more information UI |
| [ ] | UC-093 | Accept claim modal |
| [ ] | UC-094 | Reject claim modal with required reason |
| [ ] | UC-095 | Cancel claim button |

### Handover & Appointment Web

| Done | UC | Task |
| --- | --- | --- |
| [x] | UC-101 | Handover point list page |
| [x] | UC-102 | Handover point selector |
| [ ] | UC-105 | Show storage location |
| [ ] | UC-110 | Admin stored/unclaimed item list |
| [ ] | UC-112 | Create appointment page |
| [ ] | UC-113 | Proposed time picker |
| [ ] | UC-114 | Proposed location dropdown |
| [ ] | UC-115 | Select handover point |
| [ ] | UC-116 | Custom location input |
| [ ] | UC-117 | Accept appointment button |
| [ ] | UC-118 | Reject appointment with reason |
| [ ] | UC-119 | Reschedule appointment page |
| [ ] | UC-120 | Cancel appointment modal |
| [ ] | UC-122 | Confirm appointment completed |

### Chat & Notification Web

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-124 | Connect Socket.IO client |
| [ ] | UC-125 | Join claim chat room |
| [ ] | UC-126 | Chat UI with message bubbles |
| [ ] | UC-127 | Receive realtime message |
| [ ] | UC-128 | Upload and send chat image |
| [ ] | UC-130 | Show seen status |
| [ ] | UC-131 | Unread notification badge |
| [ ] | UC-132 | Toast for new claim |
| [ ] | UC-133 | Toast for claim accepted/rejected |
| [ ] | UC-134 | Toast for new matching |
| [ ] | UC-140 | Reputation history page |
| [ ] | UC-141 | Reputation level widget |
| [ ] | UC-142 | Feedback form |
| [ ] | UC-148 | Report violation modal |

### Admin Dashboard & Config Web

| Done | UC | Task |
| --- | --- | --- |
| [ ] | UC-144 | User management page |
| [ ] | UC-145 | Lock/unlock account button |
| [ ] | UC-146 | Post management page |
| [ ] | UC-147 | Hide/delete violating post modal |
| [ ] | UC-149 | Report review queue |
| [ ] | UC-150 | Report handling UI |
| [x] | UC-151 | Admin dashboard metric cards and charts |
| [ ] | UC-152 | LOST/FOUND by week/month chart |
| [ ] | UC-153 | Successful return rate chart |
| [ ] | UC-154 | Most lost categories chart |
| [ ] | UC-155 | Lost-location heatmap |
| [ ] | UC-156 | Top trusted users table |
| [ ] | UC-157 | Export PDF/CSV button |
| [ ] | UC-158 | Email registration policy config page |
| [ ] | UC-159 | Post expiration config |
| [ ] | UC-160 | Max posts per day config |
| [ ] | UC-161 | Max images per post config |
| [ ] | UC-162 | Max image size config |
| [ ] | UC-163 | Allowed image formats config |
| [ ] | UC-164 | Category management page |
| [ ] | UC-165 | Campus location management page |
| [ ] | UC-166 | Handover point management page |
| [ ] | UC-167 | Matching threshold config |
| [ ] | UC-168 | Matching weight sliders |
| [ ] | UC-169 | Notification/email rule config |
| [ ] | UC-170 | Config history page |
| [ ] | UC-171 | Rollback config button |
| [x] | UC-172 | Consume public config for form pre-validation |
