// src/app/guards/AuthGuard.tsx
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../core/supabase/client';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setChecking(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) return null;
  if (!session) {
    const pathWithQuery = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
    const loginPath = pathWithQuery && pathWithQuery !== "/"
      ? `/auth/login?returnTo=${encodeURIComponent(pathWithQuery)}`
      : "/auth/login";
    return <Navigate to={loginPath} replace />;
  }
  return <>{children}</>;
}
