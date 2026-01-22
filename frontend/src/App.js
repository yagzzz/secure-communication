import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import AppProviders from '@/contexts/AppProviders';
import { useDeviceUnlock } from '@/contexts/DeviceUnlockContext';
import { useUser } from '@/contexts/UserContext';
import { requireAuth, requireUnlock, redirectRoot, requireRole } from '@/routes/guards';
import Login from '@/pages/Login';
import UnlockScreen from '@/pages/UnlockScreen';
import Home from '@/pages/Home';
import AdminDashboard from '@/pages/AdminDashboard';
import ChatInterface from '@/pages/ChatInterface';
import Settings from '@/pages/Settings';
import '@/utils/resizeObserverFix';
import '@/App.css';

// Protected Route wrapper that checks both auth and unlock
const ProtectedRoute = ({ children, requiresAuth = true, requiresUnlock = false, isAuthenticated }) => {
  const { isUnlocked } = useDeviceUnlock();
  const location = useLocation();

  const authRedirect = requiresAuth ? requireAuth({ isAuthenticated }) : null;
  if (authRedirect) {
    return <Navigate to={authRedirect} state={{ from: location }} replace />;
  }

  const unlockRedirect = requiresUnlock ? requireUnlock({ isUnlocked }) : null;
  if (unlockRedirect) {
    return <Navigate to={unlockRedirect} state={{ from: location }} replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { isAuthenticated, role, loading } = useUser();
  const { isUnlocked } = useDeviceUnlock();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Theme is handled at app startup
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-[#22c55e] text-xl font-mono">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="App dark">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/unlock" replace />}
          />

            {/* Unlock screen - requires auth but not unlock */}
            <Route
              path="/unlock"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiresAuth={true} requiresUnlock={false}>
                  <UnlockScreen />
                </ProtectedRoute>
              }
            />

            {/* Protected routes - require both auth and unlock */}
            <Route
              path="/home"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiresAuth={true} requiresUnlock={true}>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiresAuth={true} requiresUnlock={true}>
                  <ChatInterface />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiresAuth={true} requiresUnlock={true}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                requireRole({ role, requiredRole: 'admin' }) ? (
                  <Navigate to="/login" replace />
                ) : (
                  <ProtectedRoute isAuthenticated={isAuthenticated} requiresAuth={true} requiresUnlock={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                )
              }
            />

            {/* Root redirect with proper logic */}
            <Route
              path="/"
              element={
                <Navigate to={redirectRoot({ isAuthenticated, isUnlocked })} replace />
              }
            />
          </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
