// src/app/guards/AuthGuard.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../core/supabase/client';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setChecking(false);
    });
    return () => { mounted = false; };
  }, []);

  if (checking) return null;          
  if (!session) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}
