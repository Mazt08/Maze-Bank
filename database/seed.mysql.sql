INSERT INTO users (username, password_hash, role) VALUES
('alice', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c', 'user'),
('bob', '1d4598d1949b47f7f211134b639ec32238ce73086a83c2f745713b3f12f817e5', 'user'),
('charlie', '9dbd5c893b5b573a1aa909c8cade58df194310e411c590d9fb0d63431841fd67', 'user'),
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

INSERT INTO accounts (user_id, account_number, balance, account_type) VALUES
((SELECT id FROM users WHERE username = 'alice'), '1001-2024-ALICE', 5000.00, 'checking'),
((SELECT id FROM users WHERE username = 'alice'), '1002-2024-ALICE', 12500.00, 'savings'),
((SELECT id FROM users WHERE username = 'bob'), '1003-2024-BOB', 3000.00, 'checking'),
((SELECT id FROM users WHERE username = 'bob'), '1004-2024-BOB', 8200.50, 'savings'),
((SELECT id FROM users WHERE username = 'charlie'), '1005-2024-CHARLIE', 10000.00, 'checking'),
((SELECT id FROM users WHERE username = 'charlie'), '1006-2024-CHARLIE', 25000.00, 'savings'),
((SELECT id FROM users WHERE username = 'admin'), '1000-2024-ADMIN', 1000000.00, 'checking');

INSERT INTO transactions (from_account, to_account, amount, description, transaction_type) VALUES
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), 500.00, 'Lunch payment', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), (SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), 200.00, 'Coffee repayment', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), (SELECT id FROM accounts WHERE account_number = '1002-2024-ALICE'), 1500.00, 'Project reimbursement', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '1002-2024-ALICE'), 2000.00, 'Savings transfer', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), (SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), 150.00, 'Birthday gift', 'transfer'),
((SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), (SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), 300.00, 'Book purchase reimbursement', 'transfer');

INSERT INTO sessions (user_id, session_token, expires_at) VALUES
((SELECT id FROM users WHERE username = 'alice'), 'demo-alice-session-token', DATE_ADD(NOW(), INTERVAL 24 HOUR));
