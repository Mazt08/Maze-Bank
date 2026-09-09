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

  // Add Account modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedType, setSelectedType] = useState('checking');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [creating, setCreating] = useState(false);

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

  const handleAddAccount = async () => {
    if (!selectedUser) {
      setFormError('Please select a user');
      return;
    }

    setFormError('');
    setFormSuccess('');
    setCreating(true);

    try {
      await adminAPI.createAccount(selectedUser, selectedType);
      setFormSuccess('Account created successfully');
      setShowModal(false);
      setSelectedUser('');
      setSelectedType('checking');
      // Refresh accounts
      const accountsRes = await adminAPI.getAllAccounts();
      setAccounts(accountsRes.data.accounts);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setCreating(false);
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
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>All Accounts ({accounts.length})</h2>
                <button
                  onClick={() => {
                    setSelectedUser('');
                    setSelectedType('checking');
                    setFormError('');
                    setFormSuccess('');
                    setShowModal(true);
                  }}
                  className="btn btn-primary"
                >
                  Add Account
                </button>
              </div>

              {/* Add Account Modal */}
              {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                  <div
                    className="modal-content"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-header">
                      <h3>Add New Account</h3>
                      <button onClick={() => setShowModal(false)} className="btn-close">
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      {formError && <div className="alert alert-danger">{formError}</div>}
                      {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleAddAccount();
                      }}>
                        <div className="form-group mb-3">
                          <label className="form-label">User</label>
                          <select
                            className="form-select"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            required
                            disabled={creating}
                          >
                            <option value="">Select a user</option>
                            {users.map((u) => {
                              const label =
                                u.username +
                                " (" +
                                (u.role === "admin" ? "admin" : "user") +
                                ")";
                              return (
                                <option key={u.id} value={u.id}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="form-group mb-3">
                          <label className="form-label">Account Type</label>
                          <select
                            className="form-select"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            required
                            disabled={creating}
                          >
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <button
                            type="submit"
                            className="btn btn-success w-100"
                            disabled={creating}
                          >
                            {creating ? 'Creating...' : 'Create Account'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

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