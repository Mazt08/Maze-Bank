<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/../config/db.php';

$conn = mazeDbConnect();

$username = trim((string) ($_POST['username'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

// VULN: Brute force - no rate limiting, lockout, or CAPTCHA is enforced.
// Repeated failed attempts are silently accepted, making password guessing easy.
// SECURE: A fixed version would track attempts and enforce exponential backoff or lockouts.
if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password are required.']);
    exit;
}

$passwordHash = hash('sha256', $password);

// VULN: SQL Injection - user input is concatenated directly into the query string.
// An attacker can enter a crafted username like admin' -- to bypass the password check.
// SECURE: Prepared statements would bind parameters instead: SELECT * FROM users WHERE username = ? AND password_hash = ?
$sql = "SELECT * FROM users WHERE username = '{$username}' AND password_hash = '{$passwordHash}' LIMIT 1";
$result = $conn->query($sql);

if (!$result || $result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password.']);
    exit;
}

$user = $result->fetch_assoc();

// VULN: Predictable session token generation with md5(username + time()) is easy to guess.
// SECURE: random_bytes(32) or bin2hex(random_bytes(32)) would provide a cryptographically random token.
$sessionToken = md5($user['username'] . time());
$expiresAt = date('Y-m-d H:i:s', time() + 86400);

$insertSql = "INSERT INTO sessions (user_id, session_token, expires_at) VALUES ({$user['id']}, '{$sessionToken}', '{$expiresAt}') ON DUPLICATE KEY UPDATE session_token = '{$sessionToken}', expires_at = '{$expiresAt}', created_at = NOW()";
$conn->query($insertSql);

setcookie('maze_session', $sessionToken, time() + 86400, '/', '', false, false);

echo json_encode([
    'success' => true,
    'user' => [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
    ],
    'session_token' => $sessionToken,
    'expires_at' => $expiresAt,
]);

$conn->close();
