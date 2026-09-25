import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transferAPI } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Transfer() {
  const navigate = useNavigate();
  const [fromAccounts, setFromAccounts] = useState([]);

  usePageTitle('Transfer Funds');
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
      const res = await transferAPI.getOptions();
      const froms = res.data.fromAccounts || res.data.accounts || [];
      const tos = res.data.toAccounts || res.data.recipients || [];
      setFromAccounts(froms);
      setToAccounts(tos);
      if (froms.length > 0) setFromAccountId(froms[0].id);
    } catch (err) {
      setError('Failed to load transfer options');
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

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Amount must be positive');
      return;
    }

    if (String(fromAccountId) === String(toAccountId)) {
      setError('Sender and recipient accounts cannot be the same');
      return;
    }

    setSubmitting(true);

    try {
      await transferAPI.transfer(
        parseInt(fromAccountId, 10),
        parseInt(toAccountId, 10),
        parseFloat(amount),
        description
      );
      setSuccess('Transfer completed successfully!');
      setFromAccountId(fromAccounts[0]?.id || '');
      setToAccountId('');
      setAmount('');
      setDescription('');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title mb-4">Transfer Funds</h1>

      {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
      {success && <div className="alert alert-success mb-3" role="status">{success}</div>}

      {loading ? (
        <div className="loading" role="status">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} aria-label="Funds Transfer Form">
            <div className="form-group">
              <label htmlFor="fromAccountSelect" className="form-label">From Account</label>
              <select
                id="fromAccountSelect"
                className="form-input form-select"
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
              <label htmlFor="toAccountSelect" className="form-label">To Account</label>
              <select
                id="toAccountSelect"
                className="form-input form-select"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="">Select recipient account</option>
                {toAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_number} {acc.username ? `(${acc.username})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="transferAmountInput" className="form-label">Amount ($)</label>
              <input
                id="transferAmountInput"
                type="number"
                className="form-input"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="transferDescriptionInput" className="form-label">Description (optional)</label>
              <input
                id="transferDescriptionInput"
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Payment for rent"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitting}
                aria-label="Execute fund transfer"
              >
                {submitting ? 'Processing...' : 'Transfer Funds'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}