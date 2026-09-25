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

// Support both JSON body and POST form data
$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);

$username = trim((string) ($jsonData['username'] ?? $_POST['username'] ?? ''));
$password = (string) ($jsonData['password'] ?? $_POST['password'] ?? '');
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
// Handle multiple comma-separated IPs in X-Forwarded-For
if (strpos($clientIp, ',') !== false) {
    $clientIp = trim(explode(',', $clientIp)[0]);
}

// Server-side validation
if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Username and password are required.',
    ]);
    exit;
}

$passwordHash = hash('sha256', $password);

// ============================================================================
// VULN: SQL Injection - user input is concatenated directly into the query string.
// An attacker can enter a crafted username like admin' -- to bypass the password check.
// SECURE: Prepared statements would bind parameters instead:
// $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password_hash = ? LIMIT 1");
// $stmt->bind_param("ss", $username, $passwordHash);
// ============================================================================
$sql = "SELECT * FROM users WHERE username = '{$username}' AND password_hash = '{$passwordHash}' LIMIT 1";
$result = $conn->query($sql);

if (!$result || $result->num_rows === 0) {
    // VULN: Brute force - no rate limiting or lockout is enforced.
    // Audit Trail: Log failed attempt to login_attempts table for visible evidence in reports/demos without blocking.
    $logStmt = $conn->prepare("INSERT INTO login_attempts (username, ip_address, attempted_at) VALUES (?, ?, NOW())");
    if ($logStmt) {
        $logStmt->bind_param("ss", $username, $clientIp);
        $logStmt->execute();
        $logStmt->close();
    }

    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid username or password.',
    ]);
    exit;
}

$user = $result->fetch_assoc();

// ============================================================================
// VULN: Predictable session token generation with md5(username + time()) is easy to guess.
// SECURE: bin2hex(random_bytes(32)) would provide a cryptographically secure random token.
// ============================================================================
$sessionToken = md5($user['username'] . time());
$expiresAt = date('Y-m-d H:i:s', time() + 86400);

// Store session in database (prepared statement for session management)
$sessStmt = $conn->prepare("INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)");
if ($sessStmt) {
    $sessStmt->bind_param("iss", $user['id'], $sessionToken, $expiresAt);
    $sessStmt->execute();
    $sessStmt->close();
}

// VULN: Insecure cookie transmission (missing HttpOnly, Secure, SameSite=Strict flags)
setcookie('maze_session', $sessionToken, time() + 86400, '/', '', false, false);

echo json_encode([
    'success' => true,
    'message' => 'Login successful',
    'user' => [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
    ],
    'token' => $sessionToken,
    'session_token' => $sessionToken,
    'expires_at' => $expiresAt,
]);

$conn->close();

