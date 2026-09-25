-- Maze Bank Database Reset Script
-- Drops all existing tables and re-seeds to a clean, known test state

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS admin_log;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Create Schema
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_accounts_user_id (user_id)
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

CREATE TABLE login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) DEFAULT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT DEFAULT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_transactions_from_account ON transactions(from_account);
CREATE INDEX idx_transactions_to_account ON transactions(to_account);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_admin_log_admin_id ON admin_log(admin_id);

-- 2. Seed Clean Test Data
INSERT INTO users (username, password_hash, role) VALUES
('alice', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c', 'user'),
('bob', '1d4598d1949b47f7f211134b639ec32238ce73086a83c2f745713b3f12f817e5', 'user'),
('charlie', '9dbd5c893b5b573a1aa909c8cade58df194310e411c590d9fb0d63431841fd67', 'user'),
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

INSERT INTO accounts (user_id, account_number, balance) VALUES
((SELECT id FROM users WHERE username = 'alice'), '2024-ALICE', 17500.00),
((SELECT id FROM users WHERE username = 'bob'), '2024-BOB', 11200.50),
((SELECT id FROM users WHERE username = 'charlie'), '2024-CHARLIE', 35000.00),
((SELECT id FROM users WHERE username = 'admin'), '2024-ADMIN', 1000000.00);

INSERT INTO transactions (from_account, to_account, amount, description, transaction_type) VALUES
((SELECT id FROM accounts WHERE account_number = '2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '2024-BOB'), 500.00, 'Lunch payment', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '2024-BOB'), (SELECT id FROM accounts WHERE account_number = '2024-CHARLIE'), 200.00, 'Coffee repayment', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '2024-CHARLIE'), (SELECT id FROM accounts WHERE account_number = '2024-ALICE'), 1500.00, 'Project reimbursement', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '2024-CHARLIE'), (SELECT id FROM accounts WHERE account_number = '2024-ALICE'), 300.00, 'Book purchase reimbursement', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '2024-BOB'), 150.00, 'Birthday gift', 'transfer');

INSERT INTO sessions (user_id, session_token, expires_at) VALUES
((SELECT id FROM users WHERE username = 'alice'), 'demo-alice-session-token', DATE_ADD(NOW(), INTERVAL 24 HOUR));

INSERT INTO admin_log (admin_id, action, details) VALUES
((SELECT id FROM users WHERE username = 'admin'), 'system_init', 'Database re-seeded to baseline state');
