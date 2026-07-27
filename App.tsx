
import React, { useState, useEffect, PropsWithChildren } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Income from './pages/Income';
import Expenditure from './pages/Expenditure';
import Audit from './pages/Audit';
import Search from './pages/Search';
import About from './pages/About';
import DataEditor from './pages/DataEditor';
import Notebook from './pages/Notebook';
import Store from './pages/Store';
import DbAdministration from './pages/DbAdministration';
import { ShieldCheck, Plane, Lock, User, Cpu, Globe, Cloud, RefreshCw, CheckCircle } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { DateProvider } from './contexts/DateContext';
import { getGitHubConfig, fetchFromGitHub } from './services/githubService';
import { saveDB, getStoredUsername, verifyPassword, getStoredSecurityQuestion, verifySecurityAnswer, resetPasswordDirectly } from './services/db';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';

const ProtectedRoute = ({ isAuth, children }: PropsWithChildren<{ isAuth: boolean }>) => {
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppContent: React.FC<{ 
  isAuth: boolean; 
  authRole: 'admin' | 'user' | null; 
  onLogin: (role: 'admin' | 'user') => void; 
  onLogout: () => void; 
}> = ({ isAuth, authRole, onLogin, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigate = (p: string) => {
        navigate(`/${p}`);
    }

    // Determine active page from URL for sidebar highlighting
    const getActivePage = () => {
        const path = location.pathname.substring(1);
        if (path === '') return 'home';
        return path.split('/')[0];
    };

    return (
        <Routes>
            <Route 
              path="/login" 
              element={
                isAuth ? (
                  authRole === 'admin' ? <Navigate to="/admin-dashboard" replace /> : <Navigate to="/home" replace />
                ) : (
                  <Login onLoginSuccess={(role) => { onLogin(role); navigate(role === 'admin' ? '/admin-dashboard' : '/home'); }} />
                )
              } 
            />
            
            {/* Admin Dashboard */}
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute isAuth={isAuth && authRole === 'admin'}>
                  <AdminDashboard onLogout={onLogout} />
                </ProtectedRoute>
              } 
            />

            {/* User Workspace Routes */}
            <Route path="/*" element={
                <ProtectedRoute isAuth={isAuth && authRole === 'user'}>
                    <Layout activePage={getActivePage()} onNavigate={handleNavigate} onLogout={onLogout}>
                        <Routes>
                            <Route path="home" element={<Home />} />
                            <Route path="income" element={<Income />} />
                            <Route path="expenditure" element={<Expenditure />} />
                            <Route path="store" element={<Store />} />
                            <Route path="audit" element={<Audit />} />
                            <Route path="notebook" element={<Notebook />} />
                            <Route path="editor" element={<DataEditor />} />
                            <Route path="search" element={<Search />} />
                            <Route path="about" element={<About />} />
                            <Route path="dbadmin" element={<DbAdministration />} />
                            <Route path="*" element={<Navigate to="home" replace />} />
                        </Routes>
                    </Layout>
                </ProtectedRoute>
            } />
        </Routes>
    )
}

const App: React.FC = () => {
  // CRITICAL FIX: Initialize state from localStorage using simple multi-role check.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const auth = localStorage.getItem("arms_auth");
    return auth === "logged_in_admin" || auth === "logged_in_user";
  });

  const [authRole, setAuthRole] = useState<'admin' | 'user' | null>(() => {
    return localStorage.getItem("arms_auth_role") as 'admin' | 'user' | null;
  });

  // Wrapper to sync state with localStorage and handle roles
  const updateAuth = (role: 'admin' | 'user' | null) => {
    if (role) {
      localStorage.setItem("arms_auth", role === 'admin' ? "logged_in_admin" : "logged_in_user");
      localStorage.setItem("arms_auth_role", role);
      setAuthRole(role);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem("arms_auth");
      localStorage.removeItem("arms_auth_role");
      localStorage.removeItem("arms_readonly_mode");
      localStorage.removeItem("arms_readonly_secret_key");
      localStorage.removeItem("arms_readonly_file_path");
      localStorage.removeItem("arms_shared_database");
      sessionStorage.clear();
      setAuthRole(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <LanguageProvider>
      <DateProvider>
        <Router>
            <AppContent isAuth={isAuthenticated} authRole={authRole} onLogin={updateAuth} onLogout={() => updateAuth(null)} />
        </Router>
      </DateProvider>
    </LanguageProvider>
  );
};

export default App;
