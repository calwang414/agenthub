"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  role: "admin" | "editor" | "guest";
  status: "active" | "disabled";
}

export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("agenthub_users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        name: data.name,
        nickname: data.nickname,
        phone: data.phone || "",
        role: data.role,
        status: data.status,
      };
    } catch {
      return null;
    }
  }, [supabase]);

  async function pollForProfile(userId: string, retries = 10, interval = 300): Promise<UserProfile | null> {
    for (let i = 0; i < retries; i++) {
      const profile = await fetchProfile(userId);
      if (profile) return profile;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return null;
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch {
        // 会话获取失败，静默处理
      }
      setIsLoading(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        if (profileData) {
          setProfile(profileData);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        setUser(data.user);
        const profileData = await fetchProfile(data.user.id);
        setProfile(profileData);
        if (profileData?.status === "disabled") {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          return { success: false, error: "账号已被禁用" };
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, [supabase, fetchProfile]);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name || data.email.split("@")[0],
            phone: data.phone || "",
          },
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (authData.user) {
        setUser(authData.user);
        const profileData = await pollForProfile(authData.user.id);
        if (profileData) {
          await supabase
            .from("agenthub_users")
            .update({
              name: data.name || data.email.split("@")[0],
              phone: data.phone || "",
            })
            .eq("id", authData.user.id);
          setProfile({
            ...profileData,
            name: data.name || data.email.split("@")[0],
            phone: data.phone || "",
          });
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, [supabase, fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/marketplace");
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    if (profileData) setProfile(profileData);
  }, [user, fetchProfile]);

  const isAdmin = profile?.role === "admin";
  const isEditor = profile?.role === "admin" || profile?.role === "editor";
  const isLoggedIn = user !== null && profile !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        isAdmin,
        isEditor,
        isLoggedIn,
      }}
    >
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
