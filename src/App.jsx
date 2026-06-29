import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import SupportDashboard from './pages/SupportDashboard';
import { ConciergeBell, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

function PrivateRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" />; // Or to a unauthorized page
  }

  return children;
}

function RoleRedirect() {
  const { currentUser, userRole } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" />;
  
  if (userRole === 'admin') return <Navigate to="/admin" />;
  if (userRole === 'support') return <Navigate to="/support" />;
  return <Navigate to="/staff" />; // Default to staff
}

function AppContent() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Router>
      <div className="container">
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ConciergeBell size={28} color="var(--accent-primary)" />
            <h2 style={{ margin: 0 }}>ServeFlow</h2>
          </div>
          <button 
            onClick={toggleTheme} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', borderRadius: '50%' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/admin" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/staff" 
            element={
              <PrivateRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/support" 
            element={
              <PrivateRoute allowedRoles={['support', 'admin']}>
                <SupportDashboard />
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('Notification tapped: ', event);
      });
      FirebaseMessaging.addListener('pushNotificationReceived', (notification) => {
        console.log('Foreground notification received: ', notification);
      });
    } else {
      // Web Push foreground listener
      import('firebase/messaging').then(({ onMessage }) => {
        import('./firebase').then(({ messaging }) => {
          if (messaging) {
            onMessage(messaging, (payload) => {
              console.log("Foreground web message received:", payload);
              if (Notification.permission === 'granted') {
                new Notification(payload.notification.title, {
                  body: payload.notification.body,
                  icon: '/icon-192.png' // Make sure you have this icon in public/
                });
              }
            });
          }
        }).catch(err => console.log("Firebase not initialized", err));
      }).catch(err => console.log("Messaging unsupported", err));
    }
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
