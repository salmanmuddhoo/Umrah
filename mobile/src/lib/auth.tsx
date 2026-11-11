import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { createApi, type Api } from './api';
import { tokenStorage } from './storage';
import type { Session, User } from './types';

/**
 * Where the API lives. Set EXPO_PUBLIC_API_URL for real devices and production.
 * The defaults reach a server running on the development machine: the Android
 * emulator sees the host as 10.0.2.2, the iOS simulator as localhost.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

/** Time in the background after which the PIN is asked for again. */
export const RELOCK_AFTER_MS = 2 * 60_000;

type AuthValue = {
  /** False until the saved session has been checked on launch. */
  ready: boolean;
  user: User | null;
  api: Api;
  /**
   * True when someone is signed in on this device but has not entered their PIN
   * since the app was opened (or since it came back from a long spell in the background).
   */
  locked: boolean;
  /** Checks the PIN with the server and unlocks the app. Throws an ApiError when the PIN is wrong. */
  unlock: (pin: string) => Promise<void>;
  /** True once after "Forgot PIN" so the app can open the sign-in screen; reading it is the caller's cue to clear it. */
  wantsSignIn: boolean;
  clearWantsSignIn: () => void;
  /** Leaves the lock screen to reset the PIN with a new verification code. */
  forgotPin: () => Promise<void>;
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
  const [locked, setLocked] = useState(false);
  const [wantsSignIn, setWantsSignIn] = useState(false);

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
    setLocked(false); // they have just entered their PIN to get here
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
          if (!cancelled) {
            setLocked(true); // a saved session always starts behind the PIN
            setUser(me.user);
          }
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

  // Lock again when the app comes back after a while in the background.
  const leftAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (leftAt.current !== null && Date.now() - leftAt.current > RELOCK_AFTER_MS) setLocked(true);
        leftAt.current = null;
      } else if (leftAt.current === null) {
        leftAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(
    async (pin: string) => {
      await api.verifyPin(pin);
      setLocked(false);
    },
    [api],
  );

  const forgotPin = useCallback(async () => {
    await signOut();
    setWantsSignIn(true);
  }, [signOut]);
  const clearWantsSignIn = useCallback(() => setWantsSignIn(false), []);

  const value = useMemo(
    () => ({ ready, user, api, locked: !!user && locked, unlock, wantsSignIn, clearWantsSignIn, forgotPin, signIn, signOut, refreshUser }),
    [ready, user, api, locked, unlock, wantsSignIn, clearWantsSignIn, forgotPin, signIn, signOut, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
