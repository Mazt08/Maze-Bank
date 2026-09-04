import pool from '../db/pool.js';

/**
 * Account Controller - INTENTIONALLY VULNERABLE
 * 
 * VULNERABILITY: SQL Injection in transaction search
 * Uses string interpolation in WHERE clause instead of parameterized queries
 */

export async function getAccountInfo(req, res) {
  try {
    const userId = req.userId;

    // SECURE: Parameterized query for account info
    const [rows] = await pool.query(
      'SELECT id, user_id, account_number, balance, account_type, created_at FROM accounts WHERE user_id = ?',
      [userId]
    );

    return res.json({
      accounts: rows,
    });
  } catch (err) {
    console.error('Get account error:', err);
    return res.status(500).json({ error: 'Failed to fetch account info' });
  }
}

export async function getAccountBalance(req, res) {
  try {
    const userId = req.userId;
    const { accountId } = req.params;

    // SECURE: Parameterized query to validate ownership
    const [rows] = await pool.query(
      'SELECT id, user_id, account_number, balance, account_type FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json({
      account: rows[0],
    });
  } catch (err) {
    console.error('Get balance error:', err);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
}

export async function searchTransactions(req, res) {
  try {
    const userId = req.userId;
    const { searchTerm = '' } = req.query;
    const { accountId } = req.params;

    // First verify the account belongs to the user (this uses secure parameterized query)
    const [accountCheckRows] = await pool.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (accountCheckRows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // ============================================================================
    // VULN: SQL INJECTION - String interpolation in WHERE clause
    // ============================================================================
    // This query is vulnerable to SQL injection. An attacker can extract data by:
    // - Search term: %' OR '1'='1
    // - This bypasses the search filter, returning ALL transactions for the account
    // 
    // The query becomes:
    // SELECT * FROM transactions WHERE from_account = 123 AND description LIKE '%' OR '1'='1'
    //
    // The condition '1'='1' is always true, so it returns all rows instead of filtered ones.
    //
    // More advanced attacks:
    // - Search: %' OR '1'='1' -- (to comment out rest)
    // - Search: %'; DROP TABLE transactions; -- (destructive)
    // - Search: %' UNION SELECT * FROM users WHERE '1'='1' -- (data exfiltration)
    //
    // HOW IT WORKS:
    // The LIKE clause should only match descriptions containing the search term.
    // But by injecting OR conditions, the attacker can make the WHERE clause match everything.
    //
    // IMPACT: Attacker can view all transactions, modify query logic, or extract sensitive data.
    // ============================================================================

    const query = `SELECT * FROM transactions WHERE from_account = ${accountId} AND description LIKE '%${searchTerm}%'`;
    
    console.log('[DEBUG - VULN] Search Query:', query); // Log for educational inspection

    const [rows] = await pool.query(query);

    return res.json({
      transactions: rows,
    });

    /* ========================================================================
    // SECURE: Parameterized query with proper escaping
    // ========================================================================
    const query = 'SELECT * FROM transactions WHERE from_account = ? AND description LIKE ?';
    const [rows] = await pool.query(query, [accountId, `%${searchTerm}%`]);

    return res.json({
      transactions: rows,
    });
    ======================================================================== */
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}

export async function getTransactionHistory(req, res) {
  try {
    const userId = req.userId;
    const { accountId } = req.params;

    // Verify account ownership
    const [accountCheckRows] = await pool.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (accountCheckRows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // SECURE: Parameterized query for transaction history
    const [rows] = await pool.query(
      'SELECT id, from_account, to_account, amount, description, transaction_type, timestamp FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY timestamp DESC LIMIT 50',
      [accountId, accountId]
    );

    return res.json({
      transactions: rows,
    });
  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
}
