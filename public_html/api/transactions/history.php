<?php
header('Content-Type: application/json; charset=UTF-8');
require __DIR__ . '/../config/db.php';

$conn = mazeDbConnect();

$accountId = isset($_GET['account_id']) ? (int) $_GET['account_id'] : 0;
$search = $_GET['search'] ?? '';

if ($accountId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid account_id is required.']);
    exit;
}

// VULN: User-controlled search input is interpolated directly into the SQL WHERE clause.
// A payload like %' OR '1'='1 can bypass the filter and dump all transactions.
// SECURE: Prepared statements would use WHERE description LIKE ? with a bound parameter.
$sql = "SELECT t.*, a1.account_number AS from_account_number, a2.account_number AS to_account_number FROM transactions t INNER JOIN accounts a1 ON a1.id = t.from_account INNER JOIN accounts a2 ON a2.id = t.to_account WHERE t.from_account = {$accountId} AND t.description LIKE '%{$search}%' ORDER BY t.timestamp DESC LIMIT 50";

$result = $conn->query($sql);

$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
}

echo json_encode([
    'account_id' => $accountId,
    'search' => $search,
    'transactions' => $rows,
]);

$conn->close();
