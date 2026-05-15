<?php
header('Access-Control-Allow-Origin: *');
echo json_encode(['status' => 'ok', 'message' => 'PHP is working in public/']);
