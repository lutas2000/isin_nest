-- Apply once to SOURCE_DB_* before deploying incremental attendance imports.
-- Preserve every raw punch before advancing the device cursor, including unlinked users.
CREATE TABLE IF NOT EXISTS staff_m70_log (
  id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  device_number INT UNSIGNED NOT NULL,
  machine_id BIGINT UNSIGNED NOT NULL,
  create_time DATETIME NOT NULL,
  verify_mode INT UNSIGNED NULL,
  raw BINARY(12) NOT NULL,
  state ENUM('pending', 'imported', 'departed') NOT NULL DEFAULT 'pending',
  record_id VARCHAR(128) NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  INDEX idx_staff_m70_log_pending (state, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
