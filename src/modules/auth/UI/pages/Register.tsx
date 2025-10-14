// src/modules/auth/UI/pages/Register.tsx
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AccountType } from "../../../../shared/types/auth";
import { getRegisterSchema } from "../validation/registerSchemas";
import { registerUser } from "../../application/use-cases/registerUser";
import { registerAdapter } from "../../infrastructure/supabase/adapters/registerAdapter";
import { supabase } from "../../../../core/supabase/client";
import { env } from "../../../../core/config/env";

import Notice from "../../../../shared/UI/Notice";
import AuthHeader from "../components/AuthHeader";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/AuthCard";
import OAuthButton from "../components/OAuthButton";
import DividerText from "../components/DividerText";
import BaseFields from "../forms/BaseFields";
import AgentExtras from "../forms/AgentExtras";
import OwnerExtras from "../forms/OwnerExtras";
import Button from "../../../../shared/UI/Button";
import SiteFooter from "../components/SiteFooter";


type Form = any;

export default function Register() {
  const [sp] = useSearchParams();
  const nav = useNavigate();

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info" | "warning";
    text: React.ReactNode;
  } | null>(null);

  const accountType = useMemo<AccountType | null>(() => {
    const t = sp.get("type");
    return t === "buyer" || t === "agent" || t === "owner" ? t : null;
  }, [sp]);

  const schema = useMemo(() => getRegisterSchema(accountType ?? "buyer"), [accountType]);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (f: Form) => {
    setNotice(null);

    if (!accountType) {
      setNotice({ type: "warning", text: "Selecciona un tipo de cuenta." });
      return;
    }

    try {
      await registerUser(
        {
          accountType,
          first_name: f.first_name,
          last_name: f.last_name,
          email: f.email,
          password: f.password,
          phone: f.phone,
          belongs_to_org: accountType === "agent" ? !!f.belongs_to_org : undefined,
          org_code: accountType === "agent" ? (f.org_code || null) : null,
          org_name: accountType === "owner" ? f.org_name : null,
        },
        registerAdapter
      );

      // Aviso y redirección a Login con email prellenado y bandera de "registered"
      setNotice({
        type: "success",
        text:
          accountType === "owner"
            ? "Cuenta creada. Te enviamos un correo de verificación. Al iniciar sesión podrás ver tu código de organización en el dashboard."
            : "Cuenta creada. Te enviamos un correo para confirmar tu cuenta.",
      });

      // 1s para que se alcance a leer y nav con query
      setTimeout(() => {
        nav(`/auth/login?registered=1&email=${encodeURIComponent(f.email)}`);
      }, 800);
    } catch (e: any) {
  const code = e?.code || e?.message;
  const msg = (e?.message || "").toString().toLowerCase();

  if (code === "EMAIL_IN_USE") {
    setNotice({
      type: "warning",
      text: (
        <>
          Este correo ya está registrado.{" "}
          <Link to={`/auth/login?email=${encodeURIComponent(f.email)}`} style={{ color: "var(--brand-700)", fontWeight: 600 }}>
            Inicia sesión
          </Link>{" "}
          o usa otro correo.
        </>
      ),
    });
    return;
  }

  // fallback por si algún entorno antiguo devuelve texto en lugar de code
  const isDupEmail =
    e?.status === 400 ||
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("duplicate key") ||
    msg.includes("user already") ||
    msg.includes("email address is already registered");

  if (isDupEmail) {
    setNotice({
      type: "warning",
      text: (
        <>
          Este correo ya está registrado.{" "}
          <Link to={`/auth/login?email=${encodeURIComponent(f.email)}`} style={{ color: "var(--brand-700)", fontWeight: 600 }}>
            Inicia sesión
          </Link>{" "}
          o usa otro correo.
        </>
      ),
    });
    return;
  }

  setNotice({
    type: "error",
    text: e?.message ?? "Ocurrió un error durante el registro.",
  });
}

  };

  return (
    <>
      <AuthHeader />
      <AuthLayout>
        <AuthCard size="lg">
          <h1 className="auth-title">Crear cuenta</h1>
          <p className="auth-subtitle">Completa tus datos para registrarte</p>

          {notice && (
            <Notice variant={notice.type} onClose={() => setNotice(null)}>
              {notice.text}
            </Notice>
          )}

          {/* OAuth */}
          <div className="oauth-section">
            <div className="oauth-row">
              <div className="oauth-btn-wrap">
                <OAuthButton
                  provider="google"
                  onClick={() =>
                    supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: env.VITE_OAUTH_REDIRECT_URL },
                    })
                  }
                />
              </div>

              {/* <div className="oauth-btn-wrap">
                <OAuthButton
                  provider="apple"
                  onClick={() =>
                    supabase.auth.signInWithOAuth({
                      provider: "apple",
                      options: { redirectTo: env.VITE_OAUTH_REDIRECT_URL },
                    })
                  }
                /> */}
              {/* </div> */}
            </div>
          </div>

          <DividerText>o</DividerText>

          {/* GRID 2 COLS */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
              <BaseFields register={register} errors={errors} />
              {accountType === "agent" && (
                <AgentExtras register={register} watch={watch} setValue={setValue} errors={errors} />
              )}
              {accountType === "owner" && <OwnerExtras register={register} errors={errors} />}
            </div>

            <Button type="submit" disabled={isSubmitting} style={{ marginTop: 12 }}>
              {isSubmitting ? "Creando..." : "Crear cuenta"}
            </Button>
          </form>

          <p style={{ textAlign: "center", marginTop: 14, color: "var(--text-600)" }}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/auth/login" style={{ color: "var(--brand-700)", fontWeight: 600 }}>
              Inicia sesión aquí
            </Link>
          </p>
        </AuthCard>
      </AuthLayout>
      <SiteFooter/>
    </>
  );
}
