// src/app/auth/components/AccountTypeModal.tsx
import { useMemo, useState, useEffect } from "react";
import Modal from "../../../../shared/UI/Modal";
import buyerIcon from "../../../../shared/assets/icons/home-svgrepo-com.svg";
import agentIcon from "../../../../shared/assets//icons/employee-svgrepo-com.svg";
import orgIcon from "../../../../shared/assets//icons/building1-svgrepo-com.svg";
import type { AccountType } from "../../../../shared/types/auth";

type Props = {
  open: boolean;
  value?: AccountType | null;
  onSelect?: (value: AccountType) => void;
  onClose: () => void;
  onContinue?: (value: AccountType | null) => void;
  confirmLabel?: string;
  loading?: boolean;
  title?: string;
  subtitle?: string;
};

export default function AccountTypeModal({
  open,
  value,
  onSelect,
  onClose,
  onContinue,
  confirmLabel,
  loading = false,
  title,
  subtitle,
}: Props) {
  const [internal, setInternal] = useState<AccountType | null>(value ?? null);
  const current = value ?? internal;

  useEffect(() => {
    if (value !== undefined) setInternal(value);
  }, [value]);

  const options = useMemo(
    () => [
      {
        id: "buyer" as const,
        title: "Comprador",
        desc: "Para personas que buscan su próxima propiedad.",
        icon: buyerIcon,
      },
      {
        id: "agent" as const,
        title: "Agente",
        desc: "Para profesionales inmobiliarios independientes.",
        icon: agentIcon,
      },
      {
        id: "owner" as const,
        title: "Organización",
        desc: "Para agencias y constructoras.",
        icon: orgIcon,
      },
    ],
    [],
  );

  const select = (id: AccountType) => {
    if (onSelect) {
      onSelect(id);
    } else {
      setInternal(id);
    }
  };

  const handleContinue = () => {
    if (!onContinue || loading) return;
    onContinue(current ?? null);
  };

  const heading = title ?? "¿Qué tipo de cuenta deseas crear?";
  const description = subtitle ?? "Selecciona la opción que mejor se adapte a tus necesidades";

  return (
    <Modal open={open} onClose={onClose} labelledBy="accountTypeTitle">
      <div className="modal-body">
        <h2 id="accountTypeTitle" className="modal-title">
          {heading}
        </h2>
        <p className="modal-sub">{description}</p>

        <div className="option-list" role="radiogroup" aria-labelledby="accountTypeTitle">
          {options.map(option => {
            const selected = current === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`option-card ${selected ? "selected" : ""}`}
                onClick={() => select(option.id)}
              >
                <div className="option-left">
                  <img src={option.icon} alt="" aria-hidden width={24} height={24} />
                </div>
                <div>
                  <div className="option-title">{option.title}</div>
                  <div className="option-desc">{option.desc}</div>
                </div>
                <span className="radio-dot" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-primary" disabled={!current || loading} onClick={handleContinue}>
          {loading ? "Guardando..." : confirmLabel ?? "Continuar"}
        </button>
      </div>
    </Modal>
  );
}
