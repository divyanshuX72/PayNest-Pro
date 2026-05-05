<?php
/**
 * Test Controller
 * 
 * Handles test-related API endpoints.
 */

require_once __DIR__ . '/../config/db.php';

class TestController
{
    /**
     * GET /api/test-db
     * 
     * Tests database connectivity by running SELECT 1.
     * Returns success/failure message.
     */
    public static function testDatabase(): void
    {
        try {
            $db   = Database::getConnection();
            $stmt = $db->query('SELECT 1 AS result');
            $row  = $stmt->fetch();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Database connected successfully ✅',
                'data'    => [
                    'query'  => 'SELECT 1',
                    'result' => $row['result'],
                    'db_name' => env('DB_NAME'),
                    'host'    => env('DB_HOST'),
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ], JSON_PRETTY_PRINT);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed ❌',
                'error'   => $e->getMessage()
            ], JSON_PRETTY_PRINT);
        }
    }
}
