<?php
require_once __DIR__ . '/helpers.php';

function tl_seed(): void {
    $db = tl_db();

    $plans = [
        [
            'id' => 'basic',
            'name' => 'Basic',
            'tag' => 'Ideal for beginners',
            'popular' => false,
            'sort_order' => 1,
            'options' => [
                ['period'=>'1 day','price_usd'=>49,'detail'=>'2,000 USDT Limit','days'=>1,'limit'=>'2,000 USDT'],
                ['period'=>'7 days','price_usd'=>149,'detail'=>'15,000 USDT Limit','days'=>7,'limit'=>'15,000 USDT'],
                ['period'=>'1 month','price_usd'=>299,'detail'=>'200,000 USDT Limit','days'=>30,'limit'=>'200,000 USDT']
            ],
            'features' => ['Instant Activation','2k-200k Daily Limit','1 Device Access','Standard Email Support','Secure Web Dashboard','Network: TRC-20 Only','Real-time Status']
        ],
        [
            'id' => 'premium',
            'name' => 'Premium',
            'tag' => 'For advanced flashers',
            'popular' => true,
            'sort_order' => 2,
            'options' => [
                ['period'=>'1 day','price_usd'=>99,'detail'=>'35,000 USDT Limit','days'=>1,'limit'=>'35,000 USDT'],
                ['period'=>'7 days','price_usd'=>299,'detail'=>'150,000 USDT Limit','days'=>7,'limit'=>'150,000 USDT'],
                ['period'=>'1 month','price_usd'=>599,'detail'=>'750,000 USDT Limit','days'=>30,'limit'=>'750,000 USDT']
            ],
            'features' => ['High Speed Execution','35k-750k Daily Limit','2 Devices Access','Priority Chat Support','TRC-20 & ERC-20 Support','90-day History','Custom API Access']
        ],
        [
            'id' => 'master',
            'name' => 'Master',
            'tag' => 'Enterprise-level operations',
            'popular' => false,
            'sort_order' => 3,
            'options' => [
                ['period'=>'1 day','price_usd'=>799,'detail'=>'950,000 USDT Limit','days'=>1,'limit'=>'950,000 USDT'],
                ['period'=>'7 days','price_usd'=>1999,'detail'=>'10M USDT Limit','days'=>7,'limit'=>'10,000,000 USDT'],
                ['period'=>'1 month','price_usd'=>9999,'detail'=>'500M USDT Limit','days'=>30,'limit'=>'500,000,000 USDT']
            ],
            'features' => ['Unlimited Speed','950k-500M Daily Limit','Unlimited Devices','Dedicated Success Manager','All Networks Supported','Custom Network Routing','24/7 Phone Support']
        ],
    ];

    foreach ($plans as $p) {
        $db->plans->updateOne(['id' => $p['id']], ['$set' => $p], ['upsert' => true]);
    }

    // Seed demo plan
    $exists = $db->demo_plan->findOne(['id' => 'demo']);
    if (!$exists) {
        $demo = [
            'id' => 'demo',
            'name' => 'Try Demo',
            'price_usd' => 19,
            'duration' => '1 Hour Full Access',
            'limit' => '1,000 USDT Flash Limit',
            'days' => 0,
            'hours' => 1,
            'backtests_limit' => 1, // keeping field name for compatibility
            'perks' => ['Test premium features','Full 1-hour access','1,000 USDT Limit','Instant activation','Secure isolation'],
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
