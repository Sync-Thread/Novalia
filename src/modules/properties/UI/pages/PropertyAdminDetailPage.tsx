// Panel compacto de administración de propiedades.
// No tocar lógica de Application/Domain.
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PropertiesProvider } from "../containers/PropertiesProvider";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import DesignBanner from "../utils/DesignBanner";
import MediaDropzone from "../components/MediaDropzone";
import DocumentCard from "../components/DocumentCard";
import AmenityChips, { DEFAULT_AMENITY_GROUPS } from "../components/AmenityChips";
import QuickViewSheet from "../components/QuickViewSheet";
import MarkSoldModal from "../modals/MarkSoldModal";
import DeletePropertyModal from "../modals/DeletePropertyModal";
import { formatCurrency, formatDate, formatStatus, formatVerification } from "../utils/format";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { MediaDTO } from "../../application/dto/MediaDTO";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import type { Currency } from "../../domain/enums";
import { CURRENCY_VALUES } from "../../domain/enums";

interface EditForm {
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency: Currency;
  city: string;
  state: string;
  amenities: string[];
  amenitiesExtra: string;
}

const EMPTY_FORM: EditForm = {
  title: "",
  description: "",
  priceAmount: 0,
  priceCurrency: "MXN",
  city: "",
  state: "",
  amenities: [],
  amenitiesExtra: "",
};

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
  const {
    getProperty,
    updateProperty,
    publishProperty,
    pauseProperty,
    markSold,
    deleteProperty,
    uploadMedia,
    removeMedia,
    setCoverMedia,
    reorderMedia,
    attachDocument,
    deleteDocument,
    verifyRpp,
    listDocuments,
  } = usePropertiesActions();

  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [property, setProperty] = useState<PropertyDTO | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaDTO[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quickView, setQuickView] = useState(false);
  const [markSoldOpen, setMarkSoldOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    void loadProperty(id);
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    const result = await getProperty(propertyId);
    if (result.isOk()) {
      const data = result.value;
      setProperty(data);
      setForm({
        title: data.title,
        description: data.description ?? "",
        priceAmount: data.price.amount,
        priceCurrency: data.price.currency,
        city: data.address.city ?? "",
        state: data.address.state ?? "",
        amenities: data.amenities ?? [],
        amenitiesExtra: data.amenitiesExtra ?? "",
      });
      const docs = await listDocuments(propertyId);
      if (docs.isOk()) setDocuments(docs.value);
    }
  };

  const handleSave = async () => {
    if (!property) return;
    setSaving(true);
    setMessage(null);
    const result = await updateProperty({
      id: property.id,
      patch: {
        title: form.title.trim() || "Propiedad sin título",
        description: form.description.trim() || null,
        price: { amount: Math.max(1, form.priceAmount), currency: form.priceCurrency },
        amenities: form.amenities,
        amenitiesExtra: form.amenitiesExtra.trim() || null,
        address: {
          city: form.city.trim() || "Por definir",
          state: form.state.trim() || "Por definir",
          country: property.address.country ?? "MX",
          displayAddress: property.address.displayAddress ?? true,
        },
      },
    });
    setMessage(result.isOk() ? "Cambios guardados." : "No pudimos guardar los cambios.");
    setSaving(false);
    if (result.isOk()) void loadProperty(property.id);
  };

  const handlePublish = async () => {
    if (!property) return;
    await publishProperty({ id: property.id });
    void loadProperty(property.id);
  };

  const handlePause = async () => {
    if (!property) return;
    await pauseProperty({ id: property.id });
    void loadProperty(property.id);
  };

  const handleMarkSold = async ({ soldAt }: { soldAt: string; note?: string }) => {
    if (!property) return;
    await markSold({ id: property.id, soldAt: new Date(soldAt) });
    setMarkSoldOpen(false);
    void loadProperty(property.id);
  };

  const handleDelete = async () => {
    if (!property) return;
    await deleteProperty({ id: property.id });
    setDeleteOpen(false);
    navigate("/properties");
  };

  const handleUploadMedia = async (files: File[]) => {
    if (!property) return;
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const result = await uploadMedia({
        propertyId: property.id,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        data: buffer,
        type: file.type.startsWith("video") ? "video" : file.type.includes("pdf") ? "floorplan" : "image",
      });
      if (result.isOk()) setMediaItems(prev => [...prev, result.value]);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!property) return;
    const result = await removeMedia({ propertyId: property.id, mediaId });
    if (result.isOk()) setMediaItems(prev => prev.filter(item => item.id !== mediaId));
  };

  const handleSetCover = async (mediaId: string) => {
    if (!property) return;
    const result = await setCoverMedia({ propertyId: property.id, mediaId });
    if (result.isOk()) setMediaItems(prev => prev.map(item => ({ ...item, isCover: item.id === mediaId })));
  };

  const handleReorderMedia = async (orderedIds: string[]) => {
    if (!property) return;
    const result = await reorderMedia({ propertyId: property.id, orderedIds });
    if (result.isOk()) {
      setMediaItems(prev => {
        const map = new Map(prev.map(item => [item.id, item]));
        return orderedIds.map(id => map.get(id)).filter(Boolean) as MediaDTO[];
      });
    }
  };

  const attachDoc = async (type: DocumentTypeDTO, file: File) => {
    if (!property) return;
    const url = URL.createObjectURL(file);
    const result = await attachDocument({
      propertyId: property.id,
      docType: type,
      url,
      metadata: { fileName: file.name },
    });
    if (result.isOk()) {
      const docs = await listDocuments(property.id);
      if (docs.isOk()) setDocuments(docs.value);
    }
  };

  const deleteDoc = async (doc: DocumentDTO) => {
    const result = await deleteDocument(doc.id);
    if (result.isOk() && property) {
      const docs = await listDocuments(property.id);
      if (docs.isOk()) setDocuments(docs.value);
    }
  };

  const verifyDoc = async (doc: DocumentDTO, status: VerificationStatusDTO) => {
    if (!property) return;
    const result = await verifyRpp({ propertyId: property.id, docId: doc.id, status });
    if (result.isOk()) {
      const docs = await listDocuments(property.id);
      if (docs.isOk()) setDocuments(docs.value);
    }
  };

  const findDoc = (type: DocumentTypeDTO) => documents.find(doc => doc.docType === type) ?? null;

  if (!id) {
    return (
      <div className="app-container app-section">
        <p>Selecciona una propiedad válida.</p>
      </div>
    );
  }

  return (
    <main className="property-admin app-container">
      <DesignBanner
        note="Panel compacto: edita datos mínimos, revisa media y gestiona documentos antes de publicar."
        storageKey="properties-admin-compact"
      />

      {property && (
        <header className="form-section property-admin__header">
          <nav className="property-admin__breadcrumb" aria-label="Breadcrumb">
            <button type="button" className="btn btn-ghost" onClick={() => navigate("/properties")}>
              Mis propiedades
            </button>
            <span aria-hidden="true">/</span>
            <span>{property.title}</span>
          </nav>
          <div className="property-admin__headline">
            <div className="property-admin__summary">
              <h1 className="property-admin__title">{property.title}</h1>
              <p className="property-admin__meta">{formatCurrency(property.price.amount, property.price.currency)}</p>
              <p className="property-admin__meta">
                {formatStatus(property.status)} • Creada {formatDate(property.createdAt ?? "")}
              </p>
            </div>
            <div className="property-admin__actions">
              <button type="button" className="btn" onClick={() => setQuickView(true)}>
                Vista rapida
              </button>
              {property.status === "draft" && (
                <button type="button" className="btn btn-primary" onClick={handlePublish}>
                  Publicar
                </button>
              )}
              {property.status === "published" && (
                <button type="button" className="btn" onClick={handlePause}>
                  Pausar
                </button>
              )}
              <button type="button" className="btn" onClick={() => setMarkSoldOpen(true)}>
                Marcar vendida
              </button>
              <button type="button" className="btn btn-ghost property-admin__danger" onClick={() => setDeleteOpen(true)}>
                Eliminar
              </button>
            </div>
          </div>
        </header>
      )}

      // Distribución a 2 columnas: igual a diseño de referencia. No tocar lógica.
      <section className="form-section">
        <header className="wizard-card__header">
          <h2 className="form-section__title">Datos basicos</h2>
          <p className="form-section__subtitle">Actualiza la informacion clave de la propiedad.</p>
        </header>
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">Titulo</span>
            <input className="input" value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} />
          </label>
          <label className="field-group">
            <span className="field-label">Precio</span>
            <input className="input" type="number" min={0} value={form.priceAmount} onChange={event => setForm(prev => ({ ...prev, priceAmount: Number(event.target.value) }))} />
          </label>
          <label className="field-group">
            <span className="field-label">Moneda</span>
            <div className="select-control">
              <select
                className="select-control__native"
                value={form.priceCurrency}
                onChange={event => setForm(prev => ({ ...prev, priceCurrency: event.target.value as Currency }))}
              >
                {CURRENCY_VALUES.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="field-group">
            <span className="field-label">Ciudad</span>
            <input className="input" value={form.city} onChange={event => setForm(prev => ({ ...prev, city: event.target.value }))} />
          </label>
          <label className="field-group">
            <span className="field-label">Estado</span>
            <input className="input" value={form.state} onChange={event => setForm(prev => ({ ...prev, state: event.target.value }))} />
          </label>
          <label className="field-group form-col-2">
            <span className="field-label">Descripcion</span>
            <textarea className="textarea" rows={4} value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} />
          </label>
          <div className="form-col-2">
            <AmenityChips
              groups={DEFAULT_AMENITY_GROUPS}
              selected={form.amenities}
              onChange={next => setForm(prev => ({ ...prev, amenities: next }))}
              extraValue={form.amenitiesExtra}
              onExtraChange={value => setForm(prev => ({ ...prev, amenitiesExtra: value }))}
            />
          </div>
        </div>
        <div className="property-admin__form-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {message && <span className="muted">{message}</span>}
        </div>
      </section>

      <section className="form-section">
        <header className="wizard-card__header">
          <h2 className="form-section__title">Media</h2>
          <p className="form-section__subtitle">Gestiona la galeria de la propiedad.</p>
        </header>
        <div className="form-grid">
          <div className="form-col-2">
            <MediaDropzone
              items={mediaItems}
              onUpload={handleUploadMedia}
              onRemove={handleRemoveMedia}
              onSetCover={handleSetCover}
              onReorder={handleReorderMedia}
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <header className="wizard-card__header">
          <h2 className="form-section__title">Documentos</h2>
          <p className="form-section__subtitle">Adjunta y revisa los archivos requeridos.</p>
        </header>
        <div className="form-grid">
          <div className="wizard-docs form-col-2">
            {(["rpp_certificate", "deed", "id_doc"] as DocumentTypeDTO[]).map(type => (
              <DocumentCard
                key={type}
                docType={type}
                document={findDoc(type)}
                onUpload={file => attachDoc(type, file)}
                onDelete={() => {
                  const doc = findDoc(type);
                  if (doc) deleteDoc(doc);
                }}
                onVerify={status => {
                  const doc = findDoc(type);
                  if (doc) verifyDoc(doc, status);
                }}
                allowVerification={type === "rpp_certificate"}
              />
            ))}
          </div>
          <span className="wizard-note form-col-2">
            Estado del RPP: {formatVerification(findDoc("rpp_certificate")?.verification ?? "pending")}
          </span>
        </div>
      </section>

      {property && (
        <QuickViewSheet
          propertyId={property.id}
          initialProperty={property}
          open={quickView}
          onClose={() => setQuickView(false)}
          onRefresh={() => loadProperty(property.id)}
          onEdit={() => undefined}
        />
      )}

      <MarkSoldModal open={markSoldOpen} onClose={() => setMarkSoldOpen(false)} onConfirm={handleMarkSold} />
      <DeletePropertyModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} propertyTitle={property?.title} />
    </main>
  );
}
