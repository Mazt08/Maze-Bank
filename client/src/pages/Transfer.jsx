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
        navigateTo('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  function navigateTo(url) {
    // Simple navigation without full page reload
    const link = document.createElement('a');
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div>
      <h1 className="page-title mb-4">Transfer Funds</h1>

      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">From Account</label>
              <select
                className="form-input form-select"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="">Select account</option>
                {fromAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_number} - ${
                      parseFloat(acc.balance).toFixed(2)
                    }
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">To Account</label>
              <select
                className="form-input form-select"
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
              <label className="form-label">Amount ($)</label>
              <input
                type="number"
                className="form-input"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Payment for rent"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Processing...' : 'Transfer Funds'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}