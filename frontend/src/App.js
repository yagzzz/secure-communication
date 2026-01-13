import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/AdminDashboard';
import ChatInterface from '@/pages/ChatInterface';
import '@/utils/resizeObserverFix';
import '@/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState({ primary_color: '#22c55e', secondary_color: '#1e293b', app_title: 'EncrypTalk' });

  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Load admin branding settings
      loadBrandingSettings();
    }
    setLoading(false);
  }, []);

  const loadBrandingSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api'}/admin/settings`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const settings = await response.json();
        setBranding({
          primary_color: settings.primary_color || '#22c55e',
          secondary_color: settings.secondary_color || '#1e293b',
          app_title: settings.app_title || 'EncrypTalk'
        });
        // Apply CSS variables for theme
        document.documentElement.style.setProperty('--primary-color', settings.primary_color || '#22c55e');
        document.documentElement.style.setProperty('--secondary-color', settings.secondary_color || '#1e293b');
      }
    } catch (error) {
      console.error('Branding yükleme hatası:', error);
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    // Load branding settings after login
    setTimeout(() => loadBrandingSettings(), 100);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

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
          <Route
            path="/login"
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={user.role === 'admin' ? '/admin' : '/chat'} />}
          />
          <Route
            path="/admin"
            element={user && user.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/chat"
            element={user ? <ChatInterface user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/chat') : '/login'} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
