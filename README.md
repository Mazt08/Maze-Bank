# Maze Bank — Deliberately Vulnerable Banking Application

⚠️ **SECURITY WARNING** ⚠️

This application is **intentionally vulnerable by design** for educational cybersecurity coursework. It contains:

- SQL Injection vulnerabilities in authentication and search endpoints
- Weak session token generation and handling
- Predictable session hijacking opportunities

This app must **NEVER** be deployed to a public internet-facing server or used with real data. It is intended **only** for local educational labs or isolated test environments where you are legally authorized to attack your own code.

---

## Project Overview

**Maze Bank** is a mock online banking application built with React (frontend) + Express (backend) + PostgreSQL (database). It demonstrates realistic banking features (login, dashboards, transfers, history, admin panel) but with deliberately weak security to teach SQL injection and session hijacking concepts.

---

## Architecture

```
maze-bank/
├── client/                          # React frontend (port 3000)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transfer.jsx
│   │   │   ├── History.jsx
│   │   │   └── Admin.jsx
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── .env.example
├── server/                          # Express backend (port 5000)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── accounts.js
│   │   │   ├── transfers.js
│   │   │   └── admin.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── accountController.js
│   │   │   ├── transferController.js
│   │   │   └── adminController.js
│   │   ├── db/
│   │   │   └── pool.js
│   │   ├── middleware/
│   │   │   └── sessionMiddleware.js
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── server.js
│   │   └── seed.js
│   ├── package.json
│   └── .env.example
├── database/
│   ├── schema.sql
│   └── seed.sql
├── deployment/
│   ├── nginx.conf
│   ├── docker-compose.yml
│   ├── robots.txt
│   └── .env.production
└── .gitignore
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+ (or Docker)
- Git

### 1. Set up the Database

**Option A: With Docker**

```bash
docker-compose -f deployment/docker-compose.yml up -d postgres
```

**Option B: Local PostgreSQL**

```bash
createdb maze_bank
psql maze_bank < database/schema.sql
psql maze_bank < database/seed.sql
```

### 2. Start Backend Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your DB credentials
npm start
```

Server runs on `http://localhost:5000`

### 3. Start Frontend Client

```bash
cd client
npm install
cp .env.example .env
npm start
```

Client runs on `http://localhost:3000`

### 4. Default Test Credentials

| Username | Password | Role  | Account Balance |
| -------- | -------- | ----- | --------------- |
| alice    | pass123  | user  | $5,000          |
| bob      | pass456  | user  | $3,000          |
| charlie  | pass789  | user  | $10,000         |
| admin    | admin123 | admin | $1,000,000      |

---

## Intentional Vulnerabilities & Learning Objectives

### A. SQL Injection (SQLi)

#### Vulnerability 1: Login Authentication

**File:** `server/src/controllers/authController.js` → `loginUser()`

The login endpoint constructs the authentication query using **string concatenation** instead of parameterized queries:

```javascript
// VULN: SQLi - raw string concatenation (no parameterization)
const query = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${passwordHash}'`;
```

**How to exploit:**

- Username: `admin' --`
- Password: anything

This bypasses the password check because SQL comment (`--`) ignores the rest of the query.

**Why it's vulnerable:** User input is directly embedded into the SQL query without escaping or parameterization.

**Fixed version (commented out):**

```javascript
// SECURE: Parameterized query (prepared statement)
const query = "SELECT * FROM users WHERE username = $1 AND password_hash = $2";
const result = await pool.query(query, [username, passwordHash]);
```

---

#### Vulnerability 2: Transaction History Search

**File:** `server/src/controllers/accountController.js` → `searchTransactions()`

The search filter endpoint interpolates user input directly into the `WHERE` clause:

```javascript
// VULN: SQLi - raw string concatenation in WHERE clause
const query = `SELECT * FROM transactions WHERE from_account = ${accountId} AND description LIKE '%${searchTerm}%'`;
```

**How to exploit:**

- Search term: `%' OR '1'='1`
- This returns all transactions instead of just filtered ones.

**Why it's vulnerable:** The `searchTerm` is wrapped in `LIKE` but not escaped, allowing injection of SQL operators.

