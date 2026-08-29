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
      <div className="page">
        <div className="error">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>⚙️ Admin Panel</h1>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading admin data...</div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
            <button
              className={`btn ${activeTab === 'stats' ? '' : 'btn-secondary'}`}
              onClick={() => setActiveTab('stats')}
              style={{
                background: activeTab === 'stats' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: activeTab === 'stats' ? 'white' : '#667eea',
                borderBottom: activeTab === 'stats' ? '3px solid #667eea' : 'none',
                borderRadius: '0',
              }}
            >
              📊 Stats
            </button>
            <button
              className={`btn ${activeTab === 'users' ? '' : 'btn-secondary'}`}
              onClick={() => setActiveTab('users')}
              style={{
                background: activeTab === 'users' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: activeTab === 'users' ? 'white' : '#667eea',
                borderBottom: activeTab === 'users' ? '3px solid #667eea' : 'none',
                borderRadius: '0',
              }}
            >
              👥 Users
            </button>
            <button
              className={`btn ${activeTab === 'accounts' ? '' : 'btn-secondary'}`}
              onClick={() => setActiveTab('accounts')}
              style={{
                background: activeTab === 'accounts' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: activeTab === 'accounts' ? 'white' : '#667eea',
                borderBottom: activeTab === 'accounts' ? '3px solid #667eea' : 'none',
                borderRadius: '0',
              }}
            >
              🏦 Accounts
            </button>
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="dashboard-grid">
              <div className="card">
                <h3>Total Users</h3>
                <div className="balance-amount">{stats.totalUsers}</div>
              </div>
              <div className="card">
                <h3>Total Accounts</h3>
                <div className="balance-amount">{stats.totalAccounts}</div>
              </div>
              <div className="card">
                <h3>Total Balance</h3>
                <div className="balance-amount">${parseFloat(stats.totalBalance).toFixed(2)}</div>
              </div>
              <div className="card">
                <h3>Total Transactions</h3>
                <div className="balance-amount">{stats.totalTransactions}</div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <h2>All Users ({users.length})</h2>
              <div className="table-container">
                <table>
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
                        <td>{u.id}</td>
                        <td>
                          <strong>{u.username}</strong>
                        </td>
                        <td>
                          <span
                            style={{
                              background: u.role === 'admin' ? '#667eea' : '#ccc',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
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
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Account Number</th>
                      <th>Username</th>
                      <th>Type</th>
                      <th>Balance</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td>
                          <code>{acc.account_number}</code>
                        </td>
                        <td>{acc.username}</td>
                        <td>{acc.account_type}</td>
                        <td>
                          <strong>${parseFloat(acc.balance).toFixed(2)}</strong>
                        </td>
                        <td>{new Date(acc.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
