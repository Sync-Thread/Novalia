import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  User,
} from "lucide-react";
import {
  getPresignedUrlForDisplay,
  uploadFile,
} from "../../../properties/infrastructure/adapters/MediaStorage";
import { supabase } from "../../../../core/supabase/client";
import { useContractsActions } from "../hooks/useContractsActions";
import { CustomSelect } from "../../../properties/UI/components/CustomSelect";

/** Calcula SHA-256 de un archivo */
async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Tipos de contrato disponibles (basados en contract_type_enum) */
const DOCUMENT_TYPES = [
  { value: "", label: "Selecciona un tipo" },
  { value: "intermediacion", label: "Intermediación (2%)" },
  { value: "oferta", label: "Oferta de Compra" },
  { value: "promesa", label: "Promesa de Compraventa" },
];

interface PropertyOption {
  id: string;
  name: string;
  folio: string;
  s3Key?: string;
  address: string;
}

interface ClientOption {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
}

interface FormData {
  documentType: string;
  propertyId: string;
  clientId: string;
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
}: NewDocumentQuickViewProps) {
  // Inicializar fecha de emisión con fecha actual del dispositivo
  const today = new Date().toISOString().split("T")[0];

  // Hook de acciones del módulo contracts
  const {
    loading: contractsLoading,
    listPropertiesForSelector,
    listClientsForSelector,
  } = useContractsActions();

  const [formData, setFormData] = useState<FormData>({
    documentType: "",
    propertyId: "",
    clientId: "",
    title: "",
    description: "",
    issuedDate: today,
    expirationDate: "",
    file: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [propertyPreviews, setPropertyPreviews] = useState<
    Record<string, string>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const propertySearchRef = useRef<HTMLInputElement>(null);
  const clientSearchRef = useRef<HTMLInputElement>(null);

  /** Cerrar al presionar Escape */
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

  /** Cargar todas las propiedades usando el use case */
  const loadAllProperties = useCallback(async () => {
    const result = await listPropertiesForSelector({
      pageSize: 100,
    });

    if (result) {
      const mappedProperties: PropertyOption[] = result.items.map((prop) => {
        const addressParts = [prop.neighborhood, prop.city, prop.state].filter(
          Boolean
        );

        return {
          id: prop.id,
          name: prop.title,
          folio: prop.internalId || "Sin folio",
          address:
            addressParts.length > 0
              ? addressParts.join(", ")
              : prop.addressLine || "Sin dirección",
          s3Key: prop.coverImageS3Key || undefined,
        };
      });

      setPropertyOptions(mappedProperties);

      // Cargar previews de imágenes
      mappedProperties.forEach(async (prop) => {
        if (prop.s3Key) {
          try {
            const previewUrl = await getPresignedUrlForDisplay(prop.s3Key);
            setPropertyPreviews((prev) => ({ ...prev, [prop.id]: previewUrl }));
          } catch (error) {
            console.error(
              "Error cargando preview de propiedad:",
              prop.id,
              error
            );
          }
        }
      });
    } else {
      setPropertyOptions([]);
    }
  }, [listPropertiesForSelector]);

  /** Filtrar propiedades localmente */
  const filteredProperties = propertyOptions.filter(
    (p) =>
      !propertySearch.trim() ||
      p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.folio.toLowerCase().includes(propertySearch.toLowerCase())
  );

  /** Cargar clientes usando el use case */
  const loadAllClients = useCallback(async () => {
    console.log("🔍 Cargando clientes con propertyId:", formData.propertyId);

    // Si hay propiedad seleccionada, cargar solo clientes interesados
    // Si NO hay propiedad, cargar todos los contactos
    const result = await listClientsForSelector({
      pageSize: 200,
      propertyId: formData.propertyId || undefined,
    });

    console.log("📊 Resultado de clientes:", result);

    if (result) {
      const mappedClients: ClientOption[] = result.map((client) => ({
        id: client.id,
        fullName: client.fullName || "Sin nombre",
        email: client.email || undefined,
        phone: client.phone || undefined,
      }));

      console.log("✅ Clientes mapeados:", mappedClients.length);
      setClientOptions(mappedClients);
    } else {
      setClientOptions([]);
    }
  }, [listClientsForSelector, formData.propertyId]);

  /** Filtrar clientes localmente */
  const filteredClients = clientOptions.filter(
    (c) =>
      !clientSearch.trim() ||
      c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone?.includes(clientSearch.trim())
  );

  /** Cargar propiedades y clientes al abrir */
  useEffect(() => {
    if (open) {
      loadAllProperties();
      loadAllClients();
    }
  }, [open, loadAllProperties, loadAllClients]);

  /** Recargar clientes cuando cambie la propiedad seleccionada */
  useEffect(() => {
    if (open && formData.propertyId) {
      loadAllClients();
      // Limpiar cliente seleccionado al cambiar de propiedad
      setFormData((prev) => ({ ...prev, clientId: "" }));
      setClientSearch("");
    }
  }, [formData.propertyId, open, loadAllClients]);

  /** Auto-resize del textarea cuando cambia el contenido */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [formData.description]);

  /** Validación del formulario */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.documentType) {
      newErrors.documentType = "Selecciona un tipo de contrato";
    }

    // Propiedad es opcional - puede ser una plantilla sin propiedad
    // if (!formData.propertyId) {
    //   newErrors.propertyId = "Selecciona una propiedad";
    // }

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

  /** Manejo de selección de archivo */
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

  /** Manejo de selección de propiedad */
  const handlePropertySelect = useCallback((property: PropertyOption) => {
    setFormData((prev) => ({ ...prev, propertyId: property.id }));
    setPropertySearch(property.name);
    setShowPropertyDropdown(false);
    setErrors((prev) => ({ ...prev, propertyId: undefined }));
  }, []);

  /** Manejo del envío del formulario */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setLoading(true);
      setUploadProgress(0);

      try {
        if (!formData.file) {
          throw new Error("No file selected");
        }

        // 1. Calcular hash SHA-256 del archivo
        setUploadProgress(10);
        const fileHash = await calculateSHA256(formData.file);

        // 2. Subir archivo a S3 privado
        setUploadProgress(30);
        const uploadResult = await uploadFile(
          formData.file,
          "contracts", // folder en S3
          null
        );

        if (!uploadResult || !uploadResult.key) {
          throw new Error("Upload failed - no key returned");
        }

        setUploadProgress(60);

        // 3. Obtener orgId del usuario actual
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        const orgId = profile?.org_id || null;

        // 4. Crear registro en tabla contracts
        setUploadProgress(80);
        const { data: contract, error: insertError } = await supabase
          .from("contracts")
          .insert({
            org_id: orgId, // Puede ser null para usuarios sin org
            user_id: user.id, // Usuario creador del contrato
            property_id: formData.propertyId || null,
            client_contact_id: formData.clientId || null,
            contract_type: formData.documentType, // 'intermediacion' | 'oferta' | 'promesa'
            status: "draft",
            is_template: false, // Es un contrato real, no una plantilla
            title: formData.title,
            description: formData.description || null,
            issued_on: formData.issuedDate,
            due_on: formData.expirationDate || null,
            s3_key: uploadResult.key,
            hash_sha256: fileHash,
            metadata: {
              fileName: formData.file.name,
              contentType: formData.file.type,
              size: formData.file.size,
              uploadedAt: new Date().toISOString(),
            },
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Error inserting contract:", insertError);
          throw new Error(`Failed to create contract: ${insertError.message}`);
        }

        setUploadProgress(100);

        if (onSuccess && contract) {
          onSuccess(contract.id);
        }

        // Reset form
        setFormData({
          documentType: "",
          propertyId: "",
          clientId: "",
          title: "",
          description: "",
          issuedDate: today,
          expirationDate: "",
          file: null,
        });
        setPropertySearch("");
        setClientSearch("");
        setErrors({});

        onClose();
      } catch (error) {
        console.error("Error creating contract:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al subir el documento. Intenta nuevamente.";
        setErrors({
          file: errorMessage,
        });
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
    },
    [formData, validateForm, onSuccess, onClose, today]
  );

  /** Cambio de campos del formulario */
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
      {/* Backdrop */}
      <div
        role="presentation"
        className="quickview-scrim"
        onClick={onClose}
        style={{ cursor: "pointer" }}
      />

      {/* Panel lateral */}
      <aside
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-document-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          boxShadow: "0 0 30px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Header con título y botón de cierre alineados */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id="new-document-title"
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: "#111827",
                lineHeight: 1.2,
              }}
              tabIndex={-1}
            >
              Nuevo Documento
            </h2>
            <p
              className="muted"
              style={{
                fontSize: "13px",
                marginTop: "4px",
                color: "#6b7280",
                lineHeight: 1.4,
              }}
            >
              Los documentos se almacenan de forma privada y segura
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              marginLeft: "16px",
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </header>

        {/* Body con scroll */}
        <div
          className="sheet-body"
          style={{
            padding: "24px",
            overflowY: "auto",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* Tipo de documento */}
            <div>
              <label
                htmlFor="documentType"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                Tipo de documento <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  border: `1px solid ${errors.documentType ? "#dc2626" : "rgba(148, 163, 184, 0.45)"}`,
                  borderRadius: "12px",
                  background: "#ffffff",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  overflow: "visible",
                }}
                onMouseEnter={(e) => {
                  if (!errors.documentType) {
                    e.currentTarget.style.borderColor =
                      "rgba(41, 93, 255, 0.35)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(41, 93, 255, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!errors.documentType) {
                    e.currentTarget.style.borderColor =
                      "rgba(148, 163, 184, 0.45)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <CustomSelect
                  value={formData.documentType}
                  options={DOCUMENT_TYPES}
                  onChange={(value) => handleChange("documentType", value)}
                  disabled={false}
                  placeholder="Selecciona un tipo"
                  ariaLabel="Tipo de documento"
                  ariaDescribedBy={
                    errors.documentType ? "documentType-error" : undefined
                  }
                />
              </div>
              {errors.documentType && (
                <p
                  id="documentType-error"
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertCircle size={14} />
                  {errors.documentType}
                </p>
              )}
            </div>

            {/* Propiedad asociada */}
            <div>
              <label
                htmlFor="propertySearch"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                Propiedad asociada (opcional)
              </label>
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
                    zIndex: 1,
                  }}
                />
                <input
                  ref={propertySearchRef}
                  id="propertySearch"
                  type="text"
                  placeholder="Buscar por nombre o folio..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  onFocus={() => setShowPropertyDropdown(true)}
                  aria-invalid={!!errors.propertyId}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px 0 40px",
                    border: `1px solid ${errors.propertyId ? "#dc2626" : "rgba(148, 163, 184, 0.45)"}`,
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    color: "#111827",
                    background: "#ffffff",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onFocusCapture={(e) => {
                    e.target.style.borderColor = "#295dff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(41, 93, 255, 0.18)";
                  }}
                  onBlurCapture={(e) => {
                    setTimeout(() => {
                      setShowPropertyDropdown(false);
                      e.target.style.borderColor = errors.propertyId
                        ? "#dc2626"
                        : "rgba(148, 163, 184, 0.45)";
                      e.target.style.boxShadow = "none";
                    }, 200);
                  }}
                />

                {/* Dropdown de propiedades */}
                {showPropertyDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      maxHeight: "240px",
                      overflowY: "auto",
                      zIndex: 1000,
                    }}
                  >
                    {contractsLoading.properties ? (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "#6b7280",
                        }}
                      >
                        <Loader2
                          size={20}
                          className="animate-spin"
                          style={{ margin: "0 auto" }}
                        />
                      </div>
                    ) : filteredProperties.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          color: "#9ca3af",
                          textAlign: "center",
                          fontSize: "14px",
                        }}
                      >
                        No se encontraron propiedades
                      </div>
                    ) : (
                      filteredProperties.map((property) => (
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
                            transition: "background 0.15s ease",
                            borderRadius: "8px",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(41, 93, 255, 0.08)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          {propertyPreviews[property.id] ? (
                            <img
                              src={propertyPreviews[property.id]}
                              alt={property.name}
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                objectFit: "cover",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                background: "#f3f4f6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <FileText
                                size={20}
                                style={{ color: "#9ca3af" }}
                              />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 500,
                                color: "#111827",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: "14px",
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

              {/* Propiedad seleccionada */}
              {selectedProperty && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px",
                    background: "#f0f5ff",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  {propertyPreviews[selectedProperty.id] ? (
                    <img
                      src={propertyPreviews[selectedProperty.id]}
                      alt={selectedProperty.name}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        background: "#dbeafe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText size={16} style={{ color: "#3b82f6" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: "14px",
                        color: "#111827",
                      }}
                    >
                      {selectedProperty.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {selectedProperty.address}
                    </div>
                  </div>
                  <CheckCircle2
                    size={18}
                    style={{ color: "#16a34a", flexShrink: 0 }}
                  />
                </div>
              )}

              {errors.propertyId && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertCircle size={14} />
                  {errors.propertyId}
                </p>
              )}
            </div>

            {/* Cliente asociado (opcional) */}
            <div>
              <label
                htmlFor="clientSearch"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                Cliente asociado (opcional)
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={18}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
                <input
                  ref={clientSearchRef}
                  id="clientSearch"
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  onFocus={() => setShowClientDropdown(true)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px 0 40px",
                    border: "1px solid rgba(148, 163, 184, 0.45)",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    color: "#111827",
                    background: "#ffffff",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onFocusCapture={(e) => {
                    e.target.style.borderColor = "#295dff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(41, 93, 255, 0.18)";
                  }}
                  onBlurCapture={(e) => {
                    setTimeout(() => {
                      setShowClientDropdown(false);
                      e.target.style.borderColor = "rgba(148, 163, 184, 0.45)";
                      e.target.style.boxShadow = "none";
                    }, 200);
                  }}
                />

                {/* Dropdown de clientes */}
                {showClientDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      maxHeight: "240px",
                      overflowY: "auto",
                      zIndex: 1000,
                    }}
                  >
                    {contractsLoading.clients ? (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "#6b7280",
                        }}
                      >
                        <Loader2
                          size={20}
                          className="animate-spin"
                          style={{ margin: "0 auto" }}
                        />
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          color: "#9ca3af",
                          textAlign: "center",
                          fontSize: "14px",
                        }}
                      >
                        {formData.propertyId
                          ? "Sin clientes interesados en esta propiedad"
                          : "No se encontraron clientes"}
                      </div>
                    ) : (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              clientId: client.id,
                            }));
                            setClientSearch(client.fullName);
                            setShowClientDropdown(false);
                          }}
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
                            transition: "background 0.15s ease",
                            borderRadius: "8px",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(41, 93, 255, 0.08)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              fontWeight: 600,
                              fontSize: "16px",
                            }}
                          >
                            {client.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 500,
                                color: "#111827",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: "14px",
                              }}
                            >
                              {client.fullName}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginTop: "2px",
                              }}
                            >
                              {client.email || client.phone || "Sin contacto"}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Cliente seleccionado */}
              {formData.clientId &&
                (() => {
                  const selectedClient = clientOptions.find(
                    (c) => c.id === formData.clientId
                  );
                  return selectedClient ? (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "12px",
                        background: "#f0fdf4",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          fontWeight: 600,
                          fontSize: "14px",
                        }}
                      >
                        {selectedClient.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "#111827",
                          }}
                        >
                          {selectedClient.fullName}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {selectedClient.email ||
                            selectedClient.phone ||
                            "Sin contacto"}
                        </div>
                      </div>
                      <CheckCircle2
                        size={18}
                        style={{ color: "#16a34a", flexShrink: 0 }}
                      />
                    </div>
                  ) : null;
                })()}
            </div>

            {/* Título */}
            <div>
              <label
                htmlFor="title"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                Título <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="Ej: Contrato de compraventa"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                maxLength={120}
                aria-invalid={!!errors.title}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  border: `1px solid ${errors.title ? "#dc2626" : "rgba(148, 163, 184, 0.45)"}`,
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontFamily: "inherit",
                  color: "#111827",
                  background: "#ffffff",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#295dff";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(41, 93, 255, 0.18)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.title
                    ? "#dc2626"
                    : "rgba(148, 163, 184, 0.45)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {errors.title && (
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertCircle size={14} />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Descripción con auto-resize */}
            <div>
              <label
                htmlFor="description"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                Descripción (opcional)
              </label>
              <textarea
                ref={textareaRef}
                id="description"
                placeholder="Describe brevemente el contenido del documento..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                maxLength={400}
                rows={3}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "12px 14px",
                  border: "1px solid rgba(148, 163, 184, 0.45)",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontFamily: "inherit",
                  color: "#111827",
                  background: "#ffffff",
                  resize: "none",
                  overflow: "hidden",
                  lineHeight: 1.5,
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#295dff";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(41, 93, 255, 0.18)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(148, 163, 184, 0.45)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <p
                style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}
              >
                {formData.description.length}/400 caracteres
              </p>
            </div>

            {/* Fechas */}
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
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  Fecha de emisión
                </label>
                <input
                  id="issuedDate"
                  type="date"
                  value={formData.issuedDate}
                  onChange={(e) => handleChange("issuedDate", e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px",
                    border: "1px solid rgba(148, 163, 184, 0.45)",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    color: "#111827",
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#295dff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(41, 93, 255, 0.18)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(148, 163, 184, 0.45)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="expirationDate"
                  style={{
                    display: "block",
                    fontWeight: 500,
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  Vencimiento
                </label>
                <input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) =>
                    handleChange("expirationDate", e.target.value)
                  }
                  aria-invalid={!!errors.expirationDate}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px",
                    border: `1px solid ${errors.expirationDate ? "#dc2626" : "rgba(148, 163, 184, 0.45)"}`,
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    color: "#111827",
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#295dff";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(41, 93, 255, 0.18)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.expirationDate
                      ? "#dc2626"
                      : "rgba(148, 163, 184, 0.45)";
                    e.target.style.boxShadow = "none";
                  }}
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

            {/* Dropzone para archivo */}
            <div>
              <label
                htmlFor="file"
                style={{
                  display: "block",
                  fontWeight: 500,
                  marginBottom: "8px",
                  fontSize: "14px",
                  color: "#374151",
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
                  transition: "all 0.2s ease",
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
                      <div
                        style={{
                          fontWeight: 500,
                          color: "#111827",
                          fontSize: "14px",
                        }}
                      >
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
                    <p
                      style={{
                        fontWeight: 500,
                        marginBottom: "4px",
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      Arrastra un archivo o haz clic para seleccionar
                    </p>
                    <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                      PDF, JPG, PNG • Máx. 10 MB
                    </p>
                  </>
                )}
              </div>

              {/* Barra de progreso */}
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
                        transition: "width 0.3s ease",
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
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <AlertCircle size={14} />
                  {errors.file}
                </p>
              )}
            </div>

            {/* Nota de privacidad */}
            <div
              style={{
                padding: "12px 16px",
                background: "#f0f5ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <AlertCircle
                size={18}
                style={{ color: "#2563eb", flexShrink: 0, marginTop: "2px" }}
              />
              <div
                style={{ fontSize: "13px", color: "#1e40af", lineHeight: 1.5 }}
              >
                Los documentos se almacenan en el bucket privado de forma segura
              </div>
            </div>

            {/* Botones de acción */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                paddingTop: "8px",
                borderTop: "1px solid #f3f4f6",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{
                  flex: 1,
                  height: "44px",
                  borderRadius: "12px",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  flex: 1,
                  height: "44px",
                  borderRadius: "12px",
                  gap: "8px",
                }}
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
