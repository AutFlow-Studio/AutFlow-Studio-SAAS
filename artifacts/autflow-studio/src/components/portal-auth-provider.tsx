import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface PortalUser {
  id: number;
  name: string;
  email: string;
  clientId: number;
  workspaceId: number;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface PortalAuthContextValue {
  user: PortalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/auth/me", { credentials: "include" });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/portal/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Login failed" }));
      throw new Error(body.error ?? "Login failed");
    }
    setUser(await res.json());
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/portal/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  return (
    <PortalAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth(): PortalAuthContextValue {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
