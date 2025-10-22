// src/modules/auth/UI/pages/Callback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../../core/supabase/client";
import { registerAdapter } from "../../infrastructure/supabase/adapters/registerAdapter";

export default function Callback() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("[oauth][callback] failed to fetch session", error);
        nav("/auth/login?error=callback");
        return;
      }

      const session = data.session;
      if (!session) {
        nav("/auth/login");
        return;
      }

      const user = session.user;
      const userId = user?.id ?? null;
      if (userId) {
        try {
          const accountTypeMeta = user?.user_metadata?.account_type;
          const accountType =
            accountTypeMeta === "agent" || accountTypeMeta === "owner" || accountTypeMeta === "buyer"
              ? accountTypeMeta
              : "buyer";
          await registerAdapter.validateBootstrap(userId, {
            accountType,
            flow: "oauth",
            expectMembership: accountType === "owner",
          });
        } catch (err) {
          console.warn("[oauth][callback] validation failed", err);
        }
      } else {
        console.warn("[oauth][callback] session missing user id");
      }

      nav("/properties");
    })();
  }, []);

  return null; // o spinner
}
