// src/App.jsx
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import SmartSearch from './components/SmartSearch';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Đang tải...</p>
        </div>
      </div>
    );
  }

  return user ? <SmartSearch /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
