<?php
/**
 * PayNest Pro - Auth Guard Include
 *
 * Add this ONE line to the TOP of any protected PHP page:
 *
 *   require_once __DIR__ . '/includes/auth_guard.php';
 *
 * It will:
 *   1. Boot the session
 *   2. Check login status
 *   3. Verify single-device session token
 *   4. Check role == admin/super_admin
 *   5. Auto-logout after 15 min inactivity
 *   6. Expose $currentAdmin for use in the page
 */
require_once dirname(__DIR__) . '/security.php';

$currentAdmin = requireAuth();
