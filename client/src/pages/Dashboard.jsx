import React, { useEffect, useState } from 'react';
import { accountAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountAPI.getAccounts();
      setAccounts(response.data.accounts);
    } catch (err) {
      setError('Failed to load accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

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
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Loading accounts...</span>
        </div>
      ) : (
        <>
          {/* Balance Summary */}
          <div className="stats-grid mb-4">
            <div className="stat-card">
              <div className="stat-label">Total Balance</div>
              <div className="stat-value">${totalBalance.toFixed(2)}</div>
              <div className="stat-label mt-1" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                {accounts.length} account{accounts.length !== 1 ? 's' : ''}
              </div>
            </div>
            {accounts.map((account) => (
              <div className="stat-card" key={account.id}>
                <div className="stat-label">{account.account_type}</div>
                <div className="stat-value" style={{ fontSize: '22px' }}>
                  ${parseFloat(account.balance).toFixed(2)}
                </div>
                <div className="stat-label mt-1" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                  <span className="font-mono text-sm">{account.account_number}</span>
                </div>
              </div>
            ))}
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

          {/* Accounts Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <span className="font-mono text-sm">{account.account_number}</span>
                    </td>
                    <td>{account.account_type}</td>
                    <td>
                      <span className="font-medium">
                        ${parseFloat(account.balance).toFixed(2)}
                      </span>
                    </td>
                    <td className="text-secondary">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <a href={`/history?account=${account.id}`} className="btn btn-ghost btn-sm">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
