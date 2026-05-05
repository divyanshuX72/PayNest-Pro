<?php
/**
 * API Routes
 * 
 * Defines all API route mappings.
 * Simple router that maps URI paths to controller methods.
 */

require_once __DIR__ . '/../controllers/TestController.php';

/**
 * Route handler — matches the request URI to a controller action.
 *
 * @param string $method  HTTP method (GET, POST, etc.)
 * @param string $uri     Request URI path
 */
function handleRoutes(string $method, string $uri): void
{
    // Remove query string from URI
    $uri = parse_url($uri, PHP_URL_PATH);

    // Remove trailing slash (except root)
    $uri = rtrim($uri, '/') ?: '/';

    // ─── Serve Static Assets ────────────────────────────────────
    if (preg_match('/^\/assets\//', $uri)) {
        return; // Let PHP built-in server handle static files
    }

    // ─── Page Routes ────────────────────────────────────────────

    // GET /login — Login page
    if ($method === 'GET' && $uri === '/login') {
        require __DIR__ . '/../views/login.php';
        return;
    }

    // GET / or GET /dashboard — Dashboard page
    if ($method === 'GET' && ($uri === '/' || $uri === '/dashboard')) {
        require __DIR__ . '/../views/dashboard.php';
        return;
    }

    // ─── API Routes ─────────────────────────────────────────────

    // GET /api/test-db — Test database connection
    if ($method === 'GET' && $uri === '/api/test-db') {
        header('Content-Type: application/json; charset=utf-8');
        TestController::testDatabase();
        return;
    }

    // GET /api — API info
    if ($method === 'GET' && $uri === '/api') {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => '🚀 PayNest Pro API Server is running',
            'version' => '1.0.0',
            'environment' => env('NODE_ENV', 'development'),
            'endpoints' => [
                'GET /api'          => 'API info',
                'GET /api/test-db'  => 'Test database connection',
            ]
        ], JSON_PRETTY_PRINT);
        return;
    }

    // ─── 404 Not Found ──────────────────────────────────────────
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => "Route not found: $method $uri"
    ], JSON_PRETTY_PRINT);
}
