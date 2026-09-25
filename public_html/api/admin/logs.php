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

// Fetch failed login attempts
$loginAttemptsRes = $conn->query("SELECT id, username, ip_address, attempted_at FROM login_attempts ORDER BY attempted_at DESC LIMIT 100");
$loginAttempts = [];
if ($loginAttemptsRes) {
    while ($row = $loginAttemptsRes->fetch_assoc()) {
        $loginAttempts[] = [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'ip_address' => $row['ip_address'],
            'attempted_at' => $row['attempted_at'],
        ];
    }
}

// Fetch admin audit log
$adminLogRes = $conn->query("SELECT l.id, l.admin_id, u.username as admin_username, l.action, l.details, l.timestamp FROM admin_log l JOIN users u ON l.admin_id = u.id ORDER BY l.timestamp DESC LIMIT 100");
$adminLogs = [];
if ($adminLogRes) {
    while ($row = $adminLogRes->fetch_assoc()) {
        $adminLogs[] = [
            'id' => (int) $row['id'],
            'admin_id' => (int) $row['admin_id'],
            'admin_username' => $row['admin_username'],
            'action' => $row['action'],
            'details' => $row['details'],
            'timestamp' => $row['timestamp'],
        ];
    }
}

echo json_encode([
    'success' => true,
    'login_attempts' => $loginAttempts,
    'admin_logs' => $adminLogs,
]);

$conn->close();
