'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, type AuthUser } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  locale?: 'fr' | 'de';
  country?: 'FR' | 'DE';
  marketingOptIn?: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Témoin de session posé par l'API — ne contient aucune donnée sensible. */
const SESSION_HINT_COOKIE = 'sm_session';

function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith(`${SESSION_HINT_COOKIE}=`));
}

/**
 * Le jeton d'accès reste en mémoire, jamais dans le localStorage : en cas de
 * faille XSS il n'est pas exfiltrable. La persistance de session repose sur le
 * cookie httpOnly de rafraîchissement posé par l'API.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Le cookie de rafraîchissement est httpOnly, donc invisible ici. L'API
    // pose en parallèle un témoin lisible : sans lui, aucune session n'existe
    // et interroger l'API ne ferait qu'un aller-retour pour un 401.
    if (!hasSessionHint()) {
      setUser(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ user: AuthUser; accessToken: string }>('/api/auth/refresh', {
        method: 'POST',
      });
      setUser(data.user);
      setAccessToken(data.accessToken);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Le jeton d'accès expire en 15 minutes : on le renouvelle un peu avant pour
  // éviter qu'un formulaire long échoue au moment de l'envoi.
  useEffect(() => {
    if (!accessToken) return;
    const timer = setInterval(() => void refresh(), 13 * 60_000);
    return () => clearInterval(timer);
  }, [accessToken, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser; accessToken: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
    return data.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await apiFetch<{ user: AuthUser; accessToken: string }>('/api/auth/register', {
      method: 'POST',
      body: input,
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    setAccessToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, loading, login, register, logout, refresh }),
    [user, accessToken, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}
