import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavIcon = ({ name }) => {
  const icons = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    transfer: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10l5-6 5 6" />
        <path d="M12 4v16" />
        <path d="M17 14l-5 6-5-6" />
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    admin: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // If not authenticated, just render children (for auth pages)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo">
            <span className="sidebar-logo-icon">M</span>
            <span>Maze Bank</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Main</div>
            <Link
              to="/dashboard"
              className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              <NavIcon name="dashboard" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/transfer"
              className={`sidebar-link ${isActive('/transfer') ? 'active' : ''}`}
            >
              <NavIcon name="transfer" />
              <span>Transfers</span>
            </Link>
            <Link
              to="/history"
              className={`sidebar-link ${isActive('/history') ? 'active' : ''}`}
            >
              <NavIcon name="history" />
              <span>Transaction History</span>
            </Link>
          </div>

          {user?.role === 'admin' && (
            <div className="sidebar-nav-section">
              <div className="sidebar-nav-label">Administration</div>
              <Link
                to="/admin"
                className={`sidebar-link ${isActive('/admin') ? 'active' : ''}`}
              >
                <NavIcon name="admin" />
                <span>Admin Panel</span>
              </Link>
            </div>
          )}

          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Account</div>
            <button type="button" className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={() => { /* Settings placeholder */ }}>
              <NavIcon name="settings" />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
            <NavIcon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <header className="topbar">
        <div className="topbar-user">
          <div className="topbar-avatar">{getInitials(user?.username)}</div>
          <div className="topbar-info">
            <span className="topbar-name">{user?.username}</span>
            <span className="topbar-role">{user?.role}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-wrapper">{children}</div>
      </main>
    </div>
  );
}
