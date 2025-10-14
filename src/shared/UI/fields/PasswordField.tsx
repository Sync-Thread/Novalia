// src/shared/UI/fields/PasswordField.tsx
import React, { useState } from "react";
import TextField from "./TextField";
import { Eye, EyeOff, Lock } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

const PasswordField = React.forwardRef<HTMLInputElement, Props>(
  ({ label, error, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <TextField
        ref={ref}
        label={label}
        error={error}
        type={show ? "text" : "password"}
        leftIcon={<Lock size={20} aria-hidden />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{ background: "none", border: 0 }}
          >
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        }
        {...rest}
      />
    );
  }
);
PasswordField.displayName = "PasswordField";
export default PasswordField;
