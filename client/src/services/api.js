import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const ACTIVE_SESSION_USER_KEY = "active_session_user";

export function getActiveSessionToken() {
  const activeUser = sessionStorage.getItem(ACTIVE_SESSION_USER_KEY);
  if (!activeUser) return null;

  try {
    return sessionStorage.getItem("session_token");
  } catch {
    return null;
  }
}

export function storeSessionToken(username, token) {
  sessionStorage.setItem("session_token", token);
  sessionStorage.setItem(ACTIVE_SESSION_USER_KEY, username);
}

export function removeActiveSessionToken(username) {
  sessionStorage.removeItem("session_token");
  sessionStorage.removeItem(ACTIVE_SESSION_USER_KEY);
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = getActiveSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const activeUser = sessionStorage.getItem(ACTIVE_SESSION_USER_KEY);
      if (activeUser) removeActiveSessionToken(activeUser);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth endpoints
export const authAPI = {
  register: (username, password) =>
    api.post("/auth/register", { username, password }),
  login: (username, password) =>
    api.post("/auth/login", { username, password }),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
};

// Account endpoints
export const accountAPI = {
  getAccounts: () => api.get("/accounts"),
  getBalance: (accountId) => api.get(`/accounts/${accountId}`),
  getHistory: (accountId) => api.get(`/accounts/${accountId}/history`),
  searchTransactions: (accountId, searchTerm) =>
    api.get(`/accounts/${accountId}/search`, { params: { searchTerm } }),
};

// Transfer endpoints
export const transferAPI = {
  getOptions: () => api.get("/transfers/options"),
  transfer: (fromAccountId, toAccountId, amount, description) =>
    api.post("/transfers", {
      fromAccountId,
      toAccountId,
      amount,
      description,
    }),
};

// Admin endpoints
export const adminAPI = {
  getAllUsers: () => api.get("/admin/users"),
  getAllAccounts: () => api.get("/admin/accounts"),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  updateBalance: (accountId, newBalance) =>
    api.put(`/admin/accounts/${accountId}/balance`, { newBalance }),
  createAccount: (userId) =>
    api.post("/admin/accounts", { userId }),
  getStats: () => api.get("/admin/stats"),
  getLogs: () => api.get("/admin/logs"),
};

export default api;
