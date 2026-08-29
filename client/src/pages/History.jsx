import React, { useEffect, useState, useCallback } from 'react';
import { accountAPI } from '../services/api';

export default function History() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountAPI.getAccounts();
      setAccounts(response.data.accounts);
      if (response.data.accounts.length > 0) {
        setSelectedAccountId(response.data.accounts[0].id);
      }
    } catch (err) {
      setError('Failed to load accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactionHistory = useCallback(async () => {
    if (!selectedAccountId) return;

    try {
      setSearching(true);
      const response = await accountAPI.getHistory(selectedAccountId);
      setTransactions(response.data.transactions);
      setError('');
    } catch (err) {
      setError('Failed to load transactions');
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedAccountId && searchTerm === '') {
      loadTransactionHistory();
    }
  }, [selectedAccountId, searchTerm, loadTransactionHistory]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    try {
      setSearching(true);
      setError('');
      const response = await accountAPI.searchTransactions(
        selectedAccountId,
        searchTerm
      );
      setTransactions(response.data.transactions);
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    loadTransactionHistory();
  };

  return (
    <div className="page">
      <h1>📋 Transaction History</h1>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="card">
            <div className="form-group">
              <label>Select Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setTransactions([]);
                  setSearchTerm('');
                }}
                disabled={searching}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_number} - ${parseFloat(acc.balance).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {selectedAccountId && (
              <form onSubmit={handleSearch} style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transactions by description..."
                    style={{ flex: 1 }}
                    disabled={searching}
                  />
                  <button type="submit" className="btn" disabled={searching}>
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                  {searchTerm && (
                    <button
                      type="button"
                      className="btn"
                      onClick={handleClearSearch}
                      disabled={searching}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            )}

            {searchTerm && (
              <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f0f4ff' }}>
                <h4>💡 SQL Injection Vulnerability:</h4>
                <p>Try searching for:</p>
                <code
                  style={{
                    display: 'block',
                    background: '#fff',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    overflowX: 'auto',
                  }}
                >
                  %' OR '1'='1
                </code>
                <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                  This returns ALL transactions instead of just filtered ones!
                </p>
              </div>
            )}
          </div>

          {selectedAccountId && (
            <>
              <h2>
                Transactions
                {searchTerm && ` (searching for: "${searchTerm}")`}
              </h2>
              {transactions.length === 0 ? (
                <div className="card">
                  <p className="text-center text-muted">No transactions found</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>From Account</th>
                        <th>To Account</th>
                        <th>Amount</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>{new Date(tx.timestamp).toLocaleString()}</td>
                          <td>{tx.transaction_type}</td>
                          <td>
                            <code>{tx.from_account}</code>
                          </td>
                          <td>
                            <code>{tx.to_account}</code>
                          </td>
                          <td>${parseFloat(tx.amount).toFixed(2)}</td>
                          <td>{tx.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
