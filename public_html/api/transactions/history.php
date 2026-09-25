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

$accountId = isset($_GET['account_id']) ? (int) $_GET['account_id'] : 0;
$search = $_GET['search'] ?? '';

if ($accountId <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'A valid account_id is required.',
    ]);
    exit;
}

// ============================================================================
// VULN: User-controlled search input is interpolated directly into the SQL WHERE clause.
// A payload like %' OR '1'='1 can bypass the filter and dump all transactions across all users.
// SECURE: Prepared statements would use WHERE description LIKE ? with a bound parameter.
// ============================================================================
$sql = "SELECT t.*, a1.account_number AS from_account_number, a2.account_number AS to_account_number FROM transactions t INNER JOIN accounts a1 ON a1.id = t.from_account INNER JOIN accounts a2 ON a2.id = t.to_account WHERE (t.from_account = {$accountId} OR t.to_account = {$accountId}) AND t.description LIKE '%{$search}%' ORDER BY t.timestamp DESC LIMIT 50";

$result = $conn->query($sql);

$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'id' => (int) $row['id'],
            'from_account' => (int) $row['from_account'],
            'to_account' => (int) $row['to_account'],
            'from_account_number' => $row['from_account_number'],
            'to_account_number' => $row['to_account_number'],
            'amount' => (float) $row['amount'],
            'description' => $row['description'],
            'transaction_type' => $row['transaction_type'] ?? 'transfer',
            'timestamp' => $row['timestamp'],
        ];
    }
}

echo json_encode([
    'success' => true,
    'account_id' => $accountId,
    'search' => $search,
    'transactions' => $rows,
]);

$conn->close();