**Fixed version (commented out):**

```javascript
// SECURE: Parameterized query with bound parameters
const query =
  "SELECT * FROM transactions WHERE from_account = $1 AND description ILIKE $2";
const result = await pool.query(query, [accountId, `%${searchTerm}%`]);
```

---

### B. Session Hijacking

#### Vulnerability 3: Weak Token Generation

**File:** `server/src/middleware/sessionMiddleware.js` → `generateSessionToken()`

Session tokens are generated using a **predictable algorithm** instead of cryptographic randomness:

```javascript
// VULN: Predictable session token (simple hash of username + timestamp)
function generateSessionToken(username) {
  const timestamp = Date.now();
  return crypto
    .createHash("sha256")
    .update(`${username}:${timestamp}`)
    .digest("hex");
}
```

**Why it's vulnerable:**

- Tokens are based on publicly known data (username) + time
- An attacker who knows your username and approximate login time can guess your token
- No cryptographic randomness; tokens are deterministic

**How to exploit:**

- Record your login time
- Try hashing `username:timestamp` for nearby timestamps
- One will likely match your actual session token

**Fixed version (commented out):**

```javascript
// SECURE: Cryptographically random token
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}
```

---

#### Vulnerability 4: Insecure Session Transmission

**File:** `server/src/controllers/authController.js` → Login response

Session tokens are returned in the **response body and set in a non-secure cookie**:

```javascript
// VULN: Token sent in body + non-HttpOnly, non-Secure cookie
res.cookie("session_token", token, {
  httpOnly: false, // ← Accessible from JavaScript (XSS-able)
  secure: false, // ← Sent over HTTP (interceptable)
  sameSite: "lax",
});
res.json({ token, username });
```

**Why it's vulnerable:**

- Non-`HttpOnly` means JavaScript can steal it
- Non-`Secure` means it's sent over unencrypted HTTP
- Token in response body means it's visible in network logs, browser history, proxy caches

**Fixed version (commented out):**

```javascript
// SECURE: HttpOnly, Secure cookie with no body token
res.cookie("session_token", token, {
  httpOnly: true, // ← Not accessible from JavaScript
  secure: true, // ← Only sent over HTTPS
  sameSite: "strict",
  maxAge: 3600000, // 1 hour
});
res.json({ success: true }); // No token in body
```

---

#### Vulnerability 5: No Session Binding or Rotation

**File:** `server/src/middleware/sessionMiddleware.js` → `validateSession()`

Once a session token is captured, it remains valid indefinitely and can be used from any IP/browser:

```javascript
// VULN: Session validation doesn't check IP, User-Agent, or rotation
async function validateSession(token) {
  const result = await pool.query(
    "SELECT * FROM sessions WHERE session_token = $1",
    [token],
  );
  if (result.rows.length === 0) return null;
  // ← No IP binding, no User-Agent binding, no rotation
  return result.rows[0];
}
```

**Why it's vulnerable:**

- Stolen token works from any device/location
- No automatic rotation on privilege change
- Session never expires (in this implementation)
- No tracking of session context (IP, device)

**Fixed version (commented out):**

```javascript
// SECURE: Session binding + rotation
async function validateSession(token, ipAddress, userAgent) {
  const result = await pool.query(
    "SELECT * FROM sessions WHERE session_token = $1 AND bound_ip = $2 AND bound_user_agent = $3 AND expires_at > NOW()",
    [token, ipAddress, userAgent],
  );
  if (result.rows.length === 0) return null;

  // Rotate token on each request
  const newToken = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "UPDATE sessions SET session_token = $1 WHERE session_token = $2",
    [newToken, token],
  );
  return { ...result.rows[0], newToken };
}
```

---

## Comparative Analysis: Insecure vs. Secure

