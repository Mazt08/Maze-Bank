import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import History from './pages/History';
import Admin from './pages/Admin';
import './index.css';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route
          path="/dashboard"
          element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>}
        />
        <Route
          path="/transfer"
          element={<PrivateRoute><Layout><Transfer /></Layout></PrivateRoute>}
        />
        <Route
          path="/history"
          element={<PrivateRoute><Layout><History /></Layout></PrivateRoute>}
        />
        <Route
          path="/admin"
          element={<PrivateRoute><Layout><Admin /></Layout></PrivateRoute>}
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
