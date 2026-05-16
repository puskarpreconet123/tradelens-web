<?php
declare(strict_types=1);

// CORS - Moved to top to ensure headers are sent even if requirements fail
$origin = getenv('CORS_ORIGIN') ?: '*';
if ($origin === '*' && isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
}

header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/lib/helpers.php';
require_once __DIR__ . '/lib/seed.php';

// Auto-seed if plans are missing
try {
    $db = tl_db();
    if ($db->plans->countDocuments([]) === 0) {
        tl_seed();
    }
} catch (Throwable $e) { error_log('Auto-seed error: ' . $e->getMessage()); }

// Path normalization
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?: '/';

// Remove index.php from path if present (common in some Apache setups)
$path = str_replace('/index.php', '', $path);
$path = rtrim($path, '/') ?: '/';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Optional: strip /api prefix so both /api/auth and /auth work
if (strpos($path, '/api') === 0) {
    $path = substr($path, 4) ?: '/';
}

// Routing
try {
    if ($path === '/seed-debug') {
        try {
            $res = tl_seed();
            tl_json_response(['status' => 'success', 'seeded' => $res]);
        } catch (Throwable $e) {
            tl_json_response(['status' => 'error', 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    }

    // Health
    if ($path === '/' || $path === '/api') {
        tl_json_response(['service' => 'EduFlash PHP API', 'status' => 'ok']);
    }

    if ($path === '/config' && $method === 'GET') {
        tl_json_response(['recaptcha_site_key' => tl_env('RECAPTCHA_SITE_KEY')]);
    }

    // ---------- Auth ----------
    if ($path === '/auth/register' && $method === 'POST') return handle_register();
    if ($path === '/auth/login'    && $method === 'POST') return handle_login(false);
    if ($path === '/auth/me'       && $method === 'GET')  return handle_me();

    // Admin auth
    if ($path === '/admin/login'   && $method === 'POST') return handle_login(true);

    // ---------- Plans (public) ----------
    if ($path === '/plans'         && $method === 'GET')  return handle_list_plans();
    if ($path === '/plans/demo'    && $method === 'GET')  return handle_demo_plan();

    // ---------- Package Requests ----------
    if ($path === '/requests'      && $method === 'POST') return handle_create_request();
    if ($path === '/requests'      && $method === 'GET')  return handle_list_my_requests();

    // ---------- Licenses / Backtest (user) ----------
    if ($path === '/licenses'        && $method === 'GET') return handle_list_licenses();
    if ($path === '/licenses/active' && $method === 'GET') return handle_active_license();
    if ($path === '/backtest/run'    && $method === 'POST') return handle_run_backtest();

    // ---------- Admin ----------
    if ($path === '/admin/requests' && $method === 'GET')  return handle_admin_list_requests();
    if ($path === '/admin/users'    && $method === 'GET')  return handle_admin_list_users();
    if ($path === '/admin/stats'    && $method === 'GET')  return handle_admin_stats();

    if (preg_match('#^/admin/requests/([0-9a-f-]+)/approve$#', $path, $m) && $method === 'POST') {
        return handle_admin_approve($m[1]);
    }
    if (preg_match('#^/admin/requests/([0-9a-f-]+)/reject$#', $path, $m) && $method === 'POST') {
        return handle_admin_reject($m[1]);
    }

    tl_error('Not found: ' . $method . ' ' . $path, 404);
} catch (Throwable $e) {
    error_log('Server error: ' . $e->getMessage());
    tl_error('Server error: ' . $e->getMessage(), 500);
}


// ===== Handlers =====

function handle_register(): void {
    $b = tl_read_json();
    tl_verify_recaptcha($b['recaptcha_token'] ?? null);
    $email = strtolower(trim($b['email'] ?? ''));
    $password = $b['password'] ?? '';
    $name = trim($b['name'] ?? '');
    $contact = trim($b['contact_number'] ?? '');
    
    if (!tl_validate_email($email)) tl_error('Invalid email', 422);
    if (strlen($password) < 6) tl_error('Password must be at least 6 characters', 422);
    if ($name === '' || mb_strlen($name) > 80) tl_error('Name is required (max 80 chars)', 422);
    
    if ($contact === '') {
        tl_error('Please provide your WhatsApp or Telegram Number', 422);
    }

    $db = tl_db();
    if ($db->users->findOne(['email' => $email])) tl_error('Email already registered', 400);

    $id = tl_uuid();
    $user_data = [
        'id' => $id,
        'email' => $email,
        'password_hash' => tl_hash_password($password),
        'name' => $name,
        'contact_number' => $contact,
        'role' => 'user',
        'created_at' => date('c')
    ];
    $db->users->insertOne($user_data);

    $token = tl_issue_token($id, $email, 'user');
    unset($user_data['password_hash'], $user_data['_id']);
    tl_json_response(['token' => $token, 'user' => $user_data]);
}

function handle_login(bool $adminOnly): void {
    $b = tl_read_json();
    tl_verify_recaptcha($b['recaptcha_token'] ?? null);
    $email = strtolower(trim($b['email'] ?? ''));
    $password = $b['password'] ?? '';
    if ($email === '' || $password === '') tl_error('Email and password are required', 422);

    $u = tl_db()->users->findOne(['email' => $email]);
    if (!$u || !tl_verify_password($password, $u['password_hash'])) tl_error('Invalid email or password', 401);
    
    $user = (array)$u;
    if ($adminOnly && $user['role'] !== 'admin') tl_error('Not an admin account', 403);

    $token = tl_issue_token($user['id'], $user['email'], $user['role']);
    unset($user['password_hash'], $user['_id']);
    tl_json_response(['token' => $token, 'user' => $user]);
}

function handle_me(): void {
    $u = tl_require_auth();
    tl_json_response($u);
}

function handle_list_plans(): void {
    $cursor = tl_db()->plans->find([], ['sort' => ['sort_order' => 1]]);
    $out = [];
    foreach ($cursor as $r) {
        $p = (array)$r;
        unset($p['_id']);
        $out[] = $p;
    }
    tl_json_response($out);
}

function handle_demo_plan(): void {
    $r = tl_db()->demo_plan->findOne(['id' => 'demo']);
    if (!$r) tl_error('Demo plan not found', 404);
    $p = (array)$r;
    unset($p['_id']);
    tl_json_response($p);
}

function handle_create_request(): void {
    $u = tl_current_user(); // Optional auth
    $b = tl_read_json();
    if (!$u) tl_verify_recaptcha($b['recaptcha_token'] ?? null);
    $isDemo = (bool)($b['demo'] ?? false);
    $db = tl_db();

    $guest_name = trim((string)($b['guest_name'] ?? ''));
    $guest_email = strtolower(trim((string)($b['guest_email'] ?? '')));
    $guest_contact = trim((string)($b['guest_contact'] ?? ''));

    if (!$u) {
        if ($guest_name === '' || $guest_email === '' || $guest_contact === '') {
            tl_error('Please provide your name, email, and contact method (WhatsApp/Telegram).', 422);
        }
        if (!tl_validate_email($guest_email)) tl_error('Invalid email format.', 422);
    }

    if ($isDemo) {
        $r = $db->demo_plan->findOne(['id' => 'demo']);
        if (!$r) tl_error('Demo plan not found', 404);
        $d = (array)$r;
        $plan_id = 'demo';
        $plan_name = $d['name'] ?? 'Demo';
        $period = $d['duration'] ?? '1 Hour Full Access';
        $price_usd = (float)($d['price_usd'] ?? 0);
        $option_index = null;
    } else {
        $plan_id = $b['plan_id'] ?? '';
        $option_index = isset($b['option_index']) ? (int)$b['option_index'] : null;
        if ($plan_id === '' || $option_index === null) tl_error('plan_id and option_index required', 422);
        
        $p = $db->plans->findOne(['id' => $plan_id]);
        if (!$p) tl_error('Plan not found', 404);
        
        $plan = (array)$p;
        $options = $plan['options'];
        if (!isset($options[$option_index])) tl_error('Invalid option_index', 422);
        $opt = $options[$option_index];
        $plan_name = $plan['name'];
        $period = $opt['period'];
        $price_usd = (float)$opt['price_usd'];
    }

    // Prevent duplicate pending for registered users
    if ($u) {
        $check = $db->package_requests->findOne([
            'user_id' => $u['id'],
            'plan_id' => $plan_id,
            'status' => 'pending'
        ]);
        if ($check) tl_error('You already have a pending request for this plan.', 409);
    }

    $id = tl_uuid();
    $request_data = [
        'id' => $id,
        'user_id' => $u['id'] ?? null,
        'user_email' => $u['email'] ?? $guest_email,
        'user_name' => $u['name'] ?? $guest_name,
        'guest_contact' => $guest_contact ?: null,
        'plan_id' => $plan_id,
        'plan_name' => $plan_name,
        'period' => $period,
        'price_usd' => $price_usd,
        'option_index' => $option_index,
        'is_demo' => $isDemo,
        'is_lead' => $u ? false : true,
        'status' => 'pending',
        'created_at' => date('c')
    ];

    $db->package_requests->insertOne($request_data);

    $res = $db->package_requests->findOne(['id' => $id]);
    $out = (array)$res;
    unset($out['_id']);
    tl_json_response($out);
}

function handle_list_my_requests(): void {
    $u = tl_require_auth();
    $cursor = tl_db()->package_requests->find(['user_id' => $u['id']], ['sort' => ['created_at' => -1]]);
    $out = [];
    foreach ($cursor as $r) {
        $item = (array)$r;
        unset($item['_id']);
        $out[] = $item;
    }
    tl_json_response($out);
}

function handle_list_licenses(): void {
    $u = tl_require_auth();
    $cursor = tl_db()->licenses->find(['user_id' => $u['id']], ['sort' => ['issued_at' => -1]]);
    $out = [];
    foreach ($cursor as $r) {
        $item = (array)$r;
        unset($item['_id']);
        $out[] = $item;
    }
    tl_json_response($out);
}

function handle_active_license(): void {
    $u = tl_require_auth();
    $now = date('c');
    $lic = tl_db()->licenses->findOne([
        'user_id' => $u['id'],
        'status' => 'active',
        'expires_at' => ['$gt' => $now]
    ], ['sort' => ['issued_at' => -1]]);
    
    if (!$lic) {
        tl_json_response(null);
        return;
    }
    
    $out = (array)$lic;
    unset($out['_id']);
    tl_json_response($out);
}

function handle_run_backtest(): void {
    $u = tl_require_auth();
    $b = tl_read_json();
    $amount = (float)($b['amount'] ?? 0);
    $network = trim((string)($b['network'] ?? 'TRC-20'));
    $destination = trim((string)($b['destination'] ?? ''));

    if ($amount <= 0) tl_error('Invalid flash amount', 422);
    if ($destination === '') tl_error('Destination address required', 422);

    $db = tl_db();
    $now = date('c');
    $license = $db->licenses->findOne([
        'user_id' => $u['id'],
        'status' => 'active',
        'expires_at' => ['$gt' => $now]
    ], ['sort' => ['issued_at' => -1]]);
    
    if (!$license) tl_error('No active license found.', 403);
    
    $lic = (array)$license;
    $used = (float)($lic['backtests_used'] ?? 0);
    $limit = (float)($lic['backtests_limit'] ?? 0);

    if (($used + $amount) > $limit) {
        tl_error("Limit exceeded. Remaining: " . ($limit - $used) . " USDT", 403);
    }

    $pnl_pct = 0.08 + (mt_rand() / mt_getrandmax()) * 0.24;
    $duration_ms = mt_rand(700, 1900);

    // Equity curve
    $n = 60; $curve = [100.0]; $target = 100.0 * (1 + $pnl_pct);
    for ($i = 1; $i < $n; $i++) {
        $progress = $i / ($n - 1);
        $drift = ($target - 100.0) * $progress;
        $noise = (mt_rand(-100, 100) / 100) * 1.2;
        $curve[] = round(100.0 + $drift + $noise, 3);
    }

    $run_id = 'fl_' . bin2hex(random_bytes(6));
    $bt_id = tl_uuid();
    $db->backtests->insertOne([
        'id' => $bt_id,
        'user_id' => $u['id'],
        'license_id' => $lic['id'],
        'amount' => $amount,
        'network' => $network,
        'destination' => $destination,
        'run_id' => $run_id,
        'duration_ms' => $duration_ms,
        'equity_curve' => $curve,
        'created_at' => date('c')
    ]);
    
    $db->licenses->updateOne(['id' => $lic['id']], ['$inc' => ['backtests_used' => $amount]]);

    tl_json_response([
        'run_id' => $run_id,
        'amount' => $amount,
        'network' => $network,
        'duration_ms' => $duration_ms,
        'equity_curve' => $curve,
        'license_id' => $lic['id'],
        'fee' => round($amount * 0.0005, 2)
    ]);
}

// ---------- Admin handlers ----------

function handle_admin_list_requests(): void {
    tl_require_admin();
    $status = $_GET['status'] ?? null;
    $filter = [];
    if (in_array($status, ['pending','approved','rejected'], true)) {
        $filter['status'] = $status;
    }
    
    $cursor = tl_db()->package_requests->find($filter, ['sort' => ['created_at' => -1]]);
    $out = [];
    foreach ($cursor as $r) {
        $item = (array)$r;
        unset($item['_id']);
        $out[] = $item;
    }
    tl_json_response($out);
}

function handle_admin_list_users(): void {
    tl_require_admin();
    $cursor = tl_db()->users->find([], ['sort' => ['created_at' => -1]]);
    $out = [];
    foreach ($cursor as $r) {
        $item = (array)$r;
        unset($item['_id'], $item['password_hash']);
        $out[] = $item;
    }
    tl_json_response($out);
}

function handle_admin_stats(): void {
    tl_require_admin();
    $db = tl_db();
    $now = date('c');
    $stats = [
        'users'              => $db->users->countDocuments(['role' => 'user']),
        'leads'              => $db->package_requests->countDocuments(['is_lead' => true]),
        'pending_requests'   => $db->package_requests->countDocuments(['status' => 'pending']),
        'approved_requests'  => $db->package_requests->countDocuments(['status' => 'approved']),
        'rejected_requests'  => $db->package_requests->countDocuments(['status' => 'rejected']),
        'active_licenses'    => $db->licenses->countDocuments(['status' => 'active', 'expires_at' => ['$gt' => $now]]),
        'total_backtests'    => $db->backtests->countDocuments([]),
    ];
    tl_json_response($stats);
}

function handle_admin_approve(string $requestId): void {
    tl_require_admin();
    $db = tl_db();

    $req_res = $db->package_requests->findOne(['id' => $requestId]);
    if (!$req_res) tl_error('Request not found', 404);
    
    $req = (array)$req_res;
    if ($req['status'] !== 'pending') tl_error('Request is not pending', 409);

    // Determine validity & limit
    if ($req['is_demo']) {
        $demo_res = $db->demo_plan->findOne(['id' => 'demo']);
        $d = (array)$demo_res;
        $hours = (int)($d['hours'] ?? 1);
        $expires_at = date('c', time() + ($hours * 3600));
        $limit = (float)($d['usdt_limit'] ?? 1000);
    } else {
        $p = $db->plans->findOne(['id' => $req['plan_id']]);
        if (!$p) tl_error('Plan no longer exists', 404);
        
        $plan = (array)$p;
        $options = $plan['options'];
        $opt = $options[(int)$req['option_index']] ?? null;
        if (!$opt) tl_error('Option no longer exists', 404);
        
        $days = (int)$opt['days'];
        $expires_at = date('c', time() + ($days * 86400));
        $limit = (float)($opt['usdt_limit'] ?? 0);
    }

    $lic_id = tl_uuid();
    $db->licenses->insertOne([
        'id' => $lic_id,
        'user_id' => $req['user_id'],
        'request_id' => $req['id'],
        'plan_id' => $req['plan_id'],
        'plan_name' => $req['plan_name'],
        'period' => $req['period'],
        'license_key' => tl_license_key(),
        'api_key' => tl_api_key(),
        'status' => 'active',
        'issued_at' => date('c'),
        'expires_at' => $expires_at,
        'backtests_used' => 0.0,
        'backtests_limit' => $limit,
    ]);

    $db->package_requests->updateOne(['id' => $req['id']], ['$set' => ['status' => 'approved', 'decided_at' => date('c')]]);

    $lic = $db->licenses->findOne(['id' => $lic_id]);
    $out = (array)$lic;
    unset($out['_id']);
    tl_json_response(['success' => true, 'license' => $out]);
}

function handle_admin_reject(string $requestId): void {
    tl_require_admin();
    $b = tl_read_json();
    $reason = trim((string)($b['reason'] ?? ''));
    $db = tl_db();

    $req_res = $db->package_requests->findOne(['id' => $requestId]);
    if (!$req_res) tl_error('Request not found', 404);
    
    $req = (array)$req_res;
    if ($req['status'] !== 'pending') tl_error('Request is not pending', 409);

    $db->package_requests->updateOne(['id' => $req['id']], [
        '$set' => [
            'status' => 'rejected',
            'reject_reason' => $reason !== '' ? $reason : null,
            'decided_at' => date('c')
        ]
    ]);

    tl_json_response(['success' => true]);
}
