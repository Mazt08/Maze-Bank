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

    const [rows] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0 || rows[0].role !== 'admin') {
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
    const [rows] = await pool.query(
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    );

    return res.json({
      users: rows,
    });
  } catch (err) {
    console.error('Get all users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function getAllAccounts(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT a.id, a.user_id, a.account_number, a.balance, a.account_type, a.created_at, u.username FROM accounts a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC'
    );

    return res.json({
      accounts: rows,
    });
  } catch (err) {
    console.error('Get all accounts error:', err);
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
}

export async function getUserDetails(req, res) {
  try {
    const { userId } = req.params;

    const [userRows] = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [accountRows] = await pool.query(
      'SELECT id, account_number, balance, account_type, created_at FROM accounts WHERE user_id = ?',
      [userId]
    );

    const [transactionRows] = await pool.query(
      'SELECT id, from_account, to_account, amount, description, transaction_type, timestamp FROM transactions WHERE from_account IN (SELECT id FROM accounts WHERE user_id = ?) ORDER BY timestamp DESC LIMIT 50',
      [userId]
    );

    return res.json({
      user: userRows[0],
      accounts: accountRows,
      recentTransactions: transactionRows,
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

    const [rows] = await pool.query(
      'UPDATE accounts SET balance = ? WHERE id = ?',
      [newBalance, accountId]
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Fetch the updated account
    const [updatedRows] = await pool.query(
      'SELECT * FROM accounts WHERE id = ?',
      [accountId]
    );

    return res.json({
      message: 'Account balance updated',
      account: updatedRows[0],
    });
  } catch (err) {
    console.error('Update balance error:', err);
    return res.status(500).json({ error: 'Failed to update balance' });
  }
}

export async function getSystemStats(req, res) {
  try {
    const [userCountRows] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [accountCountRows] = await pool.query('SELECT COUNT(*) as count FROM accounts');
    const [totalBalanceRows] = await pool.query('SELECT SUM(balance) as total FROM accounts');
    const [transactionCountRows] = await pool.query('SELECT COUNT(*) as count FROM transactions');

    return res.json({
      stats: {
        totalUsers: userCountRows[0].count,
        totalAccounts: accountCountRows[0].count,
        totalBalance: totalBalanceRows[0].total,
        totalTransactions: transactionCountRows[0].count,
      },
    });
  } catch (err) {
    console.error('System stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
