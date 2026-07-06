import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from './SessionContext';

// LOGIC-002 (mock): route guard для АЗ-экранов.
export function RequireAuth({ children }: PropsWithChildren) {
  const { authenticated } = useSession();
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
