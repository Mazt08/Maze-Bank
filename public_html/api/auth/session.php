<?php
header('Content-Type: application/json; charset=UTF-8');
require __DIR__ . '/../config/db.php';

$conn = mazeDbConnect();

$tokenFromCookie = $_COOKIE['maze_session'] ?? '';
$tokenFromHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (strpos($tokenFromHeader, 'Bearer ') === 0) {
    $tokenFromHeader = trim(substr($tokenFromHeader, 7));
} else {
    $tokenFromHeader = '';
}

$sessionToken = $tokenFromCookie !== '' ? $tokenFromCookie : $tokenFromHeader;

if ($sessionToken === '') {
    http_response_code(401);
    echo json_encode(['authenticated' => false, 'error' => 'No valid session token.']);
    exit;
}

// VULN: Session tokens are accepted without binding to an IP or user-agent.
// A captured token continues to work even when reused from another browser.
// SECURE: Bind sessions to the originating IP and user-agent, and rotate tokens on login.
$sql = "SELECT s.*, u.username, u.role FROM sessions s INNER JOIN users u ON u.id = s.user_id WHERE s.session_token = '{$sessionToken}' AND s.expires_at > NOW() LIMIT 1";
$result = $conn->query($sql);

if (!$result || $result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['authenticated' => false, 'error' => 'Session expired or invalid.']);
    exit;
}

$session = $result->fetch_assoc();

// VULN: Cookie is set without HttpOnly, Secure, or SameSite flags.
// In a lab it is readable/interceptable by client-side scripts or network attackers.
// SECURE: setcookie('maze_session', $token, [
//   'expires' => time() + 86400,
//   'httponly' => true,
//   'secure' => true,
//   'samesite' => 'Lax'
// ]);

echo json_encode([
    'authenticated' => true,
    'user' => [
        'id' => (int) $session['user_id'],
        'username' => $session['username'],
        'role' => $session['role'],
    ],
    'session_token' => $sessionToken,
]);

$conn->close();
