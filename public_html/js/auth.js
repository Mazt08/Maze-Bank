/**
 * auth.js — Login & Register page logic for Maze Bank vanilla frontend.
 *
 * Stores the session token in sessionStorage (intentional VULN: exposed
 * to JavaScript, matching the React client behaviour for the lab).
 */

'use strict';

const API = '/api';

// ---- Shared helpers ----

function setToken(token, username) {
  sessionStorage.setItem('maze_token', token);
  sessionStorage.setItem('maze_user', username);
}

function getToken() {
  return sessionStorage.getItem('maze_token');
}

function redirectIfAuthed() {
  if (getToken()) window.location.href = '/dashboard.html';
}

function showAlert(el, msg, type = 'danger') {
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.hidden = false;
}

function hideAlert(el) {
  el.hidden = true;
  el.textContent = '';
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---- Login page ----

function initLogin() {
  const form    = document.getElementById('loginForm');
  const alertEl = document.getElementById('loginAlert');
  const btnText = document.getElementById('loginBtnText');

  if (!form) return;
  redirectIfAuthed();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      showAlert(alertEl, 'Username and password are required.');
      return;
    }

    btnText.textContent = 'Signing in…';
    form.querySelector('button[type=submit]').disabled = true;

    const { ok, data } = await apiFetch('/auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    form.querySelector('button[type=submit]').disabled = false;
    btnText.textContent = 'Sign In';

    if (ok && data.success) {
      // VULN: token exposed in JS-accessible sessionStorage (not HttpOnly).
      setToken(data.token || data.session_token, data.user?.username || username);
      window.location.href = '/dashboard.html';
    } else {
      showAlert(alertEl, data.error || 'Login failed. Check credentials and try again.');
    }
  });
}

// ---- Register page ----

function initRegister() {
  const form    = document.getElementById('registerForm');
  const alertEl = document.getElementById('registerAlert');
  const btnText = document.getElementById('registerBtnText');

  if (!form) return;
  redirectIfAuthed();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const username = form.username.value.trim();
    const password = form.password.value;
    const confirm  = form.confirmPassword.value;

    if (!username || !password) {
      showAlert(alertEl, 'Username and password are required.');
      return;
    }
    if (password !== confirm) {
      showAlert(alertEl, 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      showAlert(alertEl, 'Password must be at least 6 characters.');
      return;
    }

    btnText.textContent = 'Creating account…';
    form.querySelector('button[type=submit]').disabled = true;

    const { ok, data } = await apiFetch('/auth/register.php', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    form.querySelector('button[type=submit]').disabled = false;
    btnText.textContent = 'Create Account';

    if (ok && data.success) {
      showAlert(alertEl, 'Account created! Signing you in…', 'success');

      // Auto-login after registration
      const login = await apiFetch('/auth/login.php', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (login.ok && login.data.success) {
        setToken(login.data.token || login.data.session_token, username);
        window.location.href = '/dashboard.html';
      } else {
        window.location.href = '/index.html';
      }
    } else {
      showAlert(alertEl, data.error || 'Registration failed.');
    }
  });
}

// Boot the right handler based on which form is present.
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initRegister();
});
