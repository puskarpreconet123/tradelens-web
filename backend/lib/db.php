<?php
require_once __DIR__ . '/config.php';

function tl_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $host = tl_env('DB_HOST', '127.0.0.1');
    $port = tl_env('DB_PORT', '3306');
    $name = tl_env('DB_NAME', 'tradelens');
    $user = tl_env('DB_USER', 'root');
    $pass = tl_env('DB_PASS', '') ?? '';
    $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}
