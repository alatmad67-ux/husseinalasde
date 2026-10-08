'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  adminPhone: string | null;
  login: (phone: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  adminPhone: null,
  login: () => false,
  logout: () => {},
});

// Admin credentials as requested
const ADMIN_PHONE = '07600505015';
const ADMIN_PASS = '2026#123';
const AUTH_STORAGE_KEY = 'asadi_admin_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored === 'true') {
      setIsAuthenticated(true);
      setAdminPhone(ADMIN_PHONE);
    }
  }, []);

  // Route protection
  useEffect(() => {
    if (!mounted) return;

    // Public routes that anyone (customers scanning QR stickers) can access without login
    const isPublicRoute = pathname.startsWith('/public/') || pathname === '/login';

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, mounted, pathname, router]);

  const login = (phone: string, pass: string) => {
    const cleanPhone = phone.trim();
    const cleanPass = pass.trim();

    if (cleanPhone === ADMIN_PHONE && cleanPass === ADMIN_PASS) {
      setIsAuthenticated(true);
      setAdminPhone(ADMIN_PHONE);
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      router.replace('/');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAdminPhone(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, adminPhone, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
