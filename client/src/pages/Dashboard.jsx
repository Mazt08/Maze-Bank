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
    <div className="page">
      <h1>💼 Dashboard</h1>
      <p>Welcome, {user?.username}! {user?.role === 'admin' && '👤 (Admin)'}</p>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading accounts...</div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="card">
              <h3>Total Balance</h3>
              <div className="balance-amount">${totalBalance.toFixed(2)}</div>
              <p className="text-muted">{accounts.length} account(s)</p>
            </div>

            <div className="card">
              <h3>Quick Actions</h3>
              <div className="card-content">
                <a href="/transfer" className="btn">
                  💸 Transfer Funds
                </a>
                <a href="/history" className="btn">
                  📋 View History
                </a>
                {user?.role === 'admin' && (
                  <a href="/admin" className="btn">
                    ⚙️ Admin Panel
                  </a>
                )}
              </div>
            </div>
          </div>

          <h2>Your Accounts</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <code>{account.account_number}</code>
                    </td>
                    <td>{account.account_type}</td>
                    <td>
                      <strong>${parseFloat(account.balance).toFixed(2)}</strong>
                    </td>
                    <td>{new Date(account.created_at).toLocaleDateString()}</td>
                    <td>
                      <a
                        href={`/history?account=${account.id}`}
                        className="btn btn-small"
                      >
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
