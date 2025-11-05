import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircleIcon } from "lucide-react";
import { SignaturePad } from "../components/SignaturePad/SignaturePad";
import styles from "./SignContractPage.module.css";

export const SignContractPage: React.FC = () => {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSaveSignature = (dataUrl: string) => {
    setSignatureData(dataUrl);
    setShowPreview(true);
    console.log("Firma guardada:", dataUrl);
  };

  const handleClearSignature = () => {
    setSignatureData(null);
    setShowPreview(false);
  };

  const handleConfirmSignature = async () => {
    if (!signatureData) return;

    setIsSaving(true);
    try {
      // TODO: Aquí implementarás la lógica para guardar la firma
      // Opciones:
      // 1. Guardar como imagen en storage (Supabase Storage)
      // 2. Guardar en la base de datos como base64
      // 3. Superponer en el PDF del contrato

      console.log("Guardando firma para contrato:", contractId);
      console.log("Data URL:", signatureData);

      // Simular guardado
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Navegar de vuelta a los contratos
      navigate("/contracts");
    } catch (error) {
      console.error("Error al guardar la firma:", error);
      alert("Error al guardar la firma. Por favor, intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Firma Digital del Contrato</h1>
          <p className="muted">
            {contractId
              ? `ID del contrato: ${contractId}`
              : "Firma tu documento"}
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.signatureSection}>
          <div className={styles.instructions}>
            <h2>Instrucciones</h2>
            <ol>
              <li>Usa tu mouse o tu dedo para firmar en el área blanca</li>
              <li>Puedes ajustar el grosor y color de la firma</li>
              <li>
                Si te equivocas, usa el botón "Limpiar" para empezar de nuevo
              </li>
              <li>Cuando estés satisfecho, presiona "Guardar"</li>
              <li>Revisa tu firma y confirma</li>
            </ol>
          </div>

          <SignaturePad
            width={800}
            height={400}
            onSave={handleSaveSignature}
            onClear={handleClearSignature}
            backgroundColor="#ffffff"
            penColor="#000000"
            penWidth={2}
            showActions={!showPreview}
            onCancel={() => navigate(-1)}
          />
        </div>

        {showPreview && signatureData && (
          <div className={styles.previewSection}>
            <h2>Vista Previa de tu Firma</h2>
            <div className={styles.previewCard}>
              <img
                src={signatureData}
                alt="Vista previa de la firma"
                className={styles.previewImage}
              />
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowPreview(false)}
              >
                Editar Firma
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSignature}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className={styles.spinner} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon size={18} />
                    Confirmar y Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {!showPreview && (
          <div className={styles.infoBox}>
            <h3>ℹ️ Información Importante</h3>
            <ul>
              <li>Tu firma será almacenada de forma segura y encriptada</li>
              <li>Esta firma tiene validez legal dentro de la plataforma</li>
              <li>
                Podrás revisar el documento firmado en el módulo de contratos
              </li>
              <li>La firma se guardará en formato PNG con transparencia</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
