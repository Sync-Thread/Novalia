// src/shared/UI/fields/TextField.tsx
import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const TextField = React.forwardRef<HTMLInputElement, Props>(
  ({ label, error, leftIcon, rightIcon, ...rest }, ref) => {
    // Determinar clases de padding basadas en la presencia de iconos
    const inputClasses = [
      "input-entrada",
      leftIcon ? "input--has-left-icon" : "",
      rightIcon ? "input--has-right-icon" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="field">
        {label && <label>{label}</label>}
        <div className="input-wrap">
          {leftIcon && <span className="input-left">{leftIcon}</span>}
          <input
            ref={ref}
            className={inputClasses}
            {...rest}
            // style={{ padding: "0px" }}
          />
          {rightIcon && <span className="input-right">{rightIcon}</span>}
        </div>
        {error && <span className="input-error">{error}</span>}
      </div>
    );
  }
);
TextField.displayName = "TextField";
export default TextField;
