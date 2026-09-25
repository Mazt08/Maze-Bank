-- Old (pre-migration) Maze Bank schema + seed data, for testing the migration.

DROP DATABASE IF EXISTS maze_bank_migration_test;
CREATE DATABASE maze_bank_migration_test;
USE maze_bank_migration_test;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  account_number VARCHAR(20) NOT NULL UNIQUE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  account_type ENUM('checking', 'savings') DEFAULT 'checking',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_account INT NOT NULL,
  to_account INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  transaction_type ENUM('transfer', 'deposit', 'withdrawal') DEFAULT 'transfer',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_account) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (to_account) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_transactions_from_account ON transactions(from_account);
CREATE INDEX idx_transactions_to_account ON transactions(to_account);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);

INSERT INTO users (username, password_hash, role) VALUES
('alice', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c', 'user'),
('bob', '1d4598d1949b47f7f211134b639ec32238ce73086a83c2f745713b3f12f817e5', 'user'),
('charlie', '9dbd5c893b5b573a1aa909c8cade58df194310e411c590d9fb0d63431841fd67', 'user'),
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

-- Backdated created_at so the {year}-{USERNAME} rewrite yields 2024-ALICE etc.
INSERT INTO accounts (user_id, account_number, balance, account_type, created_at) VALUES
((SELECT id FROM users WHERE username = 'alice'), '1001-2024-ALICE', 5000.00, 'checking', '2024-03-01 10:00:00'),
((SELECT id FROM users WHERE username = 'alice'), '1002-2024-ALICE', 12500.00, 'savings', '2024-03-02 10:00:00'),
((SELECT id FROM users WHERE username = 'bob'), '1003-2024-BOB', 3000.00, 'checking', '2024-03-03 10:00:00'),
((SELECT id FROM users WHERE username = 'bob'), '1004-2024-BOB', 8200.50, 'savings', '2024-03-04 10:00:00'),
((SELECT id FROM users WHERE username = 'charlie'), '1005-2024-CHARLIE', 10000.00, 'checking', '2024-03-05 10:00:00'),
((SELECT id FROM users WHERE username = 'charlie'), '1006-2024-CHARLIE', 25000.00, 'savings', '2024-03-06 10:00:00'),
((SELECT id FROM users WHERE username = 'admin'), '1000-2024-ADMIN', 1000000.00, 'checking', '2024-03-07 10:00:00');

INSERT INTO transactions (from_account, to_account, amount, description, transaction_type) VALUES
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), 500.00, 'Lunch payment', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), (SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), 200.00, 'Coffee repayment', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), (SELECT id FROM accounts WHERE account_number = '1002-2024-ALICE'), 1500.00, 'Project reimbursement', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '1002-2024-ALICE'), 2000.00, 'Savings transfer', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), 150.00, 'Birthday gift', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), (SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), 300.00, 'Book purchase reimbursement', 'transfer');

INSERT INTO sessions (user_id, session_token, expires_at) VALUES
((SELECT id FROM users WHERE username = 'alice'), 'demo-alice-session-token', DATE_ADD(NOW(), INTERVAL 24 HOUR));
