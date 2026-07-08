ALTER TABLE post_media
  ADD COLUMN thumbnail_url VARCHAR(500) NULL AFTER secure_url,
  ADD COLUMN optimized_url VARCHAR(500) NULL AFTER thumbnail_url;

CREATE INDEX idx_post_media_kind_sort
  ON post_media (post_id, media_kind, sort_order, created_at);
