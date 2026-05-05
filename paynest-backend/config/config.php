<?php
/**
 * Application Configuration
 * 
 * Central config file that loads environment variables
 * and provides app-wide constants.
 */

require_once __DIR__ . '/env.php';

// Load .env file
loadEnv(__DIR__ . '/../.env');

// Application Config Constants
define('APP_PORT',    env('PORT', '5000'));
define('APP_ENV',     env('NODE_ENV', 'development'));
define('JWT_SECRET',  env('JWT_SECRET', 'payroll_jwt_secret_key_2026'));

// CORS Headers for API
function setCorsHeaders(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
