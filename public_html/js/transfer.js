/**
 * transfer.js — Fund transfer page for Maze Bank vanilla frontend.
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

function showAlert(id, msg, type = 'danger') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.hidden = false;
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) { el.hidden = true; el.textContent = ''; }
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

async function loadTransferOptions() {
  const loadingEl = document.getElementById('transferLoading');
  const formEl    = document.getElementById('transferForm');
  const fromSel   = document.getElementById('fromAccountId');
  const toSel     = document.getElementById('toAccountId');

  const data = await apiFetch('/transfers/options.php');

  if (loadingEl) loadingEl.hidden = true;

  if (!data.success) {
    showAlert('transferAlert', data.error || 'Failed to load transfer options.');
    return;
  }

  // Populate sender accounts
  (data.accounts || []).forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = `${acc.account_number}  —  $${fmt(acc.balance)}`;
    fromSel.appendChild(opt);
  });

  // Populate recipient accounts
  (data.recipients || []).forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = `${acc.account_number}  (${acc.username})`;
    toSel.appendChild(opt);
  });

  if (formEl) formEl.hidden = false;
}

function initTransferForm() {
  const form    = document.getElementById('transferForm');
  const btnText = document.getElementById('transferBtnText');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('transferAlert');

    const fromAccountId = parseInt(form.fromAccountId.value, 10);
    const toAccountId   = parseInt(form.toAccountId.value, 10);
    const rawAmount     = form.amount.value.trim();
    const description   = form.description.value.trim() || 'Transfer';

    if (!fromAccountId || !toAccountId) {
      showAlert('transferAlert', 'Please select both sender and recipient accounts.');
      return;
    }
    if (fromAccountId === toAccountId) {
      showAlert('transferAlert', 'Sender and recipient accounts cannot be the same.');
      return;
    }
    if (!rawAmount || isNaN(rawAmount) || parseFloat(rawAmount) <= 0) {
      showAlert('transferAlert', 'Enter a valid amount greater than zero.');
      return;
    }

    btnText.textContent = 'Processing…';
    form.querySelector('button[type=submit]').disabled = true;

    const { ok, data } = await (async () => {
      const token   = getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(API + '/transfers/transfer.php', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: parseFloat(rawAmount),
          description,
        }),
      });
      if (res.status === 401) { sessionStorage.clear(); window.location.href = '/index.html'; }
      const d = await res.json().catch(() => ({}));
      return { ok: res.ok, data: d };
    })();

    form.querySelector('button[type=submit]').disabled = false;
    btnText.textContent = 'Transfer Funds';

    if (ok && data.success) {
      showAlert('transferAlert', 'Transfer completed successfully!', 'success');
      form.reset();
      // Refresh options to show updated balances
      document.getElementById('fromAccountId').innerHTML = '<option value="">Select your account</option>';
      document.getElementById('toAccountId').innerHTML = '<option value="">Select recipient account</option>';
      loadTransferOptions();
    } else {
      showAlert('transferAlert', data.error || 'Transfer failed.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initTopbar();
  initLogout();
  loadTransferOptions();
  initTransferForm();
});
