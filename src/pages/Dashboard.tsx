// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../core/supabase/client';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const logout = async () => { await supabase.auth.signOut(); nav('/auth/login'); };

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto' }}>
      <h1>Dashboard</h1>
      <p>Sesión: {email ?? 'sin sesión'}</p>
      <p><Link to='/properties/new'>Publicar propiedad</Link></p>
      <button onClick={logout}>Cerrar sesión</button>
    </main>
  );
}
