import React, { useEffect, useState } from 'react';
import { transferAPI } from '../services/api';

export default function Transfer() {
  const [fromAccounts, setFromAccounts] = useState([]);
  const [toAccounts, setToAccounts] = useState([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTransferOptions();
  }, []);

  const loadTransferOptions = async () => {
    try {
      setLoading(true);
      const response = await transferAPI.getOptions();
      setFromAccounts(response.data.fromAccounts);
      setToAccounts(response.data.toAccounts);
      if (response.data.fromAccounts.length > 0) {
        setFromAccountId(response.data.fromAccounts[0].id);
      }
    } catch (err) {
      setError('Failed to load transfer options');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fromAccountId || !toAccountId || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be positive');
      return;
    }

    setSubmitting(true);

    try {
      await transferAPI.transfer(
        parseInt(fromAccountId),
        parseInt(toAccountId),
        parseFloat(amount),
        description
      );
      setSuccess('Transfer completed successfully!');
      setFromAccountId(fromAccounts[0]?.id || '');
      setToAccountId('');
      setAmount('');
      setDescription('');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <h1>💸 Transfer Funds</h1>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit} className="card">
            <div className="form-group">
              <label>From Account</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="">Select account</option>
                {fromAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_number} - ${parseFloat(acc.balance).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>To Account</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="">Select recipient account</option>
                {toAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Payment for rent"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Processing...' : 'Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
