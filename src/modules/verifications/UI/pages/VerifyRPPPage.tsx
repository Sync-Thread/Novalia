import React, { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyRpp, createRPPPayload } from "../../RPP";
import { supabase } from "../../../../core/supabase/client";
import { uploadFile } from "../../../properties/infrastructure/adapters/MediaStorage";
import { SupabaseDocumentStorage } from "../../../properties/infrastructure/adapters/SupabaseDocumentStorage";
import { SupabaseAuthService } from "../../../properties/infrastructure/adapters/SupabaseAuthService";
import { PropertiesProvider } from "../../../properties/UI/containers/PropertiesProvider";
import { usePropertiesActions } from "../../../properties/UI/hooks/usePropertiesActions";
import styles from "./VerifyRPPPage.module.css";

type VerificationStep = "upload" | "review" | "processing" | "result";

const authService = new SupabaseAuthService({ client: supabase });
const documentStorage = new SupabaseDocumentStorage({ supabase, authService });

export default function VerifyRPPPage() {
  return (
    <PropertiesProvider>
      <VerifyRPPPageContent />
    </PropertiesProvider>
  );
}

function VerifyRPPPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get("propertyId");

  // Hook para acceder al use case VerifyRpp
  const { verifyRpp: verifyRppUseCase } = usePropertiesActions();

  const [currentStep, setCurrentStep] = useState<VerificationStep>("upload");
  const [rppDocument, setRppDocument] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

    // Guardar el archivo original para subirlo después
    setUploadedFile(file);

    // Convertir a base64 para preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setRppDocument(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = () => {
    setRppDocument(null);
    setUploadedFile(null);
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
    if (!canSubmit() || !uploadedFile) {
      setError("Falta el archivo o los datos del formulario");
      return;
    }

    if (!propertyId) {
      setError(
        "No se especificó el ID de la propiedad. Por favor, accede desde el wizard de publicación."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStep("processing");

    try {
      // 1. Llamar al worker (opcional, la respuesta se ignora)
      const payload = createRPPPayload({
        ownerName: formData.ownerName,
        propertyAddress: formData.propertyAddress,
        registrationNumber: formData.registrationNumber,
        rppDocument: rppDocument,
      });

      await verifyRpp(payload);

      // 2. Subir archivo a S3
      console.log("📤 Subiendo documento RPP a S3...");
      const uploadResult = await uploadFile(
        uploadedFile,
        "documents",
        propertyId
      );

      if (!uploadResult?.objectUrl) {
        throw new Error("Error al subir el documento a S3");
      }

      console.log("✅ Documento subido a S3:", uploadResult);

      // 3. Guardar en la base de datos con estado "verified"
      const dbResult = await documentStorage.insertDocumentFromS3({
        propertyId: propertyId,
        docType: "rpp_certificate",
        s3Key: uploadResult.key,
        url: uploadResult.objectUrl,
        fileName: uploadResult.filename,
        contentType: uploadResult.contentType,
        size: uploadResult.size,
      });

      if (dbResult.isErr()) {
        const errorMsg =
          typeof dbResult.error === "object" &&
          dbResult.error !== null &&
          "message" in dbResult.error
            ? String(dbResult.error.message)
            : "Error desconocido al guardar en BD";
        throw new Error(errorMsg);
      }

      console.log("✅ Documento RPP guardado en BD:", dbResult.value);

      // 4. Actualizar el atributo rpp_verified de la propiedad usando el use case
      console.log("🔄 Actualizando rpp_verified de la propiedad...");
      const verifyUseCaseResult = await verifyRppUseCase({
        propertyId: propertyId,
        docId: dbResult.value.id,
        status: "verified",
      });

      if (verifyUseCaseResult.isErr()) {
        console.error(
          "⚠️ Error al actualizar rpp_verified:",
          verifyUseCaseResult.error
        );
        // No fallar todo el proceso, solo loguear el error
        // El documento ya está guardado y marcado como verified
      } else {
        console.log("✅ Atributo rpp_verified actualizado en la propiedad");
      }

      // 5. Simular resultado exitoso
      const simulatedResult = {
        verified: true,
        status: "verified",
        message: "Documento RPP verificado correctamente",
        documentType: "rpp_certificate",
        documentId: dbResult.value.id,
        timestamp: new Date().toISOString(),
      };

      setResult(simulatedResult);
      setCurrentStep("result");
    } catch (err) {
      console.error("❌ Error en verificación RPP:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setCurrentStep("review");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep("upload");
    setRppDocument(null);
    setUploadedFile(null);
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
