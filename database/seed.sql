-- Maze Bank Database Seed Data
-- Test credentials and fake account balances for educational use only

-- Insert test users
-- Passwords are hashed with SHA-256 (in real world, use bcrypt)
-- alice:pass123 / bob:pass456 / charlie:pass789 / admin:admin123

INSERT INTO users (username, password_hash, role) VALUES
('alice', '937c2ab8a95e02c17ba8e6e38bb5d3525d6a06cc8de8d7c0d9f9e8d9cdc3a1f1', 'user'),
('bob', '6f6a5ab92fd5a7c8a8c8d3d8e0e1f2f3f4f5f6f7f8f9fafbfcfdfeff00010203', 'user'),
('charlie', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1', 'user'),
('admin', 'b4f8a92d9f47e3e0e4e6e8ea0ece4e9edeef6f8faf9fbfdfefef0f2f4f6f8fa', 'admin');

-- Insert accounts for each user
INSERT INTO accounts (user_id, account_number, balance, account_type) VALUES
-- Alice's account
((SELECT id FROM users WHERE username = 'alice'), '1001-2024-ALICE', 5000.00, 'checking'),
((SELECT id FROM users WHERE username = 'alice'), '1002-2024-ALICE', 12500.00, 'savings'),

-- Bob's account
((SELECT id FROM users WHERE username = 'bob'), '1003-2024-BOB', 3000.00, 'checking'),
((SELECT id FROM users WHERE username = 'bob'), '1004-2024-BOB', 8200.50, 'savings'),

-- Charlie's account
((SELECT id FROM users WHERE username = 'charlie'), '1005-2024-CHARLIE', 10000.00, 'checking'),
((SELECT id FROM users WHERE username = 'charlie'), '1006-2024-CHARLIE', 25000.00, 'savings'),

-- Admin account
((SELECT id FROM users WHERE username = 'admin'), '1000-2024-ADMIN', 1000000.00, 'checking');

-- Insert sample transactions
INSERT INTO transactions (from_account, to_account, amount, description, transaction_type) VALUES
-- Alice to Bob
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), 
 (SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), 
 500.00, 'Payment for lunch', 'transfer'),

-- Bob to Charlie
((SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), 
 (SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), 
 200.00, 'Repayment for coffee', 'transfer'),

-- Charlie to Alice
((SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), 
 (SELECT id FROM accounts WHERE account_number = '1002-2024-ALICE'), 
 1500.00, 'Group project reimbursement', 'transfer'),

-- Alice to Alice (savings deposit)
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), 
 (SELECT id FROM accounts WHERE account_number = '1002-2024-ALICE'), 
 2000.00, 'Savings transfer', 'transfer'),

-- Multiple transactions for testing search
((SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), 
 (SELECT id FROM accounts WHERE account_number = '1003-2024-BOB'), 
 150.00, 'Birthday gift from Alice', 'transfer'),

((SELECT id FROM accounts WHERE account_number = '1005-2024-CHARLIE'), 
 (SELECT id FROM accounts WHERE account_number = '1001-2024-ALICE'), 
 300.00, 'Book purchase reimbursement', 'transfer');
