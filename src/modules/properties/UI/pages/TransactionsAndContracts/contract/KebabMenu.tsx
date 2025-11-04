import React, { useState } from 'react';
import styles from '../TransactionsAndContracts.module.css';
import type { IContract } from './contractType';

interface KebabMenuProps {
  contract: IContract;
  onActionClick: (action: string, contractId: string) => void;
}

const KebabMenu: React.FC<KebabMenuProps> = ({ contract, onActionClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: string) => {
    onActionClick(action, contract.id);
    setIsOpen(false);
  };

  return (
    <div className={styles.kebabContainer}>
      <button
        className={styles.kebabButton}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Menú de opciones"
      >
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
      </button>

      {isOpen && (
        <>
          <div className={styles.dropdown} role="menu">
            <button
              onClick={() => handleAction('ver-detalle')}
              role="menuitem"
            >
              Ver detalle
            </button>
            <button
              onClick={() => handleAction('descargar')}
              role="menuitem"
            >
              Descargar
            </button>
            <div className={styles.divider} role="separator" />
            <button
              onClick={() => handleAction('eliminar')}
              className={styles.destructive}
              role="menuitem"
            >
              Eliminar
            </button>
          </div>
          <div
            className={styles.overlay}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
};

export default KebabMenu;