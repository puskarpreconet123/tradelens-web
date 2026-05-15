<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/helpers.php';
require_once __DIR__ . '/../lib/seed.php';

// CORS
$origin = tl_env('CORS_ORIGIN', '*');
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// One-time seed on first request
try { tl_seed(); } catch (Throwable $e) { error_log('Seed error: ' . $e->getMessage()); }

// Path normalization
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rtrim($uri, '/') ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Routing
try {
    // Health
    if ($path === '/api' || $path === '/api/') {
        tl_json_response(['service' => 'TradeLens PHP API', 'status' => 'ok']);
    }

    // ---------- Auth ----------
    if ($path === '/api/auth/register' && $method === 'POST') return handle_register();
    if ($path === '/api/auth/login'    && $method === 'POST') return handle_login(false);
    if ($path === '/api/auth/me'       && $method === 'GET')  return handle_me();

    // Admin auth
    if ($path === '/api/admin/login'   && $method === 'POST') return handle_login(true);

    // ---------- Plans (public) ----------
    if ($path === '/api/plans'         && $method === 'GET')  return handle_list_plans();
    if ($path === '/api/plans/demo'    && $method === 'GET')  return handle_demo_plan();

    // ---------- Package Requests ----------
    if ($path === '/api/requests'      && $method === 'POST') return handle_create_request();
    if ($path === '/api/requests'      && $method === 'GET')  return handle_list_my_requests();

    // ---------- Licenses / Backtest (user) ----------
    if ($path === '/api/licenses'        && $method === 'GET') return handle_list_licenses();
    if ($path === '/api/licenses/active' && $method === 'GET') return handle_active_license();
    if ($path === '/api/backtest/run'    && $method === 'POST') return handle_run_backtest();

    // ---------- Admin ----------
    if ($path === '/api/admin/requests' && $method === 'GET')  return handle_admin_list_requests();
    if ($path === '/api/admin/users'    && $method === 'GET')  return handle_admin_list_users();
    if ($path === '/api/admin/stats'    && $method === 'GET')  return handle_admin_stats();

    if (preg_match('#^/api/admin/requests/([0-9a-f-]+)/approve$#', $path, $m) && $method === 'POST') {
        return handle_admin_approve($m[1]);
    }
    if (preg_match('#^/api/admin/requests/([0-9a-f-]+)/reject$#', $path, $m) && $method === 'POST') {
        return handle_admin_reject($m[1]);
    }

    tl_error('Not found: ' . $method . ' ' . $path, 404);
} catch (PDOException $e) {
    error_log('DB error: ' . $e->getMessage());
    tl_error('Database error', 500);
} catch (Throwable $e) {
    error_log('Server error: ' . $e->getMessage());
    tl_error('Server error: ' . $e->getMessage(), 500);
}


// ===== Handlers =====

function handle_register(): void {
    $b = tl_read_json();
    $email = strtolower(trim($b['email'] ?? ''));
    $password = $b['password'] ?? '';
    $name = trim($b['name'] ?? '');
    if (!tl_validate_email($email)) tl_error('Invalid email', 422);
    if (strlen($password) < 6) tl_error('Password must be at least 6 characters', 422);
    if ($name === '' || mb_strlen($name) > 80) tl_error('Name is required (max 80 chars)', 422);

    $db = tl_db();
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) tl_error('Email already registered', 400);

    $id = tl_uuid();
    $insert = $db->prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?,?,?,?,?)');
    $insert->execute([$id, $email, tl_hash_password($password), $name, 'user']);

    $token = tl_issue_token($id, $email, 'user');
    $user = ['id' => $id, 'email' => $email, 'name' => $name, 'role' => 'user', 'created_at' => date('c')];
    tl_json_response(['token' => $token, 'user' => $user]);
}

