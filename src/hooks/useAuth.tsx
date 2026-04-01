import { useState, useEffect } from "react";
import { User } from "@/types/schema";
import { DEMO_USER } from "@/lib/demo-data";

const AUTH_STORAGE_KEY = "auth-user";

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function login(email: string, password: string): { success: boolean; error?: string } {
  // Local credentials - no backend needed
  const validCredentials = [
    { email: "admin@cybaemtech.com", password: "admin123", role: "ADMIN" as const, fullName: "Admin User" },
    { email: "demo@cybaemtech.com", password: "demo123", role: "ADMIN" as const, fullName: "Demo User" },
    { email: "user@cybaemtech.com", password: "user123", role: "USER" as const, fullName: "Team Member" },
  ];

  const match = validCredentials.find(c => c.email === email && c.password === password);
  if (!match) {
    return { success: false, error: "Invalid email or password" };
  }

  const user: User = {
    id: Math.floor(Math.random() * 1000) + 1,
    username: match.email.split("@")[0],
    email: match.email,
    fullName: match.fullName,
    password: "",
    avatarUrl: null,
    isActive: true,
    role: match.role,
    lastLogin: new Date().toISOString(),
    createdAt: "2024-01-01",
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth-change"));
  return { success: true };
}

export function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem("demo-mode");
  window.dispatchEvent(new Event("auth-change"));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(getStoredUser);

  useEffect(() => {
    const handler = () => setUser(getStoredUser());
    window.addEventListener("auth-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("auth-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    user,
    isLoading: false,
    isError: false,
    error: null,
    isAuthenticated: !!user,
    isUnauthenticated: !user,
  };
}
