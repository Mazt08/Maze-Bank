<?php

function mazeDbConnect() {
    $configPath = dirname(__DIR__, 3) . '/config/db.php';

    if (file_exists($configPath)) {
        $config = require $configPath;
    } else {
        $config = [
            'host' => 'localhost',
            'port' => 3306,
            'database' => 'maze_bank',
            'username' => 'maze_user',
            'password' => 'ChangeMe123!',
        ];
    }

    $connection = new mysqli(
        $config['host'],
        $config['username'],
        $config['password'],
        $config['database'],
        $config['port']
    );

    if ($connection->connect_errno) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Database connection failed',
            'message' => $connection->connect_error,
        ]);
        exit;
    }

    return $connection;
}
