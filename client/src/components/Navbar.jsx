import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <h1>🏦 Maze Bank</h1>

      {isAuthenticated ? (
        <div className="nav-links">
          <span>👤 {user?.username}</span>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/transfer">Transfer</Link>
          <Link to="/history">History</Link>
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </nav>
  );
}
