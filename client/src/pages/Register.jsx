import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const navigate = useNavigate();

  usePageTitle('Create Account');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(username, password);
      setSuccess('Registration successful! Logging you in...');

      setTimeout(async () => {
        try {
          await login(username, password);
          navigate('/dashboard');
        } catch (err) {
          navigate('/login');
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
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
          <p className="auth-subtitle">Create a new account</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert" aria-live="polite">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="status" aria-live="polite">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Create Account Form">
          <div className="form-group">
            <label htmlFor="registerUsername" className="form-label">Username</label>
            <input
              id="registerUsername"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              disabled={loading}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerPassword" className="form-label">Password</label>
            <input
              id="registerPassword"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerConfirmPassword" className="form-label">Confirm Password</label>
            <input
              id="registerConfirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              aria-label="Create your Maze Bank account"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
