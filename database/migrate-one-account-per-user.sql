-- Maze Bank - One Account Per User Migration
--
-- Merges the legacy checking/savings (deposit/checking) account pairs into a
-- single account per user and drops the account_type concept entirely.
--
-- Run this ONCE against an existing Maze Bank database before deploying the
-- updated application. Back up the database first.
--
--   mysql -u root -p maze_bank < database/migrate-one-account-per-user.sql
--
-- The script is re-runnable: applied to an already-migrated database it
-- makes no changes (each step is guarded with an information_schema check).
--
-- NOTE: MySQL implicitly commits around DDL statements, so this cannot be
-- rolled back as a unit - that is why you take a backup first.

-- ---------------------------------------------------------------------------
-- Step 1: Merge duplicate accounts (2+ rows per user_id) into the lowest id
--         row. The surviving row's balance becomes the sum of all balances.
-- ---------------------------------------------------------------------------

-- Transactions reference the accounts that are about to be deleted, so
-- re-point them at the surviving account BEFORE deleting anything.
UPDATE transactions t
JOIN (
  SELECT a.id AS old_account_id, keeper.keep_id
  FROM accounts a
  JOIN (
    SELECT user_id, MIN(id) AS keep_id
    FROM accounts
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) keeper ON keeper.user_id = a.user_id
  WHERE a.id <> keeper.keep_id
) m ON m.old_account_id = t.from_account
SET t.from_account = m.keep_id;

UPDATE transactions t
JOIN (
  SELECT a.id AS old_account_id, keeper.keep_id
  FROM accounts a
  JOIN (
    SELECT user_id, MIN(id) AS keep_id
    FROM accounts
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) keeper ON keeper.user_id = a.user_id
  WHERE a.id <> keeper.keep_id
) m ON m.old_account_id = t.to_account
SET t.to_account = m.keep_id;

-- Fold every balance of the discarded accounts into the surviving account.
UPDATE accounts a
JOIN (
  SELECT user_id, MIN(id) AS keep_id, SUM(balance) AS total_balance
  FROM accounts
  GROUP BY user_id
  HAVING COUNT(*) > 1
) totals ON totals.keep_id = a.id
SET a.balance = totals.total_balance;

-- Drop the leftover rows (all accounts except the lowest id per user).
DELETE a FROM accounts a
JOIN (
  SELECT user_id, MIN(id) AS keep_id
  FROM accounts
  GROUP BY user_id
  HAVING COUNT(*) > 1
) keeper ON keeper.user_id = a.user_id
WHERE a.id <> keeper.keep_id;

-- ---------------------------------------------------------------------------
-- Step 2: Normalise the account number format to {year}-{USERNAME}.
--         Legacy numbers (1001-2024-ALICE, 1002-2024-ALICE, ...) lose their
--         numeric prefix. Rows already in the target format are untouched.
-- ---------------------------------------------------------------------------
UPDATE accounts a
JOIN users u ON u.id = a.user_id
SET a.account_number = CONCAT(DATE_FORMAT(a.created_at, '%Y'), '-', UPPER(u.username))
WHERE a.account_number <> CONCAT(DATE_FORMAT(a.created_at, '%Y'), '-', UPPER(u.username));

-- ---------------------------------------------------------------------------
-- Step 3: Drop the account_type column (nothing references it anymore).
--         Guarded so the script can be re-run on MySQL, which has no
--         "DROP COLUMN IF EXISTS".
-- ---------------------------------------------------------------------------
SET @has_type := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts'
    AND COLUMN_NAME = 'account_type'
);
SET @drop_type := IF(@has_type > 0,
  'ALTER TABLE accounts DROP COLUMN account_type', 'DO 0');
PREPARE stmt FROM @drop_type;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Step 4: Enforce one account per user going forward. The index is dropped
--         first (if present) so the script can be re-run.
-- ---------------------------------------------------------------------------
SET @has_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts'
    AND INDEX_NAME = 'uq_accounts_user_id'
);
SET @drop_index := IF(@has_index > 0,
  'ALTER TABLE accounts DROP INDEX uq_accounts_user_id', 'DO 0');
PREPARE stmt FROM @drop_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE accounts ADD UNIQUE INDEX uq_accounts_user_id (user_id);

-- ---------------------------------------------------------------------------
-- Verification - every column should read 0 after a successful migration.
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM (
    SELECT user_id FROM accounts GROUP BY user_id HAVING COUNT(*) > 1
  ) dupes) AS users_with_multiple_accounts,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts'
       AND COLUMN_NAME = 'account_type') AS account_type_columns_left;
