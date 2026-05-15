<?php
require_once __DIR__ . '/helpers.php';

function tl_seed(): void {
    $db = tl_db();

    // Seed plans if empty
    $count = $db->plans->countDocuments();
    if ($count === 0) {
        $plans = [
            [
                'id' => 'starter',
                'name' => 'Starter',
                'tag' => 'Perfect for individual traders',
                'popular' => false,
                'sort_order' => 1,
                'options' => [
                    ['period'=>'1 day','price_usd'=>49,'detail'=>'50 backtests','days'=>1,'backtests_limit'=>50],
                    ['period'=>'7 days','price_usd'=>99,'detail'=>'500 backtests','days'=>7,'backtests_limit'=>500],
                    ['period'=>'1 month','price_usd'=>299,'detail'=>'3,000 backtests','days'=>30,'backtests_limit'=>3000]
                ],
                'features' => ['Up to 3,000 backtests / month','Standard data resolution (1m)','Email support','Core indicators library','Weekly data updates','30-day report history','Telegram / Slack alerts']
            ],
            [
                'id' => 'pro',
                'name' => 'Pro',
                'tag' => 'For growing trading desks',
                'popular' => true,
                'sort_order' => 2,
                'options' => [
                    ['period'=>'1 day','price_usd'=>99,'detail'=>'500 backtests','days'=>1,'backtests_limit'=>500],
                    ['period'=>'7 days','price_usd'=>199,'detail'=>'5,000 backtests','days'=>7,'backtests_limit'=>5000],
                    ['period'=>'1 month','price_usd'=>599,'detail'=>'30,000 backtests','days'=>30,'backtests_limit'=>30000]
                ],
                'features' => ['Up to 30,000 backtests / month','High-res tick data (1s)','Priority chat support','Advanced indicators + ML','90-day report history','Real-time data feeds','Multi-account workspaces']
            ],
            [
                'id' => 'enterprise',
                'name' => 'Enterprise',
                'tag' => 'Institutional-grade platform',
                'popular' => false,
                'sort_order' => 3,
                'options' => [
                    ['period'=>'1 day','price_usd'=>799,'detail'=>'Unlimited','days'=>1,'backtests_limit'=>999999],
                    ['period'=>'7 days','price_usd'=>1599,'detail'=>'Unlimited + WS','days'=>7,'backtests_limit'=>999999],
                    ['period'=>'1 month','price_usd'=>9999,'detail'=>'Unlimited + SLA','days'=>30,'backtests_limit'=>999999]
                ],
                'features' => ['Unlimited backtests & strategies','Tick-level historical data','Dedicated success manager','24/7 phone + Slack support','Custom indicator development','370-day report retention','On-prem deployment option']
            ],
        ];
        foreach ($plans as $p) {
            $db->plans->insertOne($p);
        }
    }

    // Seed demo plan
    $exists = $db->demo_plan->findOne(['id' => 'demo']);
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
        $db->demo_plan->insertOne($demo);
    }

    // Seed admin user
    $adminEmail = strtolower(tl_env('ADMIN_EMAIL', 'admin@gmail.com'));
    $adminPass  = tl_env('ADMIN_PASSWORD', 'admin123');
    $adminName  = tl_env('ADMIN_NAME', 'Administrator');
    
    $exists = $db->users->findOne(['email' => $adminEmail]);
    if (!$exists) {
        $db->users->insertOne([
            'id' => tl_uuid(),
            'email' => $adminEmail,
            'password_hash' => tl_hash_password($adminPass),
            'name' => $adminName,
            'role' => 'admin',
            'created_at' => date('c')
        ]);
    }
}
