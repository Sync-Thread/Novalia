
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PropertiesProvider } from "../containers/PropertiesProvider";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import AmenityChips, { DEFAULT_AMENITY_GROUPS } from "../components/AmenityChips";
import MediaDropzone from "../components/MediaDropzone";
import DocumentCard from "../components/DocumentCard";
import type { MediaDTO, MediaTypeDTO } from "../../application/dto/MediaDTO";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import { formatCurrency } from "../utils/format";
import type { Condition, Currency, Orientation } from "../../domain/enums";
import { CONDITION_VALUES, CURRENCY_VALUES, ORIENTATION_VALUES } from "../../domain/enums";

const STEPS = ["Basicos", "Ubicacion", "Detalles", "Amenidades", "Media", "Documentos"] as const;

interface WizardFormState {
  propertyId?: string;
  title: string;
  description: string;
  propertyType: PropertyDTO["propertyType"];
  priceAmount: number;
  priceCurrency: string;
  tagsText: string;
  internalId: string;
  address: {
    addressLine: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    displayAddress: boolean;
  };
  location: {
    lat: string;
    lng: string;
  };
  details: {
    bedrooms: string;
    bathrooms: string;
    parkingSpots: string;
    constructionM2: string;
    landM2: string;
    levels: string;
    yearBuilt: string;
    floor: string;
    hoaFee: string;
    condition: string;
    furnished: boolean;
    petFriendly: boolean;
    orientation: string;
  };
  amenities: string[];
  amenitiesExtra: string;
}

const initialFormState: WizardFormState = {
  title: "",
  description: "",
  propertyType: "house",
  priceAmount: 0,
  priceCurrency: "MXN",
  tagsText: "",
  internalId: "",
  address: {
    addressLine: "",
    neighborhood: "",
    city: "",
    state: "",
    postalCode: "",
    country: "MX",
    displayAddress: false,
  },
  location: { lat: "", lng: "" },
  details: {
    bedrooms: "",
    bathrooms: "",
    parkingSpots: "",
    constructionM2: "",
    landM2: "",
    levels: "",
    yearBuilt: "",
    floor: "",
    hoaFee: "",
    condition: "",
    furnished: false,
    petFriendly: false,
    orientation: "",
  },
  amenities: [],
  amenitiesExtra: "",
};

const DOC_TYPES: { type: DocumentTypeDTO; label: string }[] = [
  { type: "rpp_certificate", label: "Certificado RPP" },
  { type: "deed", label: "Escritura" },
  { type: "id_doc", label: "Identificacion" },
  { type: "floorplan", label: "Plano" },
  { type: "other", label: "Otro" },
];

export default function PublishWizardPage() {
  return (
    <PropertiesProvider>
      <PublishWizard />
    </PropertiesProvider>
  );
}

function PublishWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingId = searchParams.get("id");
  const actions = usePropertiesActions();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<WizardFormState>(initialFormState);
  const [mediaItems, setMediaItems] = useState<MediaDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [serverProperty, setServerProperty] = useState<PropertyDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [authKyc, setAuthKyc] = useState<"verified" | "pending" | "rejected">("pending");

  useEffect(() => {
    void actions.getAuthProfile().then(result => {
      if (result.isOk()) {
        setAuthKyc(result.value.kycStatus);
      }
    });
  }, [actions]);

  const loadProperty = async (id: string) => {
    const result = await actions.getProperty(id);
    if (result.isOk()) {
      setServerProperty(result.value);
      setForm(mapPropertyToForm(result.value));
      await loadDocuments(id);
    }
  };

  useEffect(() => {
    if (existingId) {
      void loadProperty(existingId);
    }
  }, [existingId]);

  const mapPropertyToForm = (property: PropertyDTO): WizardFormState => ({
    propertyId: property.id,
    title: property.title,
    description: property.description ?? "",
    propertyType: property.propertyType,
    priceAmount: property.price.amount,
    priceCurrency: property.price.currency,
    tagsText: property.tags.join(", "),
    internalId: property.internalId ?? "",
    address: {
      addressLine: property.address.addressLine ?? "",
      neighborhood: property.address.neighborhood ?? "",
      city: property.address.city ?? "",
      state: property.address.state ?? "",
      postalCode: property.address.postalCode ?? "",
      country: property.address.country ?? "MX",
      displayAddress: property.address.displayAddress ?? false,
    },
    location: {
      lat: property.location?.lat?.toString() ?? "",
      lng: property.location?.lng?.toString() ?? "",
    },
    details: {
      bedrooms: property.bedrooms?.toString() ?? "",
      bathrooms: property.bathrooms?.toString() ?? "",
      parkingSpots: property.parkingSpots?.toString() ?? "",
      constructionM2: property.constructionM2?.toString() ?? "",
      landM2: property.landM2?.toString() ?? "",
      levels: property.levels?.toString() ?? "",
      yearBuilt: property.yearBuilt?.toString() ?? "",
      floor: property.floor?.toString() ?? "",
      hoaFee: property.hoaFee?.amount?.toString() ?? "",
      condition: property.condition ?? "",
      furnished: property.furnished ?? false,
      petFriendly: property.petFriendly ?? false,
      orientation: property.orientation ?? "",
    },
    amenities: property.amenities ?? [],
    amenitiesExtra: property.amenitiesExtra ?? "",
  });

  const parseTags = (text: string): string[] =>
    text
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

  const parseNumberOrNull = (value: string): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const DEFAULT_CURRENCY: Currency = "MXN";

  const normalizeCurrency = (value: string): Currency => {
    return CURRENCY_VALUES.includes(value as Currency) ? (value as Currency) : DEFAULT_CURRENCY;
  };

  const normalizeCondition = (value: string | null): Condition | null => {
    if (!value) return null;
    return CONDITION_VALUES.includes(value as Condition) ? (value as Condition) : null;
  };

  const normalizeOrientation = (value: string | null): Orientation | null => {
    if (!value) return null;
    return ORIENTATION_VALUES.includes(value as Orientation) ? (value as Orientation) : null;
  };

  const saveCurrentStep = async (): Promise<boolean> => {
    setSaving(true);
    try {
      if (currentStep === 1) {
        if (!form.title.trim() || form.priceAmount <= 0) {
          alert("Completa el titulo y un precio mayor a cero.");
          return false;
        }
        if (!form.propertyId) {
          const result = await actions.createProperty({
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            propertyType: form.propertyType,
            price: { amount: form.priceAmount, currency: normalizeCurrency(form.priceCurrency) },
            operationType: "sale",
            address: {
              addressLine: form.address.addressLine || undefined,
              neighborhood: form.address.neighborhood || undefined,
              city: form.address.city || "Por definir",
              state: form.address.state || "Por definir",
              postalCode: form.address.postalCode || undefined,
              country: form.address.country || "MX",
              displayAddress: form.address.displayAddress,
            },
            amenities: form.amenities,
            amenitiesExtra: form.amenitiesExtra || undefined,
            tags: parseTags(form.tagsText),
            internalId: form.internalId || undefined,
          });
          if (result.isOk()) {
            setForm(prev => ({ ...prev, propertyId: result.value.id }));
            await loadProperty(result.value.id);
          } else {
            return false;
          }
        } else {
          const result = await actions.updateProperty({
            id: form.propertyId,
            patch: {
              title: form.title.trim(),
              description: form.description.trim() || null,
              propertyType: form.propertyType,
              price: { amount: form.priceAmount, currency: normalizeCurrency(form.priceCurrency) },
              tags: parseTags(form.tagsText),
              internalId: form.internalId.trim() || null,
            },
          });
          if (result.isErr()) return false;
          await loadProperty(form.propertyId);
        }
      } else if (currentStep === 2 && form.propertyId) {
        const result = await actions.updateProperty({
          id: form.propertyId,
          patch: {
            address: {
              addressLine: form.address.addressLine || null,
              neighborhood: form.address.neighborhood || null,
              city: form.address.city || "Por definir",
              state: form.address.state || "Por definir",
              postalCode: form.address.postalCode || null,
              country: form.address.country || "MX",
              displayAddress: form.address.displayAddress,
            },
            location:
              form.location.lat && form.location.lng
                ? { lat: Number(form.location.lat), lng: Number(form.location.lng) }
                : null,
          },
        });
        if (result.isErr()) return false;
        await loadProperty(form.propertyId);
      } else if (currentStep === 3 && form.propertyId) {
        const result = await actions.updateProperty({
          id: form.propertyId,
          patch: {
            bedrooms: parseNumberOrNull(form.details.bedrooms),
            bathrooms: parseNumberOrNull(form.details.bathrooms),
            parkingSpots: parseNumberOrNull(form.details.parkingSpots),
            constructionM2: parseNumberOrNull(form.details.constructionM2),
            landM2: parseNumberOrNull(form.details.landM2),
            levels: parseNumberOrNull(form.details.levels),
            yearBuilt: parseNumberOrNull(form.details.yearBuilt),
            floor: parseNumberOrNull(form.details.floor),
            hoaFee: form.details.hoaFee ? { amount: Number(form.details.hoaFee), currency: normalizeCurrency(form.priceCurrency) } : null,
            condition: normalizeCondition(form.details.condition || null),
            furnished: form.details.furnished,
            petFriendly: form.details.petFriendly,
            orientation: normalizeOrientation(form.details.orientation || null),
          },
        });
        if (result.isErr()) return false;
        await loadProperty(form.propertyId);
      } else if (currentStep === 4 && form.propertyId) {
        const result = await actions.updateProperty({
          id: form.propertyId,
          patch: {
            amenities: form.amenities,
            amenitiesExtra: form.amenitiesExtra || null,
          },
        });
        if (result.isErr()) return false;
        await loadProperty(form.propertyId);
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async () => {
    const ok = await saveCurrentStep();
    if (ok) setCurrentStep(step => Math.min(step + 1, STEPS.length));
  };

  const prevStep = () => setCurrentStep(step => Math.max(step - 1, 1));

  const guessMediaType = (mime: string): MediaTypeDTO => {
    if (mime.startsWith("video")) return "video";
    if (mime.includes("pdf")) return "floorplan";
    return "image";
  };

  const handleMediaUpload = async (files: File[]) => {
    if (!form.propertyId) {
      alert("Debes guardar los pasos previos antes de subir media.");
      return;
    }
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const mediaType = guessMediaType(file.type);
      const result = await actions.uploadMedia({
        propertyId: form.propertyId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        data: buffer,
        type: mediaType,
      });
      if (result.isOk()) {
        setMediaItems(prev => [...prev, result.value]);
      }
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await actions.removeMedia({ propertyId: form.propertyId, mediaId });
    if (result.isOk()) {
      setMediaItems(prev => prev.filter(item => item.id !== mediaId));
    }
  };

  const handleSetCover = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await actions.setCoverMedia({ propertyId: form.propertyId, mediaId });
    if (result.isOk()) {
      setMediaItems(prev =>
        prev.map(item => ({
          ...item,
          isCover: item.id === mediaId,
        })),
      );
    }
  };

  const handleReorderMedia = async (orderedIds: string[]) => {
    if (!form.propertyId) return;
    const result = await actions.reorderMedia({ propertyId: form.propertyId, orderedIds });
    if (result.isOk()) {
      setMediaItems(prev => {
        const map = new Map(prev.map(item => [item.id, item]));
        return orderedIds.map(id => map.get(id)!).filter(Boolean);
      });
    }
  };

  const loadDocuments = async (propertyId: string) => {
    const result = await actions.listDocuments(propertyId);
    if (result.isOk()) {
      setDocuments(result.value);
    }
  };

  const handleAttachDocument = async (docType: DocumentTypeDTO, file: File) => {
    if (!form.propertyId) return;
    const blobUrl = URL.createObjectURL(file);
    const result = await actions.attachDocument({
      propertyId: form.propertyId,
      docType,
      url: blobUrl,
      metadata: { fileName: file.name },
    });
    if (result.isOk()) {
      await loadDocuments(form.propertyId);
    }
  };

  const handleDeleteDocument = async (doc: DocumentDTO) => {
    const result = await actions.deleteDocument(doc.id);
    if (result.isOk() && form.propertyId) {
      await loadDocuments(form.propertyId);
    }
  };

  const handleVerifyDocument = async (doc: DocumentDTO, status: VerificationStatusDTO) => {
    if (!form.propertyId) return;
    const result = await actions.verifyRpp({ propertyId: form.propertyId, docId: doc.id, status });
    if (result.isOk()) {
      await loadDocuments(form.propertyId);
    }
  };

  const readiness = useMemo(() => {
    const hasRpp = documents.some(doc => doc.docType === "rpp_certificate");
    const completeness = serverProperty?.completenessScore ?? 0;
    return {
      kyc: authKyc === "verified",
      completeness: completeness >= 80,
      rpp: hasRpp,
      priceDefined: form.priceAmount > 0 && Boolean(form.address.city) && Boolean(form.propertyType),
    };
  }, [authKyc, documents, form.address.city, form.priceAmount, form.propertyType, serverProperty?.completenessScore]);

  const canPublish =
    readiness.kyc && readiness.completeness && readiness.rpp && readiness.priceDefined && form.propertyId !== undefined;

  const handlePublish = async () => {
    if (!form.propertyId) return;
    const ok = await saveCurrentStep();
    if (!ok) return;
    const result = await actions.publishProperty({ id: form.propertyId });
    if (result.isOk()) {
      navigate("/properties");
    }
  };

  return (
    <main
      style={{
        padding: "32px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate("/properties")}
          style={{ border: "none", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}
        >
          ? Mis propiedades
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Publicar propiedad
        </h1>
        <Stepper currentStep={currentStep} />
      </header>

      <section
        style={{
          background: "#fff",
          borderRadius: 24,
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 18px 40px rgba(15,23,42,0.1)",
          padding: "32px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {currentStep === 1 && <StepBasics form={form} setForm={setForm} serverProperty={serverProperty} />}
        {currentStep === 2 && <StepLocation form={form} setForm={setForm} />}
        {currentStep === 3 && <StepDetails form={form} setForm={setForm} />}
        {currentStep === 4 && <StepAmenities form={form} setForm={setForm} />}
        {currentStep === 5 && (
          <StepMedia
            propertyId={form.propertyId}
            mediaItems={mediaItems}
            onUpload={handleMediaUpload}
            onRemove={handleRemoveMedia}
            onSetCover={handleSetCover}
            onReorder={handleReorderMedia}
          />
        )}
        {currentStep === 6 && (
          <StepDocuments
            propertyId={form.propertyId}
            documents={documents}
            onAttach={handleAttachDocument}
            onDelete={handleDeleteDocument}
            onVerify={handleVerifyDocument}
            readiness={readiness}
          />
        )}
      </section>

      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(148,163,184,0.25)",
          paddingTop: 16,
        }}
      >
        <button type="button" onClick={prevStep} disabled={currentStep === 1} style={secondaryButtonStyle}>
          Anterior
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={saveCurrentStep} disabled={saving} style={secondaryButtonStyle}>
            {saving ? "Guardando…" : "Guardar borrador"}
          </button>
          {currentStep < STEPS.length && (
            <button type="button" onClick={nextStep} disabled={saving} style={primaryButtonStyle}>
              Siguiente
            </button>
          )}
          {currentStep === STEPS.length && (
            <button type="button" onClick={handlePublish} disabled={!canPublish || saving} style={primaryButtonStyle}>
              Publicar ahora
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol style={{ display: "flex", gap: 12, fontSize: 13, color: "#475569", padding: 0, margin: "12px 0 0" }}>
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === currentStep;
        const completed = stepNumber < currentStep;
        return (
          <li
            key={label}
            style={{
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: active ? 600 : 500,
              color: completed ? "#1d4ed8" : active ? "#0f172a" : "#94a3b8",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: completed ? "#1d4ed8" : active ? "#295DFF" : "rgba(148,163,184,0.2)",
                color: completed || active ? "#fff" : "#475569",
                fontWeight: 600,
              }}
            >
              {stepNumber}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function StepBasics({
  form,
  setForm,
  serverProperty,
}: {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
  serverProperty: PropertyDTO | null;
}) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <label style={fieldLabelStyle}>
          Tipo de propiedad
          <select
            value={form.propertyType}
            onChange={event =>
              setForm(prev => ({ ...prev, propertyType: event.target.value as PropertyDTO["propertyType"] }))
            }
            style={selectStyle}
          >
            {["house", "apartment", "land", "office", "commercial", "industrial", "other"].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldLabelStyle}>
          Titulo
          <input
            type="text"
            value={form.title}
            maxLength={80}
            onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
            style={inputStyle}
          />
        </label>
        <label style={fieldLabelStyle}>
          Precio (MXN)
          <input
            type="number"
            min={0}
            value={form.priceAmount}
            onChange={event => setForm(prev => ({ ...prev, priceAmount: Number(event.target.value) }))}
            style={inputStyle}
          />
        </label>
        <label style={fieldLabelStyle}>
          ID interno
          <input
            type="text"
            value={form.internalId}
            onChange={event => setForm(prev => ({ ...prev, internalId: event.target.value }))}
            style={inputStyle}
          />
        </label>
      </div>
      <label style={fieldLabelStyle}>
        Descripcion
        <textarea
          value={form.description}
          maxLength={2000}
          onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
          rows={6}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>
      <label style={fieldLabelStyle}>
        Tags (separados por coma)
        <input
          type="text"
          value={form.tagsText}
          onChange={event => setForm(prev => ({ ...prev, tagsText: event.target.value }))}
          style={inputStyle}
          placeholder="Ej. exclusivo, vista al mar, remodelado"
        />
      </label>
      {serverProperty && (
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Completitud estimada: {Math.round(serverProperty.completenessScore)}% · Valor sugerido: {" "}
          {formatCurrency(serverProperty.price.amount, serverProperty.price.currency)}
        </div>
      )}
    </div>
  );
}

function StepLocation({
  form,
  setForm,
}: {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {[
          { label: "Direccion", key: "addressLine" },
          { label: "Colonia", key: "neighborhood" },
          { label: "Ciudad", key: "city" },
          { label: "Estado", key: "state" },
          { label: "Codigo postal", key: "postalCode" },
          { label: "Pais", key: "country" },
        ].map(field => (
          <label key={field.key} style={fieldLabelStyle}>
            {field.label}
            <input
              type="text"
              value={(form.address as any)[field.key]}
              onChange={event =>
                setForm(prev => ({
                  ...prev,
                  address: { ...prev.address, [field.key]: event.target.value },
                }))
              }
              style={inputStyle}
            />
          </label>
        ))}
      </div>
      <label style={{ ...fieldLabelStyle, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={form.address.displayAddress}
          onChange={event =>
            setForm(prev => ({ ...prev, address: { ...prev.address, displayAddress: event.target.checked } }))
          }
        />
        Mostrar direccion aproximada en la publicacion
      </label>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <label style={fieldLabelStyle}>
          Latitud
          <input
            type="number"
            value={form.location.lat}
            onChange={event => setForm(prev => ({ ...prev, location: { ...prev.location, lat: event.target.value } }))}
            style={inputStyle}
          />
        </label>
        <label style={fieldLabelStyle}>
          Longitud
          <input
            type="number"
            value={form.location.lng}
            onChange={event => setForm(prev => ({ ...prev, location: { ...prev.location, lng: event.target.value } }))}
            style={inputStyle}
          />
        </label>
      </div>
    </div>
  );
}

function StepDetails({
  form,
  setForm,
}: {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[
          { label: "Recamaras", key: "bedrooms" },
          { label: "Banos", key: "bathrooms" },
          { label: "Estacionamientos", key: "parkingSpots" },
          { label: "Construccion m²", key: "constructionM2" },
          { label: "Terreno m²", key: "landM2" },
          { label: "Niveles", key: "levels" },
          { label: "Ano construccion", key: "yearBuilt" },
          { label: "Piso", key: "floor" },
        ].map(field => (
          <label key={field.key} style={fieldLabelStyle}>
            {field.label}
            <input
              type="number"
              value={(form.details as any)[field.key]}
              onChange={event =>
                setForm(prev => ({
                  ...prev,
                  details: { ...prev.details, [field.key]: event.target.value },
                }))
              }
              style={inputStyle}
            />
          </label>
        ))}
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <label style={fieldLabelStyle}>
          Cuota mantenimiento (MXN)
          <input
            type="number"
            value={form.details.hoaFee}
            onChange={event =>
              setForm(prev => ({ ...prev, details: { ...prev.details, hoaFee: event.target.value } }))
            }
            style={inputStyle}
          />
        </label>
        <label style={fieldLabelStyle}>
          Condicion
          <select
            value={form.details.condition}
            onChange={event =>
              setForm(prev => ({ ...prev, details: { ...prev.details, condition: event.target.value } }))
            }
            style={selectStyle}
          >
            <option value="">Seleccione</option>
            {["new", "excellent", "good", "needs_renovation", "unknown"].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldLabelStyle}>
          Orientacion
          <select
            value={form.details.orientation}
            onChange={event =>
              setForm(prev => ({ ...prev, details: { ...prev.details, orientation: event.target.value } }))
            }
            style={selectStyle}
          >
            <option value="">Seleccione</option>
            {["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <label style={{ ...fieldLabelStyle, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={form.details.furnished}
            onChange={event =>
              setForm(prev => ({ ...prev, details: { ...prev.details, furnished: event.target.checked } }))
            }
          />
          Amueblado
        </label>
        <label style={{ ...fieldLabelStyle, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={form.details.petFriendly}
            onChange={event =>
              setForm(prev => ({ ...prev, details: { ...prev.details, petFriendly: event.target.checked } }))
            }
          />
          Pet friendly
        </label>
      </div>
    </div>
  );
}

function StepAmenities({
  form,
  setForm,
}: {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AmenityChips
        groups={DEFAULT_AMENITY_GROUPS}
        selected={form.amenities}
        onChange={amenities => setForm(prev => ({ ...prev, amenities }))}
        extraValue={form.amenitiesExtra}
        onExtraChange={value => setForm(prev => ({ ...prev, amenitiesExtra: value }))}
      />
    </div>
  );
}

function StepMedia({
  propertyId,
  mediaItems,
  onUpload,
  onRemove,
  onSetCover,
  onReorder,
}: {
  propertyId?: string;
  mediaItems: MediaDTO[];
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSetCover: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {!propertyId && (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(248,113,113,0.4)",
            background: "rgba(248,113,113,0.12)",
            padding: "12px 16px",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          Guarda la informacion basica antes de subir media.
        </div>
      )}
      <MediaDropzone
        items={mediaItems}
        onUpload={files => onUpload(files)}
        onRemove={onRemove}
        onSetCover={onSetCover}
        onReorder={onReorder}
        uploading={!propertyId}
      />
    </div>
  );
}

function StepDocuments({
  propertyId,
  documents,
  onAttach,
  onDelete,
  onVerify,
  readiness,
}: {
  propertyId?: string;
  documents: DocumentDTO[];
  onAttach: (docType: DocumentTypeDTO, file: File) => void;
  onDelete: (doc: DocumentDTO) => void;
  onVerify: (doc: DocumentDTO, status: VerificationStatusDTO) => void;
  readiness: { kyc: boolean; completeness: boolean; rpp: boolean; priceDefined: boolean };
}) {
  const getDoc = (docType: DocumentTypeDTO) => documents.find(doc => doc.docType === docType) ?? null;
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {!propertyId && (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(248,113,113,0.4)",
            background: "rgba(248,113,113,0.12)",
            padding: "12px 16px",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          Guarda la propiedad antes de adjuntar documentos.
        </div>
      )}
      <div style={{ display: "grid", gap: 16 }}>
        {DOC_TYPES.map(item => {
          const doc = getDoc(item.type);
          return (
            <DocumentCard
              key={item.type}
              docType={item.type}
              document={doc ?? undefined}
              onUpload={file => onAttach(item.type, file)}
              onDelete={doc ? () => onDelete(doc) : undefined}
              onView={doc ? document => window.open(document.url ?? "#", "_blank", "noopener,noreferrer") : undefined}
              onVerify={doc ? status => onVerify(doc, status) : undefined}
              allowVerification={item.type === "rpp_certificate"}
            />
          );
        })}
      </div>
      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,0.28)",
          padding: "16px 18px",
          fontSize: 13,
          color: "#475569",
          background: "rgba(15,23,42,0.02)",
        }}
      >
        <strong>Checklist antes de publicar</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>{readiness.kyc ? "?" : "•"} KYC verificado</li>
          <li>{readiness.completeness ? "?" : "•"} Completitud = 80%</li>
          <li>{readiness.rpp ? "?" : "•"} Certificado RPP adjunto</li>
          <li>{readiness.priceDefined ? "?" : "•"} Precio, tipo y ubicacion definidos</li>
        </ul>
      </div>
    </div>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 14,
  color: "#0f172a",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.4)",
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "'Inter', system-ui, sans-serif",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
};

const primaryButtonStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "none",
  background: "#295DFF",
  color: "#fff",
  padding: "12px 20px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 14px 32px rgba(41,93,255,0.22)",
};

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "#fff",
  color: "#0f172a",
  padding: "12px 20px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

export type { WizardFormState };
export { initialFormState, StepBasics, StepLocation, StepDetails, StepAmenities, StepMedia, StepDocuments };



