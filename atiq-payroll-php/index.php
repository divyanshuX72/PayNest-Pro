<?php
/**
 * PayNest Pro - Root index.php
 * Redirect to dashboard if logged in, else to login.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/security.php';  // Boots session

if (!empty($_SESSION['admin_id'])) {
    redirect('/dashboard.php');
} else {
    redirect('/auth/login.php');
}
