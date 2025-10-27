// src/app/auth/components/AuthHeader.tsx

import { Link } from "react-router-dom";
import logo from "../../../../shared/assets/icons/logo.svg";

export default function AuthHeader() {
  return (
    <header className="auth-header">
      <div className="auth-header__bar">
        <Link
          to="/"
          className="auth-header__back"
          aria-label="Regresar al inicio publico"
        >
          <span className="auth-header__back-icon" aria-hidden="true">
            <ArrowLeftIcon />
          </span>
          <span className="auth-header__back-text">Regresar</span>
        </Link>
        <Link
          to="/"
          className="auth-header__brand"
          aria-label="Ir al inicio publico de Novalia"
        >
          <img src={logo} alt="" width={24} height={24} aria-hidden="true" />
          <span>Novalia</span>
        </Link>
        <div style={{ width: "102px" }} aria-hidden="true" />
      </div>
    </header>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M5 12l5.5 5.5M5 12l5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
