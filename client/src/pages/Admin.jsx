import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('stats');

  // Add Account modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
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

  usePageTitle('Admin Panel');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, accountsRes, logsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllUsers(),
        adminAPI.getAllAccounts(),
        adminAPI.getLogs(),
      ]);

      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setAccounts(accountsRes.data.accounts);
      setLoginAttempts(logsRes.data.login_attempts || []);
      setAdminLogs(logsRes.data.admin_logs || []);
    } catch (err) {
      setError('Failed to load admin data');
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
      await adminAPI.createAccount(selectedUser);
      setFormSuccess('Account created successfully');
      setShowModal(false);
      setSelectedUser('');
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
        <div className="loading" role="status" aria-label="Loading admin data">
          <div className="loading-spinner"></div>
          <span>Loading admin data...</span>
        </div>
      ) : (
        <div className="card">
          <div className="admin-tabs" role="tablist" aria-label="Admin sections">
            <button
              role="tab"
              aria-selected={activeTab === 'stats'}
              className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'users'}
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'accounts'}
              className={`admin-tab ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              Accounts
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'logs'}
              className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Logs
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
                  ${parseFloat(stats.totalBalance || 0).toFixed(2)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Transactions</div>
                <div className="stat-value">{stats.totalTransactions}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Failed Logins</div>
                <div className="stat-value">{loginAttempts.length}</div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <h2>All Users ({users.length})</h2>
              <div className="table-container mt-2">
                <table className="table" aria-label="All users">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Username</th>
                      <th scope="col">Role</th>
                      <th scope="col">Joined</th>
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
                <div
                  className="modal-backdrop"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modalTitle"
                  onClick={() => setShowModal(false)}
                >
                  <div
                    className="modal-content"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-header">
                      <h3 id="modalTitle">Add New Account</h3>
                      <button
                        onClick={() => setShowModal(false)}
                        className="btn-close"
                        aria-label="Close dialog"
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      {formError && <div className="alert alert-danger">{formError}</div>}
                      {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

                      <form onSubmit={(e) => { e.preventDefault(); handleAddAccount(); }}>
                        <div className="form-group mb-3">
                          <label htmlFor="modalUserSelect" className="form-label">User</label>
                          <select
                            id="modalUserSelect"
                            className="form-select"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            required
                            disabled={creating}
                          >
                            <option value="">Select a user</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.username} ({u.role === 'admin' ? 'admin' : 'user'})
                              </option>
                            ))}
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
                <table className="table" aria-label="All accounts">
                  <thead>
                    <tr>
                      <th scope="col">Account Number</th>
                      <th scope="col">Username</th>
                      <th scope="col" className="text-right">Balance</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td className="font-mono text-sm">{acc.account_number}</td>
                        <td>{acc.username}</td>
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

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              {/* Failed Login Attempts */}
              <section aria-labelledby="loginAttemptsHeading">
                <h2 id="loginAttemptsHeading" className="mb-2">
                  Failed Login Attempts
                  <span className="badge badge-danger ml-2">{loginAttempts.length}</span>
                </h2>
                <p className="text-secondary text-sm mb-3">
                  Each entry is evidence of a failed authentication attempt. Run{' '}
                  <code>poc-bruteforce.py</code> to populate this table for your writeup.
                </p>
                {loginAttempts.length === 0 ? (
                  <div className="text-center text-muted" style={{ padding: '16px' }}>
                    No failed login attempts recorded yet.
                  </div>
                ) : (
                  <div className="table-container mb-4">
                    <table className="table" aria-label="Failed login attempts">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Username Tried</th>
                          <th scope="col">IP Address</th>
                          <th scope="col">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginAttempts.map((attempt) => (
                          <tr key={attempt.id}>
                            <td className="font-mono text-sm">{attempt.id}</td>
                            <td className="font-mono text-sm">{attempt.username || '(empty)'}</td>
                            <td className="font-mono text-sm">{attempt.ip_address}</td>
                            <td className="text-secondary text-sm">
                              {new Date(attempt.attempted_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Admin Audit Log */}
              <section aria-labelledby="adminLogHeading">
                <h2 id="adminLogHeading" className="mb-2">Admin Audit Log</h2>
                <p className="text-secondary text-sm mb-3">
                  Records of privileged admin actions such as balance updates and account creation.
                </p>
                {adminLogs.length === 0 ? (
                  <div className="text-center text-muted" style={{ padding: '16px' }}>
                    No admin actions logged yet.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table" aria-label="Admin audit log">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Admin</th>
                          <th scope="col">Action</th>
                          <th scope="col">Details</th>
                          <th scope="col">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminLogs.map((entry) => (
                          <tr key={entry.id}>
                            <td className="font-mono text-sm">{entry.id}</td>
                            <td className="font-medium">{entry.admin_username}</td>
                            <td>
                              <span className="badge badge-primary">{entry.action}</span>
                            </td>
                            <td className="text-secondary text-sm">{entry.details || '-'}</td>
                            <td className="text-secondary text-sm">
                              {new Date(entry.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
