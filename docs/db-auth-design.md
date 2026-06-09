# Authentication Database Design

## Scope

This document marks the database design for the registration and login module as completed.

Covered use cases:

| UC | Coverage |
| --- | --- |
| UC-001 Register with email | Completed at database design level |
| UC-002 Validate allowed email domain | Not applied after requirement update |
| UC-003 Send email OTP | Completed at database design level |
| UC-004 Verify email OTP | Completed at database design level |
| UC-005 Login with email and password | Completed at database design level |
| UC-006 Login with Google email | Completed at database design level |
| UC-007 Logout | Completed at database design level |
| UC-008 Refresh access token | Completed at database design level |
| UC-009 Store bcrypt password hash | Completed at database design level |
| UC-010 User/Admin/Staff role authorization | Completed at database design level |
| UC-011 View profile | Supported by `users` profile fields |
| UC-012 Update profile | Supported by `users` profile fields |
| UC-013 Upload avatar | Supported by `avatar_url` and `avatar_public_id` |
| UC-014 Activity history | Supported by `user_activity_logs` |

Not covered here: API implementation, UI implementation, email provider integration, JWT signing code, Google OAuth callback code.

## Entity Overview

| Table | Purpose |
| --- | --- |
| `users` | Account, password hash, profile, account status |
| `roles` | System roles such as USER, STAFF, ADMIN |
| `user_roles` | Many-to-many user role assignment |
| `email_verification_otps` | OTP lifecycle for email verification |
| `oauth_accounts` | External login mapping, mainly Google |
| `refresh_tokens` | Refresh-token session storage and revocation |
| `login_audit_logs` | Login/logout/security audit trail |
| `user_activity_logs` | User-facing activity history |

## Conventions

- Database engine: MySQL 8.
- Charset: `utf8mb4`.
- Primary key: `CHAR(36)` UUID string for readability in the thesis/demo phase.
- Password storage: only store bcrypt hash in `users.password_hash`; never store raw password.
- Refresh token storage: only store token hash in `refresh_tokens.token_hash`; never store raw refresh token.
- OTP storage: store `otp_hash`, not raw OTP.
- Email policy: do not require FPT, EDU, FE, or any school domain suffix. K19 onward can register with the email they currently use.
- Soft delete: `deleted_at IS NULL` means active record.
- Timestamps use UTC at application level.

## Status Enums

```text
users.status:
  PENDING_EMAIL_VERIFICATION
  ACTIVE
  LOCKED
  DISABLED

email_verification_otps.purpose:
  REGISTER
  LOGIN
  CHANGE_EMAIL

email_verification_otps.status:
  PENDING
  VERIFIED
  EXPIRED
  CANCELLED

refresh_tokens.revoked_reason:
  LOGOUT
  ROTATED
  ADMIN_LOCK
  SECURITY_RISK
```

## MySQL DDL

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  normalized_email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL,
  full_name VARCHAR(160) NOT NULL,
  student_code VARCHAR(40) NULL,
  phone_number VARCHAR(30) NULL,
  avatar_url VARCHAR(500) NULL,
  avatar_public_id VARCHAR(255) NULL,
  status ENUM('PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'LOCKED', 'DISABLED') NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  locked_until DATETIME NULL,
  failed_login_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_users_normalized_email (normalized_email),
  KEY idx_users_status (status),
  KEY idx_users_student_code (student_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  assigned_by CHAR(36) NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_verification_otps (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  email VARCHAR(255) NOT NULL,
  normalized_email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose ENUM('REGISTER', 'LOGIN', 'CHANGE_EMAIL') NOT NULL DEFAULT 'REGISTER',
  status ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_otps_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_email_otps_normalized_email_status (normalized_email, status),
  KEY idx_email_otps_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE oauth_accounts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255) NOT NULL,
  linked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  CONSTRAINT fk_oauth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_oauth_provider_user (provider, provider_user_id),
  KEY idx_oauth_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  user_agent VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoked_reason ENUM('LOGOUT', 'ROTATED', 'ADMIN_LOCK', 'SECURITY_RISK') NULL,
  replaced_by_token_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_refresh_tokens_replaced_by FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens(id),
  UNIQUE KEY uq_refresh_tokens_token_hash (token_hash),
  KEY idx_refresh_tokens_user_active (user_id, revoked_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_audit_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  normalized_email VARCHAR(255) NULL,
  event_type VARCHAR(60) NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_login_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_login_audit_user_created (user_id, created_at),
  KEY idx_login_audit_email_created (normalized_email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_activity_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id CHAR(36) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_activity_logs_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Seed Data

```sql
INSERT INTO roles (id, code, name, description)
VALUES
  (UUID(), 'USER', 'User', 'Default student/user role'),
  (UUID(), 'STAFF', 'Staff', 'Campus staff role'),
  (UUID(), 'ADMIN', 'Admin', 'System administrator role');
```

## Main Flows

### Registration With Email

1. Normalize email to lowercase and trim spaces.
2. Validate email syntax only; do not enforce school domain suffix.
3. Create `users` row with `PENDING_EMAIL_VERIFICATION`.
4. Store bcrypt hash in `users.password_hash`.
5. Create OTP row in `email_verification_otps`.
6. After OTP is verified, set `users.email_verified_at`, `users.status = ACTIVE`.
7. Assign default `USER` role through `user_roles`.

### Login

1. Find user by `users.normalized_email`.
2. Check `status = ACTIVE` and `deleted_at IS NULL`.
3. Compare password with `password_hash`.
4. Create `login_audit_logs` row.
5. Create `refresh_tokens` row using token hash.
6. Update `users.last_login_at`.

### Refresh Token

1. Hash incoming refresh token.
2. Find non-revoked, non-expired `refresh_tokens` row.
3. Rotate refresh token by revoking old row with `ROTATED`.
4. Create replacement token and set `replaced_by_token_id`.

### Logout

1. Hash incoming refresh token.
2. Set `refresh_tokens.revoked_at = NOW()`.
3. Set `refresh_tokens.revoked_reason = LOGOUT`.
4. Add `login_audit_logs` event.

## Implementation Notes

- DEV 3 owns Node.js API implementation for this DB design.
- DEV 5 can reuse `users`, `roles`, and `user_roles` for Spring Security role validation in Java Admin Service.
- API should expose Swagger/OpenAPI after implementation.
- Later modules should reference `users.id` as creator/owner/staff/admin foreign key.
