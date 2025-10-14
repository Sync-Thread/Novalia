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
    return (
      <div className="field">
        {label && <label>{label}</label>}
        <div className="input-wrap">
          {leftIcon && <span className="input-left">{leftIcon}</span>}
          <input ref={ref} className="input" {...rest} />
          {rightIcon && <span className="input-right">{rightIcon}</span>}
        </div>
        {error && <span className="input-error">{error}</span>}
      </div>
    );
  }
);
TextField.displayName = "TextField";
export default TextField;