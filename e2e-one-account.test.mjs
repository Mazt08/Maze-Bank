import mysql from './server/node_modules/mysql2/promise.js';
import crypto from 'crypto';
import fs from 'fs';

const BASE = 'maze_bank_e2e';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  const admin = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    multipleStatements: true,
  });

  // Fresh database built from the checked-in schema + seed.
  await admin.query(`DROP DATABASE IF EXISTS ${BASE}`);
  await admin.query(`CREATE DATABASE ${BASE}`);
  const schema = fs.readFileSync('database/schema.sql', 'utf-8');
  const seed = fs.readFileSync('database/seed.sql', 'utf-8');
  await admin.query(`USE ${BASE}`);
  await admin.query("SET SESSION sql_mode = ''");
  await admin.query(schema);
  await admin.query(seed);
  console.log('seeded');

  // Sanity: one account per user, expected balances.
  const [accounts] = await admin.query(
    `SELECT a.id, u.username, a.account_number, a.balance FROM accounts a JOIN users u ON u.id = a.user_id ORDER BY a.id`
  );
  console.table(accounts);
  const [dupeCount] = await admin.query(
    `SELECT COUNT(*) AS dupes FROM (SELECT user_id FROM accounts GROUP BY user_id HAVING COUNT(*) > 1) d`
  );
  console.log('users with multiple accounts:', dupeCount[0].dupes);

  // Unique constraint must exist and be enforced.
  const [indexes] = await admin.query(
    `SELECT INDEX_NAME, NON_UNIQUE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = '${BASE}' AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'user_id'`
  );
  console.log('user_id indexes:', indexes);

  // Try to insert a second account for alice - must fail.
  try {
    await admin.query(
      `INSERT INTO accounts (user_id, account_number, balance) VALUES (1, '2099-ALICE2', 1.00)`
    );
    console.log('FAIL: second account insert was allowed');
  } catch (e) {
    console.log('OK: duplicate account rejected ->', e.code, e.errno);
  }

  // ---------------------------------------------------------------------------
  // Registration flow: auto-creates exactly one account, 0.00, {year}-{USERNAME}
  // ---------------------------------------------------------------------------
  const api = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: BASE,
  });

  const res = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dave', password: 'pass000' }),
  });
  const body = await res.json();
  console.log('register status:', res.status, body.message || body.error);

  const [newUser] = await api.query(
    `SELECT u.id, u.username, a.id AS account_id, a.account_number, a.balance
     FROM users u LEFT JOIN accounts a ON a.user_id = u.id
     WHERE u.username = 'dave'`
  );
  console.table(newUser);

  const [daveCount] = await api.query(
    `SELECT COUNT(*) AS n FROM accounts WHERE user_id = (SELECT id FROM users WHERE username = 'dave')`
  );
  console.log('accounts for dave (must be 1):', daveCount[0].n);
  console.log('account number format ok:', newUser[0].account_number === `${new Date().getFullYear()}-DAVE`);

  // ---------------------------------------------------------------------------
  // Admin create-account: no type param, rejects when user already has account
  // ---------------------------------------------------------------------------
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "admin' --", password: 'whatever' }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody.token;
  console.log('admin login (SQLi kept intact):', !!token);

  // dave already has an account -> expect 409
  const dup = await fetch('http://localhost:5000/api/admin/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: newUser[0].id }),
  });
  const dupBody = await dup.json();
  console.log('duplicate create ->', dup.status, dupBody.error || dupBody.message);

  // brand-new user with no account -> expect 201, no account_type in response
  await api.query(
    `INSERT INTO users (username, password_hash, role) VALUES ('erin', '${hashPassword('pass111')}', 'user')`
  );
  const [erin] = await api.query(`SELECT id, username FROM users WHERE username = 'erin'`);

  const create = await fetch('http://localhost:5000/api/admin/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: erin[0].id, type: 'savings' }),
  });
  const createBody = await create.json();
  console.log('admin create ->', create.status, JSON.stringify(createBody));
  console.log('response has no account_type:', !('account_type' in (createBody.account || {})));

  const [erinAccounts] = await api.query(
    `SELECT id, account_number, balance FROM accounts WHERE user_id = ?`,
    [erin[0].id]
  );
  console.table(erinAccounts);

  // ---------------------------------------------------------------------------
  // Account info endpoints must not return account_type
  // ---------------------------------------------------------------------------
  const erinLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "erin' --", password: 'x' }),
  }).then((r) => r.json());

  const info = await fetch('http://localhost:5000/api/accounts', {
    headers: { Authorization: `Bearer ${erinLogin.token}` },
  }).then((r) => r.json());
  console.log('account info has no account_type:', !info.accounts?.[0]?.account_type);
  console.log('account info:', JSON.stringify(info));

  const allAccounts = await fetch('http://localhost:5000/api/admin/accounts', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  console.log(
    'admin list has no account_type:',
    allAccounts.accounts.every((a) => !('account_type' in a))
  );

  // Registration with a duplicate username must still 409, not 500.
  const dupUser = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dave', password: 'pass000' }),
  }).then((r) => r.json());
  console.log('duplicate username ->', dupUser.error);

  await api.end();
  await admin.query(`DROP DATABASE IF EXISTS ${BASE}`);
  await admin.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('E2E FAILED:', e);
  process.exit(1);
});
