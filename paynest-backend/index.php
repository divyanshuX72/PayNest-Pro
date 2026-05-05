<?php
/**
 * ┌─────────────────────────────────────────────────┐
 * │         PayNest Pro — PHP Backend Server         │
 * │                                                   │
 * │  Main entry point. Initializes database,          │
 * │  sets CORS headers, and routes all requests.      │
 * └─────────────────────────────────────────────────┘
 *
 * Run with: php -S localhost:5000 index.php
 */

// ─── Let PHP built-in server handle static files ─────────────
if (php_sapi_name() === 'cli-server') {
    $filePath = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (is_file($filePath)) {
        return false; // Serve the file directly
    }
}

// ─── Load Configuration ──────────────────────────────────────
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/routes/api.php';

// ─── Connect Database Before Handling Requests ───────────────
Database::connect();

// ─── Handle Request ──────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = $_SERVER['REQUEST_URI'];

// Set CORS only for API routes
if (str_starts_with(parse_url($uri, PHP_URL_PATH), '/api')) {
    setCorsHeaders();
}

handleRoutes($method, $uri);
