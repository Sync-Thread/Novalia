// Wizard moderno para publicar propiedades. Mantener la logica de negocio intacta.
import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PropertiesProvider } from "../../containers/PropertiesProvider";
import { usePropertiesActions } from "../../hooks/usePropertiesActions";
import AmenityChips, {
  DEFAULT_AMENITY_GROUPS,
} from "./components/AmenityChips";
import MediaDropzone from "./components/MediaDropzone";
import DocumentCard from "./components/DocumentCard";
import CustomSelect from "../../components/CustomSelect";
import Modal from "../../components/Modal";
import DesignBanner from "../../utils/DesignBanner";
import {
  isGeolocationSupported,
  getCurrentPosition,
} from "../../utils/geolocation";
import type { Coords } from "../../utils/geolocation";
import type { MediaDTO } from "../../../application/dto/MediaDTO";
import type {
  DocumentDTO,
  DocumentTypeDTO,
  VerificationStatusDTO,
} from "../../../application/dto/DocumentDTO";
import type { PropertyDTO } from "../../../application/dto/PropertyDTO";
import type { Currency, PropertyType } from "../../../domain/enums";
import {
  CURRENCY_VALUES,
  PROPERTY_TYPE,
  PROPERTY_TYPE_VALUES,
} from "../../../domain/enums";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  uploadFile,
  getPresignedUrlForDisplay,
} from "../../../infrastructure/adapters/MediaStorage";
import { supabase } from "../../../../../core/supabase/client";
import { SupabaseMediaStorage } from "../../../infrastructure/adapters/SupabaseMediaStorage";
import { SupabaseDocumentStorage } from "../../../infrastructure/adapters/SupabaseDocumentStorage";
import { SupabaseAuthService } from "../../../infrastructure/adapters/SupabaseAuthService";
import { descargarCoordenadasDePropiedad } from "../../utils/downloadscoords";

// Instanciar los adaptadores
const authService = new SupabaseAuthService({ client: supabase });
const mediaStorage = new SupabaseMediaStorage({ supabase, authService });
const documentStorage = new SupabaseDocumentStorage({ supabase, authService });

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

// Estados de México (32 estados) con sus IDs del INEGI
const MEXICO_STATES_OPTIONS = [
  { value: "Aguascalientes", label: "Aguascalientes", inegiId: 1 },
  { value: "Baja California", label: "Baja California", inegiId: 2 },
  { value: "Baja California Sur", label: "Baja California Sur", inegiId: 3 },
  { value: "Campeche", label: "Campeche", inegiId: 4 },
  { value: "Chiapas", label: "Chiapas", inegiId: 7 },
  { value: "Chihuahua", label: "Chihuahua", inegiId: 8 },
  { value: "Ciudad de México", label: "Ciudad de México", inegiId: 9 },
  { value: "Coahuila", label: "Coahuila", inegiId: 5 },
  { value: "Colima", label: "Colima", inegiId: 6 },
  { value: "Durango", label: "Durango", inegiId: 10 },
  { value: "Guanajuato", label: "Guanajuato", inegiId: 11 },
  { value: "Guerrero", label: "Guerrero", inegiId: 12 },
  { value: "Hidalgo", label: "Hidalgo", inegiId: 13 },
  { value: "Jalisco", label: "Jalisco", inegiId: 14 },
  { value: "México", label: "México", inegiId: 15 },
  { value: "Michoacán", label: "Michoacán", inegiId: 16 },
  { value: "Morelos", label: "Morelos", inegiId: 17 },
  { value: "Nayarit", label: "Nayarit", inegiId: 18 },
  { value: "Nuevo León", label: "Nuevo León", inegiId: 19 },
  { value: "Oaxaca", label: "Oaxaca", inegiId: 20 },
  { value: "Puebla", label: "Puebla", inegiId: 21 },
  { value: "Querétaro", label: "Querétaro", inegiId: 22 },
  { value: "Quintana Roo", label: "Quintana Roo", inegiId: 23 },
  { value: "San Luis Potosí", label: "San Luis Potosí", inegiId: 24 },
  { value: "Sinaloa", label: "Sinaloa", inegiId: 25 },
  { value: "Sonora", label: "Sonora", inegiId: 26 },
  { value: "Tabasco", label: "Tabasco", inegiId: 27 },
  { value: "Tamaulipas", label: "Tamaulipas", inegiId: 28 },
  { value: "Tlaxcala", label: "Tlaxcala", inegiId: 29 },
  { value: "Veracruz", label: "Veracruz", inegiId: 30 },
  { value: "Yucatán", label: "Yucatán", inegiId: 31 },
  { value: "Zacatecas", label: "Zacatecas", inegiId: 32 },
];

