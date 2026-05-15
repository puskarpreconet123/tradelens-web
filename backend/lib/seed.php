<?php
require_once __DIR__ . '/helpers.php';

function tl_seed(): void {
    $db = tl_db();

    // Seed plans if empty
    $count = (int)$db->query('SELECT COUNT(*) FROM plans')->fetchColumn();
    if ($count === 0) {
        $plans = [
            ['starter','Starter','Perfect for individual traders',0,1,
              [['period'=>'1 day','price_usd'=>49,'detail'=>'50 backtests','days'=>1,'backtests_limit'=>50],
               ['period'=>'7 days','price_usd'=>99,'detail'=>'500 backtests','days'=>7,'backtests_limit'=>500],
               ['period'=>'1 month','price_usd'=>299,'detail'=>'3,000 backtests','days'=>30,'backtests_limit'=>3000]],
              ['Up to 3,000 backtests / month','Standard data resolution (1m)','Email support','Core indicators library','Weekly data updates','30-day report history','Telegram / Slack alerts']
            ],
            ['pro','Pro','For growing trading desks',1,2,
              [['period'=>'1 day','price_usd'=>99,'detail'=>'500 backtests','days'=>1,'backtests_limit'=>500],
               ['period'=>'7 days','price_usd'=>199,'detail'=>'5,000 backtests','days'=>7,'backtests_limit'=>5000],
               ['period'=>'1 month','price_usd'=>599,'detail'=>'30,000 backtests','days'=>30,'backtests_limit'=>30000]],
              ['Up to 30,000 backtests / month','High-res tick data (1s)','Priority chat support','Advanced indicators + ML','90-day report history','Real-time data feeds','Multi-account workspaces']
            ],
            ['enterprise','Enterprise','Institutional-grade platform',0,3,
              [['period'=>'1 day','price_usd'=>799,'detail'=>'Unlimited','days'=>1,'backtests_limit'=>999999],
               ['period'=>'7 days','price_usd'=>1599,'detail'=>'Unlimited + WS','days'=>7,'backtests_limit'=>999999],
               ['period'=>'1 month','price_usd'=>9999,'detail'=>'Unlimited + SLA','days'=>30,'backtests_limit'=>999999]],
              ['Unlimited backtests & strategies','Tick-level historical data','Dedicated success manager','24/7 phone + Slack support','Custom indicator development','370-day report retention','On-prem deployment option']
            ],
        ];
        $stmt = $db->prepare('INSERT INTO plans (id, name, tag, popular, sort_order, options_json, features_json) VALUES (?,?,?,?,?,?,?)');
        foreach ($plans as $p) {
            $stmt->execute([$p[0], $p[1], $p[2], $p[3], $p[4], json_encode($p[5]), json_encode($p[6])]);
        }
    }

    // Seed demo plan
    $exists = $db->query("SELECT COUNT(*) FROM demo_plan WHERE id='demo'")->fetchColumn();
    if (!$exists) {
        $demo = [
            'id' => 'demo',
            'name' => 'Try Demo',
            'price_usd' => 19,
            'duration' => '1 Hour Full Access',
            'limit' => '50 Backtests Included',
            'days' => 0,
            'hours' => 1,
            'backtests_limit' => 50,
            'perks' => ['Run up to 50 backtests','Full 1-hour access','Test every Pro feature','Instant activation','Email onboarding'],
        ];
        $stmt = $db->prepare('INSERT INTO demo_plan (id, data_json) VALUES (?, ?)');
        $stmt->execute(['demo', json_encode($demo)]);
    }

    // Seed admin user
    $adminEmail = strtolower(tl_env('ADMIN_EMAIL', 'admin@gmail.com'));
    $adminPass  = tl_env('ADMIN_PASSWORD', 'admin123');
    $adminName  = tl_env('ADMIN_NAME', 'Administrator');
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$adminEmail]);
    if (!$stmt->fetch()) {
        $insert = $db->prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?,?,?,?,?)');
        $insert->execute([tl_uuid(), $adminEmail, tl_hash_password($adminPass), $adminName, 'admin']);
    }
}
