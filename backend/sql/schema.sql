CREATE DATABASE IF NOT EXISTS tradelens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tradelens;

CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(36) PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name         VARCHAR(120) NOT NULL,
  role         ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plans (
  id            VARCHAR(40) PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  tag           VARCHAR(200) NOT NULL,
  popular       TINYINT(1) DEFAULT 0,
  options_json  TEXT NOT NULL,
  features_json TEXT NOT NULL,
  sort_order    INT DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS demo_plan (
  id        VARCHAR(20) PRIMARY KEY,
  data_json TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS package_requests (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  user_email    VARCHAR(255) NOT NULL,
  user_name     VARCHAR(120) NOT NULL,
  plan_id       VARCHAR(40) NOT NULL,
  plan_name     VARCHAR(80) NOT NULL,
  period        VARCHAR(60) NOT NULL,
  price_usd     DECIMAL(10,2) NOT NULL,
  option_index  INT DEFAULT NULL,
  is_demo       TINYINT(1) DEFAULT 0,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reject_reason TEXT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decided_at    TIMESTAMP NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS licenses (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  request_id      VARCHAR(36) NULL,
  plan_id         VARCHAR(40) NOT NULL,
  plan_name       VARCHAR(80) NOT NULL,
  period          VARCHAR(60) NOT NULL,
  license_key     VARCHAR(60) NOT NULL,
  api_key         VARCHAR(80) NOT NULL,
  status          ENUM('active','expired','revoked') NOT NULL DEFAULT 'active',
  issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP NOT NULL,
  backtests_used  INT DEFAULT 0,
  backtests_limit INT DEFAULT 0,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS backtests (
  id                VARCHAR(36) PRIMARY KEY,
  user_id           VARCHAR(36) NOT NULL,
  license_id        VARCHAR(36) NOT NULL,
  strategy          VARCHAR(120),
  market            VARCHAR(120),
  sharpe            DECIMAL(10,3),
  max_drawdown      DECIMAL(10,3),
  trades            INT,
  net_pnl           DECIMAL(18,2),
  duration_ms       INT,
  equity_curve_json TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;
