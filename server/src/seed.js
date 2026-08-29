import pool from './db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting database seed...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('📋 Creating schema...');
    await client.query(schemaSql);

    // Read and execute seed data
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    
    console.log('📦 Seeding data...');
    await client.query(seedSql);

    console.log('✅ Database seeded successfully!');
    console.log(`
Test Credentials:
  - Username: alice    | Password: pass123  | Balance: $5,000
  - Username: bob      | Password: pass456  | Balance: $3,000
  - Username: charlie  | Password: pass789  | Balance: $10,000
  - Username: admin    | Password: admin123 | Role: admin
    `);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
