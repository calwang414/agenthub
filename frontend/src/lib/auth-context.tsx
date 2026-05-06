"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { MockUser } from "@/lib/mock/users";

const STORAGE_KEY = "agenthub_auth_user";

export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

interface AuthState {
  user: MockUser | null;
  isLoading: boolean;
  login: (account: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "请求失败");
  return json.data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as MockUser;
          const currentUser = await apiCall<MockUser>(`/api/users/${stored.id}`);
          if (currentUser && currentUser.status === "active") {
            setUser(currentUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    try {
      const result = await apiCall<MockUser>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: account, password }),
      });
      setUser(result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e instanceof Error ? e.message : e) };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const result = await apiCall<MockUser>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setUser(result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e instanceof Error ? e.message : e) };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    router.push("/marketplace");
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const fresh = await apiCall<MockUser>(`/api/users/${user.id}`);
      setUser(fresh);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // silently fail — data will refresh on next page load
    }
  }, [user]);

  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor" || user?.role === "admin";
  const isLoggedIn = user !== null;

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser, isAdmin, isEditor, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