interface DraftForm {
  propertyId: string | null;
  title: string;
  propertyType: PropertyType;
  priceAmount: number;
  priceCurrency: Currency;
  city: string;
  state: string;
  description: string;
  levels: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  constructionM2: number | null;
  landM2: number | null;
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
  levels: null,
  bedrooms: null,
  bathrooms: null,
  parkingSpots: null,
  constructionM2: null,
  landM2: null,
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
    removeMedia,
    setCoverMedia,
    reorderMedia,
    deleteDocument,
    verifyRpp,
    listDocuments,
    getAuthProfile,
  } = usePropertiesActions();

  const [form, setForm] = useState<DraftForm>(INITIAL_FORM);
  const [mediaItems, setMediaItems] = useState<MediaDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [hasVerifiedRppCertificate, setHasVerifiedRppCertificate] =
    useState(false);
  const [userKycStatus, setUserKycStatus] = useState<
    "verified" | "pending" | "rejected" | null
  >(null);
  const [propertyStatus, setPropertyStatus] = useState<
    PropertyDTO["status"] | null
  >(null);
  const [savedCompleteness, setSavedCompleteness] = useState<number | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSaveBeforeRppModal, setShowSaveBeforeRppModal] = useState(false);
  const [showKycRequiredModal, setShowKycRequiredModal] = useState(false);
  const [showRppRequiredModal, setShowRppRequiredModal] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Estado para municipios cargados dinámicamente
  const [municipalities, setMunicipalities] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

  const isEditingDraft = isEditing && propertyStatus === "draft";

  // const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
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

      // Establecer coords iniciales por defecto
      setCoords({ lat: defaultLat, lng: defaultLng });

      // Si hay propertyId, intentar cargar coordenadas guardadas
      if (form.propertyId) {
        descargarCoordenadasDePropiedad(form.propertyId)
          .then((coordenadas) => {
            if (coordenadas && coordenadas.lat && coordenadas.lng) {
              // Actualizar estado
              setCoords({ lat: coordenadas.lat, lng: coordenadas.lng });

              // Mover marker a las coordenadas guardadas
              if (markerRef.current) {
                markerRef.current.setLatLng([coordenadas.lat, coordenadas.lng]);
              }

              // Centrar mapa en las coordenadas guardadas
              if (leafletMap.current) {
                leafletMap.current.setView(
                  [coordenadas.lat, coordenadas.lng],
                  16
                );
              }

              console.log("Coordenadas cargadas de BD:", coordenadas);
            } else {
              console.log(
                "No hay coordenadas guardadas, usando posición por defecto"
              );
            }
          })
          .catch((error) => {
            console.error("Error al cargar coordenadas:", error);
          });
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
  }, [currentStep, form.propertyId]);

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
    setSavedCompleteness(null);
    setCoords(null);
  }, [editingId]);

  // Cargar el perfil del usuario al montar el componente
  useEffect(() => {
    let active = true;

    const loadUserProfile = async () => {
      console.log("👤 Cargando perfil del usuario...");
      const profileResult = await getAuthProfile();

      if (!active) return;

      if (profileResult.isOk()) {
        const profile = profileResult.value;
        setUserKycStatus(profile.kycStatus);
        console.log("✅ Perfil cargado. KYC Status:", profile.kycStatus);
      } else {
        console.error("❌ Error al cargar perfil:", profileResult.error);
        setUserKycStatus("pending"); // Fallback a pending si falla
      }
    };

    loadUserProfile();

    return () => {
      active = false;
    };
  }, [getAuthProfile]);

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
          levels: data.levels ?? null,
          bedrooms: data.bedrooms ?? null,
          bathrooms: data.bathrooms ?? null,
          parkingSpots: data.parkingSpots ?? null,
          constructionM2: data.constructionM2 ?? null,
          landM2: data.landM2 ?? null,
          amenities: data.amenities ?? [],
          amenitiesExtra: data.amenitiesExtra ?? "",
        }));
        setPropertyStatus(data.status);
        setSavedCompleteness(
          typeof data.completenessScore === "number"
            ? Math.round(data.completenessScore)
            : null
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

  // Función para recargar medias desde BD
  const reloadMediaFromDatabase = useCallback(async () => {
    if (!form.propertyId) return;

    console.log(
      "🔄 Recargando imágenes desde BD para propiedad:",
      form.propertyId
    );

    // 1. Obtener registros de media_assets
    const mediaResult = await mediaStorage.listMedia(form.propertyId);

    if (mediaResult.isErr()) {
      console.error("Error al cargar media desde BD:", mediaResult.error);
      setMessage("⚠️ No se pudieron cargar las imágenes");
      return;
    }

    const mediaRecords = mediaResult.value;
    console.log(
      `✅ Se encontraron ${mediaRecords.length} registros de media en BD`
    );

    if (mediaRecords.length === 0) {
      setMediaItems([]);
      return;
    }

    // 2. Descargar cada imagen usando presigned URLs
    const mediaWithBlobUrls = await Promise.all(
      mediaRecords.map(async (mediaRecord) => {
        try {
          if (!mediaRecord.s3Key) {
            console.warn("Media sin s3Key:", mediaRecord.id);
            return mediaRecord;
          }

          console.log("⬇️ Descargando imagen:", mediaRecord.s3Key);

          // Obtener presigned URL y descargar como blob
          const blobUrl = await getPresignedUrlForDisplay(mediaRecord.s3Key);

          console.log("✅ Imagen descargada como blob:", blobUrl);

          // Retornar MediaDTO con blob URL local
          return {
            ...mediaRecord,
            url: blobUrl, // Usar blob URL en lugar de S3 URL
          };
        } catch (error) {
          console.error("Error descargando imagen:", mediaRecord.s3Key, error);
          // Retornar el registro sin modificar si falla
          return mediaRecord;
        }
      })
    );

    // 3. Actualizar estado con las imágenes descargadas
    setMediaItems(mediaWithBlobUrls);
    console.log("✅ Todas las imágenes cargadas y listas para mostrar");
  }, [form.propertyId]);

  // Auto-guardar borrador y cargar imágenes cuando llegue al paso "media"
  useEffect(() => {
    // Solo procesar si estamos en el paso "media" (índice 3)
    if (currentStep !== 3) return;

    let active = true;

    const prepareMediaStep = async () => {
      // Si no hay propertyId, guardar borrador automáticamente primero
      if (!form.propertyId) {
        console.log(
          "📝 Paso media detectado sin propertyId, guardando borrador..."
        );
        setMessage("Guardando borrador antes de cargar archivos...");

        const savedPropertyId = await handleSave();

        if (!active) return;

        if (!savedPropertyId) {
          setMessage(
            "❌ No pudimos guardar el borrador. Por favor, completa los campos requeridos."
          );
          return;
        }

        console.log(
          "✅ Borrador guardado automáticamente con ID:",
          savedPropertyId
        );
        setMessage("✅ Borrador guardado. Ya puedes subir archivos.");
      }

      // Si ya hay propertyId, cargar imágenes desde BD (solo si no hay imágenes ya)
      if (form.propertyId && mediaItems.length === 0) {
        console.log("📸 Cargando imágenes desde BD...");
        await reloadMediaFromDatabase();
      }
    };

    prepareMediaStep();

    return () => {
      active = false;
    };
  }, [currentStep, form.propertyId]);

  // Cargar documentos desde BD cuando llegue al paso "publish"
  useEffect(() => {
    // Solo cargar si estamos en el paso "publish" (índice 4) y tenemos propertyId
    if (currentStep !== 4 || !form.propertyId) return;

    let active = true;

    const loadDocumentsFromDatabase = async () => {
      console.log(
        "📄 Cargando documentos desde BD para propiedad:",
        form.propertyId
      );

      const docsResult = await documentStorage.listDocuments(form.propertyId!);

      if (!active) return;

      if (docsResult.isErr()) {
        console.error("Error al cargar documentos desde BD:", docsResult.error);
        return;
      }

      const docs = docsResult.value;
      // console.log(`✅ Se encontraron ${docs.length} documentos en BD`);

      setDocuments(docs);
    };

    loadDocumentsFromDatabase();

    return () => {
      active = false;
    };
  }, [currentStep, form.propertyId]);

  // Verificar si existe un documento rpp_certificate verificado
  useEffect(() => {
    const rppCertificate = documents.find(
      (doc) => doc.docType === "rpp_certificate"
    );

    if (rppCertificate && rppCertificate.verification === "verified") {
      setHasVerifiedRppCertificate(true);
      console.log("✅ Documento RPP verificado encontrado:", rppCertificate.id);
    } else {
      setHasVerifiedRppCertificate(false);
      if (rppCertificate) {
        console.log(
          "⚠️ Documento RPP encontrado pero no verificado. Estado:",
          rppCertificate.verification
        );
      }
    }
  }, [documents]);

  const buildDraftPayload = () => ({
    title: form.title.trim() || "Propiedad sin titulo",
    description: form.description.trim() || null,
    propertyType: form.propertyType,
    price: {
      amount: Math.max(1, form.priceAmount),
      currency: form.priceCurrency,
    },
    operationType: "sale" as const,
    levels: form.levels,
    bedrooms: form.bedrooms,
    bathrooms: form.bathrooms,
    parkingSpots: form.parkingSpots,
    constructionM2: form.constructionM2,
    landM2: form.landM2,
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

  const handleSave = async (): Promise<string | null> => {
    setSaving(true);
    setMessage(null);
    const payload = buildDraftPayload();

    if (!form.propertyId) {
      // console.log('antes de "crear"');

      const result = await createProperty(payload as any);
      // console.log("despues de crear, mas result");
      // console.log(result);

      if (result.isOk()) {
        const id = result.value.id;
        setForm((prev) => ({ ...prev, propertyId: id }));
        await refreshDocs(id);
        setMessage("Borrador guardado.");
        setSavedCompleteness(completion);
        setSaving(false);
        return id; // Retornar el nuevo propertyId
      } else {
        setMessage("No pudimos guardar el borrador.");
        setSaving(false);
        return null;
      }
    } else {
      const result = await updateProperty({
        id: form.propertyId,
        patch: payload,
      });
      const success = result.isOk();
      setMessage(
        success ? "Borrador actualizado." : "No pudimos actualizar el borrador."
      );
      if (success) {
        setSavedCompleteness(completion);
      }
      if (success && isEditing) {
        setSaving(false);
        navigate("/properties");
        return form.propertyId;
      }
      setSaving(false);
      return success ? form.propertyId : null;
    }
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

    // ========================================
    // VALIDACIONES ANTES DE PUBLICAR
    // ========================================

    // 1. Verificar que el usuario tenga INE verificado
    if (userKycStatus !== "verified") {
      console.log("⚠️ Usuario no tiene INE verificado. Status:", userKycStatus);
      setShowKycRequiredModal(true);
      return;
    }

    // 2. Verificar que la propiedad tenga RPP verificado
    if (!hasVerifiedRppCertificate) {
      console.log("⚠️ Propiedad no tiene RPP verificado");
      setShowRppRequiredModal(true);
      return;
    }

    console.log(
      "✅ Todas las verificaciones pasadas. Procediendo a publicar..."
    );

    // ========================================
    // LÓGICA DE PUBLICACIÓN
    // ========================================

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
    // En este punto, el propertyId SIEMPRE debe existir (el useEffect lo garantiza)
    if (!form.propertyId) {
      setMessage(
        "❌ Error: No hay propertyId. Por favor, guarda el borrador primero."
      );
      return;
    }

    const currentPropertyId = form.propertyId;
    console.log(
      "📤 Iniciando upload de archivos para propertyId:",
      currentPropertyId
    );

    // Procesar cada archivo usando currentPropertyId
    for (const file of files) {
      const tempId = crypto.randomUUID();

      try {
        // 1. Crear URL local inmediatamente para preview
        const localUrl = URL.createObjectURL(file);

        // 2. Crear MediaDTO temporal con URL local
        const tempMedia: MediaDTO = {
          id: tempId,
          orgId: null,
          propertyId: currentPropertyId,
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
        const uploadResult = await uploadFile(
          file,
          "uploads",
          currentPropertyId
        );

        if (uploadResult?.objectUrl) {
          // console.log("Archivo subido a S3:", uploadResult);

          // 5. Guardar en la base de datos
          const dbResult = await mediaStorage.insertMediaFromS3({
            propertyId: currentPropertyId,
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

            // 6. Actualizar con el ID real pero mantener URL local
            setMediaItems((prev) =>
              prev.map((item) =>
                item.id === tempId
                  ? {
                      ...savedMedia,
                      url: localUrl, // Mantener URL local en lugar de S3
                      metadata: {
                        ...savedMedia.metadata,
                        uploading: false,
                      },
                    }
                  : item
              )
            );

            // NO liberar URL local - la necesitamos para mostrar la imagen
            // URL.revokeObjectURL(localUrl);

            setMessage(`✅ ${file.name} subido correctamente`);
          } else {
            console.error("Error guardando en BD:", dbResult.error);

            // Actualizar el item temporal con error
            setMediaItems((prev) =>
              prev.map((item) =>
                item.id === tempId
                  ? {
                      ...item,
                      metadata: {
                        ...item.metadata,
                        uploading: false,
                        error: "Error guardando en BD",
                      },
                    }
                  : item
              )
            );

            setMessage(
              `⚠️ ${file.name} subido a S3 pero error guardando en BD`
            );
          }
        } else {
          // Si falla el upload a S3, remover el item temporal
          setMediaItems((prev) => prev.filter((item) => item.id !== tempId));
          setMessage(`❌ Error al subir ${file.name} a S3`);
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
    console.log("🖼️ Estableciendo nueva portada...");

    const result = await setCoverMedia({
      propertyId: form.propertyId,
      mediaId,
    });

    if (result.isOk()) {
      console.log("✅ Portada actualizada en BD, recargando imágenes...");
      // Recargar las imágenes desde BD para reflejar el cambio de isCover
      await reloadMediaFromDatabase();
    } else {
      console.error("❌ Error al actualizar portada:", result.error);
    }
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
    // En este punto, el propertyId SIEMPRE debe existir (similar al paso media)
    if (!form.propertyId) {
      setMessage(
        "❌ Error: No hay propertyId. Por favor, guarda el borrador primero."
      );
      return;
    }

    const currentPropertyId = form.propertyId;

    try {
      console.log("📄 Subiendo documento:", file.name);

      // 1. Subir a S3
      const uploadResult = await uploadFile(
        file,
        "documents",
        currentPropertyId
      );

      if (!uploadResult?.objectUrl) {
        setMessage(`❌ Error al subir ${file.name} a S3`);
        return;
      }

      console.log("✅ Documento subido a S3:", uploadResult);

      // 2. Guardar en la base de datos
      const dbResult = await documentStorage.insertDocumentFromS3({
        propertyId: currentPropertyId,
        docType: type,
        s3Key: uploadResult.key,
        url: uploadResult.objectUrl,
        fileName: uploadResult.filename,
        contentType: uploadResult.contentType,
        size: uploadResult.size,
      });

      if (dbResult.isOk()) {
        console.log("✅ Documento guardado en BD:", dbResult.value);
        setMessage(`✅ ${file.name} subido correctamente`);

        // Recargar lista de documentos
        await refreshDocs(currentPropertyId);
      } else {
        console.error("Error guardando documento en BD:", dbResult.error);
        setMessage(`⚠️ ${file.name} subido a S3 pero error guardando en BD`);
      }
    } catch (error) {
      console.error("Error subiendo documento:", error);
      setMessage(
        `❌ Error al subir ${file.name}: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
    }
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

  const findDocs = (type: DocumentTypeDTO) =>
    documents.filter((doc) => doc.docType === type);

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
    // console.log("recargo?... :C");
    // if (mediaItems) {
    //   console.log("el mediaitems no esta vacio: ", mediaItems.length);
    // } else {
    //   console.log("no hay titulo");
    // }

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
      { label: "Fotos min. 1 (Paso 4)", valid: mediaItems?.length > 0 },
      {
        label: "Documentos (Paso 5)",
        valid: documents.length >= 1, // Al menos un documento (escritura, planos u otros)
      },
    ];
  }, [form, mediaItems, documents]);

  const completed = requirements.filter((item) => item.valid).length;
  const editingCompletion = Math.round((completed / requirements.length) * 100);
  const savedScore =
    savedCompleteness !== null
      ? Math.max(0, Math.min(100, Math.round(savedCompleteness)))
      : null;
  const completion = editingCompletion;
  const showSavedBadge = savedScore !== null;
  const missingItems = requirements
    .filter((item) => !item.valid)
    .map((item) => item.label);

  const goNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const goPrev = () => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const handleCancel = () => navigate("/properties");

  // Manejar click en botón de verificar RPP
  const handleVerifyRppClick = async () => {
    // Si no hay propertyId, mostrar modal pidiendo guardar primero
    if (!form.propertyId) {
      setShowSaveBeforeRppModal(true);
      return;
    }

    // Si ya hay propertyId, navegar directamente
    navigate(`/verify-rpp?propertyId=${form.propertyId}`);
  };

  // Guardar y luego ir a verificación RPP
  const handleSaveAndVerifyRpp = async () => {
    setShowSaveBeforeRppModal(false);
    setMessage("Guardando borrador antes de verificar RPP...");

    const savedPropertyId = await handleSave();

    if (!savedPropertyId) {
      setMessage(
        "❌ No pudimos guardar el borrador. Por favor, completa los campos requeridos."
      );
      return;
    }

    setMessage("✅ Borrador guardado. Redirigiendo a verificación RPP...");

    // Pequeña pausa para que el usuario vea el mensaje
    setTimeout(() => {
      navigate(`/verify-rpp?propertyId=${savedPropertyId}`);
    }, 500);
  };

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
              {/* Información principal */}
              <label className="wizard-field form-col-2">
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

              {/* Características de la propiedad */}
              <div className="wizard-field-group">
                <h4 className="wizard-field-group__title">Características</h4>
                <div className="wizard-features-grid">
                  <label className="wizard-field wizard-field--compact">
                    <span className="wizard-field__label">Pisos</span>
                    <input
                      className="wizard-field__control"
                      type="number"
                      min={0}
                      step="1"
                      inputMode="numeric"
                      value={form.levels ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          levels: raw === "" ? null : Number(raw),
                        }));
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="wizard-field wizard-field--compact">
                    <span className="wizard-field__label">Recámaras</span>
                    <input
                      className="wizard-field__control"
                      type="number"
                      min={0}
                      step="1"
                      inputMode="numeric"
                      value={form.bedrooms ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          bedrooms: raw === "" ? null : Number(raw),
                        }));
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="wizard-field wizard-field--compact">
                    <span className="wizard-field__label">Baños</span>
                    <input
                      className="wizard-field__control"
                      type="number"
                      min={0}
                      step="0.5"
                      inputMode="decimal"
                      value={form.bathrooms ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          bathrooms: raw === "" ? null : Number(raw),
                        }));
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="wizard-field wizard-field--compact">
                    <span className="wizard-field__label">
                      Estacionamientos
                    </span>
                    <input
                      className="wizard-field__control"
                      type="number"
                      min={0}
                      step="1"
                      inputMode="numeric"
                      value={form.parkingSpots ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          parkingSpots: raw === "" ? null : Number(raw),
                        }));
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="wizard-field wizard-field--compact">
                    <span className="wizard-field__label">m² construcción</span>
                    <input
                      className="wizard-field__control"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={form.constructionM2 ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          constructionM2: raw === "" ? null : Number(raw),
                        }));
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="wizard-field wizard-field--compact">
                    <span className="wizard-field__label">m² terreno</span>
                    <input
                      className="wizard-field__control"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={form.landM2 ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          landM2: raw === "" ? null : Number(raw),
                        }));
                      }}
                      placeholder="0"
                    />
                  </label>
                </div>
              </div>
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
                <span className="wizard-field__label">Estado *</span>
                <CustomSelect
                  value={form.state}
                  options={MEXICO_STATES_OPTIONS}
                  onChange={async (value) => {
                    // Actualizar el estado seleccionado
                    setForm((prev) => ({ ...prev, state: value, city: "" }));

                    // Limpiar lista de municipios y ciudad seleccionada
                    setMunicipalities([]);
                    setLoadingMunicipalities(true);

                    // Buscar el inegiId del estado seleccionado
                    const selectedState = MEXICO_STATES_OPTIONS.find(
                      (state) => state.value === value
                    );

                    if (selectedState?.inegiId) {
                      console.log("🏙️ Cargando municipios del estado:", value);

                      try {
                        // Fetch de municipios desde GitHub
                        const response = await fetch(
                          `https://raw.githubusercontent.com/angelsantosa/inegi-lista-estados/refs/heads/master/cities/${selectedState.inegiId}.json`
                        );

                        if (!response.ok) {
                          throw new Error(
                            `HTTP error! status: ${response.status}`
                          );
                        }

                        const data = await response.json();

                        // Remover el primer elemento (índice 0) que contiene "Todo el estado"
                        const municipalitiesData = data.slice(1);

                        // Transformar a formato para CustomSelect
                        const municipalitiesOptions = municipalitiesData
                          .map((mun: any) => ({
                            value: mun.nombre_municipio,
                            label: mun.nombre_municipio,
                          }))
                          .sort(
                            (
                              a: { value: string; label: string },
                              b: { value: string; label: string }
                            ) => a.label.localeCompare(b.label, "es")
                          ); // Ordenar alfabéticamente

                        setMunicipalities(municipalitiesOptions);
                        console.log(
                          `✅ Se cargaron ${municipalitiesOptions.length} municipios`
                        );
                      } catch (error) {
                        console.error("❌ Error al cargar municipios:", error);
                        setMunicipalities([]);
                      } finally {
                        setLoadingMunicipalities(false);
                      }
                    } else {
                      setLoadingMunicipalities(false);
                    }
                  }}
                  placeholder="Selecciona un estado"
                  className="wizard-field__control"
                />
              </label>
              <label className="wizard-field">
                <span className="wizard-field__label">Ciudad/Municipio *</span>
                <CustomSelect
                  value={form.city}
                  options={
                    municipalities.length > 0
                      ? municipalities
                      : [{ value: "", label: "Sin ciudad" }]
                  }
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, city: value }))
                  }
                  placeholder={
                    loadingMunicipalities
                      ? "Cargando municipios..."
                      : municipalities.length === 0
                        ? "Primero selecciona un estado"
                        : "Selecciona un municipio"
                  }
                  disabled={
                    municipalities.length === 0 || loadingMunicipalities
                  }
                  className="wizard-field__control"
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
                  disabled={!form.propertyId || saving}
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
                {(["deed", "plan", "other"] as DocumentTypeDTO[]).map(
                  (type) => {
                    // Para "other" permitir múltiples documentos
                    const isMultiple = type === "other";
                    const docsForType = findDocs(type);
                    const singleDoc = findDoc(type);

                    return (
                      <DocumentCard
                        key={`${type}-${singleDoc?.id || docsForType.map((d) => d.id).join("-") || "empty"}`}
                        docType={type}
                        documents={isMultiple ? docsForType : undefined}
                        document={!isMultiple ? singleDoc : undefined}
                        allowMultiple={isMultiple}
                        onUpload={(file) => handleAttachDocument(type, file)}
                        onDelete={(docId) => {
                          const doc = documents.find((d) => d.id === docId);
                          if (doc) deleteDoc(doc);
                        }}
                        onVerify={(status) => {
                          const doc = findDoc(type);
                          if (doc) verifyDoc(doc, status);
                        }}
                        allowVerification={false}
                      />
                    );
                  }
                )}
              </div>
              <span className="wizard-note form-col-2">
                Los documentos ayudan a verificar la autenticidad de la
                propiedad.
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
          {!hasVerifiedRppCertificate && (
            <div className="wizard-summary wizard-summary--alert">
              <strong>Verificación de documento RPP requerida</strong>
              <p>
                Para publicar propiedades necesitas verificar el documento del
                Registro Público de la Propiedad.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleVerifyRppClick}
              >
                Verificar documento ahora
              </button>
            </div>
          )}

          <div className="wizard-summary">
            <ProgressCircle value={completion} />
            <div className="wizard-summary__text">
              <h3>Completitud</h3>
              <p>Completa todos los pasos para habilitar la publicacion.</p>
              <div className="wizard-summary__chips">
                <span className="badge badge-primary">
                  En edicion: {completion}%
                </span>
                {showSavedBadge && (
                  <span className="badge badge-neutral">
                    Guardado: {savedScore}%
                  </span>
                )}
              </div>
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
            Continuar
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

      {/* Modal para guardar antes de verificar RPP */}
      <Modal
        open={showSaveBeforeRppModal}
        onClose={() => setShowSaveBeforeRppModal(false)}
        title="Guardar propiedad"
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowSaveBeforeRppModal(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAndVerifyRpp}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar y continuar"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
          Aún no has guardado esta propiedad. Para verificar el documento RPP,
          primero necesitas guardar el borrador de la propiedad.
        </p>
        <p style={{ fontSize: "14px", lineHeight: "1.5", marginTop: "12px" }}>
          ¿Deseas guardar el borrador ahora y continuar con la verificación?
        </p>
      </Modal>

      {/* Modal cuando falta verificación de INE (KYC) */}
      <Modal
        open={showKycRequiredModal}
        onClose={() => setShowKycRequiredModal(false)}
        title="Verificación de identidad requerida"
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowKycRequiredModal(false)}
            >
              Ahora no
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/verify-ine")}
            >
              Verificar mi INE
            </button>
          </>
        }
      >
        <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
          Para publicar propiedades necesitas verificar tu identidad mediante tu
          INE (Identificación Oficial).
        </p>
        <p style={{ fontSize: "14px", lineHeight: "1.5", marginTop: "12px" }}>
          Este proceso es rápido y solo lo harás una vez. Una vez verificado,
          podrás publicar todas tus propiedades.
        </p>
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "#f0f9ff",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        >
          <strong>📋 Necesitarás:</strong>
          <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
            <li>Foto de tu INE (frente y reverso)</li>
            <li>Una selfie sosteniendo tu INE</li>
          </ul>
        </div>
      </Modal>

      {/* Modal cuando falta verificación de RPP */}
      <Modal
        open={showRppRequiredModal}
        onClose={() => setShowRppRequiredModal(false)}
        title="Documento RPP no verificado"
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowRppRequiredModal(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowRppRequiredModal(false);
                handleVerifyRppClick();
              }}
            >
              Verificar RPP
            </button>
          </>
        }
      >
        <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
          Para publicar esta propiedad necesitas verificar el documento del
          Registro Público de la Propiedad (RPP).
        </p>
        <p style={{ fontSize: "14px", lineHeight: "1.5", marginTop: "12px" }}>
          Este documento certifica la legalidad de la propiedad y es requerido
          para proteger tanto a compradores como vendedores.
        </p>
      </Modal>
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
