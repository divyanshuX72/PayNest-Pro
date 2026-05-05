<?php
/**
 * PayNest Pro - Logout
 * Destroys session completely, clears DB session token, logs action.
 */
require_once __DIR__ . '/../security.php';

if (!empty($_SESSION['admin_id'])) {
    AuditLog::write($_SESSION['admin_id'], 'logout', 'Admin logged out');
    // Clear single-device token in DB
    DB::run('UPDATE admins SET session_token = NULL WHERE id = ?', [$_SESSION['admin_id']]);
}

Session::destroy();
redirect('/auth/login.php?reason=logout');
