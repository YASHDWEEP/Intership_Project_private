import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Shield, Car, Building2, Users2 } from 'lucide-react';
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
      setError(err.response?.data?.error || 'Invalid credentials');
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    try {
      await login(demoEmail, 'Password@123');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-brand-600/30">
            C
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
          CABMITRA
          <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
        </h2>
        <p className="mt-1.5 text-center text-sm font-medium text-slate-400">
          Cab Operations, Billing & Vendor Settlement Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-slate-600"
                placeholder="admin@cabmitra.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-400 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded bg-slate-950 border-slate-800 text-brand-600 focus:ring-0" />
                <span className="ml-2">Remember me</span>
              </label>
              <a href="#" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Instant Demo Access (Click to Login)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@cabmitra.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <Shield className="w-4 h-4 text-brand-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">Admin</p>
                  <p className="text-[9px] text-slate-400">Full System</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('operations@cabmitra.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <Car className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">Operations</p>
                  <p className="text-[9px] text-slate-400">Imports & Trips</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('accounts@cabmitra.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">Accounts</p>
                  <p className="text-[9px] text-slate-400">Billing & Settlements</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('vendor@cabmitra.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <Users2 className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-slate-200">Vendor</p>
                  <p className="text-[9px] text-slate-400">Earnings Portal</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
