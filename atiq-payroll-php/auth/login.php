<?php
/**
 * PayNest Pro - Login Page
 * Features: Email+password, brute-force lockout, CSRF, session fixation prevention.
 */
require_once __DIR__ . '/../security.php';

// Already logged in → dashboard
if (!empty($_SESSION['admin_id'])) {
    redirect('/dashboard.php');
}

$error   = Session::getFlash('error');
$success = Session::getFlash('success');
$reason  = $_GET['reason'] ?? '';

// Human-readable reason messages
$reasonMessages = [
    'timeout'          => '⏱️ You were logged out due to 15 minutes of inactivity.',
    'unauthorized'     => '🔒 Please login to access this page.',
    'session_conflict' => '⚠️ Your session was terminated because the account was logged in elsewhere.',
    'logout'           => '✅ You have been logged out successfully.',
];
if ($reason && empty($error)) {
    $error = $reasonMessages[$reason] ?? '';
}

// ── POST Handler ───────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRF::validate();

    $email    = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';
    $ip       = AuditLog::getIP();

    // Basic input check
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        $error = 'Please enter a valid email and password.';
    } else {
        $admin = DB::one('SELECT * FROM admins WHERE email = ?', [$email]);

        if (!$admin) {
            // Generic message — don't reveal whether email exists
            $error = 'Invalid email or password.';
            // Still sleep to prevent timing attacks
            password_verify('dummy', '$2y$12$invalid.hash.placeholder.to.prevent.timing.attacks');
        } else {
            // ── Lockout check ──────────────────────────────────────────────
            if ($admin['locked_until'] && strtotime($admin['locked_until']) > time()) {
                $remaining = ceil((strtotime($admin['locked_until']) - time()) / 60);
                $error = "Account locked. Try again in {$remaining} minute(s).";
                AuditLog::write($admin['id'], 'login_blocked', "IP: {$ip}");
            } elseif (!password_verify($password, $admin['password'])) {
                // ── Wrong password ─────────────────────────────────────────
                $newAttempts = $admin['login_attempts'] + 1;
                $lockedUntil = null;

                if ($newAttempts >= MAX_LOGIN_ATTEMPTS) {
                    $lockedUntil = date('Y-m-d H:i:s', time() + LOCKOUT_DURATION);
                    $error = 'Too many failed attempts. Account locked for ' . (LOCKOUT_DURATION / 60) . ' minutes.';
                    AuditLog::write($admin['id'], 'account_locked', "After {$newAttempts} attempts. IP: {$ip}");
                } else {
                    $remaining = MAX_LOGIN_ATTEMPTS - $newAttempts;
                    $error = "Invalid email or password. {$remaining} attempt(s) remaining.";
                }

                DB::run(
                    'UPDATE admins SET login_attempts = ?, locked_until = ? WHERE id = ?',
                    [$newAttempts, $lockedUntil, $admin['id']]
                );
            } else {
                // ── Successful authentication ──────────────────────────────
                // Reset lockout
                DB::run(
                    'UPDATE admins SET login_attempts = 0, locked_until = NULL,
                     last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
                    [$ip, $admin['id']]
                );

                // ── Single-device: invalidate any existing session ─────────
                $sessionToken = bin2hex(random_bytes(32));
                DB::run(
                    'UPDATE admins SET session_token = ? WHERE id = ?',
                    [$sessionToken, $admin['id']]
                );

                // ── Build secure session ───────────────────────────────────
                session_regenerate_id(true);
                $_SESSION['admin_id']      = (int) $admin['id'];
                $_SESSION['admin_email']   = $admin['email'];
                $_SESSION['admin_name']    = $admin['name'];
                $_SESSION['admin_role']    = $admin['role'];
                $_SESSION['session_token'] = $sessionToken;
                $_SESSION['last_activity'] = time();

                AuditLog::write($admin['id'], 'login_success', "IP: {$ip}");

                // ── 2FA: if enabled, generate OTP and redirect ─────────────
                if (OTP_ENABLED) {
                    $otp     = OTP::generate();
                    $expires = date('Y-m-d H:i:s', time() + OTP_EXPIRY_SECONDS);
                    DB::run(
                        'UPDATE admins SET otp_code = ?, otp_expires_at = ? WHERE id = ?',
                        [password_hash($otp, PASSWORD_BCRYPT, ['cost' => 10]), $expires, $admin['id']]
                    );
                    OTP::send($admin['email'], $otp);
                    redirect('/auth/otp.php');
                }

                redirect('/dashboard.php');
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login – <?= e(APP_NAME) ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg:       #080d1a;
            --glass:    rgba(255,255,255,.04);
            --border:   rgba(255,255,255,.08);
            --primary:  #3b82f6;
            --danger:   #ef4444;
            --success:  #10b981;
            --warning:  #f59e0b;
            --text:     #e2e8f0;
            --muted:    #64748b;
            --radius:   14px;
        }

        body {
            min-height: 100vh;
            background: var(--bg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', sans-serif;
            color: var(--text);
            background-image:
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,.18), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,.10), transparent);
        }

        .login-wrap {
            width: 100%;
            max-width: 420px;
            padding: 1rem;
        }

        .login-card {
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 2.5rem 2rem;
            backdrop-filter: blur(20px);
            position: relative;
            overflow: hidden;
        }

        .login-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--primary), #8b5cf6, #ec4899);
        }

        .brand {
            text-align: center;
            margin-bottom: 2rem;
        }

        .brand-icon {
            width: 60px; height: 60px;
            background: linear-gradient(135deg, var(--primary), #8b5cf6);
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.6rem;
            margin-bottom: 1rem;
            box-shadow: 0 8px 32px rgba(59,130,246,.3);
        }

        h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: .35rem; }
        .subtitle { font-size: .82rem; color: var(--muted); }

        .alert {
            padding: .75rem 1rem;
            border-radius: 8px;
            font-size: .83rem;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: flex-start;
            gap: .5rem;
            line-height: 1.4;
        }

        .alert-error   { background: rgba(239,68,68,.12);  color: #fca5a5; border: 1px solid rgba(239,68,68,.25); }
        .alert-success { background: rgba(16,185,129,.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,.25); }
        .alert-warn    { background: rgba(245,158,11,.12); color: #fcd34d; border: 1px solid rgba(245,158,11,.25); }

        .form-group { margin-bottom: 1.1rem; }

        label {
            display: block;
            font-size: .78rem;
            font-weight: 600;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: .06em;
            margin-bottom: .4rem;
        }

        input[type="email"],
        input[type="password"] {
            width: 100%;
            background: rgba(255,255,255,.04);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: .7rem 1rem;
            color: var(--text);
            font-size: .9rem;
            font-family: inherit;
            outline: none;
            transition: border-color .2s, box-shadow .2s;
        }

        input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59,130,246,.15);
        }

        .pass-wrap { position: relative; }
        .pass-toggle {
            position: absolute;
            right: .85rem; top: 50%;
            transform: translateY(-50%);
            background: none; border: none;
            color: var(--muted); cursor: pointer; font-size: 1rem;
            padding: 0;
        }

        .btn-login {
            width: 100%;
            padding: .8rem;
            background: linear-gradient(135deg, var(--primary), #6366f1);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: .95rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: opacity .2s, transform .1s;
            margin-top: .5rem;
        }

        .btn-login:hover   { opacity: .9; }
        .btn-login:active  { transform: scale(.98); }
        .btn-login:disabled { opacity: .5; cursor: not-allowed; }

        .security-note {
            text-align: center;
            font-size: .73rem;
            color: var(--muted);
            margin-top: 1.5rem;
        }

        .policy-hint {
            font-size: .72rem;
            color: var(--muted);
            margin-top: .75rem;
        }

        .policy-hint li { margin-left: 1rem; margin-top: .2rem; }
    </style>
</head>
<body>
<div class="login-wrap">
    <div class="login-card">
        <div class="brand">
            <div class="brand-icon">💰</div>
            <h1><?= e(APP_NAME) ?></h1>
            <p class="subtitle">Admin Access Only &nbsp;·&nbsp; Authorized Personnel</p>
        </div>

        <?php if ($error): ?>
            <div class="alert alert-error">⚠️ <?= e($error) ?></div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="alert alert-success">✅ <?= e($success) ?></div>
        <?php endif; ?>

        <form method="POST" id="loginForm" novalidate>
            <?= CSRF::field() ?>

            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email"
                       value="<?= e($_POST['email'] ?? '') ?>"
                       placeholder="admin@paynest.pro"
                       autocomplete="username"
                       required>
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <div class="pass-wrap">
                    <input type="password" id="password" name="password"
                           placeholder="••••••••"
                           autocomplete="current-password"
                           required>
                    <button type="button" class="pass-toggle" id="passToggle" aria-label="Toggle password">👁️</button>
                </div>
            </div>

            <button type="submit" class="btn-login" id="loginBtn">🔐 Login to Dashboard</button>
        </form>

        <p class="security-note">
            🛡️ All login attempts are logged &amp; monitored.<br>
            Unauthorized access is strictly prohibited.
        </p>
    </div>
</div>

<script>
    // Password toggle
    document.getElementById('passToggle').addEventListener('click', function () {
        const inp = document.getElementById('password');
        inp.type = inp.type === 'password' ? 'text' : 'password';
        this.textContent = inp.type === 'password' ? '👁️' : '🙈';
    });

    // Prevent double-submit
    document.getElementById('loginForm').addEventListener('submit', function () {
        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.textContent = 'Authenticating…';
    });
</script>
</body>
</html>
