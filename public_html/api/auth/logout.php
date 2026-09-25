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

$tokenFromCookie = $_COOKIE['maze_session'] ?? $_COOKIE['session_token'] ?? '';
$tokenFromHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (strpos($tokenFromHeader, 'Bearer ') === 0) {
    $tokenFromHeader = trim(substr($tokenFromHeader, 7));
} else {
    $tokenFromHeader = '';
}

$sessionToken = $tokenFromCookie !== '' ? $tokenFromCookie : $tokenFromHeader;

if ($sessionToken !== '') {
    $stmt = $conn->prepare("DELETE FROM sessions WHERE session_token = ?");
    if ($stmt) {
        $stmt->bind_param("s", $sessionToken);
        $stmt->execute();
        $stmt->close();
    }
}

setcookie('maze_session', '', time() - 3600, '/');
setcookie('session_token', '', time() - 3600, '/');

echo json_encode([
    'success' => true,
    'message' => 'Logout successful',
]);

$conn->close();