| Aspect                 | Insecure (This App)          | Secure (Fixed)               |
| ---------------------- | ---------------------------- | ---------------------------- |
| **Auth Query**         | String concatenation         | Parameterized queries        |
| **Search Query**       | Raw LIKE interpolation       | Parameterized LIKE           |
| **Token Generation**   | Simple hash (predictable)    | Cryptographic random         |
| **Token Storage**      | Non-HttpOnly cookie + body   | HttpOnly, Secure cookie only |
| **Token Transmission** | HTTP + JavaScript accessible | HTTPS only + HttpOnly        |
| **Session Binding**    | None                         | IP + User-Agent + rotation   |
| **Session Expiry**     | Never                        | 1-hour automatic expiry      |

---

## Assignment Tasks

### Part 1: Identify Vulnerabilities (before this is deployed)

1. Read the source code and find all `// VULN:` comments
2. Write a report explaining each vulnerability in your own words
3. Create a proof-of-concept (PoC) script that demonstrates SQLi in login and history search
4. Capture a session token and show it works from a different "user" (session hijacking PoC)

### Part 2: Patch the Vulnerabilities

1. Replace vulnerable code with parameterized queries (uncomment the SECURE versions)
2. Implement cryptographically random token generation
3. Add HttpOnly + Secure cookie flags
4. Add session binding (IP/User-Agent validation)
5. Implement session expiry and rotation
6. Test that exploits no longer work post-patch

### Part 3: Documentation

1. Explain why each fix prevents its corresponding attack
2. Compare insecure vs. secure query patterns
3. Discuss defense-in-depth (why multiple layers matter)

---

## Deployment (Cloud or Lab VMs Only)

This application is designed to run **only** in isolated, authorized environments. If deploying to a cloud instance for a graded demo:

### Security Gate (Reverse-Proxy Authentication)

Deploy behind an **Nginx reverse proxy with HTTP Basic Auth** to prevent casual discovery:

```bash
cd deployment
docker-compose up -d
```

This starts:

1. **Nginx** on port 80/443 with Basic Auth (username: `lecturer`, password: in `.env.production`)
2. **React frontend** on internal port 3000
3. **Express backend** on internal port 5000
4. **PostgreSQL** database on internal port 5432

Users must provide valid Basic Auth credentials before accessing the app.

### Additional Security Measures

- **Non-guessable URL**: Use a long random subdomain, not `mazebank.example.com`
- **robots.txt**: Blocks search engines from indexing
- **Rate limiting**: Slow down brute-force attempts
- **IP whitelisting**: Only allow instructor/student IPs
- **Time-limited deployment**: Spin up instance only during assignment window, destroy afterward
- **Isolated cloud account**: No other real resources in the same project

---

## Important Reminders

✅ **DO:**

- Study the vulnerabilities and understand the attack vectors
- Run locally on `localhost` during development
- Use fake data and test credentials only
- Document your findings thoroughly
- Patch vulnerabilities systematically

❌ **DON'T:**

- Deploy to a publicly accessible internet-facing URL without proper gates
- Use real banking data, real account credentials, or real user information
- Share credentials or URLs on public forums
- Leave the instance running after assignment is complete
- Use this code as a basis for any real application

---

## File Structure & Key Code Locations

**Vulnerable Endpoints:**

- SQL Injection (Login): `server/src/controllers/authController.js:loginUser()`
- SQL Injection (Search): `server/src/controllers/accountController.js:searchTransactions()`
- Weak Tokens: `server/src/middleware/sessionMiddleware.js:generateSessionToken()`
- Insecure Transmission: `server/src/controllers/authController.js` (Cookie settings)
- No Binding/Rotation: `server/src/middleware/sessionMiddleware.js:validateSession()`

**Database:**

- Schema & tables: `database/schema.sql`
- Test data: `database/seed.sql`

**Frontend:**

- Authentication context: `client/src/context/AuthContext.jsx`
- API calls: `client/src/services/api.js`
- Pages: `client/src/pages/*.jsx`

---

## References

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP Session Management](https://owasp.org/www-community/controls/Session_Management)
- [CWE-89: Improper Neutralization of Special Elements used in an SQL Command](https://cwe.mitre.org/data/definitions/89.html)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)

---

## Questions?

Consult your course materials, the inline code comments (`// VULN:` and `// SECURE:`), or your instructor.

**Last Updated:** 2025-08-29  
**For Educational Use Only**
