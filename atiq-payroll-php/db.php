<?php
/**
 * PayNest Pro - Database Connection (PDO, Singleton)
 * Uses prepared statements throughout for SQL injection prevention.
 */
require_once __DIR__ . '/config.php';

class DB {
    private static ?PDO $instance = null;

    public static function conn(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                DB_HOST, DB_NAME, DB_CHARSET
            );
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,  // Real prepared statements
                PDO::MYSQL_ATTR_FOUND_ROWS   => true,
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Log error details, show generic message to user
                error_log('[PayNest DB Error] ' . $e->getMessage());
                http_response_code(500);
                die('<h3>Database connection failed. Please try again later.</h3>');
            }
        }
        return self::$instance;
    }

    /** Convenience: prepare + execute, return statement */
    public static function run(string $sql, array $params = []): PDOStatement {
        $stmt = self::conn()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /** Fetch single row */
    public static function one(string $sql, array $params = []): ?array {
        $row = self::run($sql, $params)->fetch();
        return $row ?: null;
    }

    /** Fetch all rows */
    public static function all(string $sql, array $params = []): array {
        return self::run($sql, $params)->fetchAll();
    }

    /** Last inserted ID */
    public static function lastId(): string {
        return self::conn()->lastInsertId();
    }
}
