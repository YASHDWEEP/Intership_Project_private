import React, { useState } from 'react';
import { Search, Bell, Shield, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { user, switchRoleDemo } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const demoAccounts = [
    { name: 'System Admin', email: 'admin@cabmitra.com', role: 'ADMIN' },
    { name: 'Ops Controller', email: 'operations@cabmitra.com', role: 'OPERATIONS' },
    { name: 'Accounts Manager', email: 'accounts@cabmitra.com', role: 'ACCOUNTS' },
    { name: 'Ramesh Vendor', email: 'vendor@cabmitra.com', role: 'VENDOR' },
    { name: 'Infosys Client', email: 'client@cabmitra.com', role: 'CLIENT' },
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between shadow-xs">
      {/* Search Input */}
      <div className="relative w-96">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search trips, vehicles, vendors, invoices..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Quick Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100/70 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Switch Role: {user?.role}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-75" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Demo Account Switcher
              </div>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => {
                    switchRoleDemo(acc.email);
                    setShowRoleDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{acc.name}</p>
                    <p className="text-[10px] text-gray-500">{acc.role}</p>
                  </div>
                  {user?.role === acc.role && <Check className="w-4 h-4 text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-2 right-2 ring-2 ring-white"></span>
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-40">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Notifications</h4>
              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg">
                  <p className="font-semibold text-blue-900">Import Completed</p>
                  <p className="text-blue-700 mt-0.5">Infosys Excel upload processed 45 trips with 0 errors.</p>
                </div>
                <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-lg">
                  <p className="font-semibold text-amber-900">Settlement Pending</p>
                  <p className="text-amber-700 mt-0.5">Ramesh Travels settlement for ₹42,500 requires approval.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
            {user?.name.charAt(0)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name}</p>
            <p className="text-[10px] font-medium text-gray-500 leading-tight truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
