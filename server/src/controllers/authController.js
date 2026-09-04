import crypto from 'crypto';
import pool from '../db/pool.js';
import { createSession } from '../middleware/sessionMiddleware.js';

/**
 * Authentication Controller - INTENTIONALLY VULNERABLE
 * 
 * VULNERABILITY: SQL Injection in login endpoint
 * Uses string concatenation instead of parameterized queries
 */

// Helper function to hash passwords (simple SHA-256 for this demo)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function registerUser(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const passwordHash = hashPassword(password);

    // SECURE: Using parameterized query for registration
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, 'user']
    );

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        username,
        role: 'user'
      },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      // Unique constraint violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

export async function loginUser(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const passwordHash = hashPassword(password);

    // ============================================================================
    // VULN: SQL INJECTION - String concatenation instead of parameterized query
    // ============================================================================
    // This query is vulnerable to SQL injection. An attacker can bypass auth by:
    // - Username: admin' --
    // - Password: anything
    // 
    // This causes the query to become:
    // SELECT * FROM users WHERE username = 'admin' -- AND password_hash = '...'
    // The -- comments out the password check, allowing login as admin.
    //
    // HOW IT WORKS:
    // The single quote in 'admin' closes the username string, then -- comments out
    // the remaining AND clause. The database executes it as if there's no password check.
    //
    // IMPACT: Attacker can login as any user without knowing the password.
    // ============================================================================

    const query = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${passwordHash}'`;
    
    console.log('[DEBUG - VULN] Login Query:', query); // Log for educational inspection

    const [rows] = await pool.query(query);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    // Create session after successful login
    const session = await createSession(user.id, user.username);

    // VULN: Session token returned in body (visible in logs, history)
    // and set in non-HttpOnly, non-Secure cookie (JavaScript-accessible, sent over HTTP)
    res.cookie('session_token', session.session_token, {
      httpOnly: false,  // VULN: Accessible from JavaScript (XSS-able)
      secure: false,    // VULN: Sent over HTTP (not just HTTPS)
      sameSite: 'lax',
    });

    // VULN: Token exposed in response body
    return res.json({
      message: 'Login successful',
      token: session.session_token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });

    /* ========================================================================
    // SECURE: Parameterized query + secure session handling
    // ========================================================================
    const query = 'SELECT * FROM users WHERE username = ? AND password_hash = ?';
    const [rows] = await pool.query(query, [username, passwordHash]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const session = await createSession(user.id, user.username);

    // SECURE: HttpOnly, Secure cookie with no body token
    res.cookie('session_token', session.session_token, {
      httpOnly: true,   // Not accessible from JavaScript
      secure: true,     // Only sent over HTTPS
      sameSite: 'strict',
      maxAge: 3600000,  // 1 hour
    });

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      // Token NOT in body
    });
    ======================================================================== */
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

export async function logoutUser(req, res) {
  try {
    const token = req.cookies?.session_token || req.query?.session_token;

    if (token) {
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [token]);
    }

    res.clearCookie('session_token');
    return res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
}

export async function getCurrentUser(req, res) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: rows[0],
    });
  } catch (err) {
    console.error('Get current user error:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

