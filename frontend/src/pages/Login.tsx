import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Car, Building2, Users, Mail, Lock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@cabmitra.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError('');
    try {
      await login(demoEmail, 'Password@123');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-13 h-13 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xl mb-3">
            <Car className="w-7 h-7 text-white" />
          </div>
          
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              CAB<span className="text-indigo-600">MITRA</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
              Enterprise v2.4
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-600 font-medium max-w-xs leading-relaxed">
            Cab Operations, Billing & Vendor Settlement Management Platform
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 rounded-2xl p-6 sm:p-8">
          
          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-scale-up">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all placeholder:text-slate-400 font-medium"
                  placeholder="admin@cabmitra.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all placeholder:text-slate-400 font-medium"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <span className="ml-2 font-medium text-slate-700">Remember session</span>
              </label>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); alert('Password reset link sent to registered email'); }}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Presets */}
          <div className="mt-7 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Instant Demo Login (1-Click)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@cabmitra.com')}
                className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Admin</p>
                  <p className="text-[10px] text-slate-500">Full Access</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('operations@cabmitra.com')}
                className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Operations</p>
                  <p className="text-[10px] text-slate-500">Trips & Imports</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('accounts@cabmitra.com')}
                className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Accounts</p>
                  <p className="text-[10px] text-slate-500">Billing & Payouts</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('vendor@cabmitra.com')}
                className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Vendor</p>
                  <p className="text-[10px] text-slate-500">Driver Portal</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('client@cabmitra.com')}
                className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 text-left transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Corporate Client Portal <span className="text-indigo-600 text-[11px] font-semibold">(Infosys)</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Invoices, Trip Statements & Online Payments</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

        </div>

        {/* Security & Copyright Footer */}
        <div className="mt-6 text-center space-y-1 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center justify-center gap-1.5 text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Enterprise Gateway</span>
          </div>
          <p>© 2026 CabMitra Technologies Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
