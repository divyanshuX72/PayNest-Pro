<?php
/**
 * Database Configuration & Connection Pool
 * 
 * Uses PDO with MySQL driver (equivalent to mysql2/promise in Node.js).
 * Creates a persistent connection (PHP's equivalent of a connection pool).
 */

require_once __DIR__ . '/env.php';

// Load environment variables
loadEnv(__DIR__ . '/../.env');

/**
 * Database connection class using Singleton pattern.
 * Ensures only one connection instance exists (connection pool behavior).
 */
class Database
{
    private static ?PDO $connection = null;

    /**
     * Get database connection instance.
     * Creates connection on first call, reuses on subsequent calls.
     *
     * @return PDO
     * @throws PDOException
     */
    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $host     = env('DB_HOST', 'localhost');
            $dbName   = env('DB_NAME', 'payroll_db_2');
            $user     = env('DB_USER', 'root');
            $password = env('DB_PASSWORD', '');

            $dsn = "mysql:host=$host;dbname=$dbName;charset=utf8mb4";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_PERSISTENT         => true,  // Connection pooling
            ];

            try {
                self::$connection = new PDO($dsn, $user, $password, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit;
            }
        }

        return self::$connection;
    }

    /**
     * Test database connectivity.
     * Runs SELECT 1 to verify the connection is alive.
     *
     * @return bool
     */
    public static function testConnection(): bool
    {
        try {
            $db = self::getConnection();
            $stmt = $db->query('SELECT 1');
            return $stmt !== false;
        } catch (PDOException $e) {
            return false;
        }
    }

    /**
     * Connect database and display status message.
     * Should be called before server starts handling requests.
     */
    public static function connect(): void
    {
        try {
            self::getConnection();
            // Log to server console (visible in PHP built-in server output)
            error_log("✅ Database connected successfully");
        } catch (PDOException $e) {
            error_log("❌ Database connection failed: " . $e->getMessage());
            exit(1);
        }
    }
}
