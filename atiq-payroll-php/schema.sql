-- ============================================================
-- PayNest Pro - Secure Database Schema
-- Run this ONCE to set up all required tables.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `paynest_pro`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `paynest_pro`;

-- ────────────────────────────────────────────────────────────
-- 1. ADMINS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admins` (
    `id`               INT          UNSIGNED NOT NULL AUTO_INCREMENT,
    `email`            VARCHAR(180)          NOT NULL UNIQUE,
    `password`         VARCHAR(255)          NOT NULL,           -- bcrypt hash
    `role`             ENUM('admin','super_admin') NOT NULL DEFAULT 'admin',
    `name`             VARCHAR(100)          NOT NULL DEFAULT '',
    `session_token`    VARCHAR(64)           DEFAULT NULL,       -- single-device lock
    `otp_code`         VARCHAR(10)           DEFAULT NULL,       -- 2FA OTP
    `otp_expires_at`   DATETIME              DEFAULT NULL,
    `login_attempts`   TINYINT      UNSIGNED NOT NULL DEFAULT 0,
    `locked_until`     DATETIME              DEFAULT NULL,
    `last_login_at`    DATETIME              DEFAULT NULL,
    `last_login_ip`    VARCHAR(45)           DEFAULT NULL,
    `created_at`       DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_email` (`email`),
    INDEX `idx_session_token` (`session_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 2. AUDIT LOGS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admin_logs` (
    `id`         BIGINT   UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id`   INT      UNSIGNED NOT NULL,
    `action`     VARCHAR(120)      NOT NULL,  -- e.g. 'login', 'pay_salary', 'delete_staff'
    `detail`     TEXT              DEFAULT NULL,
    `ip_address` VARCHAR(45)       NOT NULL,
    `user_agent` VARCHAR(255)      DEFAULT NULL,
    `created_at` DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_admin_id`  (`admin_id`),
    INDEX `idx_created_at`(`created_at`),
    CONSTRAINT `fk_log_admin`
        FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 3. STAFF TABLE (existing-compatible)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `staff` (
    `id`             INT      UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id`    VARCHAR(30)       DEFAULT NULL UNIQUE,
    `name`           VARCHAR(120)      NOT NULL,
    `role`           VARCHAR(80)       DEFAULT NULL,
    `department`     VARCHAR(100)      NOT NULL,
    `section`        VARCHAR(100)      DEFAULT NULL,
    `level`          VARCHAR(50)       DEFAULT NULL,
    `qualification`  VARCHAR(50)       DEFAULT NULL,
    `joining_date`   DATE              DEFAULT NULL,
    `status`         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    `month`          VARCHAR(10)       DEFAULT NULL,
    `working_days`   TINYINT  UNSIGNED NOT NULL DEFAULT 30,
    `basic`          DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `hra`            DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `da`             DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `allowance`      DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `pf`             DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `tax`            DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `cl_taken`       TINYINT  UNSIGNED NOT NULL DEFAULT 0,
    `medical_taken`  TINYINT  UNSIGNED NOT NULL DEFAULT 0,
    `personal_leave` TINYINT  UNSIGNED NOT NULL DEFAULT 0,
    `deduction`      DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `gross`          DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `net`            DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `final_salary`   DECIMAL(12,2)     NOT NULL DEFAULT 0,
    `payment_status` ENUM('pending','paid') NOT NULL DEFAULT 'pending',
    `paid_date`      DATE              DEFAULT NULL,
    `paid_time`      TIME              DEFAULT NULL,
    `created_at`     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_department`(`department`),
    INDEX `idx_payment_status`(`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 4. DEFAULT SUPER ADMIN
-- Password = Admin@1234  (change immediately after first login)
-- bcrypt hash of 'Admin@1234'
-- ────────────────────────────────────────────────────────────
INSERT IGNORE INTO `admins` (`email`, `password`, `role`, `name`) VALUES (
    'admin@paynest.pro',
    '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uslmef9Oe', -- Admin@1234 (bcrypt cost 12)
    'super_admin',
    'System Administrator'
);
