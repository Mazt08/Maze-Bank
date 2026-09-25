/**
 * dashboard.js — Account overview page for Maze Bank vanilla frontend.
 */

'use strict';

const API = '/api';

function getToken() { return sessionStorage.getItem('maze_token'); }
function getStoredUser() { return sessionStorage.getItem('maze_user') || ''; }

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

function fmt(n) { return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function initTopbar() {
  const usernameEl = document.getElementById('topbarUsername');
  const roleEl     = document.getElementById('topbarRole');
  const avatarEl   = document.getElementById('topbarAvatar');
  if (usernameEl) usernameEl.textContent = getStoredUser();
  if (avatarEl && getStoredUser()) avatarEl.textContent = getStoredUser()[0].toUpperCase();

  // Fetch session for role
  apiFetch('/auth/session.php').then(d => {
    if (d.user) {
      if (usernameEl) usernameEl.textContent = d.user.username;
      if (roleEl)     roleEl.textContent = d.user.role;
      if (avatarEl)   avatarEl.textContent = d.user.username[0].toUpperCase();
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

async function loadDashboard() {
  const loadingEl  = document.getElementById('dashLoading');
  const contentEl  = document.getElementById('dashContent');
  const errorEl    = document.getElementById('dashError');

  const data = await apiFetch('/accounts/index.php');

  if (loadingEl) loadingEl.hidden = true;

  if (!data.success || !data.accounts || data.accounts.length === 0) {
    if (errorEl) {
      errorEl.textContent = data.error || 'No account found.';
      errorEl.hidden = false;
    }
    return;
  }

  const account = data.accounts[0];

  const balEl  = document.getElementById('accountBalance');
  const numEl  = document.getElementById('accountNumber');
  const creEl  = document.getElementById('accountCreated');
  const tbalEl = document.getElementById('tableBalance');
  const tnumEl = document.getElementById('tableAccountNumber');
  const wElMsg = document.getElementById('welcomeMsg');
  const avatEl = document.getElementById('topbarAvatar');
  if (balEl)  balEl.textContent  = '$' + fmt(account.balance);
  if (numEl)  numEl.textContent  = account.account_number;
  if (tbalEl) tbalEl.textContent = '$' + fmt(account.balance);
  if (tnumEl) tnumEl.textContent = account.account_number;
  if (creEl)  creEl.textContent  = new Date(account.created_at).toLocaleDateString();
  const uname = getStoredUser();
  if (wElMsg) wElMsg.textContent = `Welcome back, ${uname}`;
  if (avatEl) avatEl.textContent = uname ? uname[0].toUpperCase() : '?';

  // Wire "View History" link with account id
  document.querySelectorAll('[data-history-link]').forEach(el => {
    el.href = `/history.html?account=${account.id}`;
  });

  if (contentEl) contentEl.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initTopbar();
  initLogout();
  loadDashboard();
});
