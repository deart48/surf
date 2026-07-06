// LOGIC-002: состояние сессии для route guard, поверх реальных access/refresh токенов
// в localStorage (см. src/api/tokenStorage.ts, src/api/client.ts — silent refresh на 401).
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isAuthenticated as checkAuthenticated, logout as apiLogout } from '../api/endpoints';
import { setSessionExpiredHandler } from '../api/client';

interface SessionContextValue {
  authenticated: boolean;
  markAuthenticated: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [authenticated, setAuthenticated] = useState(checkAuthenticated());

  useEffect(() => {
    // Если silent refresh (401 -> POST /auth/refresh) не удался, клиент считается разлогиненным.
    setSessionExpiredHandler(() => setAuthenticated(false));
    return () => setSessionExpiredHandler(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      authenticated,
      markAuthenticated: () => setAuthenticated(true),
      logout: () => {
        void apiLogout();
        setAuthenticated(false);
      },
    }),
    [authenticated],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
