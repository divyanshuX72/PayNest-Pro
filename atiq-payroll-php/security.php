<?php
/**
 * PayNest Pro - Core Security Library
 * Include this on every protected page.
 *
 * Provides:
 *  - Session bootstrapping
 *  - Auth guard (requireAuth)
 *  - CSRF generation & validation
 *  - Audit logging
 *  - Input helpers
 *  - Password policy validation
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// ── 1. Harden session settings BEFORE session_start() ─────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => 0,                    // Browser session cookie
        'path'     => '/',
        'domain'   => '',
        'secure'   => SESSION_SECURE,
        'httponly' => SESSION_HTTP_ONLY,
        'samesite' => SESSION_SAME_SITE,
    ]);
    session_start();
    session_regenerate_id(true);            // Prevent session fixation
}

// ── 2. Inactivity Timeout ──────────────────────────────────────────────────────
function checkSessionTimeout(): void {
    if (isset($_SESSION['admin_id'])) {
        $idle = time() - ($_SESSION['last_activity'] ?? 0);
        if ($idle > SESSION_LIFETIME) {
            AuditLog::write($_SESSION['admin_id'], 'auto_logout', 'Session expired after inactivity');
            Session::destroy();
            redirect('/auth/login.php?reason=timeout');
        }
    }
    $_SESSION['last_activity'] = time();
}

// ── 3. Auth Guard ──────────────────────────────────────────────────────────────
function requireAuth(string $requiredRole = 'admin'): array {
    checkSessionTimeout();

    if (empty($_SESSION['admin_id']) || empty($_SESSION['admin_role'])) {
        redirect('/auth/login.php?reason=unauthorized');
    }

    // 2FA gate: if OTP is enabled and not yet verified, send to OTP page
    if (OTP_ENABLED && empty($_SESSION['otp_verified'])) {
        redirect('/auth/otp.php');
    }

    // Role check
    $allowedRoles = ['admin', 'super_admin'];
    if (!in_array($_SESSION['admin_role'], $allowedRoles, true)) {
        http_response_code(403);
        die('<h2>403 - Access Denied</h2>');
    }

    // Validate session token against DB (single-device check)
    $admin = DB::one(
        'SELECT id, email, role, name, session_token FROM admins WHERE id = ?',
        [$_SESSION['admin_id']]
    );
    if (!$admin || $admin['session_token'] !== ($_SESSION['session_token'] ?? '')) {
        Session::destroy();
        redirect('/auth/login.php?reason=session_conflict');
    }

    return $admin;
}

// ── 4. CSRF Protection ─────────────────────────────────────────────────────────
class CSRF {
    public static function token(): string {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH));
        }
        return $_SESSION['csrf_token'];
    }

    /** Render a hidden input */
    public static function field(): string {
        return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(self::token()) . '">';
    }

    /** Validate - call this at the top of every form handler */
    public static function validate(): void {
        $submitted = $_POST['csrf_token'] ?? '';
        if (!hash_equals(self::token(), $submitted)) {
            http_response_code(403);
            die('<h2>Invalid CSRF token. Please go back and try again.</h2>');
        }
        // Rotate token after successful validation
        unset($_SESSION['csrf_token']);
    }
}

// ── 5. Audit Logging ───────────────────────────────────────────────────────────
class AuditLog {
    public static function write(int $adminId, string $action, string $detail = ''): void {
        try {
            DB::run(
                'INSERT INTO admin_logs (admin_id, action, detail, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?)',
                [
                    $adminId,
                    $action,
                    $detail,
                    self::getIP(),
                    $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                ]
            );
        } catch (Throwable $e) {
            error_log('[AuditLog] ' . $e->getMessage());
        }
    }

    public static function getIP(): string {
        foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','HTTP_CLIENT_IP','REMOTE_ADDR'] as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = trim(explode(',', $_SERVER[$key])[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
            }
        }
        return '0.0.0.0';
    }
}

// ── 6. Session Helpers ─────────────────────────────────────────────────────────
class Session {
    public static function destroy(): void {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(
                session_name(), '', time() - 42000,
                $p['path'], $p['domain'], $p['secure'], $p['httponly']
            );
        }
        session_destroy();
    }

    public static function flash(string $key, string $message): void {
        $_SESSION['flash'][$key] = $message;
    }

    public static function getFlash(string $key): string {
        $msg = $_SESSION['flash'][$key] ?? '';
        unset($_SESSION['flash'][$key]);
        return $msg;
    }
}

// ── 7. Password Policy ─────────────────────────────────────────────────────────
class PasswordPolicy {
    /** Returns array of validation errors, empty = valid */
    public static function validate(string $password): array {
        $errors = [];
        if (strlen($password) < PASS_MIN_LENGTH) {
            $errors[] = 'Minimum ' . PASS_MIN_LENGTH . ' characters required.';
        }
        if (PASS_REQUIRE_UPPER && !preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Must contain at least one uppercase letter.';
        }
        if (PASS_REQUIRE_NUMBER && !preg_match('/[0-9]/', $password)) {
            $errors[] = 'Must contain at least one number.';
        }
        if (PASS_REQUIRE_SPECIAL && !preg_match('/[\W_]/', $password)) {
            $errors[] = 'Must contain at least one special character (e.g. @#$!).';
        }
        return $errors;
    }
}

// ── 8. OTP Mailer (simple, no dependency) ──────────────────────────────────────
class OTP {
    public static function generate(): string {
        return str_pad((string) random_int(0, (int) str_repeat('9', OTP_LENGTH)), OTP_LENGTH, '0', STR_PAD_LEFT);
    }

    public static function send(string $toEmail, string $otp): bool {
        // Basic PHP mail() — replace with PHPMailer/SMTP in production
        $subject = APP_NAME . ' - Your Login OTP';
        $body    = "Your OTP is: {$otp}\n\nValid for " . (OTP_EXPIRY_SECONDS / 60) . " minutes.\nDo not share this code.";
        $headers = "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM . ">\r\nContent-Type: text/plain; charset=UTF-8";
        return mail($toEmail, $subject, $body, $headers);
    }
}

// ── 9. Utility Helpers ─────────────────────────────────────────────────────────
function redirect(string $path): never {
    header('Location: ' . APP_URL . $path);
    exit;
}

function e(mixed $val): string {
    return htmlspecialchars((string) $val, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function sanitize(string $input): string {
    return trim(strip_tags($input));
}

function currentAdminName(): string {
    return e($_SESSION['admin_name'] ?? 'Admin');
}
