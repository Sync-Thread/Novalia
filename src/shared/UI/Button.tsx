// src/shared/UI/Button.tsx
import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};
export default function Button({ variant="primary", className="", ...rest }: Props){
  const cls = ["btn", variant === "primary" ? "btn-primary" : "btn-ghost", className].join(" ");
  return <button className={cls} {...rest} />;
}
