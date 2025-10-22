import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { verifyIne, createPayload } from "../../INE";
import { supabase } from "../../../../core/supabase/client";
import styles from "./VerifyINEPage.module.css";

type VerificationStep = "upload" | "review" | "processing" | "result";
type DocumentType = "front" | "back" | "selfie";

interface UploadedDocuments {
  front: string | null;
  back: string | null;
  selfie: string | null;
}

export default function VerifyINEPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<VerificationStep>("upload");
  const [documents, setDocuments] = useState<UploadedDocuments>({
    front: null,
    back: null,
    selfie: null,
  });
  const [formData, setFormData] = useState({
    name: "",
    curp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    selfie: useRef<HTMLInputElement>(null),
  };

  const handleFileChange = async (
    type: DocumentType,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Máximo 5MB.");
      return;
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }

    setError(null);

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setDocuments((prev) => ({ ...prev, [type]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = (type: DocumentType) => {
    setDocuments((prev) => ({ ...prev, [type]: null }));
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current!.value = "";
    }
  };

  const canProceedToReview = () => {
    return documents.front && documents.back && documents.selfie;
  };

  const canSubmit = () => {
    return canProceedToReview() && formData.name.trim() && formData.curp.trim();
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setLoading(true);
    setError(null);
    setCurrentStep("processing");

    try {
      const payload = createPayload({
        nameForm: formData.name,
        curpForm: formData.curp,
        frontImage: documents.front,
        backImage: documents.back,
        selfieImage: documents.selfie,
      });

      const response = await verifyIne(payload);

      if (
        response.status === 200 ||
        response.status === 201 ||
        response.status === 204
      ) {
        console.log(response.body);
        console.log("response", response);

        setResult(response.body);

        // Guardar en base de datos si la verificación fue exitosa
        const isVerified = response.body?.status || response.body?.verified;
        if (isVerified) {
          await saveVerificationToDatabase(response.body);
        }

        setCurrentStep("result");
      } else {
        throw new Error(response.body?.message || "Error en la verificación");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setCurrentStep("review");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Guarda la verificación en la base de datos.
   *
   * CÓMO FUNCIONA LA VERIFICACIÓN:
   * ================================
   *
   * 1. Se inserta un nuevo registro en la tabla `kyc_verifications`:
   *    - user_id: UUID del usuario actual
   *    - provider: identificador del servicio ("ine_worker")
   *    - status: enum 'pending' | 'verified' | 'rejected'
   *    - evidence: JSONB con los datos de la verificación
   *    - created_at: timestamp automático
   *
   * 2. El método `getAuthProfile()` (SupabaseAuthService):
   *    - Consulta `kyc_verifications` WHERE user_id = current_user
   *    - Ordena por `created_at DESC` (el más reciente primero)
   *    - Toma solo 1 registro (.limit(1).maybeSingle())
   *    - Mapea el status:
   *      * Si status = "verified" → kycStatus = "verified"
   *      * Si status = "rejected" → kycStatus = "rejected"
   *      * Si NULL o no existe → kycStatus = "pending"
   *
   * 3. El componente MyPropertiesPage:
   *    - Llama a getAuthProfile() en useEffect
   *    - Actualiza el estado local: setAuthStatus(result.value.kycStatus)
   *    - Si kycStatus !== "verified" → muestra el KycBanner
   *    - Si kycStatus === "verified" → oculta el banner
   *
   * 4. Flujo completo:
   *    Usuario verifica INE → se guarda con status="verified"
   *    → próxima vez que carga la página → getAuthProfile() retorna "verified"
   *    → banner desaparece automáticamente
   */
  const saveVerificationToDatabase = async (verificationData: any) => {
    try {
      console.log("=== 💾 Guardando verificación en base de datos ===");
      console.log("📊 Datos de verificación:", verificationData);

      // Obtener el usuario autenticado actual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ Error al obtener usuario:", userError);
        return;
      }

      console.log("👤 Usuario ID:", user.id);

      // Preparar el objeto evidence con toda la información de la verificación
      const evidence = {
        verificationResponse: verificationData,
        submittedData: {
          name: formData.name,
          curp: formData.curp,
        },
        timestamp: new Date().toISOString(),
      };

      // Insertar en la tabla kyc_verifications
      // Esto creará un nuevo registro con created_at = NOW()
      // getAuthProfile() siempre leerá el más reciente (ORDER BY created_at DESC)
      const { data, error } = await supabase
        .from("kyc_verifications")
        .insert({
          user_id: user.id,
          provider: "ine_worker", // Identificador del proveedor de verificación
          status: "verified", // ← Este valor se lee en getAuthProfile()
          evidence: evidence, // Información adicional como JSONB
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

      console.log("✅ Verificación guardada exitosamente");
      console.log("📄 Registro creado:", {
        id: data.id,
        user_id: data.user_id,
        provider: data.provider,
        status: data.status,
        created_at: data.created_at,
      });
      console.log(
        "🎉 El usuario ahora aparecerá como verificado en MyPropertiesPage"
      );
      console.log("=== Fin del guardado ===");
    } catch (err) {
      console.error("💥 Error inesperado al guardar verificación:", err);
    }
  };

  const handleReset = () => {
    setCurrentStep("upload");
    setDocuments({ front: null, back: null, selfie: null });
    setFormData({ name: "", curp: "" });
    setError(null);
    setResult(null);
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: "upload", label: "Subir documentos" },
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
      <h2 className={styles.sectionTitle}>Documentos requeridos</h2>
      <p className={styles.sectionSubtitle}>
        Sube fotografías claras de tu INE y una selfie para verificación
      </p>

      <div className={styles.documentsGrid}>
        {/* INE Frontal */}
        <DocumentUploader
          type="front"
          label="INE - Frente"
          description="Parte frontal de tu INE"
          image={documents.front}
          inputRef={fileInputRefs.front}
          onChange={handleFileChange}
          onRemove={handleRemoveDocument}
        />

        {/* INE Trasera */}
        <DocumentUploader
          type="back"
          label="INE - Reverso"
          description="Parte trasera de tu INE"
          image={documents.back}
          inputRef={fileInputRefs.back}
          onChange={handleFileChange}
          onRemove={handleRemoveDocument}
        />

        {/* Selfie */}
        <DocumentUploader
          type="selfie"
          label="Selfie"
          description="Foto tuya sosteniendo tu INE"
          image={documents.selfie}
          inputRef={fileInputRefs.selfie}
          onChange={handleFileChange}
          onRemove={handleRemoveDocument}
        />
      </div>

      <div className={styles.tips}>
        <h3>💡 Consejos para mejores resultados</h3>
        <ul>
          <li>Asegúrate de que la imagen esté bien iluminada</li>
          <li>Evita reflejos y sombras sobre el documento</li>
          <li>El texto debe ser legible y sin cortes</li>
          <li>La selfie debe mostrar claramente tu rostro</li>
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
      <h2 className={styles.sectionTitle}>Revisa tus datos</h2>
      <p className={styles.sectionSubtitle}>
        Confirma que la información sea correcta antes de enviar
      </p>

      <div className={styles.previewGrid}>
        {documents.front && (
          <div className={styles.previewCard}>
            <img src={documents.front} alt="INE Frontal" />
            <span>INE - Frente</span>
          </div>
        )}
        {documents.back && (
          <div className={styles.previewCard}>
            <img src={documents.back} alt="INE Reverso" />
            <span>INE - Reverso</span>
          </div>
        )}
        {documents.selfie && (
          <div className={styles.previewCard}>
            <img src={documents.selfie} alt="Selfie" />
            <span>Selfie</span>
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nombre completo *</span>
          <input
            type="text"
            className={styles.fieldInput}
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Como aparece en tu INE"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>CURP *</span>
          <input
            type="text"
            className={styles.fieldInput}
            value={formData.curp}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                curp: e.target.value.toUpperCase(),
              }))
            }
            placeholder="18 caracteres"
            maxLength={18}
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
      <h2>Verificando tu identidad...</h2>
      <p>Esto puede tomar unos segundos</p>
    </div>
  );

  const renderResultStep = () => {
    const isSuccess = result?.status || result?.verified;

    return (
      <div className={styles.resultSection}>
        <div
          className={`${styles.resultIcon} ${isSuccess ? styles.resultSuccess : styles.resultError}`}
        >
          {isSuccess ? "✓" : "✗"}
        </div>
        <h2>{isSuccess ? "¡Verificación exitosa!" : "Verificación fallida"}</h2>
        <p>
          {isSuccess
            ? "Tu identidad ha sido verificada correctamente"
            : "No pudimos verificar tu identidad. Por favor, intenta nuevamente."}
        </p>

        {/* {result && (
          <div className={styles.resultDetails}>
            <h3>Detalles</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )} */}

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
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
              >
                Intentar de nuevo
              </button>
              {/* <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/support")}
              >
                Contactar soporte
              </button> */}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="app-container">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Verificación de identidad (INE)</h1>
          <p className={styles.subtitle}>
            Para publicar propiedades necesitamos verificar tu identidad
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

interface DocumentUploaderProps {
  type: DocumentType;
  label: string;
  description: string;
  image: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (
    type: DocumentType,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onRemove: (type: DocumentType) => void;
}

function DocumentUploader({
  type,
  label,
  description,
  image,
  inputRef,
  onChange,
  onRemove,
}: DocumentUploaderProps) {
  return (
    <div className={styles.documentCard}>
      <div className={styles.documentHeader}>
        <h3>{label}</h3>
        <span className={styles.documentDescription}>{description}</span>
      </div>

      {image ? (
        <div className={styles.documentPreview}>
          <img src={image} alt={label} />
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemove(type)}
          >
            ✗ Eliminar
          </button>
        </div>
      ) : (
        <div
          className={styles.documentUpload}
          onClick={() => inputRef.current?.click()}
        >
          <div className={styles.uploadIcon}>📷</div>
          <p>Haz clic para subir</p>
          <span>o arrastra el archivo aquí</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onChange(type, e)}
      />
    </div>
  );
}
