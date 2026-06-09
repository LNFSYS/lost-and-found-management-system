# MASTER PROMPT — FPTU Lost & Found System
# Dành cho AI Agent (Claude Code / Cursor / Aider)

---

## 0. Vai trò của bạn

Bạn là một senior full-stack engineer được giao nhiệm vụ **hoàn thiện toàn bộ hệ thống Lost & Found cho FPT University Đà Nẵng** theo đúng tài liệu thiết kế đã có. Bạn phải:

1. Viết code thực tế, chạy được — không viết placeholder hay TODO trống.
2. Tạo và migrate database schema đầy đủ.
3. Sau mỗi task hoàn thành, **cập nhật ngay** vào file `dev-owned-usecase-checklist.md` bằng cách đổi `[ ]` thành `[x]` cho đúng UC và đúng dev-owner.
4. Nếu một bước cần **API key / secret** (Cloudinary, Google Cloud Vision, email SMTP, JWT secret...), hãy **dừng lại**, ghi rõ tên biến môi trường cần thiết vào `.env.example`, không hardcode, không giả mạo giá trị, và tiếp tục các bước không phụ thuộc key đó trước.
5. Luôn giữ code trong monorepo structure đã định nghĩa.

---

## 1. Tổng quan dự án

| Thuộc tính | Giá trị |
|---|---|
| Tên | FPTU Lost & Found Management System |
| Campus | FPT University — Đà Nẵng |
| Mục đích | Kết nối người mất đồ và người nhặt được đồ; AI matching; claim verification; handover; appointment |
| Monorepo root | `apps/web`, `apps/api-node`, `apps/mobile`, `apps/java-admin-service`, `shared/`, `docs/` |

### Màu sắc thương hiệu (bắt buộc áp dụng cho toàn bộ UI)

```
Primary CTA / Accent:    #F37124  (Orange)
Trust / Nav / AI:        #0651A0  (Dark Blue), #008DDE (Light Blue)
Success / Resolved:      #53B848  (Green)
Background:              #FFFFFF / #F8F8F8 (off-white)
Border:                  crisp, 1px, neutral gray
```

---

## 2. Tech Stack cứng (không được thay đổi)

| Layer | Stack |
|---|---|
| Web Frontend | React 18 + TypeScript + Vite + TailwindCSS + TanStack Query + Recharts + Socket.IO Client |
| Node API | Node.js + Express + TypeScript + Prisma (hoặc raw mysql2) |
| Database | MySQL 8, charset utf8mb4 |
| Mobile | React Native + TypeScript + Expo |
| Java Service | Spring Boot 3 + Spring Security + JPA/Hibernate + Jakarta Validation |
| File Storage | Cloudinary (upload images, avatar, claim evidence, chat attachments) |
| AI / Vision | Google Cloud Vision API (OCR, label detection, safe search) |
| Matching | TF-IDF + Cosine Similarity (JavaScript/Python worker) |
| Realtime | Socket.IO |
| Auth | JWT access token (15 min) + Refresh token (30 day rotation) + bcrypt password |
| OAuth | Google OAuth 2.0 |
| Email | Nodemailer (SMTP provider configurable) |
| Task Scheduler | Spring `@Scheduled` (Java) cho expiration tasks |
| API Docs | Swagger / OpenAPI 3.0 cho cả Node API và Java Service |

---

## 3. Cấu trúc thư mục monorepo

```
/
├── apps/
│   ├── web/                        ← React + Vite + TailwindCSS
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/           ← API calls
│   │       └── store/
│   ├── api-node/                   ← Node.js Express API
│   │   └── src/
│   │       ├── config/
│   │       ├── controllers/
│   │       ├── middlewares/
│   │       ├── models/
│   │       ├── repositories/
│   │       ├── routes/
│   │       ├── services/
│   │       └── validators/
│   ├── mobile/                     ← React Native Expo
│   │   └── src/
│   │       ├── screens/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── services/
│   └── java-admin-service/         ← Spring Boot
│       └── src/main/java/
│           ├── config/
│           ├── controller/
│           ├── service/
│           ├── repository/
│           ├── entity/
│           └── dto/
├── shared/
│   ├── types/                      ← TypeScript interfaces dùng chung Web + Mobile + Node
│   └── constants/
├── docs/
│   ├── architecture.md
│   ├── db-auth-design.md
│   ├── dev-owned-usecase-checklist.md
│   └── lost-found-system-overview.md
├── .env.example                    ← Template biến môi trường, KHÔNG có giá trị thật
└── docker-compose.yml              ← MySQL + Redis (optional)
```

