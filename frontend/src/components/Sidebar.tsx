import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  FileSpreadsheet,
  Building2,
  Users2,
  Truck,
  IndianRupee,
  Receipt,
  CreditCard,
  Landmark,
  BarChart3,
  ShieldCheck,
  LogOut,
  Sparkles,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const role = user?.role || 'ADMIN';

  const allNavItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATIONS', 'ACCOUNTS', 'VENDOR', 'CLIENT'] },
    { label: 'Trips', path: '/trips', icon: Car, roles: ['ADMIN', 'OPERATIONS', 'ACCOUNTS', 'VENDOR'] },
    { label: 'Import Center', path: '/import-center', icon: FileSpreadsheet, roles: ['ADMIN', 'OPERATIONS'] },
    { label: 'Clients', path: '/clients', icon: Building2, roles: ['ADMIN', 'OPERATIONS', 'ACCOUNTS'] },
    { label: 'Vendors', path: '/vendors', icon: Users2, roles: ['ADMIN', 'OPERATIONS', 'ACCOUNTS'] },
    { label: 'Vehicles', path: '/vehicles', icon: Truck, roles: ['ADMIN', 'OPERATIONS'] },
    { label: 'Pricing Rules', path: '/pricing', icon: IndianRupee, roles: ['ADMIN'] },
    { label: 'Invoices', path: '/invoices', icon: Receipt, roles: ['ADMIN', 'ACCOUNTS', 'VENDOR', 'CLIENT'] },
    { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['ADMIN', 'ACCOUNTS', 'CLIENT'] },
    { label: 'Settlements', path: '/settlements', icon: Landmark, roles: ['ADMIN', 'ACCOUNTS', 'VENDOR'] },
    { label: 'Email Center', path: '/email-center', icon: Mail, roles: ['ADMIN', 'ACCOUNTS', 'OPERATIONS', 'CLIENT', 'VENDOR'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'ACCOUNTS', 'CLIENT'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck, roles: ['ADMIN'] },
  ];

  const allowedItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col fixed left-0 top-0 z-30 shadow-xl border-r border-slate-800">
      {/* Brand Logo */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-600/30">
            C
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wider text-base flex items-center gap-1.5">
              CABMITRA
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Enterprise ERP</p>
          </div>
        </div>
      </div>

      {/* Role Badge Banner */}
      <div className="px-4 py-3 mx-4 my-3 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-center justify-between">
        <div className="truncate">
          <p className="text-xs font-medium text-slate-400">Signed in as</p>
          <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-brand-500/20 text-brand-400 border border-brand-500/30">
          {role}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Logout Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
