import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resetDatabase = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.DB_PASS || '';
  const database = process.env.DB_NAME || 'maze_bank';

  const connection = await mysql.createConnection({
    host,
    user,
    password,
    database,
    multipleStatements: true,
  });

  try {
    const resetSql = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'reset.sql'),
      'utf-8'
    );
    await connection.query(resetSql);

    console.log('✅ Database reset successfully using database/reset.sql!');
    console.log('Test credentials:');
    console.log('  alice / pass123    (balance $17,500.00)');
    console.log('  bob / pass456      (balance $11,200.50)');
    console.log('  charlie / pass789  (balance $35,000.00)');
    console.log('  admin / admin123   (balance $1,000,000.00)');

  } catch (error) {
    console.error('Error resetting database:', error.message);
  } finally {
    await connection.end();
  }
};

resetDatabase();
