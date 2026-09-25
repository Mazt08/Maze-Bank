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

$tokenFromQuery = $_GET['session_token'] ?? '';

$sessionToken = $tokenFromCookie !== '' ? $tokenFromCookie : ($tokenFromHeader !== '' ? $tokenFromHeader : $tokenFromQuery);

if ($sessionToken === '') {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'No valid session token provided.',
    ]);
    exit;
}

// Session lookup using prepared statement (auth check is protected; intentional vuln is in login and search)
$stmt = $conn->prepare("SELECT s.*, u.username, u.role FROM sessions s INNER JOIN users u ON u.id = s.user_id WHERE s.session_token = ? AND s.expires_at > NOW() LIMIT 1");
$stmt->bind_param("s", $sessionToken);
$stmt->execute();
$result = $stmt->get_result();

if (!$result || $result->num_rows === 0) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'Session expired or invalid.',
    ]);
    exit;
}

$session = $result->fetch_assoc();

echo json_encode([
    'success' => true,
    'authenticated' => true,
    'user' => [
        'id' => (int) $session['user_id'],
        'username' => $session['username'],
        'role' => $session['role'],
    ],
    'session_token' => $sessionToken,
]);

$stmt->close();
$conn->close();

