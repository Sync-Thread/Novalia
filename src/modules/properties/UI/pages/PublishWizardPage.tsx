// Wizard moderno para publicar propiedades. Mantener la logica de negocio intacta.
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PropertiesProvider } from "../containers/PropertiesProvider";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import AmenityChips, {
  DEFAULT_AMENITY_GROUPS,
} from "../components/AmenityChips";
import MediaDropzone from "../components/MediaDropzone";
import DocumentCard from "../components/DocumentCard";
import DesignBanner from "../utils/DesignBanner";
import { formatVerification } from "../utils/format";
import {
  isGeolocationSupported,
  getCurrentPosition,
} from "../utils/geolocation";
import type { Coords } from "../utils/geolocation";
import type { MediaDTO } from "../../application/dto/MediaDTO";
import type {
  DocumentDTO,
  DocumentTypeDTO,
  VerificationStatusDTO,
} from "../../application/dto/DocumentDTO";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { Currency, PropertyType } from "../../domain/enums";
import {
  CURRENCY_VALUES,
  PROPERTY_TYPE,
  PROPERTY_TYPE_VALUES,
} from "../../domain/enums";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { uploadFile } from "../../infrastructure/adapters/MediaStorage";
import { supabase } from "../../../../core/supabase/client";
import { SupabaseMediaStorage } from "../../infrastructure/adapters/SupabaseMediaStorage";
import { SupabaseAuthService } from "../../infrastructure/adapters/SupabaseAuthService";
import { descargarCoordenadasDePropiedad } from "../utils/downloadscoords";

// Instanciar el mediaStorage
const authService = new SupabaseAuthService({ client: supabase });
const mediaStorage = new SupabaseMediaStorage({ supabase, authService });

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  office: "Oficina",
  commercial: "Comercial",
  industrial: "Industrial",
  other: "Otro",
} as const;

const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPE_VALUES.map((value) => ({
  value,
  label: PROPERTY_TYPE_LABELS[value],
}));

interface DraftForm {
  propertyId: string | null;
  title: string;
  propertyType: PropertyType;
  priceAmount: number;
  priceCurrency: Currency;
  city: string;
  state: string;
  description: string;
  amenities: string[];
  amenitiesExtra: string;
}

const INITIAL_FORM: DraftForm = {
  propertyId: null,
  title: "",
  propertyType: PROPERTY_TYPE.House,
  priceAmount: 0,
  priceCurrency: "MXN",
  city: "",
  state: "",
  description: "",
  amenities: [],
  amenitiesExtra: "",
};

export default function PublishWizardPage() {
  return (
    <PropertiesProvider>
      <PublishWizard />
    </PropertiesProvider>
  );
}

