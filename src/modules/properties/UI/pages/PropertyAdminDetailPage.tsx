import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PropertiesProvider } from "../containers/PropertiesProvider";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { MediaDTO, MediaTypeDTO } from "../../application/dto/MediaDTO";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import type { Condition, Currency, Orientation } from "../../domain/enums";
import { CONDITION_VALUES, CURRENCY_VALUES, ORIENTATION_VALUES } from "../../domain/enums";
import MarkSoldModal from "../modals/MarkSoldModal";
import DeletePropertyModal from "../modals/DeletePropertyModal";
import QuickViewSheet from "../components/QuickViewSheet";
import {
  type WizardFormState,
  initialFormState,
  StepBasics,
  StepLocation,
  StepDetails,
  StepAmenities,
  StepMedia,
  StepDocuments,
} from "./PublishWizardPage";
import { formatCurrency, formatDate, formatStatus } from "../utils/format";


export default function PropertyAdminDetailPage() {
  return (
    <PropertiesProvider>
      <PropertyAdminDetail />
    </PropertiesProvider>
  );
}

function PropertyAdminDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const actions = usePropertiesActions();

  const [form, setForm] = useState<WizardFormState>(initialFormState);
  const [mediaItems, setMediaItems] = useState<MediaDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [serverProperty, setServerProperty] = useState<PropertyDTO | null>(null);
  const [authKyc, setAuthKyc] = useState<"verified" | "pending" | "rejected">("pending");
  const [markSoldFor, setMarkSoldFor] = useState<PropertyDTO | null>(null);
  const [deleteFor, setDeleteFor] = useState<PropertyDTO | null>(null);
  const [quickView, setQuickView] = useState(false);

  useEffect(() => {
    void actions.getAuthProfile().then(result => {
      if (result.isOk()) setAuthKyc(result.value.kycStatus);
    });
  }, [actions]);

  useEffect(() => {
    if (id) {
      void loadProperty(id);
    }
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    const result = await actions.getProperty(propertyId);
    if (result.isOk()) {
      setServerProperty(result.value);
      setForm(mapPropertyToForm(result.value));
      await loadDocuments(propertyId);
    }
  };

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

  const saveBasics = async () => {
    if (!form.propertyId) return;
    await actions.updateProperty({
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
    await loadProperty(form.propertyId);
  };

  const saveLocation = async () => {
    if (!form.propertyId) return;
    await actions.updateProperty({
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
    await loadProperty(form.propertyId);
  };

  const saveDetails = async () => {
    if (!form.propertyId) return;
    await actions.updateProperty({
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
      hoaFee: form.details.hoaFee
        ? { amount: Number(form.details.hoaFee), currency: normalizeCurrency(form.priceCurrency) }
        : null,
      condition: normalizeCondition(form.details.condition || null),
      furnished: form.details.furnished,
      petFriendly: form.details.petFriendly,
      orientation: normalizeOrientation(form.details.orientation || null),
      },
    });
    await loadProperty(form.propertyId);
  };

  const saveAmenities = async () => {
    if (!form.propertyId) return;
    await actions.updateProperty({
      id: form.propertyId,
      patch: {
        amenities: form.amenities,
        amenitiesExtra: form.amenitiesExtra || null,
      },
    });
    await loadProperty(form.propertyId);
  };

  const handleMediaUpload = async (files: File[]) => {
    if (!form.propertyId) return;
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
      if (result.isOk()) setMediaItems(prev => [...prev, result.value]);
    }
  };

  const guessMediaType = (mime: string): MediaTypeDTO => {
    if (mime.startsWith("video")) return "video";
    if (mime.includes("pdf")) return "floorplan";
    return "image";
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await actions.removeMedia({ propertyId: form.propertyId, mediaId });
    if (result.isOk()) setMediaItems(prev => prev.filter(item => item.id !== mediaId));
  };

  const handleSetCover = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await actions.setCoverMedia({ propertyId: form.propertyId, mediaId });
    if (result.isOk()) {
      setMediaItems(prev => prev.map(item => ({ ...item, isCover: item.id === mediaId })));
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
    const response = await actions.listDocuments(propertyId);
    if (response.isOk()) setDocuments(response.value);
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
    if (result.isOk()) await loadDocuments(form.propertyId);
  };

  const handleDeleteDocument = async (doc: DocumentDTO) => {
    const result = await actions.deleteDocument(doc.id);
    if (result.isOk() && form.propertyId) await loadDocuments(form.propertyId);
  };

  const handleVerifyDocument = async (doc: DocumentDTO, status: VerificationStatusDTO) => {
    if (!form.propertyId) return;
    const result = await actions.verifyRpp({ propertyId: form.propertyId, docId: doc.id, status });
    if (result.isOk()) await loadDocuments(form.propertyId);
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

  const handlePublish = async () => {
    if (!form.propertyId) return;
    const result = await actions.publishProperty({ id: form.propertyId });
    if (result.isOk()) await loadProperty(form.propertyId);
  };

  const handlePause = async () => {
    if (!form.propertyId) return;
    const result = await actions.pauseProperty({ id: form.propertyId });
    if (result.isOk()) await loadProperty(form.propertyId);
  };

  const handleMarkSold = async (soldAt: string) => {
    if (!form.propertyId) return;
    const result = await actions.markSold({ id: form.propertyId, soldAt: new Date(soldAt) });
    if (result.isOk()) {
      await loadProperty(form.propertyId);
      setMarkSoldFor(null);
    }
  };

  const handleDelete = async () => {
    if (!form.propertyId) return;
    const result = await actions.deleteProperty({ id: form.propertyId });
    if (result.isOk()) {
      navigate("/properties");
    }
  };

  if (!id) {
    return <p style={{ padding: 32 }}>Selecciona una propiedad valida.</p>;
  }

  return (
    <main
      style={{
        padding: "32px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {serverProperty && (
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <button
              type="button"
              onClick={() => navigate("/properties")}
              style={{ border: "none", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}
            >
              ? Mis propiedades
            </button>
            <h1
              style={{
                margin: "8px 0 4px",
                fontSize: 28,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {serverProperty.title}
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              {formatCurrency(serverProperty.price.amount, serverProperty.price.currency)} ·{" "}
              {serverProperty.address.city}, {serverProperty.address.state}
            </p>
            <p style={{ margin: "6px 0", color: "#94a3b8", fontSize: 12 }}>
              {formatStatus(serverProperty.status)} · Creada {formatDate(serverProperty.createdAt)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setQuickView(true)} style={secondaryButtonStyle}>
              Vista rapida
            </button>
            {serverProperty.status === "draft" && (
              <button type="button" onClick={handlePublish} style={primaryButtonStyle}>
                Publicar
              </button>
            )}
            {serverProperty.status === "published" && (
              <button type="button" onClick={handlePause} style={secondaryButtonStyle}>
                Pausar
              </button>
            )}
            <button type="button" onClick={() => setMarkSoldFor(serverProperty)} style={secondaryButtonStyle}>
              Marcar vendida
            </button>
            <button
              type="button"
              onClick={() => setDeleteFor(serverProperty)}
              style={{ ...secondaryButtonStyle, color: "#b91c1c", borderColor: "rgba(239,68,68,0.35)" }}
            >
              Eliminar
            </button>
          </div>
        </header>
      )}

      <SectionCard title="Basicos" onSave={saveBasics}>
        <StepBasics form={form} setForm={setForm} serverProperty={serverProperty} />
      </SectionCard>

      <SectionCard title="Ubicacion" onSave={saveLocation}>
        <StepLocation form={form} setForm={setForm} />
      </SectionCard>

      <SectionCard title="Detalles" onSave={saveDetails}>
        <StepDetails form={form} setForm={setForm} />
      </SectionCard>

      <SectionCard title="Amenidades" onSave={saveAmenities}>
        <StepAmenities form={form} setForm={setForm} />
      </SectionCard>

      <SectionCard title="Media">
        <StepMedia
          propertyId={form.propertyId}
          mediaItems={mediaItems}
          onUpload={handleMediaUpload}
          onRemove={handleRemoveMedia}
          onSetCover={handleSetCover}
          onReorder={handleReorderMedia}
        />
      </SectionCard>

      <SectionCard title="Documentos">
        <StepDocuments
          propertyId={form.propertyId}
          documents={documents}
          onAttach={handleAttachDocument}
          onDelete={handleDeleteDocument}
          onVerify={handleVerifyDocument}
          readiness={readiness}
        />
      </SectionCard>

      <QuickViewSheet
        propertyId={form.propertyId ?? null}
        initialProperty={serverProperty ?? undefined}
        open={quickView}
        onClose={() => setQuickView(false)}
        onRefresh={() => form.propertyId && loadProperty(form.propertyId)}
        onEdit={() => undefined}
      />

      <MarkSoldModal
        open={Boolean(markSoldFor)}
        onClose={() => setMarkSoldFor(null)}
        onConfirm={({ soldAt }) => handleMarkSold(soldAt)}
        defaultDate={markSoldFor?.soldAt ?? undefined}
      />

      <DeletePropertyModal
        open={Boolean(deleteFor)}
        propertyTitle={deleteFor?.title}
        onClose={() => setDeleteFor(null)}
        onConfirm={handleDelete}
      />
    </main>
  );
}

function SectionCard({ title, children, onSave }: { title: string; children: React.ReactNode; onSave?: () => void }) {
  return (
    <section
      style={{
        borderRadius: 24,
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
        background: "#fff",
        padding: "28px 32px",
        display: "grid",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
        {onSave && (
          <button type="button" onClick={onSave} style={secondaryButtonStyle}>
            Guardar cambios
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

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
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};



