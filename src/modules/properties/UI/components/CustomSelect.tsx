import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./CustomSelect.module.css";

export interface SelectOption {
  value: string;
  label: string;
  [key: string]: any; // Permitir propiedades adicionales
}

export interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = "Seleccionar",
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;

    // const handleClickOutside = (event: MouseEvent) => {
    //   if (
    //     containerRef.current &&
    //     !containerRef.current.contains(event.target as Node)
    //   ) {
    //     console.log("intenta cambiar / cambia.");

    //     setIsOpen(false);
    //   }
    // };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    // document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      // document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelect = (optionValue: string) => onChange(optionValue);
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        setIsOpen((prev) => !prev);
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex = Math.min(currentIndex + 1, options.length - 1);
          onChange(options[nextIndex].value);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex = Math.max(currentIndex - 1, 0);
          onChange(options[prevIndex].value);
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.customSelect} ${className}`}
      data-disabled={disabled || undefined}
      data-open={isOpen || undefined}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={handleToggle}
        onBlur={() => {
          console.log("loga");
          setTimeout(() => setIsOpen(false), 300);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerText}>{displayText}</span>
        <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
      </button>

      {isOpen && !disabled && (
        <div className={styles.dropdown} role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={styles.option}
                data-selected={isSelected || undefined}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
