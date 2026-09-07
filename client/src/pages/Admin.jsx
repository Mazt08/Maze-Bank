import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    if (user?.role !== 'admin') {
      setError('Admin access required');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, accountsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllUsers(),
        adminAPI.getAllAccounts(),
      ]);

      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setAccounts(accountsRes.data.accounts);
    } catch (err) {
      setError('Failed to load admin data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="card">
        <div className="alert alert-danger">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title mb-3">Admin Panel</h1>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Loading admin data...</span>
        </div>
      ) : (
        <div className="card">
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
            <button
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button
              className={`admin-tab ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              Accounts
            </button>
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{stats.totalUsers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Accounts</div>
                <div className="stat-value">{stats.totalAccounts}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Balance</div>
                <div className="stat-value">
                  ${parseFloat(stats.totalBalance).toFixed(2)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Transactions</div>
                <div className="stat-value">{stats.totalTransactions}</div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <h2>All Users ({users.length})</h2>
              <div className="table-container mt-2">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="font-mono text-sm">{u.id}</td>
                        <td>
                          <span className="font-medium">{u.username}</span>
                        </td>
                        <td>
                          <span
                            className={
                              u.role === 'admin'
                                ? 'badge badge-primary'
                                : 'badge badge-default'
                            }
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="text-secondary">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div>
              <h2>All Accounts ({accounts.length})</h2>
              <div className="table-container mt-2">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Account Number</th>
                      <th>Username</th>
                      <th>Type</th>
                      <th className="text-right">Balance</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td className="font-mono text-sm">{acc.account_number}</td>
                        <td>{acc.username}</td>
                        <td>{acc.account_type}</td>
                        <td className="table-amount">
                          ${parseFloat(acc.balance).toFixed(2)}
                        </td>
                        <td className="text-secondary">
                          {new Date(acc.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}