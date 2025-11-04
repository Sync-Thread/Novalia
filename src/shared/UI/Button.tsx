// src/shared/UI/Button.tsx
import React from "react";

type ButtonVariant = "primary" | "outline" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({ variant = "primary", className = "", ...rest }: Props) {
  const variantClass =
    variant === "primary" ? "btn-primary" : variant === "outline" ? "btn-outline" : "btn-ghost";
  const cls = ["btn", variantClass, className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
