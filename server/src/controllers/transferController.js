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

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify from account belongs to user
    const fromCheck = await client.query(
      'SELECT id, balance FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [fromAccountId, userId]
    );

    if (fromCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    const fromAccount = fromCheck.rows[0];

    if (fromAccount.balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Verify to account exists
    const toCheck = await client.query(
      'SELECT id FROM accounts WHERE id = $1 FOR UPDATE',
      [toAccountId]
    );

    if (toCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Target account not found' });
    }

    // Debit from account
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromAccountId]
    );

    // Credit to account
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccountId]
    );

    // Record transaction
    const transaction = await client.query(
      'INSERT INTO transactions (from_account, to_account, amount, description, transaction_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [fromAccountId, toAccountId, amount, description || 'Transfer', 'transfer']
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Transfer successful',
      transaction: transaction.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transfer error:', err);
    return res.status(500).json({ error: 'Transfer failed' });
  } finally {
    client.release();
  }
}

export async function getTransferOptions(req, res) {
  try {
    const userId = req.userId;

    // Get user's own accounts
    const ownAccounts = await pool.query(
      'SELECT id, account_number, balance FROM accounts WHERE user_id = $1',
      [userId]
    );

    // Get all accounts (but not details - just id/number for recipient selection)
    const recipientAccounts = await pool.query(
      'SELECT id, account_number FROM accounts WHERE user_id != $1',
      [userId]
    );

    return res.json({
      fromAccounts: ownAccounts.rows,
      toAccounts: recipientAccounts.rows,
    });
  } catch (err) {
    console.error('Get transfer options error:', err);
    return res.status(500).json({ error: 'Failed to fetch transfer options' });
  }
}