function PublishWizard() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const editingId = params.id ?? null;
  const isEditing = Boolean(editingId);
  const [searchParams] = useSearchParams();
  const {
    createProperty,
    updateProperty,
    publishProperty,
    getProperty,
    uploadMedia,
    removeMedia,
    setCoverMedia,
    reorderMedia,
    attachDocumentAction,
    deleteDocument,
    verifyRpp,
    listDocuments,
  } = usePropertiesActions();

  const [form, setForm] = useState<DraftForm>(INITIAL_FORM);
  const [mediaItems, setMediaItems] = useState<MediaDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [propertyStatus, setPropertyStatus] = useState<PropertyDTO["status"] | null>(null);
  const [propertyCompleteness, setPropertyCompleteness] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<Coords | null>(null);
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const isEditingDraft = isEditing && propertyStatus === "draft";

  // const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    console.log("use effect ...");

    if (!mapRef.current) return;

    const defaultLat = 22.2981865;
    const defaultLng = -97.8606072;

    // Crear mapa sólo 1 vez
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView(
        [defaultLat, defaultLng],
        16
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(leafletMap.current);

      // Crear marker draggable en la posición por defecto
      markerRef.current = L.marker([defaultLat, defaultLng], {
        draggable: true,
      })
        .addTo(leafletMap.current)
        .bindPopup("Marcador (arrástrame)")
        .openPopup();

      // evento al terminar de arrastrar: actualiza estado
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
      });

      // guardar coords iniciales en el estado
      setCoords({ lat: defaultLat, lng: defaultLng });
      if (form.propertyId) {
        const coredenas = descargarCoordenadasDePropiedad(form.propertyId);
        console.log(form.propertyId);

        console.log("coords :;;;; ", coredenas);
      }
    }

    // cleanup al desmontar
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, [currentStep]);

  // función que llamarás cuando quieras obtener la ubicación real
  const getLocation = async () => {
    try {
      // tu getCurrentPosition debe devolver { lat, lng } o similar
      const position = await getCurrentPosition();
      const lat = position.lat;
      const lng = position.lng;

      setCoords({ lat, lng });

      // mover marker si existe, si no, crearlo
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.openPopup();
      } else if (leafletMap.current) {
        markerRef.current = L.marker([lat, lng], { draggable: true })
          .addTo(leafletMap.current)
          .bindPopup("Marcador (arrástrame)")
          .openPopup();

        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          setCoords({ lat: pos.lat, lng: pos.lng });
        });
      }

      // centrar mapa en la nueva posición
      leafletMap.current?.setView([lat, lng], 16);
    } catch (error) {
      console.error("Error obteniendo ubicación:", error);
    }
  };

  useEffect(() => {
    if (editingId) return;
    setForm(() => ({ ...INITIAL_FORM }));
    setMediaItems([]);
    setDocuments([]);
    setPropertyStatus(null);
    setPropertyCompleteness(null);
    setCoords(null);
  }, [editingId]);
  useEffect(() => {
    if (!editingId) return;
    let active = true;
    const load = async () => {
      const result = await getProperty(editingId);
      if (!active) return;
      if (result.isOk()) {
        const data = result.value;
        setForm((prev) => ({
          ...prev,
          propertyId: data.id,
          title: data.title ?? "",
          description: data.description ?? "",
          propertyType: data.propertyType,
          priceAmount: data.price.amount,
          priceCurrency: data.price.currency,
          city: data.address.city ?? "",
          state: data.address.state ?? "",
          amenities: data.amenities ?? [],
          amenitiesExtra: data.amenitiesExtra ?? "",
        }));
        setPropertyStatus(data.status);
        setPropertyCompleteness(
          typeof data.completenessScore === "number" ? data.completenessScore : null,
        );
        if (data.location) {
          setCoords({ lat: data.location.lat, lng: data.location.lng });
        }
        const docs = await listDocuments(data.id);
        if (active && docs.isOk()) {
          setDocuments(docs.value);
        }
        const media = (data as unknown as { media?: MediaDTO[] }).media;
        setMediaItems(media ?? []);
      } else {
        setMessage("No pudimos cargar los datos de la propiedad.");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [editingId, getProperty, listDocuments]);

  const buildDraftPayload = () => ({
    title: form.title.trim() || "Propiedad sin titulo",
    description: form.description.trim() || null,
    propertyType: form.propertyType,
    price: {
      amount: Math.max(1, form.priceAmount),
      currency: form.priceCurrency,
    },
    operationType: "sale" as const,
    address: {
      city: form.city.trim() || "Por definir",
      state: form.state.trim() || "Por definir",
      country: "MX",
      displayAddress: true,
    },
    amenities: form.amenities,
    amenitiesExtra: form.amenitiesExtra.trim() || null,
    location: coords ? { lat: coords.lat, lng: coords.lng } : null,
  });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const payload = buildDraftPayload();

    if (!form.propertyId) {
      console.log('antes de "crear"');

      const result = await createProperty(payload);
      console.log("despues de crear, mas result");
      console.log(result);

      if (result.isOk()) {
        const id = result.value.id;
        setForm((prev) => ({ ...prev, propertyId: id }));
        await refreshDocs(id);
        setMessage("Borrador guardado.");
      } else {
        setMessage("No pudimos guardar el borrador.");
      }
    } else {
      const result = await updateProperty({
        id: form.propertyId,
        patch: payload,
      });
      const success = result.isOk();
      setMessage(success ? "Borrador actualizado." : "No pudimos actualizar el borrador.");
      if (success && isEditing) {
        setSaving(false);
        navigate("/properties");
        return;
      }
    }
    setSaving(false);
  };

  const refreshDocs = async (propertyId: string) => {
    const result = await listDocuments(propertyId);
    if (result.isOk()) {
      setDocuments(result.value);
    }
  };

  const handlePublish = async () => {
    if (!form.propertyId) return;
    setMessage(null);

    if (isEditing && !isEditingDraft) {
      const updateResult = await updateProperty({
        id: form.propertyId,
        patch: buildDraftPayload(),
      });
      if (updateResult.isOk()) {
        navigate("/properties");
      } else {
        setMessage("No pudimos actualizar la propiedad.");
      }
      return;
    }

    if (isEditingDraft) {
      const updateResult = await updateProperty({
        id: form.propertyId,
        patch: buildDraftPayload(),
      });
      if (!updateResult.isOk()) {
        setMessage("No pudimos actualizar la propiedad.");
        return;
      }
    }

    const result = await publishProperty({ id: form.propertyId });
    if (result.isOk()) {
      navigate("/properties");
    } else {
      setMessage("No pudimos publicar la propiedad.");
    }
  };

  const handleUploadMedia = async (files: File[]) => {
    if (!form.propertyId) {
      setMessage("Guarda el borrador antes de subir media.");
      return;
    }

    // Procesar cada archivo
    for (const file of files) {
      const tempId = crypto.randomUUID();

      try {
        // 1. Crear URL local inmediatamente para preview
        const localUrl = URL.createObjectURL(file);

        // 2. Crear MediaDTO temporal con URL local
        const tempMedia: MediaDTO = {
          id: tempId,
          orgId: null,
          propertyId: form.propertyId,
          url: localUrl, // URL local temporal (blob:http://...)
          s3Key: null,
          type: file.type.startsWith("video/") ? "video" : "image",
          position: mediaItems.length,
          isCover: mediaItems.length === 0,
          metadata: {
            fileName: file.name,
            originalName: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploading: true, // Flag para indicar que está subiendo
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 3. Agregar inmediatamente al estado para preview
        setMediaItems((prev) => [...prev, tempMedia]);

        // 4. Subir a S3 en segundo plano
        const uploadResult = await uploadFile(file, "uploads", form.propertyId);

        if (uploadResult?.objectUrl) {
          console.log("Archivo subido a S3:", uploadResult);

          // 5. Guardar en la base de datos
          const dbResult = await mediaStorage.insertMediaFromS3({
            propertyId: form.propertyId,
            s3Key: uploadResult.key,
            url: uploadResult.objectUrl,
            type: file.type.startsWith("video/") ? "video" : "image",
            fileName: uploadResult.filename,
            contentType: uploadResult.contentType,
            size: uploadResult.size,
          });

          if (dbResult.isOk()) {
            const savedMedia = dbResult.value;
            console.log("Media guardado en BD:", savedMedia);

            // 6. Reemplazar el temporal con el real de la BD
            // setMediaItems((prev) =>
            //   prev.map((item) => (item.id === tempId ? savedMedia : item))
            // );

            // Liberar URL local
            URL.revokeObjectURL(localUrl);

            setMessage(`✅ ${file.name} subido correctamente`);
          } else {
            console.error("Error guardando en BD:", dbResult.error);
            setMessage(
              `⚠️ ${file.name} subido a S3 pero error guardando en BD`
            );

            // Mantener el preview local si falla la BD
            // setMediaItems((prev) =>
            //   prev.map((item) =>
            //     item.id === tempId
            //       ? {
            //           ...item,
            //           metadata: {
            //             ...item.metadata,
            //             uploading: false,
            //             error: "Error guardando en BD",
            //           },
            //         }
            //       : item
            //   )
            // );
          }
        }
      } catch (error) {
        console.error("Error subiendo archivo:", error);
        setMessage(
          `❌ Error al subir ${file.name}: ${error instanceof Error ? error.message : "Error desconocido"}`
        );

        // Remover el item temporal si falla
        setMediaItems((prev) => prev.filter((item) => item.id !== tempId));
      }
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await removeMedia({ propertyId: form.propertyId, mediaId });
    if (result.isOk()) setMediaItems(result.value);
  };

  const handleSetCover = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await setCoverMedia({
      propertyId: form.propertyId,
      mediaId,
    });
    if (result.isOk()) setMediaItems(result.value);
  };

  const handleReorder = async (order: string[]) => {
    if (!form.propertyId) return;
    const result = await reorderMedia({
      propertyId: form.propertyId,
      mediaIds: order,
    });
    if (result.isOk()) setMediaItems(result.value);
  };

  const handleAttachDocument = async (type: DocumentTypeDTO, file: File) => {
    if (!form.propertyId) {
      setMessage("Guarda el borrador antes de adjuntar documentos.");
      return;
    }
    const url = URL.createObjectURL(file);
    const result = await attachDocumentAction({
      propertyId: form.propertyId,
      docType: type,
      url,
      metadata: { fileName: file.name },
    });
    if (result.isOk()) await refreshDocs(form.propertyId);
  };

  const handleLocation = async () => {
    if (!isGeolocationSupported()) {
      setMessage(
        "Geolocalización no soportada en este navegador, mueve el pin al lugar correspondiente."
      );
      return;
    }
    try {
      getLocation();
      // const coords = await getCurrentPosition();
      // setCoords(coords);
      // setMessage("Ubicación actual establecida.");
    } catch (error) {
      setMessage(
        `No pudimos obtener tu ubicación: ${(error as Error).message}`
      );
    }
  };

  const deleteDoc = async (doc: DocumentDTO) => {
    const result = await deleteDocument(doc.id);
    if (result.isOk() && form.propertyId) await refreshDocs(form.propertyId);
  };

  const verifyDoc = async (doc: DocumentDTO, status: VerificationStatusDTO) => {
    if (!form.propertyId) return;
    const result = await verifyRpp({
      propertyId: form.propertyId,
      docId: doc.id,
      status,
    });
    if (result.isOk()) await refreshDocs(form.propertyId);
  };

  const findDoc = (type: DocumentTypeDTO) =>
    documents.find((doc) => doc.docType === type) ?? null;

  const steps = [
    { id: "basics", title: "Basicos", subtitle: "Datos clave" },
    { id: "location", title: "Ubicacion", subtitle: "Zona" },
    { id: "amenities", title: "Amenidades", subtitle: "Extras" },
    { id: "media", title: "Multimedia", subtitle: "Fotos" },
    { id: "publish", title: "Publicar", subtitle: "Revision" },
  ] as const;

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (!stepParam) return;
    const targetIndex = steps.findIndex((item) => item.id === stepParam);
    if (targetIndex >= 0) {
      setCurrentStep(targetIndex);
    }
  }, [searchParams]);

  const requirements = useMemo(() => {
    const rppDoc =
      documents.find((doc) => doc.docType === "rpp_certificate") ?? null;
    return [
      { label: "Titulo (Paso 1)", valid: form.title.trim().length > 0 },
      { label: "Tipo (Paso 1)", valid: form.propertyType.trim().length > 0 },
      { label: "Precio (Paso 1)", valid: form.priceAmount > 0 },
      { label: "Ciudad (Paso 2)", valid: form.city.trim().length > 0 },
      { label: "Estado (Paso 2)", valid: form.state.trim().length > 0 },
      {
        label: "Descripcion (Paso 1)",
        valid: form.description.trim().length > 0,
      },
      {
        label: "Amenidades (Paso 3)",
        valid:
          form.amenities.length > 0 || form.amenitiesExtra.trim().length > 0,
      },
      { label: "Fotos min. 1 (Paso 4)", valid: mediaItems.length > 0 },
      {
        label: "Documento RPP (Paso 5)",
        valid: Boolean(rppDoc && rppDoc.verification === "approved"),
      },
    ];
  }, [form, mediaItems, documents]);

  const completed = requirements.filter((item) => item.valid).length;
  const computedCompletion = Math.round((completed / requirements.length) * 100);
  const completion =
    isEditing && propertyCompleteness !== null
      ? Math.max(0, Math.min(100, Math.round(propertyCompleteness)))
      : computedCompletion;
  const missingItems = requirements
    .filter((item) => !item.valid)
    .map((item) => item.label);

  const goNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const goPrev = () => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const handleCancel = () => navigate("/properties");

  // Distribución a 2 columnas: igual a diseño de referencia. No tocar lógica.
  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case "basics":
        return (
          <div className="wizard-card form-section">
            <header className="wizard-card__header">
              <h2 className="wizard-card__title">Informacion basica</h2>
              <p className="wizard-card__subtitle">
                Define los datos principales de la propiedad.
              </p>
            </header>
            <div className="form-grid">
              <label className="wizard-field">
                <span className="wizard-field__label">Titulo *</span>
                <input
                  className="wizard-field__control"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Ej: Departamento moderno en Roma Norte"
                />
              </label>
              <label className="wizard-field">
                <span className="wizard-field__label">Tipo de propiedad *</span>
                <div className="select-control">
                  <select
                    className="select-control__native"
                    value={form.propertyType}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        propertyType: event.target.value as PropertyType,
                      }))
                    }
                  >
                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="wizard-field">
                <span className="wizard-field__label">Precio *</span>
                <input
                  className="wizard-field__control"
                  type="number"
                  min={0}
                  step="1"
                  inputMode="decimal"
                  value={form.priceAmount === 0 ? "" : form.priceAmount}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      priceAmount: raw === "" ? 0 : Number(raw),
                    }));
                  }}
                  placeholder="Ej: 2450000"
                />
              </label>
              <label className="wizard-field">
                <span className="wizard-field__label">Moneda</span>
                <div className="select-control">
                  <select
                    className="select-control__native"
                    value={form.priceCurrency}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        priceCurrency: event.target.value as Currency,
                      }))
                    }
                  >
                    {CURRENCY_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="wizard-field form-col-2">
                <span className="wizard-field__label">Descripcion *</span>
                <textarea
                  className="wizard-field__control wizard-field__control--textarea"
                  rows={6}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe caracteristicas, acabados y beneficios principales."
                />
              </label>
              <label className="wizard-field form-col-2">
                <span className="wizard-field__label">Notas adicionales</span>
                <input
                  className="wizard-field__control"
                  value={form.amenitiesExtra}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      amenitiesExtra: event.target.value,
                    }))
                  }
                  placeholder="Ej: Incluye mantenimiento, pet friendly..."
                />
              </label>
            </div>
          </div>
        );
      case "location":
        return (
          <div className="wizard-card form-section">
            <header className="wizard-card__header">
              <h2 className="wizard-card__title">Ubicacion</h2>
              <p className="wizard-card__subtitle">
                Indica donde se encuentra la propiedad.
              </p>
            </header>
            <div className="form-grid">
              <label className="wizard-field">
                <span className="wizard-field__label">Ciudad *</span>
                <input
                  className="wizard-field__control"
                  value={form.city}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                  placeholder="Ej: Ciudad de Mexico"
                />
              </label>
              <label className="wizard-field">
                <span className="wizard-field__label">Estado *</span>
                <input
                  className="wizard-field__control"
                  value={form.state}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                  placeholder="Ej: CDMX"
                />
              </label>
              <div className="wizard-map form-col-2">
                <p style={{ marginBottom: "12px", fontSize: "0.875rem" }}>
                  Selecciona una ubicacion aproximada para mostrar en el mapa.
                  Arrastra el marcador para ajustar.
                </p>
                <div
                  ref={mapRef}
                  id="map"
                  style={{
                    height: "400px",
                    width: "100%",
                    borderRadius: "8px",
                    marginBottom: "12px",
                    border: "1px solid #e0e0e0",
                    position: "relative",
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={handleLocation}
                    type="button"
                    className="btn btn-outline btn-sm"
                  >
                    📍 Usar mi ubicacion
                  </button>
                  {coords && (
                    <span style={{ fontSize: "0.875rem", color: "#666" }}>
                      Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case "amenities":
        return (
          <div className="wizard-card form-section">
            <header className="wizard-card__header">
              <h2 className="wizard-card__title">Amenidades</h2>
              <p className="wizard-card__subtitle">
                Selecciona las comodidades clave.
              </p>
            </header>
            <div className="form-grid">
              <div className="form-col-2">
                <AmenityChips
                  groups={DEFAULT_AMENITY_GROUPS}
                  selected={form.amenities}
                  onChange={(next) =>
                    setForm((prev) => ({ ...prev, amenities: next }))
                  }
                  extraValue={form.amenitiesExtra}
                  onExtraChange={(value) =>
                    setForm((prev) => ({ ...prev, amenitiesExtra: value }))
                  }
                />
              </div>
            </div>
          </div>
        );
      case "media":
        return (
          <div className="wizard-card form-section">
            <header className="wizard-card__header">
              <h2 className="wizard-card__title">Galeria de medios</h2>
              <p className="wizard-card__subtitle">
                Agrega fotos y videos destacados.
              </p>
            </header>
            <div className="form-grid">
              <div className="form-col-2">
                <MediaDropzone
                  items={mediaItems}
                  onUpload={handleUploadMedia}
                  onRemove={handleRemoveMedia}
                  onSetCover={handleSetCover}
                  onReorder={handleReorder}
                />
              </div>
            </div>
          </div>
        );
      case "publish":
        return (
          <div className="wizard-card form-section">
            <header className="wizard-card__header">
              <h2 className="wizard-card__title">Documentos y publicacion</h2>
              <p className="wizard-card__subtitle">
                Revisa los documentos antes de publicar.
              </p>
            </header>
            <div className="form-grid">
              <div className="wizard-docs form-col-2">
                {(
                  ["rpp_certificate", "deed", "id_doc"] as DocumentTypeDTO[]
                ).map((type) => (
                  <DocumentCard
                    key={type}
                    docType={type}
                    document={findDoc(type)}
                    onUpload={(file) => handleAttachDocument(type, file)}
                    onDelete={() => {
                      const doc = findDoc(type);
                      if (doc) deleteDoc(doc);
                    }}
                    onVerify={(status) => {
                      const doc = findDoc(type);
                      if (doc) verifyDoc(doc, status);
                    }}
                    allowVerification={type === "rpp_certificate"}
                  />
                ))}
              </div>
              <span className="wizard-note form-col-2">
                Estado del RPP:{" "}
                {formatVerification(
                  findDoc("rpp_certificate")?.verification ?? "pending"
                )}
              </span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="wizard app-container">
      <DesignBanner
        note="Sigue los pasos para completar tu anuncio. Guarda avances en cualquier momento."
        storageKey="properties-wizard-modern"
      />

      <header className="wizard__header">
        <div>
          <h1 className="wizard__title">
            {isEditing ? "Actualizar propiedad" : "Publicar propiedad"}
          </h1>
          <p className="wizard__subtitle">
            {isEditing
              ? "Revisa y ajusta los datos antes de actualizar tu propiedad."
              : "Completa los pasos para publicar tu propiedad."}
          </p>
        </div>
        <div className="wizard__stepper" role="list">
          {steps.map((step, index) => {
            const state =
              index === currentStep
                ? "current"
                : index < currentStep
                  ? "done"
                  : "upcoming";
            return (
              <div
                key={step.id}
                className={`wizard__step wizard__step--${state}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                <div className="wizard__step-circle">
                  {state === "done" ? "\u2713" : String(index + 1)}
                </div>
                <div className="wizard__step-text">
                  <span>{step.title}</span>
                  <small>{step.subtitle}</small>
                </div>
                {index < steps.length - 1 && (
                  <span className="wizard__step-line" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </header>

      <div className="wizard__layout">
        <section className="wizard__main">{renderStepContent()}</section>

        <aside className="wizard__aside">
          <div className="wizard-summary wizard-summary--alert">
            <strong>Verificacion KYC requerida</strong>
            <p>Para publicar propiedades necesitas tu KYC (INE) verificado.</p>
            <button type="button" className="btn btn-primary btn-sm">
              Verificar ahora
            </button>
          </div>

          <div className="wizard-summary">
            <ProgressCircle value={completion} />
            <div className="wizard-summary__text">
              <h3>Completitud</h3>
              <p>Completa todos los pasos para habilitar la publicacion.</p>
            </div>
          </div>

          <div className="wizard-summary">
            <h3 className="wizard-summary__title">Campos faltantes</h3>
            {missingItems.length === 0 ? (
              <p className="wizard-summary__empty">
                {isEditing
                  ? "Todo listo para actualizar."
                  : "Todo listo para publicar."}
              </p>
            ) : (
              <ul className="wizard-summary__list">
                {missingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <footer
        className="wizard__actions"
        style={{ position: "relative", zIndex: 10 }}
      >
        <button
          type="button"
          className="btn btn-outline"
          onClick={currentStep === 0 ? handleCancel : goPrev}
        >
          {currentStep === 0 ? "Cancelar" : "Anterior"}
        </button>
        <div className="wizard__actions-spacer" />
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar borrador"}
        </button>
        {currentStep < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={goNext}>
            Continuar &gt;
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={!form.propertyId}
          >
            {isEditingDraft
              ? "Publicar propiedad"
              : isEditing
              ? "Actualizar propiedad"
              : "Publicar propiedad"}
          </button>
        )}
      </footer>

      {message && <p className="wizard__message">{message}</p>}
    </main>
  );
}

function ProgressCircle({ value }: { value: number }) {
  const normalized = Math.min(100, Math.max(0, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="wizard-progress" aria-label={`Completitud ${normalized}%`}>
      <svg className="wizard-progress__svg" viewBox="0 0 100 100">
        <circle className="wizard-progress__track" cx="50" cy="50" r={radius} />
        <circle
          className="wizard-progress__bar"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="wizard-progress__value">{normalized}%</span>
    </div>
  );
}
