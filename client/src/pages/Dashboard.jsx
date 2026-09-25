import React, { useEffect, useState } from 'react';
import { accountAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Dashboard() {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageTitle('Dashboard');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountAPI.getAccounts();
      setAccount(response.data.accounts[0] || null);
    } catch (err) {
      setError('Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome, {user?.username}{' '}
          {user?.role === 'admin' && <span>(Admin)</span>}
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading" role="status" aria-label="Loading account">
          <div className="loading-spinner"></div>
          <span>Loading account...</span>
        </div>
      ) : account ? (
        <>
          {/* Balance Card - one account per user */}
          <div className="stats-grid mb-4">
            <div className="stat-card">
              <div className="stat-label">Available Balance</div>
              <div className="stat-value">
                ${parseFloat(account.balance).toFixed(2)}
              </div>
              <div
                className="stat-label mt-1"
                style={{ textTransform: 'none', letterSpacing: 'normal' }}
              >
                <span className="font-mono text-sm">
                  {account.account_number}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="quick-actions">
              <a href="/transfer" className="btn btn-primary">
                New Transfer
              </a>
              <a href="/history" className="btn btn-secondary">
                View History
              </a>
              {user?.role === 'admin' && (
                <a href="/admin" className="btn btn-ghost">
                  Admin Panel
                </a>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="table-container">
            <table className="table" aria-label="Account details">
              <thead>
                <tr>
                  <th scope="col">Account Number</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Created</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                <tr key={account.id}>
                  <td>
                    <span className="font-mono text-sm">
                      {account.account_number}
                    </span>
                  </td>
                  <td>
                    <span className="font-medium">
                      ${parseFloat(account.balance).toFixed(2)}
                    </span>
                  </td>
                  <td className="text-secondary">
                    {new Date(account.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <a
                      href={`/history?account=${account.id}`}
                      className="btn btn-ghost btn-sm"
                      aria-label={`View history for account ${account.account_number}`}
                    >
                      View
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="text-center text-muted" style={{ padding: '24px' }}>
            No account found. An account is created automatically when you register.
          </div>
        </div>
      )}
    </div>
  );
}
