<?php
/**
 * PayNest Pro - Change Password
 * Enforces password policy and requires old password verification.
 */
require_once __DIR__ . '/../security.php';
$admin = requireAuth();

$error   = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    CSRF::validate();

    $oldPass  = $_POST['old_password'] ?? '';
    $newPass  = $_POST['new_password'] ?? '';
    $confirm  = $_POST['confirm_password'] ?? '';

    // Fetch current hash
    $row = DB::one('SELECT password FROM admins WHERE id = ?', [$admin['id']]);

    if (!password_verify($oldPass, $row['password'])) {
        $error = 'Current password is incorrect.';
    } elseif ($newPass !== $confirm) {
        $error = 'New passwords do not match.';
    } elseif ($newPass === $oldPass) {
        $error = 'New password must be different from your current password.';
    } else {
        $policyErrors = PasswordPolicy::validate($newPass);
        if ($policyErrors) {
            $error = implode(' ', $policyErrors);
        } else {
            $hash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);
            DB::run('UPDATE admins SET password = ?, session_token = NULL WHERE id = ?', [$hash, $admin['id']]);
            AuditLog::write($admin['id'], 'password_changed', 'Admin changed their password');
            // Force re-login
            Session::destroy();
            Session::flash('success', 'Password changed. Please login with your new password.');
            redirect('/auth/login.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Change Password – <?= e(APP_NAME) ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
</head>
<body>
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem">
    <div class="card" style="max-width:460px;width:100%;padding:2rem">
        <h2 style="margin-bottom:1.5rem;font-size:1.2rem">🔑 Change Password</h2>

        <?php if ($error): ?>
            <div style="background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:.75rem 1rem;font-size:.85rem;margin-bottom:1.2rem">⚠️ <?= e($error) ?></div>
        <?php endif; ?>

        <form method="POST">
            <?= CSRF::field() ?>
            <div class="form-group">
                <label>Current Password</label>
                <input type="password" name="old_password" required autocomplete="current-password">
            </div>
            <div class="form-group">
                <label>New Password</label>
                <input type="password" name="new_password" id="newPass" required autocomplete="new-password">
                <ul style="font-size:.73rem;color:#64748b;margin-top:.4rem;padding-left:1rem">
                    <li id="rLen">Minimum 8 characters</li>
                    <li id="rUpper">One uppercase letter (A-Z)</li>
                    <li id="rNum">One number (0-9)</li>
                    <li id="rSpec">One special character (@#$!...)</li>
                </ul>
            </div>
            <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" name="confirm_password" required autocomplete="new-password">
            </div>
            <button type="submit" class="btn btn-full" style="margin-top:.5rem">Save New Password</button>
        </form>
        <a href="../dashboard.php" style="display:block;text-align:center;font-size:.82rem;color:#64748b;margin-top:1rem;text-decoration:none">← Back to Dashboard</a>
    </div>
</div>
<script>
    const rules = {
        rLen:   (v) => v.length >= 8,
        rUpper: (v) => /[A-Z]/.test(v),
        rNum:   (v) => /[0-9]/.test(v),
        rSpec:  (v) => /[\W_]/.test(v),
    };
    document.getElementById('newPass').addEventListener('input', function () {
        const v = this.value;
        for (const [id, fn] of Object.entries(rules)) {
            const el = document.getElementById(id);
            el.style.color = fn(v) ? '#10b981' : '#64748b';
        }
    });
</script>
</body>
</html>
