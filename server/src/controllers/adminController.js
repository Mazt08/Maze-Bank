import pool from '../db/pool.js';

/**
 * Admin Controller
 * 
 * Uses secure parameterized queries
 * Role-based access control (admin only)
 */

export async function checkAdminRole(req, res, next) {
  try {
    const userId = req.userId;

    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('Admin check error:', err);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

export async function getAllUsers(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    );

    return res.json({
      users: result.rows,
    });
  } catch (err) {
    console.error('Get all users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function getAllAccounts(req, res) {
  try {
    const result = await pool.query(
      'SELECT a.id, a.user_id, a.account_number, a.balance, a.account_type, a.created_at, u.username FROM accounts a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC'
    );

    return res.json({
      accounts: result.rows,
    });
  } catch (err) {
    console.error('Get all accounts error:', err);
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
}

export async function getUserDetails(req, res) {
  try {
    const { userId } = req.params;

    const user = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accounts = await pool.query(
      'SELECT id, account_number, balance, account_type, created_at FROM accounts WHERE user_id = $1',
      [userId]
    );

    const transactions = await pool.query(
      'SELECT id, from_account, to_account, amount, description, transaction_type, timestamp FROM transactions WHERE from_account IN (SELECT id FROM accounts WHERE user_id = $1) ORDER BY timestamp DESC LIMIT 50',
      [userId]
    );

    return res.json({
      user: user.rows[0],
      accounts: accounts.rows,
      recentTransactions: transactions.rows,
    });
  } catch (err) {
    console.error('Get user details error:', err);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
}

export async function updateAccountBalance(req, res) {
  try {
    const { accountId } = req.params;
    const { newBalance } = req.body;

    if (newBalance === undefined || newBalance < 0) {
      return res.status(400).json({ error: 'Invalid balance' });
    }

    const result = await pool.query(
      'UPDATE accounts SET balance = $1 WHERE id = $2 RETURNING *',
      [newBalance, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json({
      message: 'Account balance updated',
      account: result.rows[0],
    });
  } catch (err) {
    console.error('Update balance error:', err);
    return res.status(500).json({ error: 'Failed to update balance' });
  }
}

export async function getSystemStats(req, res) {
  try {
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const accountCount = await pool.query('SELECT COUNT(*) as count FROM accounts');
    const totalBalance = await pool.query('SELECT SUM(balance) as total FROM accounts');
    const transactionCount = await pool.query('SELECT COUNT(*) as count FROM transactions');

    return res.json({
      stats: {
        totalUsers: userCount.rows[0].count,
        totalAccounts: accountCount.rows[0].count,
        totalBalance: totalBalance.rows[0].total,
        totalTransactions: transactionCount.rows[0].count,
      },
    });
  } catch (err) {
    console.error('System stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
