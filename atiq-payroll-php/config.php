<?php
/**
 * PayNest Pro - Master Configuration
 * All environment settings in one place.
 * In production, move credentials to environment variables (.env).
 */

// ── Database ──────────────────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_USER', 'root');          // Change in production
define('DB_PASS', '');              // Change in production
define('DB_NAME', 'paynest_pro');
define('DB_CHARSET', 'utf8mb4');

// ── Application ───────────────────────────────────────────────────────────────
define('APP_NAME', 'PayNest Pro');
define('APP_URL',  'http://localhost:8080');  // Adjust to your PHP server port
define('APP_ROOT', __DIR__);

// ── Session Security ──────────────────────────────────────────────────────────
define('SESSION_LIFETIME',   900);   // 15 minutes inactivity auto-logout (seconds)
define('SESSION_NAME',       'PAYNEST_SESS');
define('SESSION_SECURE',     false); // Set TRUE when using HTTPS in production
define('SESSION_HTTP_ONLY',  true);
define('SESSION_SAME_SITE',  'Strict');

// ── Brute-Force / Login Lockout ───────────────────────────────────────────────
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_DURATION',   600);  // 10 minutes (seconds)

// ── OTP / 2FA ─────────────────────────────────────────────────────────────────
define('OTP_EXPIRY_SECONDS', 300);   // 5 minutes
define('OTP_LENGTH',         6);
define('OTP_ENABLED',        false); // Set TRUE to require email OTP after login
                                     // (requires SMTP config below)

// ── SMTP (for OTP emails) ─────────────────────────────────────────────────────
define('SMTP_HOST',     'smtp.gmail.com');
define('SMTP_PORT',     587);
define('SMTP_USER',     'your@gmail.com');   // Change in production
define('SMTP_PASS',     'your_app_password');
define('SMTP_FROM',     'noreply@paynest.pro');
define('SMTP_FROM_NAME', APP_NAME);

// ── Password Policy ───────────────────────────────────────────────────────────
define('PASS_MIN_LENGTH', 8);
define('PASS_REQUIRE_UPPER',   true);
define('PASS_REQUIRE_NUMBER',  true);
define('PASS_REQUIRE_SPECIAL', true);

// ── CSRF ──────────────────────────────────────────────────────────────────────
define('CSRF_TOKEN_LENGTH', 32);
