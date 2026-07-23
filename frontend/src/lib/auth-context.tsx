'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import { apiClient } from './api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refreshSession: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const sessionUser = data?.session?.user ?? null;
      setUser(sessionUser);
      document.cookie = `rideflow-auth=${sessionUser ? 'true' : ''}; path=/; max-age=${sessionUser ? 86400 : 0}; SameSite=Lax`;
    } catch {
      setUser(null);
      document.cookie = 'rideflow-auth=; path=/; max-age=0; SameSite=Lax';
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      document.cookie = `rideflow-auth=${sessionUser ? 'true' : ''}; path=/; max-age=${sessionUser ? 86400 : 0}; SameSite=Lax`;
    });

    return () => listener?.subscription.unsubscribe();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    document.cookie = 'rideflow-auth=; path=/; max-age=0; SameSite=Lax';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
