import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import transferRoutes from './routes/transfers.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🔓 MAZE BANK SERVER - DELIBERATELY VULNERABLE 🔓      ║
╚════════════════════════════════════════════════════════════════╝

⚠️  WARNING: This server contains intentional security vulnerabilities
    for educational purposes ONLY.

✓ Server running on http://localhost:${PORT}
✓ CORS enabled for http://localhost:3000

📚 Educational Vulnerabilities:
  - SQL Injection in login endpoint
  - SQL Injection in search endpoint
  - Weak session token generation
  - Insecure session transmission
  - No session binding or rotation

🔍 Look for // VULN: comments in the source code to identify attack vectors
🛡️  Look for // SECURE: comments to see how to fix each vulnerability

⚠️  DO NOT DEPLOY TO PRODUCTION OR PUBLIC INTERNET
  `);
});
