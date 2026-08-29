-- Maze Bank Database Schema
-- Deliberately vulnerable-by-design application for educational purposes

-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_number VARCHAR(20) UNIQUE NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  account_type VARCHAR(20) DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  from_account INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  description VARCHAR(255),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('transfer', 'deposit', 'withdrawal')),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table (for weak session hijacking demonstration)
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_transactions_from_account ON transactions(from_account);
CREATE INDEX idx_transactions_to_account ON transactions(to_account);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