function handle_login(bool $adminOnly): void {
    $b = tl_read_json();
    $email = strtolower(trim($b['email'] ?? ''));
    $password = $b['password'] ?? '';
    if ($email === '' || $password === '') tl_error('Email and password are required', 422);

    $stmt = tl_db()->prepare('SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || !tl_verify_password($password, $u['password_hash'])) tl_error('Invalid email or password', 401);
    if ($adminOnly && $u['role'] !== 'admin') tl_error('Not an admin account', 403);

    $token = tl_issue_token($u['id'], $u['email'], $u['role']);
    unset($u['password_hash']);
    tl_json_response(['token' => $token, 'user' => $u]);
}

function handle_me(): void {
    $u = tl_require_auth();
    tl_json_response($u);
}

function handle_list_plans(): void {
    $rows = tl_db()->query('SELECT id, name, tag, popular, options_json, features_json FROM plans ORDER BY sort_order ASC')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'id' => $r['id'],
            'name' => $r['name'],
            'tag' => $r['tag'],
            'popular' => (bool)$r['popular'],
            'options' => json_decode($r['options_json'], true) ?: [],
            'features' => json_decode($r['features_json'], true) ?: [],
        ];
    }
    tl_json_response($out);
}

function handle_demo_plan(): void {
    $r = tl_db()->query("SELECT data_json FROM demo_plan WHERE id='demo'")->fetch();
    if (!$r) tl_error('Demo plan not found', 404);
    tl_json_response(json_decode($r['data_json'], true) ?: []);
}

