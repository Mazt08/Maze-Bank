import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const testPasswords = [
  { username: 'alice', password: 'pass123' },
  { username: 'bob', password: 'pass456' },
  { username: 'charlie', password: 'pass789' },
  { username: 'admin', password: 'admin123' }
];

console.log('Correct password hashes for test users:');
testPasswords.forEach(user => {
  const hash = hashPassword(user.password);
  console.log(`  ${user.username} / ${user.password}: ${hash}`);
});
