<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/db.php';

$conn = mazeDbConnect();

$tokenFromCookie = $_COOKIE['maze_session'] ?? $_COOKIE['session_token'] ?? '';
$tokenFromHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (strpos($tokenFromHeader, 'Bearer ') === 0) {
    $tokenFromHeader = trim(substr($tokenFromHeader, 7));
} else {
    $tokenFromHeader = '';
}
$sessionToken = $tokenFromCookie !== '' ? $tokenFromCookie : $tokenFromHeader;

if ($sessionToken === '') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required.']);
    exit;
}

$stmt = $conn->prepare("SELECT user_id FROM sessions WHERE session_token = ? AND expires_at > NOW() LIMIT 1");
$stmt->bind_param("s", $sessionToken);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid or expired session.']);
    $stmt->close();
    exit;
}

$user = $res->fetch_assoc();
$userId = (int) $user['user_id'];
$stmt->close();

$accStmt = $conn->prepare("SELECT id, user_id, account_number, balance, created_at FROM accounts WHERE user_id = ?");
$accStmt->bind_param("i", $userId);
$accStmt->execute();
$accResult = $accStmt->get_result();

$accounts = [];
while ($row = $accResult->fetch_assoc()) {
    $accounts[] = [
        'id' => (int) $row['id'],
        'user_id' => (int) $row['user_id'],
        'account_number' => $row['account_number'],
        'balance' => (float) $row['balance'],
        'created_at' => $row['created_at'],
    ];
}
$accStmt->close();

echo json_encode([
    'success' => true,
    'accounts' => $accounts,
]);

$conn->close();
