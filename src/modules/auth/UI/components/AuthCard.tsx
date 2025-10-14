// src/app/auth/components/AuthCard.tsx
import React from "react";

type Props = {
  children: React.ReactNode;
  size?: "md" | "lg";        // md = login, lg = register
  className?: string;
};

export default function AuthCard({ children, size = "md", className = "" }: Props) {
  return (
    <section className={`auth-card ${size === "lg" ? "auth-card--wide" : ""} ${className}`}>
      {children}
    </section>
  );
}

