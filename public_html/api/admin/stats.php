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

// Check Admin
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

$stmt = $conn->prepare("SELECT u.id, u.role FROM sessions s INNER JOIN users u ON u.id = s.user_id WHERE s.session_token = ? AND s.expires_at > NOW() LIMIT 1");
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
$stmt->close();

if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required.']);
    exit;
}

$userCount = $conn->query("SELECT COUNT(*) as count FROM users")->fetch_assoc()['count'] ?? 0;
$accountCount = $conn->query("SELECT COUNT(*) as count FROM accounts")->fetch_assoc()['count'] ?? 0;
$totalBalance = $conn->query("SELECT COALESCE(SUM(balance), 0) as total FROM accounts")->fetch_assoc()['total'] ?? 0;
$txCount = $conn->query("SELECT COUNT(*) as count FROM transactions")->fetch_assoc()['count'] ?? 0;
$failedLogins = $conn->query("SELECT COUNT(*) as count FROM login_attempts")->fetch_assoc()['count'] ?? 0;

echo json_encode([
    'success' => true,
    'stats' => [
        'totalUsers' => (int) $userCount,
        'totalAccounts' => (int) $accountCount,
        'totalBalance' => (float) $totalBalance,
        'totalTransactions' => (int) $txCount,
        'failedLogins' => (int) $failedLogins,
    ],
]);

$conn->close();
