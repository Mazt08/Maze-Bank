/**
 * history.js — Transaction history + SQLi-vulnerable search page.
 *
 * The search input is sent verbatim to /api/transactions/history.php which
 * interpolates it directly into SQL (VULN). This matches the intentional
 * vulnerability in the backend.
 */

'use strict';

const API = '/api';

function getToken() { return sessionStorage.getItem('maze_token'); }

function requireAuth() {
  if (!getToken()) window.location.href = '/index.html';
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { sessionStorage.clear(); window.location.href = '/index.html'; }
  return res.json().catch(() => ({}));
}

function fmt(n) {
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initTopbar() {
  const usernameEl = document.getElementById('topbarUsername');
  const roleEl     = document.getElementById('topbarRole');
  apiFetch('/auth/session.php').then(d => {
    if (d.user) {
      if (usernameEl) usernameEl.textContent = d.user.username;
      if (roleEl)     roleEl.textContent = d.user.role;
      if (d.user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.hidden = false);
      }
    }
  });
}

function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await fetch(API + '/auth/logout.php', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
    }).catch(() => {});
    sessionStorage.clear();
    window.location.href = '/index.html';
  });
}

function renderRows(transactions, accountId) {
  const tbody = document.getElementById('txBody');
  const empty = document.getElementById('txEmpty');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  transactions.forEach(tx => {
    const isSender = tx.from_account === accountId;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size:13px">${new Date(tx.timestamp).toLocaleString()}</td>
      <td><span class="badge badge-neutral">${tx.transaction_type || 'transfer'}</span></td>
      <td class="mono" style="font-size:13px">${tx.from_account_number || tx.from_account || '—'}</td>
      <td class="mono" style="font-size:13px">${tx.to_account_number   || tx.to_account   || '—'}</td>
      <td class="text-right ${isSender ? 'amount-negative' : 'amount-positive'}">
        ${isSender ? '−' : '+'}$${fmt(tx.amount)}
      </td>
      <td class="sub" style="font-size:13px">${tx.description || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadAccounts() {
  const sel = document.getElementById('accountSelect');
  if (!sel) return null;

  const data = await apiFetch('/accounts/index.php');
  if (!data.success || !data.accounts) return null;

  data.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = `${acc.account_number}  —  $${fmt(acc.balance)}`;
    sel.appendChild(opt);
  });

  // Pre-select from URL query param
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('account');
  if (preselect) sel.value = preselect;

  return sel.value ? parseInt(sel.value, 10) : null;
}

async function fetchHistory(accountId, searchTerm = '') {
  const loadingEl = document.getElementById('txLoading');
  if (loadingEl) loadingEl.hidden = false;
  const empty = document.getElementById('txEmpty');
  if (empty) empty.hidden = true;

  // VULN: searchTerm passes through to history.php which interpolates into SQL.
  const qs = `?account_id=${encodeURIComponent(accountId)}&search=${encodeURIComponent(searchTerm)}`;
  const data = await apiFetch('/transactions/history.php' + qs);

  if (loadingEl) loadingEl.hidden = true;

  if (!data.success) {
    const errorEl = document.getElementById('txError');
    if (errorEl) { errorEl.textContent = data.error || 'Failed to load transactions.'; errorEl.hidden = false; }
    return;
  }

  renderRows(data.transactions, accountId);
}

function initHistoryPage() {
  const sel        = document.getElementById('accountSelect');
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const clearBtn   = document.getElementById('clearSearch');
  const tableWrap  = document.getElementById('txTableWrap');

  let currentAccountId = null;

  loadAccounts().then(id => {
    currentAccountId = id;
    if (currentAccountId) {
      if (tableWrap) tableWrap.hidden = false;
      fetchHistory(currentAccountId);
    }
  });

  if (sel) {
    sel.addEventListener('change', () => {
      currentAccountId = parseInt(sel.value, 10) || null;
      if (currentAccountId) {
        if (tableWrap) tableWrap.hidden = false;
        if (searchInput) searchInput.value = '';
        fetchHistory(currentAccountId);
      }
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentAccountId) return;
      const term = searchInput ? searchInput.value : '';
      fetchHistory(currentAccountId, term);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (currentAccountId) fetchHistory(currentAccountId);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initTopbar();
  initLogout();
  initHistoryPage();
});
