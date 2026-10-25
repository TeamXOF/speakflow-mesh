"use client";

/**
 * Auth context — session persistence, login/logout, role helpers.
 * Backed by the backend's token auth (localStorage token + user).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  AuthUser, Role, getStoredUser, clearSession, apiLogout, apiLogin, apiRegister, apiGetMe,
} from "@/lib/api";

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (name: string, username: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  isTeacher: boolean;
  hasRole: (role: Role) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth failure events triggered by the Axios response interceptor
  useEffect(() => {
    const handleAuthFailed = () => {
      setUser(null);
      clearSession();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("speakflow:auth-failed", handleAuthFailed);
      return () => {
        window.removeEventListener("speakflow:auth-failed", handleAuthFailed);
      };
    }
  }, []);

  // Hydrate session via cookies & backend verification
  useEffect(() => {
    // Optimistically hydrate cached profile while verifying with backend
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
    }

    apiGetMe()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        // If not authenticated or refresh failed, clear session
        setUser(null);
        clearSession();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name: string, username: string, password: string) => {
    const data = await apiRegister(name, username, password);
    return data.message;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const hasRole = useCallback((role: Role) => user?.role === role, [user]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isTeacher: user?.role === "teacher", hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