---

## 4. Biến môi trường cần thiết

> ⚠️ Đây là danh sách đầy đủ các biến cần khai báo trong `.env.example`.  
> **Không hardcode bất kỳ giá trị nào. Nếu chưa có key, ghi `YOUR_VALUE_HERE` và tiếp tục.**

```env
# ── Database ──────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fptu_lost_found
DB_USER=YOUR_VALUE_HERE
DB_PASSWORD=YOUR_VALUE_HERE

# ── JWT ───────────────────────────────────────────────
JWT_ACCESS_SECRET=YOUR_VALUE_HERE
JWT_REFRESH_SECRET=YOUR_VALUE_HERE
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ── Cloudinary ────────────────────────────────────────
# ⛔ Cần Cloudinary account. Tạo tại https://cloudinary.com/
CLOUDINARY_CLOUD_NAME=YOUR_VALUE_HERE
CLOUDINARY_API_KEY=YOUR_VALUE_HERE
CLOUDINARY_API_SECRET=YOUR_VALUE_HERE

# ── Google OAuth ──────────────────────────────────────
# ⛔ Cần Google Cloud Console project với OAuth 2.0 credentials
GOOGLE_CLIENT_ID=YOUR_VALUE_HERE
GOOGLE_CLIENT_SECRET=YOUR_VALUE_HERE
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# ── Google Cloud Vision ───────────────────────────────
# ⛔ Cần Google Cloud project với Vision API enabled
# Option A: service account JSON key path
GOOGLE_APPLICATION_CREDENTIALS=YOUR_VALUE_HERE
# Option B: API Key (simpler, dùng cho demo)
GOOGLE_VISION_API_KEY=YOUR_VALUE_HERE

# ── Email (SMTP) ──────────────────────────────────────
# ⛔ Cần SMTP credentials (Gmail App Password, SendGrid, Mailgun...)
SMTP_HOST=YOUR_VALUE_HERE
SMTP_PORT=587
SMTP_USER=YOUR_VALUE_HERE
SMTP_PASS=YOUR_VALUE_HERE
SMTP_FROM=noreply@yourdomain.com

# ── Node API ──────────────────────────────────────────
NODE_ENV=development
API_PORT=3001
FRONTEND_URL=http://localhost:5173

# ── Java Admin Service ────────────────────────────────
JAVA_SERVICE_PORT=8080
JAVA_JWT_SECRET=YOUR_VALUE_HERE

# ── Socket.IO ─────────────────────────────────────────
SOCKET_PORT=3002

# ── Redis (optional, for caching) ────────────────────
REDIS_URL=redis://localhost:6379
```

---

## 5. Database — Full Schema

Thực hiện theo thứ tự. Mỗi bảng phải được tạo bằng SQL migration file trong `apps/api-node/src/migrations/`.

### 5.1 Bảng đã có (Authentication — hoàn chỉnh)

Các bảng sau đã được thiết kế đầy đủ trong `docs/db-auth-design.md`. **Tạo migration file chứa DDL chính xác như trong tài liệu, không thay đổi:**

- `users`
- `roles`
- `user_roles`
- `email_verification_otps`
- `oauth_accounts`
- `refresh_tokens`
- `login_audit_logs`
- `user_activity_logs`

Seed data bắt buộc:
```sql
INSERT INTO roles (id, code, name, description) VALUES
  (UUID(), 'USER',  'User',  'Default student/user role'),
  (UUID(), 'STAFF', 'Staff', 'Campus staff role'),
  (UUID(), 'ADMIN', 'Admin', 'System administrator role');
```

### 5.2 Bảng cần tạo thêm — Posts & Media