function handle_create_request(): void {
    $u = tl_require_auth();
    $b = tl_read_json();
    $isDemo = (bool)($b['demo'] ?? false);
    $db = tl_db();

    if ($isDemo) {
        $r = $db->query("SELECT data_json FROM demo_plan WHERE id='demo'")->fetch();
        if (!$r) tl_error('Demo plan not found', 404);
        $d = json_decode($r['data_json'], true);
        $plan_id = 'demo';
        $plan_name = $d['name'] ?? 'Demo';
        $period = $d['duration'] ?? '1 Hour Full Access';
        $price_usd = (float)($d['price_usd'] ?? 0);
        $option_index = null;
    } else {
        $plan_id = $b['plan_id'] ?? '';
        $option_index = isset($b['option_index']) ? (int)$b['option_index'] : null;
        if ($plan_id === '' || $option_index === null) tl_error('plan_id and option_index required', 422);
        $stmt = $db->prepare('SELECT name, options_json FROM plans WHERE id = ?');
        $stmt->execute([$plan_id]);
        $p = $stmt->fetch();
        if (!$p) tl_error('Plan not found', 404);
        $options = json_decode($p['options_json'], true);
        if (!isset($options[$option_index])) tl_error('Invalid option_index', 422);
        $opt = $options[$option_index];
        $plan_name = $p['name'];
        $period = $opt['period'];
        $price_usd = (float)$opt['price_usd'];
    }

    // Prevent duplicate pending
    $check = $db->prepare("SELECT id FROM package_requests WHERE user_id=? AND plan_id=? AND status='pending' LIMIT 1");
    $check->execute([$u['id'], $plan_id]);
    if ($check->fetch()) tl_error('You already have a pending request for this plan. Please wait for admin approval.', 409);

    $id = tl_uuid();
    $insert = $db->prepare('INSERT INTO package_requests (id, user_id, user_email, user_name, plan_id, plan_name, period, price_usd, option_index, is_demo) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $insert->execute([$id, $u['id'], $u['email'], $u['name'], $plan_id, $plan_name, $period, $price_usd, $option_index, $isDemo ? 1 : 0]);

    $row = $db->prepare('SELECT * FROM package_requests WHERE id = ?');
    $row->execute([$id]);
    tl_json_response($row->fetch());
}

function handle_list_my_requests(): void {
    $u = tl_require_auth();
    $stmt = tl_db()->prepare('SELECT * FROM package_requests WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$u['id']]);
    tl_json_response($stmt->fetchAll());
}

function handle_list_licenses(): void {
    $u = tl_require_auth();
    $stmt = tl_db()->prepare('SELECT * FROM licenses WHERE user_id = ? ORDER BY issued_at DESC');
    $stmt->execute([$u['id']]);
    tl_json_response($stmt->fetchAll());
}

function handle_active_license(): void {
    $u = tl_require_auth();
    $stmt = tl_db()->prepare("SELECT * FROM licenses WHERE user_id = ? AND status='active' AND expires_at > NOW() ORDER BY issued_at DESC LIMIT 1");
    $stmt->execute([$u['id']]);
    tl_json_response($stmt->fetch() ?: null);
}

function handle_run_backtest(): void {
    $u = tl_require_auth();
    $b = tl_read_json();
    $strategy = trim((string)($b['strategy'] ?? 'momentum_rsi_14'));
    $market = trim((string)($b['market'] ?? 'NASDAQ:AAPL'));
    $capital = (float)($b['capital'] ?? 100000);

    $db = tl_db();
    $lic = $db->prepare("SELECT * FROM licenses WHERE user_id=? AND status='active' AND expires_at > NOW() ORDER BY issued_at DESC LIMIT 1");
    $lic->execute([$u['id']]);
    $license = $lic->fetch();
    if (!$license) tl_error('No active license. Please request a plan and wait for admin approval.', 403);
    if ((int)$license['backtests_used'] >= (int)$license['backtests_limit']) tl_error('Backtest limit reached for this license.', 403);

    $sharpe = round(0.9 + (mt_rand() / mt_getrandmax()) * 1.5, 2);
    $max_dd = round(-3.5 - (mt_rand() / mt_getrandmax()) * 11.5, 2);
    $trades = mt_rand(420, 2200);
    $pnl_pct = 0.08 + (mt_rand() / mt_getrandmax()) * 0.24;
    $net_pnl = round($capital * $pnl_pct, 2);
    $duration_ms = mt_rand(700, 1900);

    // Equity curve
    $n = 60; $curve = [100.0]; $target = 100.0 * (1 + $pnl_pct);
    for ($i = 1; $i < $n; $i++) {
        $progress = $i / ($n - 1);
        $drift = ($target - 100.0) * $progress;
        $noise = (mt_rand(-100, 100) / 100) * 1.2;
        $curve[] = round(100.0 + $drift + $noise, 3);
    }

    $run_id = 'bt_' . bin2hex(random_bytes(6));
    $bt_id = tl_uuid();
    $insert = $db->prepare('INSERT INTO backtests (id, user_id, license_id, strategy, market, sharpe, max_drawdown, trades, net_pnl, duration_ms, equity_curve_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $insert->execute([$bt_id, $u['id'], $license['id'], $strategy, $market, $sharpe, $max_dd, $trades, $net_pnl, $duration_ms, json_encode($curve)]);
    $db->prepare('UPDATE licenses SET backtests_used = backtests_used + 1 WHERE id = ?')->execute([$license['id']]);

    tl_json_response([
        'run_id' => $run_id,
        'strategy' => $strategy,
        'market' => $market,
        'sharpe' => $sharpe,
        'max_drawdown' => $max_dd,
        'trades' => $trades,
        'net_pnl' => $net_pnl,
        'duration_ms' => $duration_ms,
        'equity_curve' => $curve,
        'license_id' => $license['id'],
    ]);
}

// ---------- Admin handlers ----------

function handle_admin_list_requests(): void {
    tl_require_admin();
    $status = $_GET['status'] ?? null;
    $sql = 'SELECT * FROM package_requests';
    $params = [];
    if (in_array($status, ['pending','approved','rejected'], true)) {
        $sql .= ' WHERE status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY created_at DESC';
    $stmt = tl_db()->prepare($sql);
    $stmt->execute($params);
    tl_json_response($stmt->fetchAll());
}

function handle_admin_list_users(): void {
    tl_require_admin();
    $rows = tl_db()->query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC')->fetchAll();
    tl_json_response($rows);
}

function handle_admin_stats(): void {
    tl_require_admin();
    $db = tl_db();
    $stats = [
        'users'              => (int)$db->query("SELECT COUNT(*) FROM users WHERE role='user'")->fetchColumn(),
        'pending_requests'   => (int)$db->query("SELECT COUNT(*) FROM package_requests WHERE status='pending'")->fetchColumn(),
        'approved_requests'  => (int)$db->query("SELECT COUNT(*) FROM package_requests WHERE status='approved'")->fetchColumn(),
        'rejected_requests'  => (int)$db->query("SELECT COUNT(*) FROM package_requests WHERE status='rejected'")->fetchColumn(),
        'active_licenses'    => (int)$db->query("SELECT COUNT(*) FROM licenses WHERE status='active' AND expires_at > NOW()")->fetchColumn(),
        'total_backtests'    => (int)$db->query('SELECT COUNT(*) FROM backtests')->fetchColumn(),
    ];
    tl_json_response($stats);
}

function handle_admin_approve(string $requestId): void {
    tl_require_admin();
    $db = tl_db();

    $stmt = $db->prepare('SELECT * FROM package_requests WHERE id = ?');
    $stmt->execute([$requestId]);
    $req = $stmt->fetch();
    if (!$req) tl_error('Request not found', 404);
    if ($req['status'] !== 'pending') tl_error('Request is not pending', 409);

    // Determine validity & limit
    if ((int)$req['is_demo'] === 1) {
        $row = $db->query("SELECT data_json FROM demo_plan WHERE id='demo'")->fetch();
        $d = json_decode($row['data_json'], true);
        $hours = (int)($d['hours'] ?? 1);
        $expires_at = (new DateTime())->modify("+{$hours} hours")->format('Y-m-d H:i:s');
        $limit = (int)($d['backtests_limit'] ?? 50);
    } else {
        $p = $db->prepare('SELECT options_json FROM plans WHERE id = ?');
        $p->execute([$req['plan_id']]);
        $plan = $p->fetch();
        if (!$plan) tl_error('Plan no longer exists', 404);
        $options = json_decode($plan['options_json'], true);
        $opt = $options[(int)$req['option_index']] ?? null;
        if (!$opt) tl_error('Option no longer exists', 404);
        $days = (int)$opt['days'];
        $expires_at = (new DateTime())->modify("+{$days} days")->format('Y-m-d H:i:s');
        $limit = (int)$opt['backtests_limit'];
    }

    $lic_id = tl_uuid();
    $insert = $db->prepare('INSERT INTO licenses (id, user_id, request_id, plan_id, plan_name, period, license_key, api_key, expires_at, backtests_limit) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $insert->execute([
        $lic_id, $req['user_id'], $req['id'], $req['plan_id'], $req['plan_name'], $req['period'],
        tl_license_key(), tl_api_key(), $expires_at, $limit,
    ]);

    $db->prepare("UPDATE package_requests SET status='approved', decided_at=NOW() WHERE id=?")->execute([$req['id']]);

    $lic = $db->prepare('SELECT * FROM licenses WHERE id = ?');
    $lic->execute([$lic_id]);
    tl_json_response(['success' => true, 'license' => $lic->fetch()]);
}

function handle_admin_reject(string $requestId): void {
    tl_require_admin();
    $b = tl_read_json();
    $reason = trim((string)($b['reason'] ?? ''));
    $db = tl_db();

    $stmt = $db->prepare('SELECT id, status FROM package_requests WHERE id = ?');
    $stmt->execute([$requestId]);
    $req = $stmt->fetch();
    if (!$req) tl_error('Request not found', 404);
    if ($req['status'] !== 'pending') tl_error('Request is not pending', 409);

    $upd = $db->prepare("UPDATE package_requests SET status='rejected', reject_reason=?, decided_at=NOW() WHERE id=?");
    $upd->execute([$reason !== '' ? $reason : null, $req['id']]);

    tl_json_response(['success' => true]);
}
