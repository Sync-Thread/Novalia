// src/modules/auth/UI/pages/Callback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../../core/supabase/client";

export default function Callback() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        nav("/auth/login?error=callback");
        return;
      }
      if (data.session) nav("/dashboard");
      else nav("/auth/login");
    })();
  }, []);

  return null; // o spinner
}
