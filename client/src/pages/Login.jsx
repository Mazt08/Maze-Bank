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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">M</span>
            <span>Maze Bank</span>
          </div>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>

        <div className="credentials-box">
          <div className="credentials-title">Test Credentials</div>
          <ul className="credentials-list">
            <li>alice / pass123</li>
            <li>bob / pass456</li>
            <li>charlie / pass789</li>
            <li>admin / admin123 (Admin)</li>
          </ul>
        </div>

        <div className="vuln-box">
          <div className="vuln-title">SQL Injection Demo</div>
          <code className="vuln-code">
            Username: admin' --&lt;br /&gt;
            Password: anything
          </code>
          <p className="vuln-hint">This bypasses password validation using SQL comment injection!</p>
        </div>
      </div>
    </div>
  );
}
