import pool from '../db/pool.js';

/**
 * Transfer Controller
 * 
 * Uses secure parameterized queries (no intentional vulnerabilities here)
 * Vulnerable endpoints are in authController and accountController
 */

export async function transferFunds(req, res) {
  const { fromAccountId, toAccountId, amount, description } = req.body;
  const userId = req.userId;

  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verify from account belongs to user
    const [fromCheckRows] = await connection.query(
      'SELECT id, balance FROM accounts WHERE id = ? AND user_id = ?',
      [fromAccountId, userId]
    );

    if (fromCheckRows.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'Access denied' });
    }

    const fromAccount = fromCheckRows[0];

    if (fromAccount.balance < amount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Verify to account exists
    const [toCheckRows] = await connection.query(
      'SELECT id FROM accounts WHERE id = ?',
      [toAccountId]
    );

    if (toCheckRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Target account not found' });
    }

    // Debit from account
    await connection.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromAccountId]
    );

    // Credit to account
    await connection.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toAccountId]
    );

    // Record transaction
    const [insertResult] = await connection.query(
      'INSERT INTO transactions (from_account, to_account, amount, description, transaction_type) VALUES (?, ?, ?, ?, ?)',
      [fromAccountId, toAccountId, amount, description || 'Transfer', 'transfer']
    );

    await connection.commit();

    return res.json({
      message: 'Transfer successful',
      transaction: {
        id: insertResult.insertId,
        from_account: fromAccountId,
        to_account: toAccountId,
        amount,
        description: description || 'Transfer',
        transaction_type: 'transfer'
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error('Transfer error:', err);
    return res.status(500).json({ error: 'Transfer failed' });
  } finally {
    connection.release();
  }
}

export async function getTransferOptions(req, res) {
  try {
    const userId = req.userId;

    // Get user's own accounts
    const [ownAccountRows] = await pool.query(
      'SELECT id, account_number, balance FROM accounts WHERE user_id = ?',
      [userId]
    );

    // Get all accounts (but not details - just id/number for recipient selection)
    const [recipientAccountRows] = await pool.query(
      'SELECT id, account_number FROM accounts WHERE user_id != ?',
      [userId]
    );

    return res.json({
      fromAccounts: ownAccountRows,
      toAccounts: recipientAccountRows,
    });
  } catch (err) {
    console.error('Get transfer options error:', err);
    return res.status(500).json({ error: 'Failed to fetch transfer options' });
  }
}
