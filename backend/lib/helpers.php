<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function tl_uuid(): string {
    $d = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function tl_json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function tl_error(string $msg, int $status = 400): void {
    tl_json_response(['detail' => $msg], $status);
}

function tl_read_json(): array {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function tl_b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function tl_b64url_decode(string $data): string {
    $padded = $data . str_repeat('=', (4 - strlen($data) % 4) % 4);
    return base64_decode(strtr($padded, '-_', '+/')) ?: '';
}

function tl_jwt_encode(array $payload): string {
    $secret = tl_env('JWT_SECRET', 'dev-secret');
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $h = tl_b64url_encode(json_encode($header));
    $p = tl_b64url_encode(json_encode($payload));
    $sig = hash_hmac('sha256', "$h.$p", $secret, true);
    return "$h.$p." . tl_b64url_encode($sig);
}

function tl_jwt_decode(string $jwt): ?array {
    $secret = tl_env('JWT_SECRET', 'dev-secret');
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = tl_b64url_encode(hash_hmac('sha256', "$h.$p", $secret, true));
    if (!hash_equals($expected, $s)) return null;
    $payload = json_decode(tl_b64url_decode($p), true);
    if (!is_array($payload)) return null;
    if (isset($payload['exp']) && time() > (int)$payload['exp']) return null;
    return $payload;
}

function tl_hash_password(string $password): string {
    return password_hash($password, PASSWORD_BCRYPT);
}

function tl_verify_password(string $password, string $hash): bool {
    return password_verify($password, $hash);
}

function tl_issue_token(string $user_id, string $email, string $role): string {
    $hours = (int)tl_env('JWT_EXPIRY_HOURS', '168');
    return tl_jwt_encode([
        'sub' => $user_id,
        'email' => $email,
        'role' => $role,
        'iat' => time(),
        'exp' => time() + ($hours * 3600),
    ]);
}

function tl_current_user(): ?array {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!$auth && isset($_SERVER['HTTP_AUTHORIZATION'])) $auth = $_SERVER['HTTP_AUTHORIZATION'];
    if (!preg_match('/Bearer\s+(.+)/i', $auth, $m)) return null;
    $payload = tl_jwt_decode(trim($m[1]));
    if (!$payload) return null;
    
    $user = tl_db()->users->findOne(['id' => $payload['sub']]);
    if (!$user) return null;
    
    $u = (array)$user;
    if (isset($u['_id'])) unset($u['_id']);
    return $u;
}

function tl_require_auth(): array {
    $u = tl_current_user();
    if (!$u) tl_error('Not authenticated', 401);
    return $u;
}

function tl_require_admin(): array {
    $u = tl_require_auth();
    if (($u['role'] ?? 'user') !== 'admin') tl_error('Admin access required', 403);
    return $u;
}

function tl_validate_email(string $email): bool {
    return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

function tl_license_key(): string {
    $parts = [];
    for ($i = 0; $i < 4; $i++) $parts[] = strtoupper(bin2hex(random_bytes(2)));
    return 'TL-' . implode('-', $parts);
}

function tl_api_key(): string {
    return 'tl_live_' . bin2hex(random_bytes(12));
}

function tl_verify_recaptcha(?string $token): void {
    $secret = tl_env('RECAPTCHA_SECRET_KEY');
    if (!$secret) return; // Skip if no secret key is set (development mode)
    
    if (!$token) tl_error('reCAPTCHA verification required', 422);

    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $data = [
        'secret' => $secret,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? null
    ];

    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data)
        ]
    ];
    $context  = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    if ($result === false) tl_error('reCAPTCHA service unavailable', 503);

    $response = json_decode($result, true);
    if (!$response['success']) {
        tl_error('reCAPTCHA verification failed', 422);
    }
}
