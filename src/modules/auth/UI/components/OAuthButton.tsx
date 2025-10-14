// src/app/auth/components/OAuthButton.tsx
import React from "react";
import googleIcon from "../../../../shared/assets/icons/google.svg";
import appleIcon from "../../../../shared/assets/icons/Apple_logo_grey.svg";

type Provider = "google";// | "apple";

const MAP: Record<Provider, { src: string; label: string; extraCls?: string }> = {
  google: { src: googleIcon, label: "Continuar con Google" },
  // apple:  { src: appleIcon,  label: "Continuar con Apple", extraCls: "apple" },
};

export default function OAuthButton({
  provider,
  onClick,
}: {
  provider: Provider;
  onClick?: () => void;
}) {
  const { src, label, extraCls } = MAP[provider];
  return (
    <button type="button" className={`oauth-btn ${extraCls ?? ""}`} onClick={onClick}>
      <img src={src} alt="" aria-hidden />
      {label}
    </button>
  );
}
