import React, { createContext, useState, useEffect, useCallback } from "react";
import {
  authAPI,
  getActiveSessionToken,
  storeSessionToken,
  removeActiveSessionToken,
} from "../services/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getActiveSessionToken());
  const [loading, setLoading] = useState(!!getActiveSessionToken());
  const [error, setError] = useState(null);

  // Check if user is already authenticated
  useEffect(() => {
    if (token) {
      authAPI
        .getCurrentUser()
        .then((res) => {
          setUser(res.data.user);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch user:", err);
          const activeUser = sessionStorage.getItem("active_session_user");
          if (activeUser) removeActiveSessionToken(activeUser);
          setToken(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(username, password);
      const { token: sessionToken, user: userData } = response.data;

      // Store the exposed lab token per browser tab (VULN: not HttpOnly).
      storeSessionToken(userData.username, sessionToken);
      setToken(sessionToken);
      setUser(userData);

      return userData;
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Login failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.register(username, password);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Registration failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      const activeUser = sessionStorage.getItem("active_session_user");
      if (activeUser) removeActiveSessionToken(activeUser);
      setToken(null);
      setUser(null);
      setError(null);
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
