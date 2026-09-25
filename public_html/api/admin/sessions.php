<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
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

$admin = $res->fetch_assoc();
$stmt->close();

if ($admin['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required.']);
    exit;
}

// VULN: Admin can view all active sessions including plaintext tokens
$sessRes = $conn->query("SELECT s.id, s.user_id, s.session_token, s.created_at, s.expires_at, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.expires_at > NOW() ORDER BY s.created_at DESC");
$sessions = [];
while ($row = $sessRes->fetch_assoc()) {
    $sessions[] = [
        'id' => (int) $row['id'],
        'user_id' => (int) $row['user_id'],
        'username' => $row['username'],
        'session_token' => $row['session_token'],
        'created_at' => $row['created_at'],
        'expires_at' => $row['expires_at'],
    ];
}

echo json_encode([
    'success' => true,
    'sessions' => $sessions,
]);

$conn->close();
