import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="form">
        <h2>🏦 Maze Bank Login</h2>

        <div className="warning-banner">
          <strong>⚠️ WARNING</strong>
          This is a deliberately vulnerable application for educational purposes
          only. It contains SQL injection and session hijacking vulnerabilities.
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <p className="text-center mt">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <div className="card">
          <h4>Test Credentials (for learning):</h4>
          <ul style={{ marginLeft: '1.5rem' }}>
            <li>
              <strong>alice</strong> / pass123
            </li>
            <li>
              <strong>bob</strong> / pass456
            </li>
            <li>
              <strong>charlie</strong> / pass789
            </li>
            <li>
              <strong>admin</strong> / admin123 (admin access)
            </li>
          </ul>
        </div>

        <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f0f4ff' }}>
          <h4>💡 SQL Injection Vulnerability:</h4>
          <p>Try logging in with:</p>
          <code
            style={{
              display: 'block',
              background: '#fff',
              padding: '0.5rem',
              borderRadius: '4px',
              fontSize: '0.9rem',
              overflowX: 'auto',
            }}
          >
            Username: admin' -- <br />
            Password: anything
          </code>
          <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
            This bypasses password validation using SQL comment injection!
          </p>
        </div>
      </div>
    </div>
  );
}
