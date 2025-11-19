import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { IContract } from "../../domain/entities/contractType";
import { getPresignedUrlForDisplay } from "../../../properties/infrastructure/adapters/MediaStorage";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  MapPin,
  PenTool,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  X,
  Send,
  MessageCircle,
  CheckCircle,
} from "lucide-react";
import { useContractsActions } from "../hooks/useContractsActions";
import { useContractDocuments } from "../hooks/useContractDocuments";
import { supabase } from "../../../../core/supabase/client";
import { useChatModule } from "../../../comunication/UI/contexts/ChatProvider";
import styles from "./ContractDetailSideSheet.module.css";

interface DetailSheetProps {
  contract: IContract | null;
  onClose: () => void;
  onDelete?: () => void; // Callback para notificar al padre que se eliminó
}

interface ClientOption {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  type: "profile" | "lead_contact";
}

const ContractDetailSideSheet: React.FC<DetailSheetProps> = ({
  contract,
  onClose,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { downloadContract, deleteContract, loading, listClientsForSelector } =
    useContractsActions();
  const [propertyPreview, setPropertyPreview] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null
  );
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [showThreadSelector, setShowThreadSelector] = useState(false);
  const [selectedDocumentForChat, setSelectedDocumentForChat] = useState<{
    fileName: string;
    s3Key: string;
    isMain: boolean;
  } | null>(null);
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [sendingToChat, setSendingToChat] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const clientSearchRef = useRef<HTMLInputElement>(null);
  
  // Fetch documents from contract_documents table
  const { documents: contractDocuments, loading: loadingDocuments } = useContractDocuments(contract?.id || null);
  
  // Chat module
  const { useCases } = useChatModule();

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      setCurrentUserId(userId);
    };
    void getCurrentUser();
  }, []);

  // Load available chat threads
  const loadChatThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const result = await useCases.listListerInbox.execute();
      if (result.isOk()) {
        // Flatten all threads from all groups
        const allThreads = result.value.groups.flatMap(group => group.threads);
        console.log('📋 Loaded threads:', allThreads.length, 'threads');
        console.log('🔍 Thread participants sample:', allThreads[0]?.participants);
        setChatThreads(allThreads);
      } else {
        console.error('Error loading threads:', result.error);
        setChatThreads([]);
      }
    } catch (error) {
      console.error('Error loading chat threads:', error);
      setChatThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [useCases]);

  // Cargar preview de la propiedad desde S3
  useEffect(() => {
    if (
      !contract?.propiedadImagenUrl ||
      contract.propiedadImagenUrl.startsWith("http")
    ) {
      return;
    }

    let active = true;

    const loadPropertyPreview = async () => {
      try {
        const previewUrl = await getPresignedUrlForDisplay(
          contract.propiedadImagenUrl
        );
        if (active) {
          setPropertyPreview(previewUrl);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug(
            "No se pudo cargar preview de propiedad:",
            contract.propiedadId,
            error
          );
        }
      }
    };

    loadPropertyPreview();

    return () => {
      active = false;
    };
  }, [contract?.propiedadImagenUrl, contract?.propiedadId]);

  // Liberar blob URL cuando cambie
  useEffect(() => {
    return () => {
      if (propertyPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(propertyPreview);
      }
    };
  }, [propertyPreview]);

  // Cargar clientes disponibles
  const loadClients = useCallback(async () => {
    if (!contract) return;

    setIsLoadingClients(true);
    try {
      const result = await listClientsForSelector({
        pageSize: 200,
        propertyId: contract.propiedadId || undefined,
      });

      if (result) {
        const mappedClients: ClientOption[] = result.map((client) => ({
          id: client.id,
          fullName: client.fullName || "Sin nombre",
          email: client.email || undefined,
          phone: client.phone || undefined,
          type: client.type || "lead_contact",
        }));

        setClientOptions(mappedClients);
      }
    } finally {
      setIsLoadingClients(false);
    }
  }, [listClientsForSelector, contract?.propiedadId, contract]);

  // Cargar clientes cuando se active el modo edición
  useEffect(() => {
    if (isEditingClient && contract) {
      loadClients();
    }
  }, [isEditingClient, loadClients, contract]);

  // Guardar cliente asociado
  const handleSaveClient = useCallback(async () => {
    if (!selectedClient || !contract) return;

    setIsSavingClient(true);
    try {
      const updateData: any = {};

      if (selectedClient.type === "profile") {
        updateData.client_profile_id = selectedClient.id;
        updateData.client_contact_id = null;
      } else {
        updateData.client_contact_id = selectedClient.id;
        updateData.client_profile_id = null;
      }

      const { error } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", contract.id);

      if (error) throw error;

      // Recargar la página o notificar el éxito
      window.location.reload();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      alert("Error al asociar el cliente. Intenta nuevamente.");
    } finally {
      setIsSavingClient(false);
    }
  }, [selectedClient, contract]);

  // Handle sending document to selected thread
  const handleSendDocumentToChat = useCallback(async (threadId: string) => {
    if (!selectedDocumentForChat) {
      console.error('❌ Missing document data');
      return;
    }

    console.log('📤 Starting document send...', {
      document: selectedDocumentForChat,
      threadId,
      contract: contract?.id,
    });

    setSendingToChat(true);
    setSelectedThreadId(threadId);

    try {
      // Get presigned URL for the document
      console.log('🔗 Getting presigned URL for:', selectedDocumentForChat.s3Key);
      const documentUrl = await getPresignedUrlForDisplay(selectedDocumentForChat.s3Key);
      console.log('✅ Presigned URL obtained:', documentUrl?.substring(0, 100) + '...');
      
      // Prepare message with document metadata
      const documentType = selectedDocumentForChat.isMain ? 'Contrato Principal' : 'Documento';
      const messageBody = `📄 ${documentType}: ${selectedDocumentForChat.fileName}`;
      
      console.log('📨 Sending message with payload...', {
        body: messageBody,
        threadId,
      });
      
      // Send message directly using use case
      const result = await useCases.sendMessage.execute({
        threadId,
        body: messageBody,
        payload: {
          type: 'document',
          fileName: selectedDocumentForChat.fileName,
          s3Key: selectedDocumentForChat.s3Key,
          documentUrl,
          contractId: contract?.id,
          contractProperty: contract?.propiedadNombre,
        },
      });

      if (result.isOk()) {
        console.log('✅ Document sent to chat successfully:', result.value);
        setSendingToChat(false);
        setSendSuccess(true);
        setTimeout(() => {
          setShowThreadSelector(false);
          setShowDocumentSelector(false);
          setSendSuccess(false);
          setSelectedDocumentForChat(null);
          setSelectedThreadId(null);
        }, 2000);
      } else {
        console.error('❌ Error sending message:', result.error);
        const errorMsg = typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Error al enviar el mensaje';
        alert(`Error al enviar documento: ${errorMsg}`);
        setSendingToChat(false);
      }
    } catch (error) {
      console.error('❌ Error sending document (catch):', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      alert('Error al enviar el documento');
      setSendingToChat(false);
    }
  }, [selectedDocumentForChat, useCases.sendMessage, contract]);

  if (!contract) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";

    if (dateString.includes("T")) {
      return new Date(dateString).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    const parts = dateString.split("/");
    if (parts.length !== 3) return dateString;

    const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getContractTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      Intermediacion: "Intermediación",
      Oferta: "Oferta de Compra",
      Promesa: "Promesa de Compraventa",
    };
    return types[type] || type;
  };

  const getStatusBadgeClass = (estado: string) => {
    const classes: Record<string, string> = {
      Firmado: styles.badgeSuccess,
      PendienteDeFirma: styles.badgeWarning,
      Vigente: styles.badgeInfo,
      Rechazado: styles.badgeError,
      Archivado: styles.badgeNeutral,
    };
    return classes[estado] || styles.badgeNeutral;
  };

  const getStatusLabel = (estado: string) => {
    if (estado === "PendienteDeFirma") return "Pendiente de Firma";
    return estado.replace(/([A-Z])/g, " $1").trim();
  };

  const hasFile = Boolean(contract.s3Key);
  const isChecklistComplete = contract.porcentajeCompletado === 100;
  // Checklist ya no bloquea la firma - solo necesitas tener el archivo PDF
  const canSign = hasFile && contract.estadoFirma === "PendienteDeFirma";
  const canDelete = ["PendienteDeFirma", "draft"].includes(
    contract.estadoFirma || ""
  );

  // Verificar estado del KYC del cliente desde el checklist
  const hasClient = Boolean(contract.contraparte);
  const kycCompleted =
    hasClient &&
    contract.checklist?.some(
      (item) =>
        item.tarea.toLowerCase().includes("kyc") &&
        item.tarea.toLowerCase().includes("cliente") &&
        item.completada
    );

  const handleDownload = () => {
    if (contract.s3Key) {
      const fileName =
        contract.metadata?.fileName || `contrato-${contract.id}.pdf`;
      downloadContract(contract.s3Key, fileName);
    }
  };

  const handleSign = () => {
    navigate(`/contracts/${contract.id}/sign`);
    onClose();
  };

  const handleDelete = async () => {
    if (!contract?.id) return;

    // Confirmar eliminación
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el contrato "${contract.propiedadNombre || "sin título"}"?\n\n` +
        `Esta acción no se puede deshacer. El archivo y todos los datos del contrato serán eliminados permanentemente.`
    );

    if (!confirmed) return;

    const success = await deleteContract(contract.id);

    if (success) {
      // Cerrar el panel
      onClose();
      // Notificar al padre para que recargue la lista
      if (onDelete) {
        onDelete();
      }
    } else {
      alert("Error al eliminar el contrato. Por favor, intenta nuevamente.");
    }
  };

  // Filtrar clientes localmente
  const filteredClients = clientOptions.filter(
    (c) =>
      !clientSearch.trim() ||
      c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone?.includes(clientSearch.trim())
  );

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.scrim} onClick={onClose} aria-label="Cerrar" />
      <aside
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-detail-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2 id="contract-detail-title" className={styles.title}>
              {contract.propiedadNombre || "Contrato"}
            </h2>
            <p className={styles.subtitle}>
              {getContractTypeLabel(contract.tipoContrato)} •{" "}
              {contract.contraparte || "Sin cliente"}
            </p>
            <div className={styles.badges}>
              <span
                className={`${styles.badge} ${getStatusBadgeClass(contract.estadoFirma)}`}
              >
                {getStatusLabel(contract.estadoFirma)}
              </span>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.scrollContent}>
          {/* Acciones principales */}
          <section className={styles.section}>
            {!hasFile ? (
              <div className={styles.uploadArea}>
                <Upload size={32} className={styles.uploadIcon} />
                <p className={styles.uploadTitle}>Subir archivo del contrato</p>
                <p className={styles.uploadSubtitle}>PDF, máximo 10MB</p>
                <button className={styles.btnPrimary}>
                  <Upload size={16} />
                  Seleccionar archivo
                </button>
              </div>
            ) : (
              <>
                <div className={styles.actions}>
                  <button
                    className={styles.btnSecondary}
                    onClick={handleDownload}
                    disabled={loading.download}
                    aria-label="Descargar contrato"
                  >
                    <Download size={16} />
                    {loading.download ? "Descargando..." : "Descargar"}
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleSign}
                    disabled={!canSign}
                    aria-label={
                      canSign
                        ? "Firmar"
                        : "Sube un archivo PDF para habilitar la firma"
                    }
                    title={
                      !canSign && !hasFile
                        ? "Sube un archivo PDF para habilitar la firma"
                        : undefined
                    }
                  >
                    <PenTool size={16} />
                    Firmar
                  </button>
                </div>
                <button
                  className={styles.btnSecondaryFull}
                  onClick={() => setShowDocumentSelector(true)}
                  disabled={!hasFile && contractDocuments.length === 0}
                  aria-label="Enviar documento por chat"
                  title={!hasFile && contractDocuments.length === 0 ? "No hay documentos para enviar" : "Seleccionar documento para enviar por chat"}
                >
                  <Send size={16} />
                  Enviar por chat
                </button>
              </>
            )}
          </section>

          {/* Expediente Digital */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Expediente Digital</h3>
              <button
                className={styles.btnLink}
                disabled
                title="Función disponible próximamente"
                aria-label="Agregar anexos (próximamente)"
              >
                <Plus size={14} />
                Agregar Anexos
              </button>
            </div>
            <div className={styles.documentsList}>
              {/* Contrato Principal */}
              {hasFile && (
                <div className={styles.documentItem}>
                  <div className={styles.previewIcon}>
                    <FileText size={32} />
                  </div>
                  <div className={styles.documentInfo}>
                    <p className={styles.documentName}>
                      {contract.metadata?.fileName ||
                        `contrato-${contract.id}.pdf`}
                      <span
                        className={`${styles.badge} ${styles.badgeInfo}`}
                        style={{ marginLeft: "8px" }}
                      >
                        Principal
                      </span>
                    </p>
                    <p className={styles.documentMeta}>
                      {formatFileSize(contract.metadata?.size)} • Actualizado:{" "}
                      {formatDate(contract.metadata?.uploadedAt)} • Verificado
                    </p>
                  </div>
                  <button
                    className={styles.btnIconSmall}
                    onClick={handleDownload}
                    disabled={loading.download}
                    aria-label="Descargar contrato principal"
                  >
                    <Download size={16} />
                  </button>
                </div>
              )}

              {/* Documentos adicionales desde contract_documents */}
              {loadingDocuments ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#6b7280" }}>
                  <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} />
                  <p style={{ marginTop: "8px", fontSize: "14px" }}>Cargando documentos...</p>
                </div>
              ) : contractDocuments.length > 0 ? (
                contractDocuments.map((doc) => (
                  <div key={doc.id} className={styles.documentItem}>
                    <div className={styles.previewIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.documentInfo}>
                      <p className={styles.documentName}>{doc.fileName}</p>
                      <p className={styles.documentMeta}>
                        {formatFileSize(doc.fileSize)} • Actualizado:{" "}
                        {formatDate(doc.uploadedAt)} • v{doc.version}
                      </p>
                    </div>
                    <button
                      className={styles.btnIconSmall}
                      onClick={async () => {
                        try {
                          const url = await getPresignedUrlForDisplay(doc.s3Key);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = doc.fileName;
                          link.click();
                        } catch (error) {
                          console.error('Error downloading document:', error);
                          alert('Error al descargar el documento');
                        }
                      }}
                      aria-label="Descargar documento"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))
              ) : null}

              {/* Empty state si no hay ningún documento */}
              {!hasFile && contractDocuments.length === 0 && (
                <p className={styles.emptyState}>
                  No hay documentos en el expediente
                </p>
              )}
            </div>
          </section>

          {/* Entidades vinculadas */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Entidades Vinculadas</h3>

            {/* Propiedad */}
            {contract.propiedadId ? (
              <div className={styles.entityCardHorizontal}>
                {propertyPreview ? (
                  <img
                    src={propertyPreview}
                    alt={contract.propiedadNombre}
                    className={styles.entityThumbnail}
                  />
                ) : contract.propiedadImagenUrl?.startsWith("http") ? (
                  <img
                    src={contract.propiedadImagenUrl}
                    alt={contract.propiedadNombre}
                    className={styles.entityThumbnail}
                  />
                ) : (
                  <div className={styles.entityThumbnailPlaceholder}>
                    <Building2 size={16} />
                  </div>
                )}
                <div className={styles.entityCardInfo}>
                  <div className={styles.entityCardName}>
                    {contract.propiedadNombre}
                  </div>
                  <div className={styles.entityCardMeta}>Propiedad</div>
                </div>
              </div>
            ) : (
              <div className={styles.entityCardEmpty}>
                <MapPin size={18} />
                <span>Sin propiedad asignada</span>
                <button className={styles.btnLink}>Asignar</button>
              </div>
            )}

            {/* Cliente/Contraparte */}
            {isEditingClient ? (
              <div className={styles.clientSelector}>
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
                    type="text"
                    placeholder="Buscar cliente por nombre, email o teléfono..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    onFocus={() => setShowClientDropdown(true)}
                    className={styles.clientSearchInput}
                    onBlur={() => {
                      setTimeout(() => setShowClientDropdown(false), 200);
                    }}
                  />

                  {/* Dropdown de clientes */}
                  {showClientDropdown && (
                    <div className={styles.clientDropdown}>
                      {isLoadingClients ? (
                        <div className={styles.clientDropdownEmpty}>
                          <Loader2
                            size={20}
                            className="animate-spin"
                            style={{ margin: "0 auto" }}
                          />
                          <span style={{ marginTop: "8px" }}>
                            Cargando clientes...
                          </span>
                        </div>
                      ) : clientOptions.length === 0 ? (
                        <div className={styles.clientDropdownEmpty}>
                          {contract.propiedadId
                            ? "Sin clientes interesados en esta propiedad"
                            : "No se encontraron clientes"}
                        </div>
                      ) : filteredClients.length === 0 ? (
                        <div className={styles.clientDropdownEmpty}>
                          No se encontraron resultados
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearch(client.fullName);
                              setShowClientDropdown(false);
                            }}
                            className={styles.clientDropdownItem}
                          >
                            <div className={styles.clientAvatar}>
                              {client.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.clientDropdownInfo}>
                              <div className={styles.clientDropdownName}>
                                {client.fullName}
                              </div>
                              <div className={styles.clientDropdownMeta}>
                                {client.email || client.phone || "Sin contacto"}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.clientSelectorActions}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      setIsEditingClient(false);
                      setClientSearch("");
                      setSelectedClient(null);
                    }}
                    disabled={isSavingClient}
                  >
                    Cancelar
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleSaveClient}
                    disabled={!selectedClient || isSavingClient}
                  >
                    {isSavingClient ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : contract.contraparte ? (
              <div className={styles.entityCardHorizontal}>
                <div className={styles.entityAvatar}>
                  {contract.contraparte.charAt(0).toUpperCase()}
                </div>
                <div className={styles.entityCardInfo}>
                  <div className={styles.entityCardName}>
                    {contract.contraparte}
                  </div>
                  <div className={styles.entityCardMeta}>Cliente</div>
                </div>
                <button
                  className={styles.btnIconSmall}
                  onClick={() => {
                    setIsEditingClient(true);
                    setClientSearch("");
                    setSelectedClient(null);
                  }}
                  title="Modificar cliente asociado"
                  aria-label="Modificar cliente asociado"
                >
                  <User size={16} />
                </button>
              </div>
            ) : (
              <div className={styles.entityCardEmpty}>
                <User size={18} />
                <span>Sin cliente asignado</span>
                <button
                  className={styles.btnLink}
                  onClick={() => setIsEditingClient(true)}
                >
                  Asignar
                </button>
              </div>
            )}
          </section>

          {/* Checklist */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Checklist de Requisitos</h3>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${contract.porcentajeCompletado}%` }}
                  role="progressbar"
                  aria-valuenow={contract.porcentajeCompletado}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <span className={styles.progressText}>
                {contract.porcentajeCompletado}% completado
              </span>
            </div>
            <ul className={styles.checklist}>
              <li className={styles.checklistItem}>
                <div className={styles.checklistIcon}>
                  {kycCompleted ? (
                    <CheckCircle2 size={18} className={styles.iconSuccess} />
                  ) : (
                    <Clock size={18} className={styles.iconPending} />
                  )}
                </div>
                <span className={styles.checklistLabel}>
                  KYC del cliente asociado
                </span>
              </li>
              <li className={styles.checklistItem}>
                <div className={styles.checklistIcon}>
                  <Clock size={18} className={styles.iconPending} />
                </div>
                <span className={styles.checklistLabel}>
                  Firma por parte del agente o inmobiliaria
                </span>
              </li>
              <li className={styles.checklistItem}>
                <div className={styles.checklistIcon}>
                  <Clock size={18} className={styles.iconPending} />
                </div>
                <span className={styles.checklistLabel}>
                  Firma por parte del cliente
                </span>
              </li>
            </ul>
          </section>

          {/* Información del Contrato */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Información del Contrato</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tipo</span>
                <span className={styles.infoValue}>
                  {getContractTypeLabel(contract.tipoContrato)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Plantilla</span>
                <span className={styles.infoValue}>—</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Emisión</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.fechaCreacion)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Vencimiento</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.vigencia)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Creado</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.fechaCreacion)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Actualizado</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.metadata?.uploadedAt)}
                </span>
              </div>
            </div>
          </section>

          {/* Zona de riesgo */}
          {canDelete && (
            <section className={styles.section}>
              <h3 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
                Zona de Riesgo
              </h3>

              {/* Duplicar contrato */}
              <div className={styles.actionZone}>
                <div>
                  <p className={styles.actionLabel}>Duplicar contrato</p>
                  <p className={styles.actionText}>
                    Crea una copia de este contrato con la misma información.
                  </p>
                </div>
                <button
                  className={styles.btnSecondary}
                  disabled
                  title="Función disponible próximamente"
                >
                  <Copy size={16} />
                  Duplicar
                </button>
              </div>

              {/* Eliminar contrato */}
              <div className={styles.dangerZone}>
                <div>
                  <p className={styles.dangerLabel}>Eliminar contrato</p>
                  <p className={styles.dangerText}>
                    Esta acción no se puede deshacer. El contrato será eliminado
                    permanentemente.
                  </p>
                </div>
                <button
                  className={styles.btnDanger}
                  onClick={handleDelete}
                  disabled={loading.delete}
                  aria-label="Eliminar contrato"
                >
                  <Trash2 size={16} />
                  {loading.delete ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </section>
          )}
        </div>
      </aside>

      {/* Document Selector Modal */}
      {showDocumentSelector && (
        <div className={styles.modalOverlay} onClick={() => setShowDocumentSelector(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Seleccionar documento para enviar</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setShowDocumentSelector(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Contrato Principal */}
              {hasFile && (
                <button
                  className={styles.documentSelectorItem}
                  onClick={() => {
                    setSelectedDocumentForChat({
                      fileName: contract.metadata?.fileName || `contrato-${contract.id}.pdf`,
                      s3Key: contract.s3Key!,
                      isMain: true,
                    });
                    setShowDocumentSelector(false);
                    setShowThreadSelector(true);
                    loadChatThreads();
                  }}
                >
                  <div className={styles.documentSelectorIcon}>
                    <FileText size={24} />
                  </div>
                  <div className={styles.documentSelectorInfo}>
                    <p className={styles.documentSelectorName}>
                      {contract.metadata?.fileName || `contrato-${contract.id}.pdf`}
                      <span className={`${styles.badge} ${styles.badgeInfo}`} style={{ marginLeft: "8px" }}>
                        Principal
                      </span>
                    </p>
                    <p className={styles.documentSelectorMeta}>
                      {formatFileSize(contract.metadata?.size)} • {formatDate(contract.metadata?.uploadedAt)}
                    </p>
                  </div>
                  <Send size={18} className={styles.documentSelectorSendIcon} />
                </button>
              )}

              {/* Additional documents */}
              {contractDocuments.map((doc) => (
                <button
                  key={doc.id}
                  className={styles.documentSelectorItem}
                  onClick={() => {
                    setSelectedDocumentForChat({
                      fileName: doc.fileName,
                      s3Key: doc.s3Key,
                      isMain: false,
                    });
                    setShowDocumentSelector(false);
                    setShowThreadSelector(true);
                    loadChatThreads();
                  }}
                >
                  <div className={styles.documentSelectorIcon}>
                    <FileText size={24} />
                  </div>
                  <div className={styles.documentSelectorInfo}>
                    <p className={styles.documentSelectorName}>{doc.fileName}</p>
                    <p className={styles.documentSelectorMeta}>
                      {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                  <Send size={18} className={styles.documentSelectorSendIcon} />
                </button>
              ))}

              {!hasFile && contractDocuments.length === 0 && (
                <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  <FileText size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
                  <p>No hay documentos disponibles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thread Selector Modal */}
      {showThreadSelector && selectedDocumentForChat && (
        <div className={styles.modalOverlay} onClick={() => !sendingToChat && setShowThreadSelector(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {sendSuccess ? '✅ Documento enviado' : 'Seleccionar conversación'}
              </h3>
              {!sendingToChat && !sendSuccess && (
                <button
                  className={styles.modalCloseBtn}
                  onClick={() => setShowThreadSelector(false)}
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className={styles.modalBody}>
              {sendSuccess ? (
                <div style={{ padding: "32px", textAlign: "center" }}>
                  <CheckCircle size={64} style={{ color: "#10b981", margin: "0 auto 16px" }} />
                  <p style={{ fontSize: "16px", fontWeight: 500, color: "#111827", marginBottom: "8px" }}>
                    Documento enviado correctamente
                  </p>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>
                    {selectedDocumentForChat.fileName}
                  </p>
                </div>
              ) : loadingThreads ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  <Loader2 size={40} className="animate-spin" style={{ margin: "0 auto 16px" }} />
                  <p>Cargando conversaciones...</p>
                </div>
              ) : chatThreads.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  <MessageCircle size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
                  <p>No hay conversaciones disponibles</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px", padding: "0 8px" }}>
                    Enviar "{selectedDocumentForChat.fileName}" a:
                  </p>
                  {chatThreads.map((thread) => {
                    // Find the other participant (not the current user)
                    const otherParticipant = currentUserId 
                      ? thread.participants.find((p: any) => p.id !== currentUserId)
                      : thread.participants.find((p: any) => p.type === 'contact') || thread.participants[0];
                    
                    // Use the already mapped displayName, with fallback to email or phone
                    const participantName = otherParticipant?.displayName 
                      || otherParticipant?.email 
                      || otherParticipant?.phone
                      || 'Usuario';
                    
                    const propertyName = thread.property?.title || 'Sin propiedad';
                    
                    return (
                      <button
                        key={thread.id}
                        className={styles.threadSelectorItem}
                        onClick={() => {
                          handleSendDocumentToChat(thread.id);
                        }}
                        disabled={sendingToChat}
                      >
                        <div className={styles.threadSelectorAvatar}>
                          {participantName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.threadSelectorInfo}>
                          <p className={styles.threadSelectorName}>{participantName}</p>
                          <p className={styles.threadSelectorMeta}>{propertyName}</p>
                        </div>
                        {sendingToChat && selectedThreadId === thread.id ? (
                          <Loader2 size={18} className="animate-spin" style={{ color: "#295dff" }} />
                        ) : (
                          <Send size={18} className={styles.threadSelectorSendIcon} />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDetailSideSheet;
