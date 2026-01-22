// src/components/Login.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, AlertCircle, LogIn, Database } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Redirect sẽ tự động xảy ra do AuthContext
    } catch (err) {
      console.error('Login error:', err);

      // Hiển thị lỗi dễ hiểu
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Email hoặc mật khẩu không đúng');
      } else if (err.code === 'auth/user-not-found') {
        setError('Không tìm thấy tài khoản này');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email không hợp lệ');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Quá nhiều lần thử. Vui lòng thử lại sau');
      } else {
        setError('Đăng nhập thất bại: ' + err.message);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, #334155 0px, #334155 1px, transparent 1px, transparent 40px),
                           repeating-linear-gradient(90deg, #334155 0px, #334155 1px, transparent 1px, transparent 40px)`
        }}></div>
      </div>

      {/* Accent Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 opacity-5 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-600 opacity-5 blur-3xl rounded-full"></div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-xl mb-4 shadow-lg">
            <Database className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
            Mini ERP System
          </h1>
          <p className="text-slate-500 text-sm font-medium">Enterprise Resource Planning</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Đăng nhập</h2>
              <p className="text-sm text-slate-500">Nhập thông tin để truy cập hệ thống</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400 text-sm"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-6"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" strokeWidth={2} />
                    Đăng nhập hệ thống
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Demo Accounts
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Admin</span>
                <code className="text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">admin@mini-erp.local</code>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Staff</span>
                <code className="text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">staff@mini-erp.local</code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2024 Mini ERP System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
