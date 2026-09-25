<?php
/**
 * Database Reset Script (PHP / CLI)
 * Resets the database to a clean, known seed state for grading and PoC replays.
 */

require_once __DIR__ . '/../public_html/api/config/db.php';

$conn = mazeDbConnect();

$resetSqlFile = __DIR__ . '/reset.sql';
if (!file_exists($resetSqlFile)) {
    die("Error: reset.sql not found at {$resetSqlFile}\n");
}

$sql = file_get_contents($resetSqlFile);

// Execute multiple SQL statements
if ($conn->multi_query($sql)) {
    do {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());
}

if ($conn->errno) {
    echo "❌ Database reset failed: " . $conn->error . "\n";
    exit(1);
} else {
    echo "✅ Database successfully reset and re-seeded to known state!\n";
    echo "Initial test accounts:\n";
    echo " - alice:   \$17,500.00\n";
    echo " - bob:     \$11,200.50\n";
    echo " - charlie: \$35,000.00\n";
    echo " - admin:   \$1,000,000.00\n";
    exit(0);
}
