import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATIONS' | 'ACCOUNTS' | 'VENDOR' | 'CLIENT';
  clientId?: string;
  vendorId?: string;
  clientName?: string;
  vendorName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRoleDemo: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Clear legacy localStorage persisted tokens so fresh browser launches always start at /login
    localStorage.removeItem('cabmitra_token');
    localStorage.removeItem('cabmitra_user');

    const savedUser = sessionStorage.getItem('cabmitra_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('cabmitra_token'));
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;

      sessionStorage.setItem('cabmitra_token', token);
      sessionStorage.setItem('cabmitra_user', JSON.stringify(user));
      localStorage.removeItem('cabmitra_token');
      localStorage.removeItem('cabmitra_user');

      setToken(token);
      setUser(user);
    } finally {
      setLoading(false);
    }
  };

  const switchRoleDemo = async (email: string) => {
    await login(email, 'Password@123');
  };

  const logout = () => {
    sessionStorage.removeItem('cabmitra_token');
    sessionStorage.removeItem('cabmitra_user');
    localStorage.removeItem('cabmitra_token');
    localStorage.removeItem('cabmitra_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchRoleDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
