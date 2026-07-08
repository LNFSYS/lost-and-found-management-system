ALTER TABLE match_results
  ADD COLUMN image_score FLOAT NOT NULL DEFAULT 0 AFTER time_score,
  ADD COLUMN ocr_score FLOAT NOT NULL DEFAULT 0 AFTER image_score,
  ADD COLUMN score_tier ENUM('WEAK', 'SUGGESTION', 'NOTIFY', 'HIGH_CONFIDENCE') NOT NULL DEFAULT 'WEAK' AFTER ocr_score,
  ADD COLUMN matcher_version VARCHAR(40) NOT NULL DEFAULT 'rule-v1' AFTER score_tier,
  ADD COLUMN explanation_json JSON NULL AFTER matcher_version;

CREATE TABLE match_feedback (
  id CHAR(36) PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  label ENUM('TRUE_MATCH', 'FALSE_MATCH', 'UNCERTAIN', 'DUPLICATE', 'INSUFFICIENT_EVIDENCE') NOT NULL,
  note VARCHAR(500) NULL,
  source ENUM('USER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'USER',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_feedback_match FOREIGN KEY (match_id) REFERENCES match_results(id),
  CONSTRAINT fk_match_feedback_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_match_feedback_user (match_id, user_id),
  KEY idx_match_feedback_label_created (label, created_at),
  KEY idx_match_feedback_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE match_suggestion_impressions (
  id CHAR(36) PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  source_post_id CHAR(36) NOT NULL,
  suggested_post_id CHAR(36) NOT NULL,
  surface ENUM('CREATE_POST', 'SUGGESTION_LIST', 'DETAIL', 'NOTIFICATION', 'ADMIN') NOT NULL,
  action ENUM('SHOWN', 'CLICKED', 'DISMISSED', 'CLAIM_STARTED') NOT NULL DEFAULT 'SHOWN',
  score_snapshot FLOAT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_impression_match FOREIGN KEY (match_id) REFERENCES match_results(id),
  CONSTRAINT fk_match_impression_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_match_impression_source_post FOREIGN KEY (source_post_id) REFERENCES posts(id),
  CONSTRAINT fk_match_impression_suggested_post FOREIGN KEY (suggested_post_id) REFERENCES posts(id),
  KEY idx_match_impression_match_created (match_id, created_at),
  KEY idx_match_impression_user_created (user_id, created_at),
  KEY idx_match_impression_action_created (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