```sql
-- Campus locations (phân cấp 3 cấp)
CREATE TABLE campus_areas (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campus_buildings (
  id CHAR(36) PRIMARY KEY,
  area_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_buildings_area FOREIGN KEY (area_id) REFERENCES campus_areas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Item categories
CREATE TABLE item_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_normalized VARCHAR(100) NOT NULL,
  icon VARCHAR(100) NULL,
  parent_id CHAR(36) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES item_categories(id),
  UNIQUE KEY uq_category_name (name_normalized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lost & Found posts
CREATE TABLE posts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type ENUM('LOST', 'FOUND') NOT NULL,
  status ENUM('OPEN', 'MATCHED', 'RESOLVED', 'CLOSED', 'EXPIRED', 'HIDDEN') NOT NULL DEFAULT 'OPEN',
  title VARCHAR(255) NOT NULL,
  title_normalized VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  description_normalized TEXT NOT NULL,
  category_id CHAR(36) NULL,
  area_id CHAR(36) NULL,
  building_id CHAR(36) NULL,
  room_text VARCHAR(100) NULL,
  custom_location VARCHAR(255) NULL,
  contact_info VARCHAR(255) NULL,
  lost_found_at DATETIME NULL,
  handover_point_id CHAR(36) NULL,
  secret_verification_hash VARCHAR(255) NULL,
  expires_at DATETIME NULL,
  resolved_at DATETIME NULL,
  view_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES item_categories(id),
  CONSTRAINT fk_posts_area FOREIGN KEY (area_id) REFERENCES campus_areas(id),
  CONSTRAINT fk_posts_building FOREIGN KEY (building_id) REFERENCES campus_buildings(id),
  KEY idx_posts_type_status (type, status),
  KEY idx_posts_user (user_id),
  KEY idx_posts_created (created_at),
  KEY idx_posts_lost_found_at (lost_found_at),
  FULLTEXT KEY ft_posts_search (title_normalized, description_normalized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Post media assets
CREATE TABLE post_media (
  id CHAR(36) PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  secure_url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(20) NOT NULL DEFAULT 'image',
  format VARCHAR(10) NULL,
  width INT NULL,
  height INT NULL,
  bytes INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES posts(id),
  KEY idx_post_media_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI-generated tags
CREATE TABLE ai_tags (
  id CHAR(36) PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0,
  source ENUM('VISION_LABEL', 'VISION_OBJECT', 'OCR', 'MANUAL') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_tags_post FOREIGN KEY (post_id) REFERENCES posts(id),
  KEY idx_ai_tags_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.3 Bảng cần tạo thêm — Matching

```sql
CREATE TABLE match_results (
  id CHAR(36) PRIMARY KEY,
  lost_post_id CHAR(36) NOT NULL,
  found_post_id CHAR(36) NOT NULL,
  total_score FLOAT NOT NULL DEFAULT 0,
  text_score FLOAT NOT NULL DEFAULT 0,
  category_score FLOAT NOT NULL DEFAULT 0,
  location_score FLOAT NOT NULL DEFAULT 0,
  time_score FLOAT NOT NULL DEFAULT 0,
  is_notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_lost FOREIGN KEY (lost_post_id) REFERENCES posts(id),
  CONSTRAINT fk_match_found FOREIGN KEY (found_post_id) REFERENCES posts(id),
  UNIQUE KEY uq_match_pair (lost_post_id, found_post_id),
  KEY idx_match_total_score (total_score DESC),
  KEY idx_match_lost_post (lost_post_id),
  KEY idx_match_found_post (found_post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.4 Bảng cần tạo thêm — Claims

```sql
CREATE TABLE claims (
  id CHAR(36) PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  claimant_id CHAR(36) NOT NULL,
  status ENUM('PENDING', 'NEED_MORE_INFO', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  description TEXT NULL,
  secret_answer TEXT NULL,
  approximate_lost_at DATETIME NULL,
  approximate_location VARCHAR(255) NULL,
  rejection_reason TEXT NULL,
  more_info_request TEXT NULL,
  accepted_at DATETIME NULL,
  rejected_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_claims_claimant FOREIGN KEY (claimant_id) REFERENCES users(id),
  KEY idx_claims_post (post_id),
  KEY idx_claims_claimant (claimant_id),
  KEY idx_claims_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE claim_state_logs (
  id CHAR(36) PRIMARY KEY,
  claim_id CHAR(36) NOT NULL,
  from_status VARCHAR(40) NULL,
  to_status VARCHAR(40) NOT NULL,
  actor_id CHAR(36) NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claim_state_logs_claim FOREIGN KEY (claim_id) REFERENCES claims(id),
  KEY idx_claim_state_logs_claim (claim_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE claim_evidence (
  id CHAR(36) PRIMARY KEY,
  claim_id CHAR(36) NOT NULL,
  secure_url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  evidence_type ENUM('OWNERSHIP_PROOF', 'ADDITIONAL_DOC', 'PHOTO') NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claim_evidence_claim FOREIGN KEY (claim_id) REFERENCES claims(id),
  KEY idx_claim_evidence_claim (claim_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.5 Bảng cần tạo thêm — Handover Points

```sql
CREATE TABLE handover_points (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  area_id CHAR(36) NULL,
  building_id CHAR(36) NULL,
  opening_hours VARCHAR(255) NULL,
  contact_info VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_hp_area FOREIGN KEY (area_id) REFERENCES campus_areas(id),
  CONSTRAINT fk_hp_building FOREIGN KEY (building_id) REFERENCES campus_buildings(id),
  CONSTRAINT fk_hp_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE storage_logs (
  id CHAR(36) PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  handover_point_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NOT NULL,
  action ENUM('RECEIVED', 'STORED', 'RETURNED', 'OVERDUE_MARKED') NOT NULL,
  condition_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_storage_logs_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_storage_logs_hp FOREIGN KEY (handover_point_id) REFERENCES handover_points(id),
  CONSTRAINT fk_storage_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  KEY idx_storage_logs_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.6 Bảng cần tạo thêm — Appointments

```sql
CREATE TABLE return_appointments (
  id CHAR(36) PRIMARY KEY,
  claim_id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  proposer_id CHAR(36) NOT NULL,
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'RESCHEDULED') NOT NULL DEFAULT 'PENDING',
  proposed_at DATETIME NOT NULL,
  handover_point_id CHAR(36) NULL,
  custom_location VARCHAR(255) NULL,
  rejection_reason TEXT NULL,
  cancellation_reason TEXT NULL,
  accepted_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_claim FOREIGN KEY (claim_id) REFERENCES claims(id),
  CONSTRAINT fk_appt_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_appt_proposer FOREIGN KEY (proposer_id) REFERENCES users(id),
  CONSTRAINT fk_appt_hp FOREIGN KEY (handover_point_id) REFERENCES handover_points(id),
  KEY idx_appt_claim (claim_id),
  KEY idx_appt_proposed_at (proposed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.7 Bảng cần tạo thêm — Chat

```sql
CREATE TABLE chat_rooms (
  id CHAR(36) PRIMARY KEY,
  claim_id CHAR(36) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_rooms_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_messages (
  id CHAR(36) PRIMARY KEY,
  room_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  content TEXT NULL,
  media_url VARCHAR(500) NULL,
  media_public_id VARCHAR(255) NULL,
  message_type ENUM('TEXT', 'IMAGE', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_room FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  KEY idx_messages_room_created (room_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.8 Bảng cần tạo thêm — Notifications

```sql
CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id CHAR(36) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_notifications_user_read (user_id, is_read),
  KEY idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.9 Bảng cần tạo thêm — Reputation

```sql
CREATE TABLE reputation_scores (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  total_points INT NOT NULL DEFAULT 0,
  level ENUM('NEW', 'TRUSTED', 'RELIABLE', 'EXCELLENT') NOT NULL DEFAULT 'NEW',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reputation_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reputation_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  delta INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rep_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_rep_logs_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.10 Bảng cần tạo thêm — Reports & Moderation

```sql
CREATE TABLE reports (
  id CHAR(36) PRIMARY KEY,
  reporter_id CHAR(36) NOT NULL,
  entity_type ENUM('POST', 'USER', 'CLAIM') NOT NULL,
  entity_id CHAR(36) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  details TEXT NULL,
  status ENUM('PENDING', 'REVIEWED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  KEY idx_reports_status (status),
  KEY idx_reports_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE moderation_actions (
  id CHAR(36) PRIMARY KEY,
  admin_id CHAR(36) NOT NULL,
  report_id CHAR(36) NULL,
  action_type ENUM('WARN_USER', 'HIDE_POST', 'DELETE_POST', 'BAN_USER', 'UNBAN_USER') NOT NULL,
  target_type ENUM('USER', 'POST') NOT NULL,
  target_id CHAR(36) NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mod_admin FOREIGN KEY (admin_id) REFERENCES users(id),
  CONSTRAINT fk_mod_report FOREIGN KEY (report_id) REFERENCES reports(id),
  KEY idx_mod_actions_admin (admin_id),
  KEY idx_mod_actions_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.11 Bảng cần tạo thêm — Admin Configuration

```sql
CREATE TABLE config_entries (
  id CHAR(36) PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  value_type ENUM('STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'JSON') NOT NULL DEFAULT 'STRING',
  description VARCHAR(255) NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by CHAR(36) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_config_key (config_key),
  CONSTRAINT fk_config_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE config_history (
  id CHAR(36) PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NOT NULL,
  changed_by CHAR(36) NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_config_hist_user FOREIGN KEY (changed_by) REFERENCES users(id),
  KEY idx_config_hist_key_time (config_key, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Seed config mặc định:
```sql
INSERT INTO config_entries (id, config_key, config_value, value_type, description, is_public) VALUES
  (UUID(), 'post.expiration_days',      '30',         'INTEGER', 'Số ngày trước khi bài đăng hết hạn',                TRUE),
  (UUID(), 'post.max_per_user_per_day', '5',          'INTEGER', 'Số bài đăng tối đa mỗi user mỗi ngày',              TRUE),
  (UUID(), 'post.max_images',           '5',          'INTEGER', 'Số ảnh tối đa mỗi bài',                             TRUE),
  (UUID(), 'post.max_image_size_mb',    '10',         'INTEGER', 'Dung lượng ảnh tối đa (MB)',                        TRUE),
  (UUID(), 'post.allowed_image_formats','jpg,png,webp','STRING',  'Định dạng ảnh cho phép (CSV)',                      TRUE),
  (UUID(), 'matching.threshold',        '0.4',        'FLOAT',  'Ngưỡng điểm matching để hiển thị gợi ý',            TRUE),
  (UUID(), 'matching.weight_text',      '0.4',        'FLOAT',  'Trọng số text similarity',                          FALSE),
  (UUID(), 'matching.weight_category',  '0.3',        'FLOAT',  'Trọng số category match',                           FALSE),
  (UUID(), 'matching.weight_location',  '0.2',        'FLOAT',  'Trọng số location match',                           FALSE),
  (UUID(), 'matching.weight_time',      '0.1',        'FLOAT',  'Trọng số time proximity',                           FALSE),
  (UUID(), 'email.policy',             'any',        'STRING',  'Chính sách email: any | fpt | custom_domains',       TRUE);
```

---

## 6. API Routes — Node.js (`apps/api-node`)

Implement các route sau. Mỗi route cần: controller, service, repository, validator, và error handler.

### Auth

| Method | Path | Auth | UC |
|---|---|---|---|
| POST | `/api/auth/register` | Public | UC-001, UC-003 |
| POST | `/api/auth/verify-otp` | Public | UC-004 |
| POST | `/api/auth/login` | Public | UC-005 |
| GET  | `/api/auth/google` | Public | UC-006 |
| GET  | `/api/auth/google/callback` | Public | UC-006 |
| POST | `/api/auth/logout` | Bearer | UC-007 |
| POST | `/api/auth/refresh` | Bearer (refresh) | UC-008 |
| GET  | `/api/auth/me` | Bearer | UC-011 |
| PUT  | `/api/auth/profile` | Bearer | UC-012 |
| POST | `/api/auth/avatar` | Bearer | UC-013 |
| GET  | `/api/auth/activity` | Bearer | UC-014 |
| GET  | `/api/auth/reputation` | Bearer | UC-015 |

### Posts

| Method | Path | Auth | UC |
|---|---|---|---|
| POST | `/api/posts` | Bearer | UC-016, UC-017 |
| GET  | `/api/posts` | Public | UC-027, UC-028, UC-057 |
| GET  | `/api/posts/my` | Bearer | UC-026 |
| GET  | `/api/posts/:id` | Public | UC-025 |
| PUT  | `/api/posts/:id` | Bearer | UC-022 |
| PATCH| `/api/posts/:id/status` | Bearer | UC-023, UC-029 |
| DELETE | `/api/posts/:id` | Bearer/Admin | UC-024 |
| POST | `/api/posts/:id/media` | Bearer | UC-035–UC-042 |
| DELETE | `/api/posts/:id/media/:mediaId` | Bearer | UC-045 |

### Search

| Method | Path | Auth | UC |
|---|---|---|---|
| GET | `/api/search` | Public | UC-048–UC-056 |
| GET | `/api/posts/:id/matches` | Bearer | UC-079 |

### Claims

| Method | Path | Auth | UC |
|---|---|---|---|
| POST | `/api/claims` | Bearer | UC-083–UC-088 |
| GET  | `/api/claims/:id` | Bearer | UC-091 |
| GET  | `/api/posts/:id/claims` | Bearer | UC-091 |
| POST | `/api/claims/:id/evidence` | Bearer | UC-038, UC-087, UC-088 |

### Config (public)

| Method | Path | Auth | UC |
|---|---|---|---|
| GET | `/api/config/public` | Public | UC-172 |

### Handover Points

| Method | Path | Auth | UC |
|---|---|---|---|
| GET | `/api/handover-points` | Public | UC-101 |
| GET | `/api/handover-points/:id` | Public | UC-105 |

### Locations & Categories

| Method | Path | Auth | UC |
|---|---|---|---|
| GET | `/api/locations/areas` | Public | - |
| GET | `/api/locations/areas/:id/buildings` | Public | - |
| GET | `/api/categories` | Public | - |

### Swagger

- Endpoint: `GET /api/docs`
- Tự động generate từ JSDoc / OpenAPI decorators.

---

## 7. Java Admin Service Routes (`apps/java-admin-service`)

Expose các REST API sau. Tất cả đều yêu cầu `ADMIN` hoặc `STAFF` role, xác thực qua JWT (verify bằng JWT_ACCESS_SECRET dùng chung với Node API).

### Claim Business

| Method | Path | Role | UC |
|---|---|---|---|
| POST | `/admin/claims/:id/request-info` | STAFF/ADMIN | UC-092 |
| POST | `/admin/claims/:id/accept` | STAFF/ADMIN | UC-093 |
| POST | `/admin/claims/:id/reject` | STAFF/ADMIN | UC-094 |
| POST | `/admin/claims/:id/cancel` | USER (own) | UC-095 |

### Handover Management

| Method | Path | Role | UC |
|---|---|---|---|
| POST | `/admin/handover-points` | ADMIN | UC-098 |
| PUT  | `/admin/handover-points/:id` | ADMIN | UC-099 |
| PATCH | `/admin/handover-points/:id/toggle` | ADMIN | UC-100 |
| POST | `/admin/handover-points/:id/receive` | STAFF | UC-103 |
| POST | `/admin/handover-points/:id/store` | STAFF | UC-104 |
| POST | `/admin/handover-points/:id/return` | STAFF | UC-108 |
| GET  | `/admin/handover-points/stored-items` | STAFF/ADMIN | UC-110 |

### Appointments

| Method | Path | Role | UC |
|---|---|---|---|
| POST | `/admin/appointments` | USER | UC-112 |
| POST | `/admin/appointments/:id/accept` | USER | UC-117 |
| POST | `/admin/appointments/:id/reject` | USER | UC-118 |
| POST | `/admin/appointments/:id/reschedule` | USER | UC-119 |
| POST | `/admin/appointments/:id/cancel` | USER | UC-120 |
| POST | `/admin/appointments/:id/complete` | STAFF/ADMIN | UC-122 |

### Admin Moderation

| Method | Path | Role | UC |
|---|---|---|---|
| GET  | `/admin/users` | ADMIN | UC-144 |
| PATCH | `/admin/users/:id/lock` | ADMIN | UC-145 |
| GET  | `/admin/posts` | ADMIN | UC-146 |
| PATCH | `/admin/posts/:id/hide` | ADMIN | UC-147 |
| GET  | `/admin/reports` | ADMIN | UC-149 |
| POST | `/admin/reports/:id/handle` | ADMIN | UC-150 |

### Dashboard & Stats

| Method | Path | Role | UC |
|---|---|---|---|
| GET | `/admin/dashboard/overview` | ADMIN | UC-151 |
| GET | `/admin/dashboard/posts-by-period` | ADMIN | UC-152 |
| GET | `/admin/dashboard/return-rate` | ADMIN | UC-153 |
| GET | `/admin/dashboard/top-categories` | ADMIN | UC-154 |
| GET | `/admin/dashboard/lost-heatmap` | ADMIN | UC-155 |
| GET | `/admin/dashboard/top-users` | ADMIN | UC-156 |
| GET | `/admin/dashboard/export` | ADMIN | UC-157 |

### Configuration

| Method | Path | Role | UC |
|---|---|---|---|
| GET  | `/admin/config` | ADMIN | - |
| PUT  | `/admin/config/:key` | ADMIN | UC-158–UC-169 |
| GET  | `/admin/config/history` | ADMIN | UC-170 |
| POST | `/admin/config/:key/rollback` | ADMIN | UC-171 |
| GET  | `/admin/categories` | ADMIN | UC-164 |
| POST | `/admin/categories` | ADMIN | UC-164 |
| PUT  | `/admin/categories/:id` | ADMIN | UC-164 |
| DELETE | `/admin/categories/:id` | ADMIN | UC-164 |
| GET  | `/admin/locations` | ADMIN | UC-165 |
| POST | `/admin/locations/areas` | ADMIN | UC-165 |
| POST | `/admin/locations/buildings` | ADMIN | UC-165 |

### Reputation

| Method | Path | Role | UC |
|---|---|---|---|
| POST | `/admin/reputation/add` | Internal/System | UC-136, UC-137 |
| POST | `/admin/reputation/subtract` | Internal/System | UC-138, UC-139 |

---

## 8. Socket.IO Events (`apps/api-node` hoặc service riêng)

```
Server → Client:
  notification:new          { notification }
  claim:status_changed      { claimId, status, message }
  match:new                 { postId, matchedPostId, score }
  chat:message              { roomId, message }
  chat:seen                 { roomId, userId, messageId }
  appointment:updated       { appointmentId, status }

Client → Server:
  chat:join                 { roomId }
  chat:send                 { roomId, content, type }
  chat:seen                 { roomId, messageId }
  notification:mark_read    { notificationId }
```

Authenticate Socket.IO connection bằng JWT trong handshake query hoặc `auth` object.

---

## 9. AI / Matching Service (`apps/api-node` hoặc worker riêng)

### 9.1 Google Vision Pipeline

> ⚠️ Cần `GOOGLE_VISION_API_KEY` hoặc `GOOGLE_APPLICATION_CREDENTIALS`.  
> Nếu chưa có, để hàm trả về `{ tags: [], ocr_text: '' }` và tiếp tục.

Flow khi upload ảnh cho post:
1. Upload lên Cloudinary → nhận `secure_url`.
2. Gửi `secure_url` đến Google Vision API (LABEL_DETECTION + OCR_TEXT + OBJECT_LOCALIZATION).
3. Lưu kết quả vào bảng `ai_tags`.
4. Gợi ý category dựa trên label → trả về frontend để user confirm.

### 9.2 Matching Engine

Flow khi tạo/cập nhật post:
1. Lấy tất cả bài đăng loại ngược lại (LOST↔FOUND) còn `OPEN`.
2. Tính `text_score` bằng TF-IDF + Cosine Similarity trên `title_normalized + description_normalized`.
3. Tính `category_score`: 1.0 nếu cùng category, 0.5 nếu cùng parent, 0 nếu khác.
4. Tính `location_score`: 1.0 cùng room, 0.7 cùng building, 0.4 cùng area, 0 khác.
5. Tính `time_score`: 1.0 nếu trong 24h, giảm dần theo công thức `1/(1 + days_diff/7)`.
6. `total_score = w_text*text + w_cat*cat + w_loc*loc + w_time*time` (weights từ `config_entries`).
7. Nếu `total_score >= matching.threshold` → upsert `match_results` → emit `match:new` qua Socket.IO nếu chưa notify.

---

## 10. Quy tắc thực hiện (bắt buộc tuân theo)

### 10.1 Sau mỗi UC hoàn thành

Mở file `docs/dev-owned-usecase-checklist.md`, tìm đúng dòng UC đó của đúng dev-owner, đổi `[ ]` thành `[x]`. Ví dụ:

```markdown
-- TRƯỚC
| [ ] | UC-001 | Register account with normal email, password, name and profile data |

-- SAU
| [x] | UC-001 | Register account with normal email, password, name and profile data |
```

Không đánh dấu `[x]` nếu task chưa được implement thực sự (không tính placeholder, stub, TODO).

### 10.2 Nếu cần API key

```
1. Thêm biến vào .env.example với comment giải thích cần tạo ở đâu
2. Wrap logic đó trong try-catch / if-guard
3. Khi key chưa có: log warning và trả về fallback response — KHÔNG crash server
4. Tiếp tục implement các UC khác không phụ thuộc key đó
```

### 10.3 Thứ tự ưu tiên implement

```
Sprint 1: DB schema, migration files, .env.example, monorepo setup
Sprint 2: Auth API (UC-001 đến UC-015), Web Auth pages
Sprint 3: Post API (UC-016 đến UC-032), Upload API, Web Post pages
Sprint 4: Search (UC-048–UC-056), Matching Engine, AI Tags
Sprint 5: Claims (UC-083–UC-095), Java Claim business
Sprint 6: Handover + Appointment (UC-098–UC-123)
Sprint 7: Chat + Socket.IO (UC-124–UC-134)
Sprint 8: Reputation, Reports, Admin Dashboard, Config
Sprint 9: Mobile screens (AK tasks)
Sprint 10: Testing, Swagger docs, Docker, deploy
```

### 10.4 Code quality

- Tất cả TypeScript file phải có `strict: true`.
- Tất cả API response phải theo cấu trúc: `{ success: boolean, data?: any, error?: string, message?: string }`.
- Tất cả UUID dùng `crypto.randomUUID()` hoặc `uuid` package, không tự generate.
- Tất cả error phải được catch và trả về HTTP status code đúng (400/401/403/404/409/422/500).
- Không commit file `.env` thật, chỉ commit `.env.example`.
- Mỗi endpoint Node.js và Java phải có Swagger annotation.

### 10.5 Database conventions (từ `db-auth-design.md`)

- Primary key: `CHAR(36)` UUID string.
- Timestamps: UTC, `DATETIME`.
- Soft delete: `deleted_at IS NULL` là active.
- Password: chỉ store bcrypt hash.
- Refresh token: chỉ store hash, không store raw.
- OTP: chỉ store hash.

---

## 11. Checklist tự kiểm tra trước khi commit

```
[ ] Migration file tạo đủ tất cả bảng mới
[ ] .env.example có đủ biến, không có giá trị thật
[ ] UC trong dev-owned-usecase-checklist.md đã được tick [x]
[ ] API trả đúng cấu trúc { success, data, error }
[ ] Swagger annotation đầy đủ cho endpoint mới
[ ] Không có console.log debug trong production code
[ ] TypeScript không có `any` trừ khi có comment lý do
[ ] Foreign key constraints đúng, không thiếu index
[ ] Socket.IO events đúng tên theo section 8
[ ] Google Vision và Cloudinary có guard khi chưa có key
```

---

## 12. File cần cập nhật sau mỗi lần làm việc

| File | Cập nhật khi nào |
|---|---|
| `docs/dev-owned-usecase-checklist.md` | Sau mỗi UC hoàn thành |
| `.env.example` | Khi phát hiện cần thêm biến môi trường mới |
| `docs/architecture.md` | Khi thêm route mới, module mới, hoặc thay đổi kiến trúc |
| `apps/api-node/swagger.yaml` (hoặc inline JSDoc) | Khi thêm/sửa endpoint |
| `apps/java-admin-service/src/main/resources/openapi.yaml` | Khi thêm/sửa Java endpoint |

---

*Prompt này được tạo dựa trên: `lost-found-system-overview.md`, `dev-owned-usecase-checklist.md`, `db-auth-design.md`, `architecture.md`.*  
*Cập nhật lần cuối: 05/06/2026*
