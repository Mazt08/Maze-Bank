import mysql from 'mysql2/promise';

const resetDatabase = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'maze_bank'
  });

  try {
    // Delete existing users and related data (cascades)
    await connection.query('DELETE FROM users');
    
    // Insert correct users with right password hashes
    const insertSql = `
      INSERT INTO users (username, password_hash, role) VALUES
      ('alice', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c', 'user'),
      ('bob', '1d4598d1949b47f7f211134b639ec32238ce73086a83c2f745713b3f12f817e5', 'user'),
      ('charlie', '9dbd5c893b5b573a1aa909c8cade58df194310e411c590d9fb0d63431841fd67', 'user'),
      ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin')
    `;
    
    await connection.query(insertSql);
    
    // Re-insert accounts
    const accountsSql = `
      INSERT INTO accounts (user_id, account_number, balance, account_type)
      SELECT id, '1001-2024-ALICE', 5000.00, 'checking' FROM users WHERE username = 'alice'
      UNION ALL
      SELECT id, '1002-2024-ALICE', 12500.00, 'savings' FROM users WHERE username = 'alice'
      UNION ALL
      SELECT id, '1003-2024-BOB', 3000.00, 'checking' FROM users WHERE username = 'bob'
      UNION ALL
      SELECT id, '1004-2024-BOB', 8200.50, 'savings' FROM users WHERE username = 'bob'
      UNION ALL
      SELECT id, '1005-2024-CHARLIE', 10000.00, 'checking' FROM users WHERE username = 'charlie'
      UNION ALL
      SELECT id, '1006-2024-CHARLIE', 25000.00, 'savings' FROM users WHERE username = 'charlie'
      UNION ALL
      SELECT id, '1000-2024-ADMIN', 1000000.00, 'checking' FROM users WHERE username = 'admin'
    `;
    
    await connection.query(accountsSql);
    
    console.log('✅ Database reset successfully!');
    console.log('Test credentials:');
    console.log('  alice / pass123');
    console.log('  bob / pass456');
    console.log('  charlie / pass789');
    console.log('  admin / admin123');
    
  } catch (error) {
    console.error('Error resetting database:', error.message);
  } finally {
    await connection.end();
  }
};

resetDatabase();
