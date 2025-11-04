// src/modules/auth/UI/pages/Callback.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../../../core/supabase/client";
import { registerAdapter } from "../../infrastructure/supabase/adapters/registerAdapter";
import AccountTypeModal from "../components/AccountTypeModal";
import type { AccountType } from "../../../../shared/types/auth";
import { normalizeAccountType } from "../../utils/accountType";

export default function Callback() {
  const nav = useNavigate();
  const location = useLocation();
  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("returnTo") ?? "/properties";
  }, [location.search]);

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
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
        if (!userId) {
          nav("/auth/login");
          return;
        }

        const metadataType = normalizeAccountType(user.user_metadata?.account_type);
        const resolvedType = metadataType ?? (await registerAdapter.resolveAccountType(userId));

        if (!resolvedType) {
          if (!mounted) return;
          setPendingUserId(userId);
          setLoading(false);
          return;
        }

        await registerAdapter.validateBootstrap(userId, {
          accountType: resolvedType,
          flow: "oauth",
          expectMembership: resolvedType === "owner",
        });

        nav(returnTo, { replace: true });
      } catch (err) {
        console.warn("[oauth][callback] unexpected error", err);
        nav("/auth/login?error=callback");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [nav, returnTo]);

  const handlePersistUserType = useCallback(
    async (type: AccountType | null) => {
      if (!type || !pendingUserId) return;
      setSaving(true);
      setError(null);
      try {
        await registerAdapter.persistUserType(pendingUserId, type);
        await registerAdapter.validateBootstrap(pendingUserId, {
          accountType: type,
          flow: "oauth",
          expectMembership: type === "owner",
        });
        setPendingUserId(null);
        nav(returnTo, { replace: true });
      } catch (err: any) {
        console.error("[oauth][callback] persist user type failed", err);
        setError(err?.message ?? "No pudimos guardar tu tipo de cuenta. Intenta nuevamente.");
      } finally {
        setSaving(false);
      }
    },
    [pendingUserId, nav, returnTo],
  );

  if (loading && !pendingUserId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>Conectando con tu cuenta…</div>
        <div style={{ fontSize: 14, color: "#64748b" }}>Estamos preparando tu espacio en Novalia.</div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          style={{
            margin: "16px auto",
            maxWidth: 420,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(220,38,38,0.2)",
            background: "rgba(254, 226, 226, 0.6)",
            color: "#b91c1c",
            fontFamily: "'Inter', system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <AccountTypeModal
        open={pendingUserId !== null}
        onClose={() => {
          /* Evitar cerrar sin seleccionar; elija un tipo para continuar */
        }}
        onContinue={handlePersistUserType}
        confirmLabel="Guardar y continuar"
        loading={saving}
        title="Completa tu cuenta"
        subtitle="Selecciona el tipo de cuenta que mejor describe cómo usarás Novalia."
      />
    </>
  );
}
