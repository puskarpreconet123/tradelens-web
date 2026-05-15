<?php
require_once __DIR__ . '/config.php';

function tl_db(): \MongoDB\Database {
    static $db = null;
    if ($db !== null) return $db;
    
    $uri = tl_env('MONGO_URI', 'mongodb://127.0.0.1:27017');
    $name = tl_env('DB_NAME', 'tradelens');
    
    $client = new \MongoDB\Client($uri);
    $db = $client->selectDatabase($name);
    return $db;
}
