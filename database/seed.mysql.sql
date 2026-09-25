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
