"use client";

import type React from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Define a simple user type, can be expanded
interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: User) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'healthdesk.auth.user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const handleAuthRedirect = useCallback((currentUser: User | null) => {
    if (isLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';

    if (currentUser && isAuthPage) {
      router.push('/dashboard');
    } else if (!currentUser && pathname === '/dashboard') {
      router.push('/login');
    } else if (!currentUser && pathname === '/') {
        router.push('/login');
    } else if (currentUser && pathname === '/') {
        router.push('/dashboard');
    }
  }, [isLoading, pathname, router]);


  useEffect(() => {
    handleAuthRedirect(user);
  }, [user, isLoading, handleAuthRedirect]);
  

  const login = async (userData: User) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(userData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    router.push('/dashboard');
  };

  const logout = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push('/login');
  };

  const register = async (userData: User) => {
    // Simulate API call for registration
    await new Promise(resolve => setTimeout(resolve, 500));
    // For this simulation, registration is similar to login
    setUser(userData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    router.push('/dashboard');
  };

  if (isLoading && (pathname === '/dashboard' || pathname === '/login' || pathname === '/register' || pathname === '/')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }


  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
