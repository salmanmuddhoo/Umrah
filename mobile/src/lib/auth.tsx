import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { createApi, type Api } from './api';
import { tokenStorage } from './storage';
import type { Session, User } from './types';

/**
 * Where the API lives. Set EXPO_PUBLIC_API_URL for real devices and production.
 * The defaults reach a server running on the development machine: the Android
 * emulator sees the host as 10.0.2.2, the iOS simulator as localhost.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

type AuthValue = {
  /** False until the saved session has been checked on launch. */
  ready: boolean;
  user: User | null;
  api: Api;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads the account, e.g. after a provider edits their profile or is approved. */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * The current sign-in token. It lives outside React because the API client
 * reads it on every request, and changing it must not re-render anything.
 */
let currentToken: string | null = null;

export function AuthProvider({ children, api: injectedApi }: { children: ReactNode; api?: Api }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    currentToken = null;
    setUser(null);
    await tokenStorage.set(null);
  }, []);

  const api = useMemo(
    () => injectedApi ?? createApi({ baseUrl: API_URL, getToken: () => currentToken, onUnauthorized: () => void signOut() }),
    [injectedApi, signOut],
  );

  const signIn = useCallback(async (session: Session) => {
    currentToken = session.token;
    setUser(session.user);
    await tokenStorage.set(session.token);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!currentToken) return;
    try {
      setUser((await api.me()).user);
    } catch {
      // Keep showing the account we have; a rejected token already signs out via onUnauthorized.
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      currentToken = await tokenStorage.get();
      if (currentToken) {
        try {
          const me = await api.me();
          if (!cancelled) setUser(me.user);
        } catch {
          // Offline or expired: start signed out; an expired token is cleared by onUnauthorized.
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const value = useMemo(() => ({ ready, user, api, signIn, signOut, refreshUser }), [ready, user, api, signIn, signOut, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
