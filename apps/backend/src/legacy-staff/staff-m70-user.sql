-- Apply once to the SOURCE_DB_* MariaDB. Never run against the HR PostgreSQL DB.
-- staff.id uses utf8_bin in the legacy schema; the child column must match.
CREATE TABLE IF NOT EXISTS staff_m70_user (
  machine_id INT UNSIGNED NOT NULL PRIMARY KEY,
  device_name VARCHAR(64) NULL,
  staff_id VARCHAR(10) CHARACTER SET utf8 COLLATE utf8_bin NULL,
  record_name VARCHAR(64) NULL,
  device_serial VARCHAR(64) NULL,
  present_on_device TINYINT(1) NOT NULL DEFAULT 1,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_m70_user_staff_id (staff_id),
  CONSTRAINT fk_staff_m70_user_staff FOREIGN KEY (staff_id)
    REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
