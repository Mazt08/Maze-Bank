<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/db.php';

$conn = mazeDbConnect();

$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);

$username = trim((string) ($jsonData['username'] ?? $_POST['username'] ?? ''));
$password = (string) ($jsonData['password'] ?? $_POST['password'] ?? '');

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Username and password are required.',
    ]);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Password must be at least 6 characters.',
    ]);
    exit;
}

// Check if username already exists
$checkStmt = $conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
$checkStmt->bind_param("s", $username);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult && $checkResult->num_rows > 0) {
    http_response_code(409);
    echo json_encode([
        'success' => false,
        'error' => 'Username already exists.',
    ]);
    $checkStmt->close();
    exit;
}
$checkStmt->close();

$passwordHash = hash('sha256', $password);

// SECURE: Use prepared statement for registration
$stmt = $conn->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')");
$stmt->bind_param("ss", $username, $passwordHash);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to create user account.',
    ]);
    $stmt->close();
    exit;
}

$userId = (int) $conn->insert_id;
$stmt->close();

// Auto-provision 1 single account for user: {YEAR}-{USERNAME}
$year = date('Y');
$accountNumber = "{$year}-" . strtoupper($username);

$accStmt = $conn->prepare("INSERT INTO accounts (user_id, account_number, balance) VALUES (?, ?, 0.00)");
$accStmt->bind_param("is", $userId, $accountNumber);
$accStmt->execute();
$accStmt->close();

http_response_code(201);
echo json_encode([
    'success' => true,
    'message' => 'User registered successfully.',
    'user' => [
        'id' => $userId,
        'username' => $username,
        'role' => 'user',
    ],
]);

$conn->close();
