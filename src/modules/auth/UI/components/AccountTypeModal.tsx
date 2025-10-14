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
  onSelect?: (v: AccountType) => void;
  onClose: () => void;
  onContinue?: (v: AccountType | null) => void;
};


export default function AccountTypeModal({
  open, value, onSelect, onClose, onContinue,
}: Props) {
  const [internal, setInternal] = useState<AccountType | null>(value ?? null);
  const current = value ?? internal;  // si value undefined o null, usa internal

  useEffect(() => { if (value !== undefined) setInternal(value); }, [value]);

  const options = useMemo(() => ([
    { id: "buyer" as const, title: "Comprador",    desc: "Para personas que buscan su próxima propiedad.", icon: buyerIcon },
    { id: "agent" as const, title: "Agente",       desc: "Para profesionales inmobiliarios independientes.", icon: agentIcon },
    { id: "owner" as const, title: "Organización", desc: "Para agencias y constructoras.",                  icon: orgIcon   },
  ]), []);

  const select = (id: AccountType) => { onSelect ? onSelect(id) : setInternal(id); };

  return (
    <Modal open={open} onClose={onClose} labelledBy="accountTypeTitle">
      <div className="modal-body">
        <h2 id="accountTypeTitle" className="modal-title">¿Qué tipo de cuenta deseas crear?</h2>
        <p className="modal-sub">Selecciona la opción que mejor se adapte a tus necesidades</p>

        <div className="option-list" role="radiogroup" aria-labelledby="accountTypeTitle">
          {options.map(opt => {
            const selected = current === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`option-card ${selected ? "selected" : ""}`}
                onClick={() => select(opt.id)}
              >
                <div className="option-left">
                  <img src={opt.icon} alt="" aria-hidden width={24} height={24}/>
                </div>
                <div>
                  <div className="option-title">{opt.title}</div>
                  <div className="option-desc">{opt.desc}</div>
                </div>
                <span className="radio-dot" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="modal-footer">
        <button
          className="btn btn-primary"
          disabled={!current}
          onClick={() => onContinue?.(current ?? null)}
        >
          Continuar
        </button>
      </div>
    </Modal>
  );
}
