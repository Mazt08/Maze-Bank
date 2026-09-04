<?php
return [
    'host' => getenv('DB_HOST') ?: 'localhost',
    'port' => (int) (getenv('DB_PORT') ?: 3306),
    'database' => getenv('DB_NAME') ?: 'maze_bank',
    'username' => getenv('DB_USER') ?: 'maze_user',
    'password' => getenv('DB_PASS') ?: 'ChangeMe123!',
];
