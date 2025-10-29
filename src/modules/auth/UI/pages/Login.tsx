// src/modules/auth/UI/pages/Login.tsx
import React from "react";
import { supabase } from "../../../../core/supabase/client";
import { env } from "../../../../core/config/env";
import { useForm } from "react-hook-form";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";

import AuthHeader from "../components/AuthHeader";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/AuthCard";
import DividerText from "../components/DividerText";
import OAuthButton from "../components/OAuthButton";
import SiteFooter from "../components/SiteFooter";
import AccountTypeModal from "../components/AccountTypeModal";
import Button from "../../../../shared/UI/Button";
import PasswordField from "../../../../shared/UI/fields/PasswordField";
import TextField from "../../../../shared/UI/fields/TextField";
import Notice from "../../../../shared/UI/Notice";
import type { AccountType } from "../../../../shared/types/auth";

type Form = { email: string; password: string };

export default function Login() {
  const [sp] = useSearchParams();
  const prefillEmail = useMemo(() => sp.get("email") ?? "", [sp]);
  const returnTo = useMemo(() => {
    const candidate = sp.get("returnTo");
    if (candidate && candidate.startsWith("/")) {
      return candidate;
    }
    return "/properties";
  }, [sp]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
  } = useForm<Form>({ defaultValues: { email: prefillEmail, password: "" } });

  const nav = useNavigate();
  const [accountTypeModalMode, setAccountTypeModalMode] = useState<
    "register" | null
  >(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info" | "warning";
    text: React.ReactNode;
  } | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const registered = sp.get("registered") === "1";
    const email = sp.get("email");
    if (registered && email) {
      setNotice({
        type: "success",
        text: (
          <>
            Cuenta creada. Te enviamos un correo de verificación a{" "}
            <strong>{email}</strong>. Revisa tu bandeja y spam.{" "}
            <button
              type="button"
              onClick={async () => {
                try {
                  setResending(true);
                  await supabase.auth.resend({ type: "signup", email });
                  setNotice({
                    type: "success",
                    text: `Hemos reenviado el correo de verificación a ${email}.`,
                  });
                } catch (e: any) {
                  setNotice({
                    type: "error",
                    text: e?.message ?? "No se pudo reenviar el correo.",
                  });
                } finally {
                  setResending(false);
                }
              }}
              style={{
                color: "var(--brand-700)",
                fontWeight: 600,
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
              disabled={resending}
            >
              {resending ? "Reenviando..." : "Reenviar"}
            </button>
          </>
        ),
      });
    }
  }, [sp]);

  const onSubmit = async ({ email, password }: Form) => {
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isUnconfirmed =
        msg.includes("not confirmed") || msg.includes("email not confirmed");
      if (isUnconfirmed) {
        setNotice({
          type: "warning",
          text: (
            <>
              Tu correo no está verificado. Revisa tu bandeja o{" "}
              <button
                type="button"
                onClick={async () => {
                  try {
                    setResending(true);
                    await supabase.auth.resend({ type: "signup", email });
                    setNotice({
                      type: "success",
                      text: `Te reenviamos el correo a ${email}.`,
                    });
                  } catch (e: any) {
                    setNotice({
                      type: "error",
                      text: e?.message ?? "No se pudo reenviar el correo.",
                    });
                  } finally {
                    setResending(false);
                  }
                }}
                style={{
                  color: "var(--brand-700)",
                  fontWeight: 600,
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                }}
                disabled={resending}
              >
                reenviar
              </button>
              .
            </>
          ),
        });
        return;
      }

      setNotice({
        type: "error",
        text: error.message || "No pudimos iniciar sesión.",
      });
      return;
    }

    // Login exitoso - el AuthGuard manejará la redirección
    nav(returnTo, { replace: true });
  };

  const goRegister = (t: AccountType | null) => {
    if (!t) return;
    setAccountTypeModalMode(null);
    const params = new URLSearchParams({ type: t });
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    nav(`/auth/register?${params.toString()}`);
  };

  // Mantén email del query si se modifica el param
  useEffect(() => {
    if (prefillEmail) setValue("email", prefillEmail);
  }, [prefillEmail, setValue]);

  const oauthRedirect = useMemo(() => {
    const base = env.VITE_OAUTH_REDIRECT_URL;
    const fallback =
      typeof window !== "undefined" ? window.location.origin : "/";
    const redirectBase = base && base.length > 0 ? base : fallback;
    if (!returnTo) return redirectBase;
    const separator = redirectBase.includes("?") ? "&" : "?";
    return `${redirectBase}${separator}returnTo=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);

  const modalOpen = accountTypeModalMode !== null;

  return (
    <>
      <AuthHeader />
      <AuthLayout>
        <AuthCard>
          <h1 className="auth-title">Iniciar sesion</h1>
          <p className="auth-subtitle">Bienvenido de vuelta a Novalia</p>

          {notice && (
            <Notice variant={notice.type} onClose={() => setNotice(null)}>
              {notice.text}
            </Notice>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              label="Correo electrónico"
              type="email"
              placeholder="Ingresa tu correo electrónico"
              leftIcon={<Mail size={20} aria-hidden />}
              error={errors.email ? "Email requerido" : undefined}
              autoComplete="email"
              inputMode="email"
              {...register("email", { required: true })}
            />
            <PasswordField
              label="Contraseña"
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              error={errors.password ? "Password requerido" : undefined}
              {...register("password", { required: true })}
            />
            <div className="auth-meta">
              <Link to="/auth/forgot-password" className="forgot">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            {/* <div className="auth-actions">*/}
            <Button
              type="submit"
              disabled={isSubmitting}
              //className="auth-actions__primary"
            >
              {isSubmitting ? "Entrando..." : "Iniciar sesion"}
            </Button>
            <DividerText>o continua con</DividerText>
          </form>

          <div className="oauth">
            <OAuthButton
              provider="google"
              onClick={() =>
                supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: oauthRedirect },
                })
              }
            />
            {/* <OAuthButton
              provider="apple"
              onClick={() =>
                supabase.auth.signInWithOAuth({
                  provider: "apple",
                  options: { redirectTo: env.VITE_OAUTH_REDIRECT_URL },
                })
              }
            /> */}
          </div>
          <p
            style={{
              textAlign: "center",
              marginTop: 14,
              color: "var(--text-600)",
            }}
          >
            ¿No tienes una cuenta?{" "}
            <button
              type="button"
              style={{
                color: "var(--brand-700)",
                fontWeight: 600,
                background: "none",
                border: 0,
              }}
              onClick={() => {
                setAccountTypeModalMode("register");
              }}
            >
              Registrate aqui
            </button>
          </p>
        </AuthCard>
      </AuthLayout>
      <SiteFooter />

      <AccountTypeModal
        open={modalOpen}
        onClose={() => setAccountTypeModalMode(null)}
        onContinue={goRegister}
      />
    </>
  );
}
