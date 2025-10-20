// Wizard compacto para publicar propiedades.
// No tocar lógica de Application/Domain.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PropertiesProvider } from "../containers/PropertiesProvider";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import AmenityChips, { DEFAULT_AMENITY_GROUPS } from "../components/AmenityChips";
import MediaDropzone from "../components/MediaDropzone";
import DocumentCard from "../components/DocumentCard";
import DesignBanner from "../utils/DesignBanner";
import { formatVerification } from "../utils/format";
import type { MediaDTO } from "../../application/dto/MediaDTO";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import type { Currency } from "../../domain/enums";
import { CURRENCY_VALUES } from "../../domain/enums";

interface DraftForm {
  propertyId: string | null;
  title: string;
  propertyType: string;
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
  propertyType: "house",
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
  const {
    createProperty,
    updateProperty,
    publishProperty,
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const payload = {
      title: form.title.trim() || "Propiedad sin título",
      description: form.description.trim() || null,
      propertyType: form.propertyType,
      price: { amount: Math.max(1, form.priceAmount), currency: form.priceCurrency },
      operationType: "sale" as const,
      address: {
        city: form.city.trim() || "Por definir",
        state: form.state.trim() || "Por definir",
        country: "MX",
        displayAddress: true,
      },
    };

    if (!form.propertyId) {
      const result = await createProperty(payload);
      if (result.isOk()) {
        const id = result.value.id;
        setForm(prev => ({ ...prev, propertyId: id }));
        await refreshDocs(id);
        setMessage("Borrador guardado.");
      } else {
        setMessage("No pudimos guardar el borrador.");
      }
    } else {
      const result = await updateProperty({ id: form.propertyId, patch: payload });
      setMessage(result.isOk() ? "Borrador actualizado." : "No pudimos actualizar el borrador.");
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
    const result = await publishProperty({ id: form.propertyId });
    if (result.isOk()) {
      navigate(`/properties/${form.propertyId}/admin`);
    } else {
      setMessage("No pudimos publicar la propiedad.");
    }
  };

  const handleUploadMedia = async (files: File[]) => {
    if (!form.propertyId) {
      setMessage("Guarda el borrador antes de subir media.");
      return;
    }
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const result = await uploadMedia({
        propertyId: form.propertyId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        data: buffer,
        type: file.type.startsWith("video") ? "video" : file.type.includes("pdf") ? "floorplan" : "image",
      });
      if (result.isOk()) setMediaItems(prev => [...prev, result.value]);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await removeMedia({ propertyId: form.propertyId, mediaId });
    if (result.isOk()) setMediaItems(prev => prev.filter(item => item.id !== mediaId));
  };

  const handleSetCover = async (mediaId: string) => {
    if (!form.propertyId) return;
    const result = await setCoverMedia({ propertyId: form.propertyId, mediaId });
    if (result.isOk()) {
      setMediaItems(prev => prev.map(item => ({ ...item, isCover: item.id === mediaId })));
    }
  };

  const handleReorder = async (orderedIds: string[]) => {
    if (!form.propertyId) return;
    const result = await reorderMedia({ propertyId: form.propertyId, orderedIds });
    if (result.isOk()) {
      setMediaItems(prev => {
        const map = new Map(prev.map(item => [item.id, item]));
        return orderedIds.map(id => map.get(id)).filter(Boolean) as MediaDTO[];
      });
    }
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

  const deleteDoc = async (doc: DocumentDTO) => {
    const result = await deleteDocument(doc.id);
    if (result.isOk() && form.propertyId) await refreshDocs(form.propertyId);
  };

  const verifyDoc = async (doc: DocumentDTO, status: VerificationStatusDTO) => {
    if (!form.propertyId) return;
    const result = await verifyRpp({ propertyId: form.propertyId, docId: doc.id, status });
    if (result.isOk()) await refreshDocs(form.propertyId);
  };

  const findDoc = (type: DocumentTypeDTO) => documents.find(doc => doc.docType === type) ?? null;

  return (
    <main className="container stack" style={{ gap: "var(--gap)" }}>
      <DesignBanner
        note="Wizard compacto: completa los campos mínimos, sube media y adjunta documentos clave."
        storageKey="properties-wizard-compact"
      />

      <section className="card" style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 600 }}>Datos básicos</h1>
        <div className="grid" style={{ gap: "var(--gap)", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label className="field-group">
            <span className="field-label">Título</span>
            <input className="input" value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} />
          </label>
          <label className="field-group">
            <span className="field-label">Tipo</span>
            <input className="input" value={form.propertyType} onChange={event => setForm(prev => ({ ...prev, propertyType: event.target.value }))} />
          </label>
          <label className="field-group">
            <span className="field-label">Precio</span>
            <input className="input" type="number" min={0} value={form.priceAmount} onChange={event => setForm(prev => ({ ...prev, priceAmount: Number(event.target.value) }))} />
          </label>
          <label className="field-group">
            <span className="field-label">Moneda</span>
            <select className="select" value={form.priceCurrency} onChange={event => setForm(prev => ({ ...prev, priceCurrency: event.target.value as Currency }))}>
              {CURRENCY_VALUES.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">Ciudad</span>
            <input className="input" value={form.city} onChange={event => setForm(prev => ({ ...prev, city: event.target.value }))} />
          </label>
          <label className="field-group">
            <span className="field-label">Estado</span>
            <input className="input" value={form.state} onChange={event => setForm(prev => ({ ...prev, state: event.target.value }))} />
          </label>
        </div>
        <label className="field-group">
          <span className="field-label">Descripción</span>
          <textarea className="textarea" rows={4} value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} />
        </label>
        <AmenityChips
          groups={DEFAULT_AMENITY_GROUPS}
          selected={form.amenities}
          onChange={next => setForm(prev => ({ ...prev, amenities: next }))}
          extraValue={form.amenitiesExtra}
          onExtraChange={value => setForm(prev => ({ ...prev, amenitiesExtra: value }))}
        />
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar borrador"}
        </button>
        {message && <span className="muted">{message}</span>}
      </section>

      <section className="card" style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Media</h2>
        <MediaDropzone
          items={mediaItems}
          onUpload={handleUploadMedia}
          onRemove={handleRemoveMedia}
          onSetCover={handleSetCover}
          onReorder={handleReorder}
        />
      </section>

      <section className="card" style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Documentos</h2>
        {(["rpp_certificate", "deed", "id_doc"] as DocumentTypeDTO[]).map(type => (
          <DocumentCard
            key={type}
            docType={type}
            document={findDoc(type)}
            onUpload={file => handleAttachDocument(type, file)}
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
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          Estado del RPP: {formatVerification(findDoc("rpp_certificate")?.verification ?? "pending")}
        </span>
      </section>

      <footer style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={!form.propertyId}>
          Publicar
        </button>
      </footer>
    </main>
  );
}
