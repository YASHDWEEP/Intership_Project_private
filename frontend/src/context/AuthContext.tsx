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
    const savedUser = localStorage.getItem('cabmitra_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cabmitra_token'));
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem('cabmitra_token', token);
      localStorage.setItem('cabmitra_user', JSON.stringify(user));

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
