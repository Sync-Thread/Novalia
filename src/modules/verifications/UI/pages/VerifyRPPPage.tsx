import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { verifyRpp, createRPPPayload } from "../../RPP";
import { supabase } from "../../../../core/supabase/client";
import styles from "./VerifyRPPPage.module.css";

type VerificationStep = "upload" | "review" | "processing" | "result";

export default function VerifyRPPPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<VerificationStep>("upload");
  const [rppDocument, setRppDocument] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ownerName: "",
    propertyAddress: "",
    registrationNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño (max 10MB para documentos PDF)
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Máximo 10MB.");
      return;
    }

    // Validar tipo (PDF o imágenes)
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Solo se permiten archivos PDF o imágenes (JPG, PNG).");
      return;
    }

    setError(null);

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setRppDocument(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = () => {
    setRppDocument(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canProceedToReview = () => {
    return rppDocument !== null;
  };

  const canSubmit = () => {
    return (
      canProceedToReview() &&
      formData.ownerName.trim() &&
      formData.propertyAddress.trim() &&
      formData.registrationNumber.trim()
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setLoading(true);
    setError(null);
    setCurrentStep("processing");

    try {
      const payload = createRPPPayload({
        ownerName: formData.ownerName,
        propertyAddress: formData.propertyAddress,
        registrationNumber: formData.registrationNumber,
        rppDocument: rppDocument,
      });

      // Llamar al worker (aunque la respuesta será de INE, la ignoraremos)
      await verifyRpp(payload);

      // Simular resultado exitoso (siempre verdadero según requerimiento)
      const simulatedResult = {
        verified: true,
        status: "verified",
        message: "Documento RPP verificado correctamente",
        documentType: "rpp",
        timestamp: new Date().toISOString(),
      };

      setResult(simulatedResult);

      // Guardar en base de datos
      await saveVerificationToDatabase(simulatedResult);

      setCurrentStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setCurrentStep("review");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Guarda la verificación RPP en la base de datos.
   * Similar al proceso de INE pero con provider "rpp_document"
   */
  const saveVerificationToDatabase = async (verificationData: any) => {
    try {
      console.log("=== 💾 Guardando verificación RPP en base de datos ===");
      console.log("📊 Datos de verificación:", verificationData);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ Error al obtener usuario:", userError);
        return;
      }

      console.log("👤 Usuario ID:", user.id);

      const evidence = {
        verificationResponse: verificationData,
        submittedData: {
          ownerName: formData.ownerName,
          propertyAddress: formData.propertyAddress,
          registrationNumber: formData.registrationNumber,
        },
        timestamp: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("kyc_verifications")
        .insert({
          user_id: user.id,
          provider: "rpp_document",
          status: "verified",
          evidence: evidence,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error al guardar en base de datos:", error);
        console.error("📝 Detalles del error:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }

      console.log("✅ Verificación RPP guardada exitosamente");
      console.log("📄 Registro creado:", {
        id: data.id,
        user_id: data.user_id,
        provider: data.provider,
        status: data.status,
        created_at: data.created_at,
      });
      console.log("=== Fin del guardado ===");
    } catch (err) {
      console.error("💥 Error inesperado al guardar verificación RPP:", err);
    }
  };

  const handleReset = () => {
    setCurrentStep("upload");
    setRppDocument(null);
    setFormData({ ownerName: "", propertyAddress: "", registrationNumber: "" });
    setError(null);
    setResult(null);
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: "upload", label: "Subir documento" },
      { id: "review", label: "Revisar datos" },
      { id: "processing", label: "Procesando" },
      { id: "result", label: "Resultado" },
    ];

    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    return (
      <div className={styles.stepIndicator}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`${styles.step} ${
              index <= currentIndex ? styles.stepActive : ""
            }`}
          >
            <div className={styles.stepCircle}>
              {index < currentIndex ? "✓" : index + 1}
            </div>
            <span className={styles.stepLabel}>{step.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className={styles.uploadSection}>
      <h2 className={styles.sectionTitle}>Documento RPP requerido</h2>
      <p className={styles.sectionSubtitle}>
        Sube el documento del Registro Público de la Propiedad (RPP) en formato
        PDF o imagen
      </p>

      <div className={styles.documentCard}>
        <div className={styles.documentHeader}>
          <h3>Documento RPP</h3>
          <span className={styles.documentDescription}>
            Certificado de libertad de gravamen o escritura registrada
          </span>
        </div>

        {rppDocument ? (
          <div className={styles.documentPreview}>
            {rppDocument.startsWith("data:application/pdf") ? (
              <div className={styles.pdfPreview}>
                <div className={styles.pdfIcon}>📄</div>
                <span>Documento PDF cargado</span>
              </div>
            ) : (
              <img src={rppDocument} alt="Documento RPP" />
            )}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={handleRemoveDocument}
            >
              ✗ Eliminar
            </button>
          </div>
        ) : (
          <div
            className={styles.documentUpload}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.uploadIcon}>📁</div>
            <p>Haz clic para subir</p>
            <span>o arrastra el archivo aquí</span>
            <span className={styles.fileTypes}>PDF, JPG o PNG (máx. 10MB)</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/jpeg,image/jpg,image/png"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      <div className={styles.tips}>
        <h3>💡 Información importante</h3>
        <ul>
          <li>El documento debe ser legible y estar completo</li>
          <li>Asegúrate de que la información sea visible</li>
          <li>
            Documentos aceptados: Certificado de libertad de gravamen, escritura
            pública registrada
          </li>
          <li>El documento debe estar vigente (no mayor a 3 meses)</li>
        </ul>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!canProceedToReview()}
        onClick={() => setCurrentStep("review")}
      >
        Continuar
      </button>
    </div>
  );

  const renderReviewStep = () => (
    <div className={styles.reviewSection}>
      <h2 className={styles.sectionTitle}>Revisa los datos del documento</h2>
      <p className={styles.sectionSubtitle}>
        Completa la información del documento RPP antes de enviar
      </p>

      <div className={styles.previewCard}>
        {rppDocument?.startsWith("data:application/pdf") ? (
          <div className={styles.pdfPreview}>
            <div className={styles.pdfIcon}>📄</div>
            <span>Documento RPP</span>
          </div>
        ) : (
          <>
            {rppDocument && <img src={rppDocument} alt="Documento RPP" />}
            <span>Documento RPP</span>
          </>
        )}
      </div>

      <div className={styles.formSection}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nombre del propietario *</span>
          <input
            type="text"
            className={styles.fieldInput}
            value={formData.ownerName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, ownerName: e.target.value }))
            }
            placeholder="Como aparece en el documento"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Dirección de la propiedad *</span>
          <input
            type="text"
            className={styles.fieldInput}
            value={formData.propertyAddress}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                propertyAddress: e.target.value,
              }))
            }
            placeholder="Dirección completa registrada"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Número de registro o folio *
          </span>
          <input
            type="text"
            className={styles.fieldInput}
            value={formData.registrationNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                registrationNumber: e.target.value.toUpperCase(),
              }))
            }
            placeholder="Folio real o número de registro"
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setCurrentStep("upload")}
        >
          Regresar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSubmit() || loading}
          onClick={handleSubmit}
        >
          Enviar verificación
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className={styles.processingSection}>
      <div className={styles.spinner}>
        <div className={styles.spinnerCircle}></div>
      </div>
      <h2>Verificando documento RPP...</h2>
      <p>Esto puede tomar unos segundos</p>
    </div>
  );

  const renderResultStep = () => {
    const isSuccess = result?.verified || result?.status === "verified";

    return (
      <div className={styles.resultSection}>
        <div
          className={`${styles.resultIcon} ${isSuccess ? styles.resultSuccess : styles.resultError}`}
        >
          {isSuccess ? "✓" : "✗"}
        </div>
        <h2>
          {isSuccess ? "¡Documento RPP verificado!" : "Verificación fallida"}
        </h2>
        <p>
          {isSuccess
            ? "El documento del Registro Público de la Propiedad ha sido verificado correctamente"
            : "No pudimos verificar el documento. Por favor, intenta nuevamente."}
        </p>

        <div className={styles.actions}>
          {isSuccess ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/properties")}
            >
              Ir a mis propiedades
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="app-container">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Verificación de documento RPP</h1>
          <p className={styles.subtitle}>
            Para publicar propiedades necesitamos verificar el documento del
            Registro Público de la Propiedad
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate(-1)}
        >
          Cancelar
        </button>
      </header>

      {renderStepIndicator()}

      {error && (
        <div className={styles.alert} role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="card" style={{ padding: "var(--gap)" }}>
        {currentStep === "upload" && renderUploadStep()}
        {currentStep === "review" && renderReviewStep()}
        {currentStep === "processing" && renderProcessingStep()}
        {currentStep === "result" && renderResultStep()}
      </div>
    </main>
  );
}
