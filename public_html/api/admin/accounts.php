<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
$adminId = (int) $admin['id'];
$stmt->close();

if ($admin['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required.']);
    exit;
}

// POST: Create account OR update balance — discriminated by which keys are present
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);

    // ---- Create account for a user (no type param — one account per user) ----
    if (isset($jsonData['userId'])) {
        $targetUserId = (int)$jsonData['userId'];

        if ($targetUserId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid userId is required.']);
            exit;
        }

        // Verify user exists
        $userStmt = $conn->prepare("SELECT id, username FROM users WHERE id = ? LIMIT 1");
        $userStmt->bind_param("i", $targetUserId);
        $userStmt->execute();
        $userRes = $userStmt->get_result();
        if (!$userRes || $userRes->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found.']);
            $userStmt->close();
            exit;
        }
        $targetUser = $userRes->fetch_assoc();
        $userStmt->close();

        // One account per user — reject duplicates
        $dupStmt = $conn->prepare("SELECT id FROM accounts WHERE user_id = ? LIMIT 1");
        $dupStmt->bind_param("i", $targetUserId);
        $dupStmt->execute();
        $dupRes = $dupStmt->get_result();
        if ($dupRes && $dupRes->num_rows > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'User already has an account.']);
            $dupStmt->close();
            exit;
        }
        $dupStmt->close();

        $year = date('Y');
        $accountNumber = "{$year}-" . strtoupper($targetUser['username']);

        $accStmt = $conn->prepare("INSERT INTO accounts (user_id, account_number, balance) VALUES (?, ?, 0.00)");
        $accStmt->bind_param("is", $targetUserId, $accountNumber);
        if (!$accStmt->execute()) {
            // Handle race-condition duplicate (unique index on user_id)
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'User already has an account.']);
            $accStmt->close();
            exit;
        }
        $newAccountId = (int)$conn->insert_id;
        $accStmt->close();

        // Audit log
        $logStmt = $conn->prepare("INSERT INTO admin_log (admin_id, action, details) VALUES (?, 'create_account', ?)");
        if ($logStmt) {
            $details = "Created account {$accountNumber} for user {$targetUser['username']} (id {$targetUserId})";
            $logStmt->bind_param("is", $adminId, $details);
            $logStmt->execute();
            $logStmt->close();
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Account created successfully.',
            'account' => [
                'id' => $newAccountId,
                'user_id' => $targetUserId,
                'username' => $targetUser['username'],
                'account_number' => $accountNumber,
                'balance' => 0.00,
            ],
        ]);
        $conn->close();
        exit;
    }

    // ---- Update account balance ----
    $accountId = isset($jsonData['accountId']) ? (int)$jsonData['accountId'] : 0;
    $newBalance = isset($jsonData['newBalance']) ? (float)$jsonData['newBalance'] : null;

    if ($accountId <= 0 || $newBalance === null || $newBalance < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Provide userId (create) or accountId + newBalance (update).']);
        exit;
    }

    $updStmt = $conn->prepare("UPDATE accounts SET balance = ? WHERE id = ?");
    $updStmt->bind_param("di", $newBalance, $accountId);
    $updStmt->execute();

    if ($updStmt->affected_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Account not found or balance unchanged.']);
        $updStmt->close();
        exit;
    }
    $updStmt->close();

    $logStmt = $conn->prepare("INSERT INTO admin_log (admin_id, action, details) VALUES (?, 'update_balance', ?)");
    if ($logStmt) {
        $details = "Updated account {$accountId} balance to {$newBalance}";
        $logStmt->bind_param("is", $adminId, $details);
        $logStmt->execute();
        $logStmt->close();
    }

    echo json_encode(['success' => true, 'message' => 'Account balance updated successfully.']);
    $conn->close();
    exit;
}

// GET: List all accounts
$accRes = $conn->query("SELECT a.id, a.user_id, a.account_number, a.balance, a.created_at, u.username FROM accounts a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC");
$accounts = [];
while ($row = $accRes->fetch_assoc()) {
    $accounts[] = [
        'id' => (int) $row['id'],
        'user_id' => (int) $row['user_id'],
        'username' => $row['username'],
        'account_number' => $row['account_number'],
        'balance' => (float) $row['balance'],
        'created_at' => $row['created_at'],
    ];
}

echo json_encode([
    'success' => true,
    'accounts' => $accounts,
]);

$conn->close();
