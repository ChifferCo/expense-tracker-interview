import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { Import } from './pages/Import';

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    loginError,
    registerError,
    isLoginPending,
    isRegisterPending,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={login}
        onRegister={register}
        loginError={loginError}
        registerError={registerError}
        isLoginPending={isLoginPending}
        isRegisterPending={isRegisterPending}
      />
    );
  }

  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/import" element={<Import />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
