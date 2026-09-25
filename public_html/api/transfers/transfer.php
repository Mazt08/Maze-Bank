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

$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);

$fromAccountId = isset($jsonData['fromAccountId']) ? (int)$jsonData['fromAccountId'] : (isset($_POST['fromAccountId']) ? (int)$_POST['fromAccountId'] : 0);
$toAccountId = isset($jsonData['toAccountId']) ? (int)$jsonData['toAccountId'] : (isset($_POST['toAccountId']) ? (int)$_POST['toAccountId'] : 0);
$rawAmount = $jsonData['amount'] ?? $_POST['amount'] ?? null;
$description = trim((string)($jsonData['description'] ?? $_POST['description'] ?? 'Transfer'));
if ($description === '') {
    $description = 'Transfer';
}

// Server-side validation
if ($fromAccountId <= 0 || $toAccountId <= 0 || $rawAmount === null || $rawAmount === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'From account, recipient account, and amount are required.']);
    exit;
}

if (!is_numeric($rawAmount)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Transfer amount must be a valid number.']);
    exit;
}

$amount = round((float)$rawAmount, 2);

if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Transfer amount must be greater than zero.']);
    exit;
}

if ($fromAccountId === $toAccountId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Sender and recipient accounts cannot be the same.']);
    exit;
}

// Atomic Database Transaction
$conn->begin_transaction();

try {
    // Verify source account ownership
    $fromStmt = $conn->prepare("SELECT id, balance FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE");
    $fromStmt->bind_param("ii", $fromAccountId, $userId);
    $fromStmt->execute();
    $fromRes = $fromStmt->get_result();

    if (!$fromRes || $fromRes->num_rows === 0) {
        $conn->rollback();
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Source account not found or access denied.']);
        $fromStmt->close();
        exit;
    }

    $fromAccount = $fromRes->fetch_assoc();
    $currentBalance = (float)$fromAccount['balance'];
    $fromStmt->close();

    if ($currentBalance < $amount) {
        $conn->rollback();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Insufficient funds for this transfer.']);
        exit;
    }

    // Verify recipient account exists
    $toStmt = $conn->prepare("SELECT id FROM accounts WHERE id = ? FOR UPDATE");
    $toStmt->bind_param("i", $toAccountId);
    $toStmt->execute();
    $toRes = $toStmt->get_result();

    if (!$toRes || $toRes->num_rows === 0) {
        $conn->rollback();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Recipient account not found.']);
        $toStmt->close();
        exit;
    }
    $toStmt->close();

    // Debit sender
    $debitStmt = $conn->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
    $debitStmt->bind_param("di", $amount, $fromAccountId);
    $debitStmt->execute();
    $debitStmt->close();

    // Credit recipient
    $creditStmt = $conn->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
    $creditStmt->bind_param("di", $amount, $toAccountId);
    $creditStmt->execute();
    $creditStmt->close();

    // Record transaction entry
    $txType = 'transfer';
    $txStmt = $conn->prepare("INSERT INTO transactions (from_account, to_account, amount, description, transaction_type) VALUES (?, ?, ?, ?, ?)");
    $txStmt->bind_param("iidss", $fromAccountId, $toAccountId, $amount, $description, $txType);
    $txStmt->execute();
    $transactionId = (int)$conn->insert_id;
    $txStmt->close();

    $conn->commit();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Transfer completed successfully.',
        'transaction' => [
            'id' => $transactionId,
            'from_account' => $fromAccountId,
            'to_account' => $toAccountId,
            'amount' => $amount,
            'description' => $description,
            'transaction_type' => 'transfer',
        ],
    ]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Transfer transaction failed.']);
}

$conn->close();
