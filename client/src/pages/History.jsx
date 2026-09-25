import React, { useEffect, useState, useCallback } from "react";
import { accountAPI } from "../services/api";
import { usePageTitle } from "../hooks/usePageTitle";

export default function History() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  usePageTitle("Transaction History");

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountAPI.getAccounts();
      setAccounts(response.data.accounts);
      if (response.data.accounts.length > 0) {
        setSelectedAccountId(response.data.accounts[0].id);
      }
    } catch (err) {
      setError("Failed to load accounts");
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
      setError("");
    } catch (err) {
      setError("Failed to load transactions");
    } finally {
      setSearching(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedAccountId && searchTerm === "") {
      loadTransactionHistory();
    }
  }, [selectedAccountId, searchTerm, loadTransactionHistory]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    try {
      setSearching(true);
      setError("");
      const response = await accountAPI.searchTransactions(
        selectedAccountId,
        searchTerm,
      );
      setTransactions(response.data.transactions);
    } catch (err) {
      setError("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    loadTransactionHistory();
  };

  return (
    <div>
      <h1 className="page-title mb-3">Transaction History</h1>

      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading" role="status" aria-label="Loading accounts">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <div className="card">
          <div className="form-group">
            <label htmlFor="historyAccountSelect" className="form-label">
              Account
            </label>
            <select
              id="historyAccountSelect"
              className="form-input form-select"
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setTransactions([]);
                setSearchTerm("");
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
            <form onSubmit={handleSearch} className="search-bar" role="search">
              <div className="search-input-wrapper">
                <label htmlFor="historySearchInput" className="sr-only">
                  Search transactions by description
                </label>
                <input
                  id="historySearchInput"
                  type="text"
                  className="form-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by description..."
                  disabled={searching}
                  aria-label="Search transactions by description"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={searching}
                aria-label="Run transaction search"
              >
                {searching ? "Searching..." : "Search"}
              </button>
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearSearch}
                  disabled={searching}
                  aria-label="Clear search and show all transactions"
                >
                  Clear
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {selectedAccountId && (
        <div className="card">
          <h2>
            Transactions
            {searchTerm && (
              <span className="text-muted font-mono text-sm ml-2">
                (searching: &ldquo;{searchTerm}&rdquo;)
              </span>
            )}
          </h2>
          {transactions.length === 0 ? (
            <div className="text-center text-muted" style={{ padding: "24px" }}>
              No transactions found
            </div>
          ) : (
            <div className="table-container mt-2">
              <table className="table" aria-label="Transaction history">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">From</th>
                    <th scope="col">To</th>
                    <th scope="col" className="text-right">Amount</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-mono text-sm">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-default">
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="font-mono text-sm">
                        {tx.from_account_number || tx.from_account || "-"}
                      </td>
                      <td className="font-mono text-sm">
                        {tx.to_account_number || tx.to_account || "-"}
                      </td>
                      <td className="table-amount">
                        ${parseFloat(tx.amount).toFixed(2)}
                      </td>
                      <td className="text-secondary">
                        {tx.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
