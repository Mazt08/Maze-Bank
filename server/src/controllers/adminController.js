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
      'SELECT a.id, a.user_id, a.account_number, a.balance, a.created_at, u.username FROM accounts a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC'
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
      'SELECT id, account_number, balance, created_at FROM accounts WHERE user_id = ?',
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

    // Audit trail: Log admin action
    try {
      await pool.query(
        'INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)',
        [req.userId, 'update_balance', `Updated account ${accountId} balance to ${newBalance}`]
      );
    } catch (logErr) {
      console.error('Failed to log admin action:', logErr);
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

export async function createAccount(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify user exists
    const [userRows] = await pool.query(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // One account per user: reject instead of creating a duplicate.
    // The UNIQUE(user_id) constraint in the schema also catches the race
    // where two requests pass this check simultaneously.
    const [existingRows] = await pool.query(
      'SELECT id FROM accounts WHERE user_id = ?',
      [userId]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({ error: 'User already has an account' });
    }

    const username = userRows[0].username;
    const year = new Date().getFullYear();

    // One consistent format: {year}-{USERNAME}
    const accountNumber = `${year}-${username.toUpperCase()}`;

    // Create account with balance 0.00
    const [result] = await pool.query(
      'INSERT INTO accounts (user_id, account_number, balance, created_at) VALUES (?, ?, 0.00, NOW())',
      [userId, accountNumber]
    );

    return res.status(201).json({
      message: 'Account created successfully',
      account: {
        id: result.insertId,
        user_id: userId,
        account_number: accountNumber,
        balance: '0.00',
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      // Unique constraint on user_id - user already has an account
      return res.status(409).json({ error: 'User already has an account' });
    }
    console.error('Create account error:', err);
    return res.status(500).json({ error: 'Failed to create account' });
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

export async function getAdminLogs(req, res) {
  try {
    const [loginAttempts] = await pool.query(
      'SELECT id, username, ip_address, attempted_at FROM login_attempts ORDER BY attempted_at DESC LIMIT 100'
    );

    const [adminLogs] = await pool.query(
      'SELECT l.id, l.admin_id, u.username as admin_username, l.action, l.details, l.timestamp FROM admin_log l JOIN users u ON l.admin_id = u.id ORDER BY l.timestamp DESC LIMIT 100'
    );

    return res.json({
      success: true,
      login_attempts: loginAttempts,
      admin_logs: adminLogs,
    });
  } catch (err) {
    console.error('Get admin logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin logs' });
  }
}
