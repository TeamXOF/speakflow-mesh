"use client";

/**
 * Auth context — session persistence, login/logout, role helpers.
 * Backed by the backend's token auth (localStorage token + user).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  AuthUser, Role, getStoredToken, getStoredUser, clearSession, apiLogout, storeSession,
  API_BASE_URL,
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

  // Hydrate from localStorage; verify the token is still valid server-side.
  useEffect(() => {
    const stored = getStoredUser();
    const token = getStoredToken();
    if (!stored || !token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await import("@/lib/api").then((m) => m.apiLogin(username, password));
    storeSession(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name: string, username: string, password: string) => {
    const data = await import("@/lib/api").then((m) => m.apiRegister(name, username, password));
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
