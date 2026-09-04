import mysql from 'mysql2/promise';

const checkDatabase = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'maze_bank'
  });

  try {
    const [rows] = await connection.query('SELECT id, username, password_hash, role FROM users');
    console.log('Users in database:');
    rows.forEach(row => {
      console.log(`  ID: ${row.id}, Username: ${row.username}, Role: ${row.role}`);
      console.log(`  Hash: ${row.password_hash}`);
    });

    // Also test the specific query
    console.log('\nTesting alice query:');
    const [aliceRows] = await connection.query(
      "SELECT * FROM users WHERE username = 'alice' AND password_hash = '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c'"
    );
    console.log('Result:', aliceRows.length > 0 ? 'User found!' : 'User not found');
    
  } finally {
    await connection.end();
  }
};

checkDatabase().catch(console.error);
