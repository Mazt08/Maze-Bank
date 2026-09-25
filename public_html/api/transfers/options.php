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

// Extract session token
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

$authStmt = $conn->prepare("SELECT user_id FROM sessions WHERE session_token = ? AND expires_at > NOW() LIMIT 1");
$authStmt->bind_param("s", $sessionToken);
$authStmt->execute();
$authResult = $authStmt->get_result();

if (!$authResult || $authResult->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid or expired session.']);
    $authStmt->close();
    exit;
}

$authUser = $authResult->fetch_assoc();
$userId = (int) $authUser['user_id'];
$authStmt->close();

// Fetch user's own accounts
$myAccStmt = $conn->prepare("SELECT id, account_number, balance FROM accounts WHERE user_id = ?");
$myAccStmt->bind_param("i", $userId);
$myAccStmt->execute();
$myAccResult = $myAccStmt->get_result();
$myAccounts = [];
while ($row = $myAccResult->fetch_assoc()) {
    $myAccounts[] = [
        'id' => (int) $row['id'],
        'account_number' => $row['account_number'],
        'balance' => (float) $row['balance'],
    ];
}
$myAccStmt->close();

// Fetch recipient accounts (other accounts in the system)
$recipStmt = $conn->prepare("SELECT a.id, a.account_number, u.username FROM accounts a INNER JOIN users u ON u.id = a.user_id WHERE a.user_id != ? ORDER BY u.username ASC");
$recipStmt->bind_param("i", $userId);
$recipStmt->execute();
$recipResult = $recipStmt->get_result();
$recipients = [];
while ($row = $recipResult->fetch_assoc()) {
    $recipients[] = [
        'id' => (int) $row['id'],
        'account_number' => $row['account_number'],
        'username' => $row['username'],
    ];
}
$recipStmt->close();

echo json_encode([
    'success' => true,
    'accounts' => $myAccounts,
    'recipients' => $recipients,
]);

$conn->close();
