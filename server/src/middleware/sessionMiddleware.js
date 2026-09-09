import crypto from "crypto";
import pool from "../db/pool.js";

/**
 * Session Middleware - INTENTIONALLY VULNERABLE FOR EDUCATIONAL PURPOSES
 *
 * VULNERABILITIES:
 * 1. Weak token generation (predictable hash)
 * 2. No cryptographic randomness
 * 3. Session tokens not bound to IP or User-Agent
 * 4. No automatic expiry or rotation
 * 5. Tokens transmitted in non-HttpOnly cookies
 */

// Session IDs are independent of user-controlled or otherwise predictable values.
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

// VULN: Session validation doesn't check IP, User-Agent, or expiry binding
async function validateSession(token) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM sessions WHERE session_token = ?",
      [token],
    );

    if (rows.length === 0) {
      return null;
    }

    const session = rows[0];

    // VULN: No validation of:
    // - IP address (can be reused from different locations)
    // - User-Agent (can be reused from different browsers)
    // - Expiry time (tokens persist indefinitely)
    // - Rotation (same token used for all requests)

    return session;

    /* SECURE: Session binding and validation
    const session = rows[0];
    
    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await pool.query('DELETE FROM sessions WHERE id = ?', [session.id]);
      return null;
    }
    
    // Check if session is bound to the same IP and User-Agent
    if (session.bound_ip !== ipAddress || session.bound_user_agent !== userAgent) {
      return null;
    }
    
    return session;
    */
  } catch (err) {
    console.error("Session validation error:", err);
    return null;
  }
}

// Create a new session for a user after successful authentication
async function createSession(userId) {
  try {
    const token = generateSessionToken();

    const [result] = await pool.query(
      "INSERT INTO sessions (user_id, session_token, created_at, expires_at) VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR))",
      [userId, token],
    );

    // Fetch the created session
    const [sessionRows] = await pool.query(
      "SELECT * FROM sessions WHERE id = ?",
      [result.insertId],
    );

    return sessionRows[0];
  } catch (err) {
    console.error("Session creation error:", err);
    throw err;
  }
}

// Middleware to validate session on protected routes
export function sessionMiddleware(req, res, next) {
  // VULN: Token can come from:
  // 1. Non-HttpOnly cookie (JavaScript-accessible)
  // 2. Query parameter (appears in logs and browser history)
  // 3. Authorization header (transmitted unencrypted over HTTP)

  const token =
    req.headers?.authorization?.replace("Bearer ", "") ||
    req.cookies?.session_token ||
    req.query?.session_token;

  if (!token) {
    return res.status(401).json({ error: "No session token provided" });
  }

  validateSession(token)
    .then((session) => {
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      req.session = session;
      req.userId = session.user_id;
      next();
    })
    .catch((err) => {
      console.error("Middleware error:", err);
      res.status(500).json({ error: "Session validation failed" });
    });
}

export { generateSessionToken, validateSession, createSession };
