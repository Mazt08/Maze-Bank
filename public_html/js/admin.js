/**
 * admin.js — Admin panel page for Maze Bank vanilla frontend.
 * Tabs: Stats | Users | Accounts | Logs
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
  if (res.status === 403) {
    document.getElementById('accessDenied').hidden = false;
    document.getElementById('adminPanel').hidden = true;
    return {};
  }
  return res.json().catch(() => ({}));
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initTopbar() {
  const usernameEl = document.getElementById('topbarUsername');
  const roleEl     = document.getElementById('topbarRole');
  apiFetch('/auth/session.php').then(d => {
    if (d.user) {
      if (usernameEl) usernameEl.textContent = d.user.username;
      if (roleEl)     roleEl.textContent = d.user.role;
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

// ---- Tabs ----

function initTabs() {
  document.querySelectorAll('.tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.hidden = true);
      btn.classList.add('active');
      const panel = document.getElementById('panel-' + btn.dataset.tab);
      if (panel) panel.hidden = false;
    });
  });
}

// ---- Stats ----

async function loadStats() {
  const data = await apiFetch('/admin/stats.php');
  if (!data.stats) return;
  const s = data.stats;
  setText('statUsers',        s.totalUsers);
  setText('statAccounts',     s.totalAccounts);
  setText('statBalance',      '$' + fmt(s.totalBalance));
  setText('statTransactions', s.totalTransactions);
  setText('statFailedLogins', s.failedLogins);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ---- Users ----

async function loadUsers() {
  const tbody = document.getElementById('usersBody');
  if (!tbody) return;

  const data = await apiFetch('/admin/users.php');
  if (!data.success || !data.users) return;

  tbody.innerHTML = '';
  data.users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size:13px">${u.id}</td>
      <td><strong>${escHtml(u.username)}</strong></td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-navy' : 'badge-neutral'}">${u.role}</span></td>
      <td class="sub">${new Date(u.created_at).toLocaleDateString()}</td>
    `;
    tbody.appendChild(tr);
  });

  // Populate "add account" user select (in accounts tab)
  const userSel = document.getElementById('newAccountUser');
  if (userSel) {
    userSel.innerHTML = '<option value="">Select a user</option>';
    data.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.username} (${u.role})`;
      userSel.appendChild(opt);
    });
  }
}

// ---- Accounts ----

async function loadAccounts() {
  const tbody = document.getElementById('accountsBody');
  if (!tbody) return;

  const data = await apiFetch('/admin/accounts.php');
  if (!data.success || !data.accounts) return;

  tbody.innerHTML = '';
  data.accounts.forEach(acc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size:13px">${escHtml(acc.account_number)}</td>
      <td>${escHtml(acc.username)}</td>
      <td class="text-right mono">${'$' + fmt(acc.balance)}</td>
      <td class="sub">${new Date(acc.created_at).toLocaleDateString()}</td>
    `;
    tbody.appendChild(tr);
  });

  const countEl = document.getElementById('accountsCount');
  if (countEl) countEl.textContent = data.accounts.length;
}

function initAddAccountModal() {
  const openBtn   = document.getElementById('openAddAccountModal');
  const backdrop  = document.getElementById('addAccountModal');
  const closeBtn  = document.getElementById('closeAddAccountModal');
  const form      = document.getElementById('addAccountForm');
  const alertEl   = document.getElementById('addAccountAlert');
  const btnText   = document.getElementById('addAccountBtnText');

  if (!openBtn || !backdrop) return;

  openBtn.addEventListener('click', () => {
    backdrop.classList.add('open');
  });
  closeBtn?.addEventListener('click', () => backdrop.classList.remove('open'));
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alertEl) { alertEl.hidden = true; alertEl.textContent = ''; }

    const userId = parseInt(document.getElementById('newAccountUser').value, 10);
    if (!userId) {
      showModalAlert(alertEl, 'Please select a user.');
      return;
    }

    btnText.textContent = 'Creating…';
    form.querySelector('button[type=submit]').disabled = true;

    const token   = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API + '/admin/accounts.php', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));

    form.querySelector('button[type=submit]').disabled = false;
    btnText.textContent = 'Create Account';

    if (res.ok && data.success) {
      backdrop.classList.remove('open');
      await loadAccounts();
      await loadStats();
    } else {
      showModalAlert(alertEl, data.error || 'Failed to create account.');
    }
  });
}

function showModalAlert(el, msg) {
  if (!el) return;
  el.className = 'alert alert-danger';
  el.textContent = msg;
  el.hidden = false;
}

// ---- Logs ----

async function loadLogs() {
  const data = await apiFetch('/admin/logs.php');
  if (!data.success) return;

  // Failed login attempts
  const attemptsBody = document.getElementById('loginAttemptsBody');
  const attemptsEmpty = document.getElementById('loginAttemptsEmpty');
  if (attemptsBody) {
    attemptsBody.innerHTML = '';
    const attempts = data.login_attempts || [];
    if (attempts.length === 0) {
      if (attemptsEmpty) attemptsEmpty.hidden = false;
    } else {
      if (attemptsEmpty) attemptsEmpty.hidden = true;
      attempts.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono" style="font-size:13px">${a.id}</td>
          <td class="mono" style="font-size:13px">${escHtml(a.username || '(empty)')}</td>
          <td class="mono" style="font-size:13px">${escHtml(a.ip_address)}</td>
          <td class="sub" style="font-size:13px">${new Date(a.attempted_at).toLocaleString()}</td>
        `;
        attemptsBody.appendChild(tr);
      });
    }
    const cntEl = document.getElementById('loginAttemptsCount');
    if (cntEl) cntEl.textContent = attempts.length;
  }

  // Admin audit log
  const adminLogBody  = document.getElementById('adminLogBody');
  const adminLogEmpty = document.getElementById('adminLogEmpty');
  if (adminLogBody) {
    adminLogBody.innerHTML = '';
    const logs = data.admin_logs || [];
    if (logs.length === 0) {
      if (adminLogEmpty) adminLogEmpty.hidden = false;
    } else {
      if (adminLogEmpty) adminLogEmpty.hidden = true;
      logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono" style="font-size:13px">${l.id}</td>
          <td><strong>${escHtml(l.admin_username)}</strong></td>
          <td><span class="badge badge-navy">${escHtml(l.action)}</span></td>
          <td class="sub" style="font-size:13px">${escHtml(l.details || '—')}</td>
          <td class="sub" style="font-size:13px">${new Date(l.timestamp).toLocaleString()}</td>
        `;
        adminLogBody.appendChild(tr);
      });
    }
  }
}

// ---- XSS escape for dynamic content ----
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Boot ----

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  initTopbar();
  initLogout();
  initTabs();
  initAddAccountModal();

  // Load all data in parallel
  await Promise.all([loadStats(), loadUsers(), loadAccounts(), loadLogs()]);
});
