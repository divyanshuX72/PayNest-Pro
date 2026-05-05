<?php
/**
 * PayNest Pro - OTP Verification (2FA)
 * Only reached after successful password login when OTP_ENABLED = true.
 */
require_once __DIR__ . '/../security.php';

// Must have a session (password already verified) but not yet OTP-verified
if (empty($_SESSION['admin_id'])) {
    redirect('/auth/login.php');
}
if (!OTP_ENABLED || !empty($_SESSION['otp_verified'])) {
    redirect('/dashboard.php');
}

$error = Session::getFlash('error');
$info  = "An OTP has been sent to your email address. Enter it below.";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRF::validate();

    $submitted = trim($_POST['otp'] ?? '');
    $adminId   = (int) $_SESSION['admin_id'];

    $admin = DB::one(
        'SELECT otp_code, otp_expires_at FROM admins WHERE id = ?',
        [$adminId]
    );

    if (!$admin || !$admin['otp_code']) {
        $error = 'No OTP found. Please login again.';
    } elseif (strtotime($admin['otp_expires_at']) < time()) {
        $error = 'OTP expired. Please login again.';
        Session::destroy();
        redirect('/auth/login.php?reason=otp_expired');
    } elseif (!password_verify($submitted, $admin['otp_code'])) {
        $error = 'Invalid OTP. Please try again.';
        AuditLog::write($adminId, 'otp_failed', '');
    } else {
        // Clear OTP from DB
        DB::run('UPDATE admins SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [$adminId]);
        $_SESSION['otp_verified'] = true;
        AuditLog::write($adminId, 'otp_verified', '');
        redirect('/dashboard.php');
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Auth – <?= e(APP_NAME) ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --bg:#080d1a; --glass:rgba(255,255,255,.04); --border:rgba(255,255,255,.08);
                --primary:#3b82f6; --danger:#ef4444; --text:#e2e8f0; --muted:#64748b; --radius:14px; }
        body { min-height:100vh; background:var(--bg); display:flex; align-items:center;
               justify-content:center; font-family:'Inter',sans-serif; color:var(--text);
               background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,.18), transparent); }
        .card { background:var(--glass); border:1px solid var(--border); border-radius:var(--radius);
                padding:2.5rem 2rem; max-width:400px; width:100%; backdrop-filter:blur(20px); position:relative; overflow:hidden; }
        .card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px;
                        background:linear-gradient(90deg,var(--primary),#8b5cf6,#ec4899); }
        .brand { text-align:center; margin-bottom:2rem; }
        .brand-icon { width:60px; height:60px; background:linear-gradient(135deg,var(--primary),#8b5cf6);
                      border-radius:16px; display:inline-flex; align-items:center; justify-content:center;
                      font-size:1.6rem; margin-bottom:1rem; }
        h1 { font-size:1.3rem; font-weight:700; margin-bottom:.3rem; }
        .sub { font-size:.82rem; color:var(--muted); }
        .info { background:rgba(59,130,246,.1); border:1px solid rgba(59,130,246,.2); color:#93c5fd;
                border-radius:8px; padding:.75rem 1rem; font-size:.83rem; margin-bottom:1.2rem; }
        .alert-error { background:rgba(239,68,68,.12); color:#fca5a5; border:1px solid rgba(239,68,68,.25);
                       border-radius:8px; padding:.75rem 1rem; font-size:.83rem; margin-bottom:1.2rem; }
        label { display:block; font-size:.78rem; font-weight:600; color:var(--muted);
                text-transform:uppercase; letter-spacing:.06em; margin-bottom:.4rem; }
        input[type=text] { width:100%; background:rgba(255,255,255,.04); border:1px solid var(--border);
                           border-radius:8px; padding:.7rem 1rem; color:var(--text); font-size:1.2rem;
                           font-family:inherit; outline:none; letter-spacing:.2em; text-align:center; }
        input:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(59,130,246,.15); }
        .btn { width:100%; padding:.8rem; background:linear-gradient(135deg,var(--primary),#6366f1);
               border:none; border-radius:8px; color:#fff; font-size:.95rem; font-weight:600;
               font-family:inherit; cursor:pointer; margin-top:.75rem; transition:opacity .2s; }
        .btn:hover { opacity:.9; }
        .back { display:block; text-align:center; font-size:.8rem; color:var(--muted);
                margin-top:1rem; text-decoration:none; }
        .back:hover { color:var(--text); }
    </style>
</head>
<body>
<div style="width:100%;max-width:400px;padding:1rem">
    <div class="card">
        <div class="brand">
            <div class="brand-icon">🔐</div>
            <h1>Two-Factor Auth</h1>
            <p class="sub">Enter the OTP sent to your email</p>
        </div>

        <?php if ($error): ?>
            <div class="alert-error">⚠️ <?= e($error) ?></div>
        <?php else: ?>
            <div class="info">📧 <?= e($info) ?></div>
        <?php endif; ?>

        <form method="POST">
            <?= CSRF::field() ?>
            <div class="form-group">
                <label for="otp">OTP Code</label>
                <input type="text" id="otp" name="otp" maxlength="<?= OTP_LENGTH ?>"
                       placeholder="000000" autocomplete="one-time-code" required autofocus>
            </div>
            <button type="submit" class="btn">✅ Verify OTP</button>
        </form>

        <a href="/auth/login.php" class="back">← Back to Login</a>
    </div>
</div>
</body>
</html>
