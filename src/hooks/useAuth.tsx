import { useState, useEffect } from "react";
import { supabaseCustom as supabase } from "@/lib/supabase-custom";
import { setCachedUser, clearCachedUser } from "@/lib/supabase-store";
import type { User } from "@/types/schema";

const mapProfile = (row: any): User => ({
  id: row.id,
  username: row.username ?? "",
  email: row.email ?? "",
  fullName: row.full_name ?? "",
  password: "",
  avatarUrl: row.avatar_url,
  isActive: row.is_active ?? true,
  role: row.role ?? "USER",
  lastLogin: row.last_login,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} as any);

export async function signup(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, username: email.split("@")[0] },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) return { success: false, error: error.message };
  // If email confirmation is required, user won't have a session yet
  if (data.user && !data.session) {
    return { success: true };
  }
  return { success: true };
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };

  // Fetch & cache profile
  if (data.user) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (profile) {
      setCachedUser(mapProfile(profile));
    } else {
      setCachedUser({
        id: data.user.id,
        username: email.split("@")[0],
        email,
        fullName: data.user.user_metadata?.full_name ?? email.split("@")[0],
        password: "",
        avatarUrl: null,
        isActive: true,
        role: "USER",
        lastLogin: new Date().toISOString(),
        createdAt: data.user.created_at,
        updatedAt: data.user.created_at,
      } as any);
    }
  }

  return { success: true };
}

export async function logout() {
  clearCachedUser();
  await supabase.auth.signOut();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(async () => {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          if (profile) {
            const mapped = mapProfile(profile);
            setUser(mapped);
            setCachedUser(mapped);
          } else {
            const fallback = {
              id: session.user.id,
              username: session.user.email?.split("@")[0] ?? "",
              email: session.user.email ?? "",
              fullName: session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "",
              password: "",
              avatarUrl: null,
              isActive: true,
              role: "USER",
              lastLogin: new Date().toISOString(),
              createdAt: session.user.created_at,
              updatedAt: session.user.created_at,
            } as any;
            setUser(fallback);
            setCachedUser(fallback);
          }
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        clearCachedUser();
        setIsLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setIsLoading(false);
      }
      // The onAuthStateChange callback above will handle setting the user
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isError: false,
    error: null,
    isAuthenticated: !!user,
    isUnauthenticated: !user && !isLoading,
  };
}
