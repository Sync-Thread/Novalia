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

type Form = { email: string; password: string };

export default function Login() {
  const [sp] = useSearchParams();
  const prefillEmail = useMemo(() => sp.get("email") ?? "", [sp]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
  } = useForm<Form>({ defaultValues: { email: prefillEmail, password: "" } });

  const nav = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info" | "warning"; text: React.ReactNode } | null>(null);
  const [resending, setResending] = useState(false);

  // Si ya hay sesión → dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/properties");
    });
  }, [nav]);

  // Mostrar banner si viene de registro
  useEffect(() => {
    const registered = sp.get("registered") === "1";
    const email = sp.get("email");
    if (registered && email) {
      setNotice({
        type: "success",
        text: (
          <>
            Cuenta creada. Te enviamos un correo de verificación a <strong>{email}</strong>. Revisa tu bandeja y spam.
            {" "}
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
                  setNotice({ type: "error", text: e?.message ?? "No se pudo reenviar el correo." });
                } finally {
                  setResending(false);
                }
              }}
              style={{ color: "var(--brand-700)", fontWeight: 600, background: "none", border: 0, cursor: "pointer" }}
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isUnconfirmed = msg.includes("not confirmed") || msg.includes("email not confirmed");
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
                    setNotice({ type: "success", text: `Te reenviamos el correo a ${email}.` });
                  } catch (e: any) {
                    setNotice({ type: "error", text: e?.message ?? "No se pudo reenviar el correo." });
                  } finally {
                    setResending(false);
                  }
                }}
                style={{ color: "var(--brand-700)", fontWeight: 600, background: "none", border: 0, cursor: "pointer" }}
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

      // Credenciales inválidas u otros errores
      setNotice({ type: "error", text: error.message || "No pudimos iniciar sesión." });
      return;
    }

    nav("/properties");
  };

  const goRegister = (t: "buyer" | "agent" | "owner" | null) => {
    if (!t) return;
    nav(`/auth/register?type=${t}`);
  };

  // Mantén email del query si se modifica el param
  useEffect(() => {
    if (prefillEmail) setValue("email", prefillEmail);
  }, [prefillEmail, setValue]);

  return (
    <>
      <AuthHeader />
      <AuthLayout>
        <AuthCard>
          <h1 className="auth-title">Iniciar Sesión</h1>
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
            <Button type="submit" disabled={isSubmitting} style={{ marginTop: 8 }}>
              {isSubmitting ? "Entrando..." : "Iniciar Sesión"}
            </Button>
          </form>

          <DividerText>o continúa con</DividerText>
          <div className="oauth">
            <OAuthButton
              provider="google"
              onClick={() =>
                supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: env.VITE_OAUTH_REDIRECT_URL },
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

          <p style={{ textAlign: "center", marginTop: 14, color: "var(--text-600)" }}>
            ¿No tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => setOpenModal(true)}
              style={{ color: "var(--brand-700)", fontWeight: 600, background: "none", border: 0 }}
            >
              Regístrate aquí
            </button>
          </p>
        </AuthCard>
      </AuthLayout>
      <SiteFooter/>

      <AccountTypeModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onContinue={(t) => {
          setOpenModal(false);
          goRegister(t);
        }}
      />
    </>
  );
}
