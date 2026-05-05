<?php
/**
 * PayNest Pro - CLI Admin Creator
 * Run from terminal: php create_admin.php
 *
 * Usage:
 *   php create_admin.php
 *
 * This script prompts for email, name, password, and role
 * and creates the admin directly in the DB.
 * No web interface — intentionally CLI only for security.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/security.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('This script can only be run from the command line.');
}

echo "╔══════════════════════════════════════╗\n";
echo "║    PayNest Pro - Create Admin CLI    ║\n";
echo "╚══════════════════════════════════════╝\n\n";

// Prompt helpers
function prompt(string $label, bool $hidden = false): string {
    echo $label . ': ';
    if ($hidden && strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
        system('stty -echo');
    }
    $val = trim(fgets(STDIN));
    if ($hidden) {
        system('stty echo');
        echo "\n";
    }
    return $val;
}

$name  = prompt('Full Name');
$email = strtolower(prompt('Email'));
$role  = prompt('Role [admin / super_admin] (default: admin)');
$role  = in_array($role, ['super_admin', 'admin']) ? $role : 'admin';

echo "\nEnter password (min 8 chars, uppercase, number, special char)\n";
$password = prompt('Password', true);
$confirm  = prompt('Confirm Password', true);

if ($password !== $confirm) {
    echo "❌ Passwords do not match.\n";
    exit(1);
}

$policyErrors = PasswordPolicy::validate($password);
if ($policyErrors) {
    foreach ($policyErrors as $err) {
        echo "❌ {$err}\n";
    }
    exit(1);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "❌ Invalid email address.\n";
    exit(1);
}

// Check duplicate
$existing = DB::one('SELECT id FROM admins WHERE email = ?', [$email]);
if ($existing) {
    echo "❌ Admin with this email already exists.\n";
    exit(1);
}

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
DB::run(
    'INSERT INTO admins (email, password, role, name) VALUES (?, ?, ?, ?)',
    [$email, $hash, $role, $name]
);

echo "\n✅ Admin created successfully!\n";
echo "   Email: {$email}\n";
echo "   Role:  {$role}\n";
echo "   Name:  {$name}\n\n";
