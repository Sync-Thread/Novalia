import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";

// Tipos de documento disponibles
const DOCUMENT_TYPES = [
  { value: "contract", label: "Contrato" },
  { value: "annex", label: "Anexo" },
  { value: "identification", label: "Identificación" },
  { value: "appraisal", label: "Avalúo" },
  { value: "rpp", label: "RPP" },
  { value: "other", label: "Otro" },
] as const;

interface PropertyOption {
  id: string;
  name: string;
  folio: string;
  thumbnail?: string;
  address: string;
}

interface FormData {
  documentType: string;
  propertyId: string;
  title: string;
  description: string;
  issuedDate: string;
  expirationDate: string;
  file: File | null;
}

interface FormErrors {
  documentType?: string;
  propertyId?: string;
  title?: string;
  file?: string;
  expirationDate?: string;
}

interface NewDocumentQuickViewProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (documentId: string) => void;
  contractId?: string;
}

export default function NewDocumentQuickView({
  open,
  onClose,
  onSuccess,
  contractId,
}: NewDocumentQuickViewProps) {
  const [formData, setFormData] = useState<FormData>({
    documentType: "",
    propertyId: "",
    title: "",
    description: "",
    issuedDate: "",
    expirationDate: "",
    file: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const propertySearchRef = useRef<HTMLInputElement>(null);

  // Trap focus dentro del QuickView cuando está abierto
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Buscar propiedades (mock - reemplazar con caso de uso real)
  const searchProperties = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPropertyOptions([]);
      return;
    }

    setLoadingProperties(true);
    // TODO: Reemplazar con caso de uso ListProperties real
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockProperties: PropertyOption[] = [
      {
        id: "P001",
        name: "Casa moderna en Polanco",
        folio: "PROP-001",
        address: "Polanco, CDMX",
        thumbnail: "/placeholder.jpg",
      },
      {
        id: "P002",
        name: "Departamento en Roma Norte",
        folio: "PROP-002",
        address: "Roma Norte, CDMX",
      },
      {
        id: "P003",
        name: "Oficina en Santa Fe",
        folio: "PROP-003",
        address: "Santa Fe, CDMX",
      },
    ].filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.folio.toLowerCase().includes(query.toLowerCase())
    );

    setPropertyOptions(mockProperties);
    setLoadingProperties(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (propertySearch) {
        searchProperties(propertySearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [propertySearch, searchProperties]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.documentType) {
      newErrors.documentType = "Selecciona un tipo de documento";
    }

    if (!formData.propertyId) {
      newErrors.propertyId = "Selecciona una propiedad";
    }

    if (!formData.title.trim()) {
      newErrors.title = "El título es obligatorio";
    }

    if (!formData.file) {
      newErrors.file = "Debes seleccionar un archivo";
    } else {
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!validTypes.includes(formData.file.type)) {
        newErrors.file = "Solo se permiten archivos PDF, JPG o PNG";
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (formData.file.size > maxSize) {
        newErrors.file = "El archivo no puede superar los 10MB";
      }
    }

    if (
      formData.issuedDate &&
      formData.expirationDate &&
      new Date(formData.expirationDate) < new Date(formData.issuedDate)
    ) {
      newErrors.expirationDate =
        "La fecha de vencimiento debe ser posterior a la de emisión";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFormData((prev) => ({ ...prev, file }));
        setErrors((prev) => ({ ...prev, file: undefined }));
      }
    },
    []
  );

  const handlePropertySelect = useCallback((property: PropertyOption) => {
    setFormData((prev) => ({ ...prev, propertyId: property.id }));
    setPropertySearch(property.name);
    setShowPropertyDropdown(false);
    setErrors((prev) => ({ ...prev, propertyId: undefined }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setLoading(true);
      setUploadProgress(0);

      try {
        // TODO: Implementar caso de uso CreateDocument
        // 1. Subir archivo a bucket privado con presign
        // 2. Crear registro de documento
        // 3. Asociar con propiedad y contrato si aplica

        // Simulación de progreso de subida
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setUploadProgress(i);
        }

        // Mock success
        const documentId = `DOC-${Date.now()}`;

        if (onSuccess) {
          onSuccess(documentId);
        }

        // Reset form
        setFormData({
          documentType: "",
          propertyId: "",
          title: "",
          description: "",
          issuedDate: "",
          expirationDate: "",
          file: null,
        });
        setPropertySearch("");
        setErrors({});

        onClose();
      } catch (error) {
        console.error("Error creating document:", error);
        setErrors({
          file: "Error al subir el documento. Intenta nuevamente.",
        });
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
    },
    [formData, validateForm, onSuccess, onClose]
  );

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  if (!open) return null;

  const selectedProperty = propertyOptions.find(
    (p) => p.id === formData.propertyId
  );

  return (
    <div className="sheet" role="presentation">
      <div
        role="presentation"
        className="quickview-scrim"
        onClick={onClose}
        style={{ cursor: "pointer" }}
      />
      <aside
        ref={panelRef}
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-document-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-ghost btn-icon sheet-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="sheet-body">
          <header className="quickview-header">
            <div className="quickview-header__left">
              <div className="quickview-header__title">
                <h2 id="new-document-title" tabIndex={-1}>
                  Nuevo Documento
                </h2>
                <p
                  className="muted"
                  style={{ fontSize: "14px", marginTop: "4px" }}
                >
                  Los documentos se almacenan de forma privada y segura
                </p>
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit}>
            {/* Tipo de documento */}
            <section className="quickview-section">
              <label
                htmlFor="documentType"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Tipo de documento <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                id="documentType"
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  textAlign: "left",
                  justifyContent: "flex-start",
                }}
                value={formData.documentType}
                onChange={(e) => handleChange("documentType", e.target.value)}
                aria-invalid={!!errors.documentType}
              >
                <option value="">Selecciona un tipo</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.documentType && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "4px",
                  }}
                >
                  <AlertCircle size={14} style={{ marginRight: "4px" }} />
                  {errors.documentType}
                </p>
              )}
            </section>

            {/* Propiedad (selector buscable) */}
            <section className="quickview-section">
              <label
                htmlFor="propertySearch"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Propiedad asociada <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <Search
                    size={18}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    ref={propertySearchRef}
                    id="propertySearch"
                    type="text"
                    className="btn btn-secondary"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      paddingLeft: "40px",
                    }}
                    placeholder="Buscar por nombre o folio..."
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    onFocus={() => setShowPropertyDropdown(true)}
                    aria-invalid={!!errors.propertyId}
                  />
                </div>

                {showPropertyDropdown && propertySearch && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      maxHeight: "240px",
                      overflowY: "auto",
                      zIndex: 1000,
                    }}
                  >
                    {loadingProperties ? (
                      <div style={{ padding: "16px", textAlign: "center" }}>
                        <Loader2 size={20} className="animate-spin" />
                      </div>
                    ) : propertyOptions.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          color: "#9ca3af",
                          textAlign: "center",
                        }}
                      >
                        No se encontraron propiedades
                      </div>
                    ) : (
                      propertyOptions.map((property) => (
                        <button
                          key={property.id}
                          type="button"
                          onClick={() => handlePropertySelect(property)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f9fafb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          {property.thumbnail && (
                            <img
                              src={property.thumbnail}
                              alt={property.name}
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                objectFit: "cover",
                              }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 500,
                                color: "#111827",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {property.name}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginTop: "2px",
                              }}
                            >
                              {property.folio} • {property.address}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedProperty && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  {selectedProperty.thumbnail && (
                    <img
                      src={selectedProperty.thumbnail}
                      alt={selectedProperty.name}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: "14px" }}>
                      {selectedProperty.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {selectedProperty.address}
                    </div>
                  </div>
                  <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
                </div>
              )}

              {errors.propertyId && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "4px",
                  }}
                >
                  <AlertCircle size={14} style={{ marginRight: "4px" }} />
                  {errors.propertyId}
                </p>
              )}
            </section>

            {/* Título */}
            <section className="quickview-section">
              <label
                htmlFor="title"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Título <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="title"
                type="text"
                className="btn btn-secondary"
                style={{ width: "100%", textAlign: "left" }}
                placeholder="Ej: Contrato de compraventa"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                maxLength={120}
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "4px",
                  }}
                >
                  <AlertCircle size={14} style={{ marginRight: "4px" }} />
                  {errors.title}
                </p>
              )}
            </section>

            {/* Descripción */}
            <section className="quickview-section">
              <label
                htmlFor="description"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  textAlign: "left",
                  minHeight: "80px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                placeholder="Describe brevemente el contenido del documento..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                maxLength={400}
              />
              <p
                style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}
              >
                {formData.description.length}/400 caracteres
              </p>
            </section>

            {/* Fechas */}
            <section className="quickview-section">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    htmlFor="issuedDate"
                    style={{
                      display: "block",
                      fontWeight: 500,
                      marginBottom: "8px",
                    }}
                  >
                    Fecha de emisión
                  </label>
                  <input
                    id="issuedDate"
                    type="date"
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                    value={formData.issuedDate}
                    onChange={(e) => handleChange("issuedDate", e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="expirationDate"
                    style={{
                      display: "block",
                      fontWeight: 500,
                      marginBottom: "8px",
                    }}
                  >
                    Vencimiento
                  </label>
                  <input
                    id="expirationDate"
                    type="date"
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                    value={formData.expirationDate}
                    onChange={(e) =>
                      handleChange("expirationDate", e.target.value)
                    }
                    aria-invalid={!!errors.expirationDate}
                  />
                  {errors.expirationDate && (
                    <p
                      style={{
                        color: "#dc2626",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {errors.expirationDate}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Archivo */}
            <section className="quickview-section">
              <label
                htmlFor="file"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Archivo <span style={{ color: "#dc2626" }}>*</span>
              </label>

              <div
                style={{
                  border: "2px dashed #e5e7eb",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  background: "#fafbfc",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#295dff";
                  e.currentTarget.style.background = "#f0f5ff";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#fafbfc";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#fafbfc";
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    setFormData((prev) => ({ ...prev, file }));
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />

                {formData.file ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={32} style={{ color: "#295dff" }} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 500, color: "#111827" }}>
                        {formData.file.name}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>
                        {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload
                      size={32}
                      style={{ color: "#9ca3af", margin: "0 auto 8px" }}
                    />
                    <p style={{ fontWeight: 500, marginBottom: "4px" }}>
                      Arrastra un archivo o haz clic para seleccionar
                    </p>
                    <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                      PDF, JPG, PNG • Máx. 10 MB
                    </p>
                  </>
                )}
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#e5e7eb",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: "100%",
                        background: "#295dff",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Subiendo... {uploadProgress}%
                  </p>
                </div>
              )}

              {errors.file && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "8px",
                  }}
                >
                  <AlertCircle size={14} style={{ marginRight: "4px" }} />
                  {errors.file}
                </p>
              )}
            </section>

            {/* Privacidad note */}
            <section className="quickview-section">
              <div
                style={{
                  padding: "12px 16px",
                  background: "#f0f5ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "12px",
                }}
              >
                <AlertCircle
                  size={18}
                  style={{ color: "#2563eb", flexShrink: 0 }}
                />
                <div style={{ fontSize: "13px", color: "#1e40af" }}>
                  Los documentos se almacenan en el bucket privado de forma
                  segura
                </div>
              </div>
            </section>

            {/* Botones */}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 1, gap: "8px" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
