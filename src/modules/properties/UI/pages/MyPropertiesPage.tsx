import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PropertiesProvider } from "../containers/PropertiesProvider";
import { usePropertyList } from "../hooks/usePropertyList";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import FiltersBar, { type FiltersBarValues, type ViewMode } from "../components/FiltersBar";
import KycBanner from "../components/KycBanner";
import PropertyCard, { type PropertyCardAction } from "../components/PropertyCard";
import QuickViewSheet from "../components/QuickViewSheet";
import MarkSoldModal from "../modals/MarkSoldModal";
import DeletePropertyModal from "../modals/DeletePropertyModal";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import { formatCurrency, formatDate, formatStatus, formatVerification } from "../utils/format";

export default function MyPropertiesPage() {
  return (
    <PropertiesProvider>
      <MyPropertiesPageContent />
    </PropertiesProvider>
  );
}

function MyPropertiesPageContent() {
  const navigate = useNavigate();
  const { filters, items, loading, error, setFilters, refresh, setPage, page, pageSize, total, cache, getCachedById } =
    usePropertyList();
  const actions = usePropertiesActions();
  const { getAuthProfile } = actions;
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [authProfileStatus, setAuthProfileStatus] = useState<"verified" | "pending" | "rejected">("pending");
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markSoldFor, setMarkSoldFor] = useState<PropertyDTO | null>(null);
  const [deleteFor, setDeleteFor] = useState<PropertyDTO | null>(null);

  useEffect(() => {
    void getAuthProfile().then(result => {
      if (result.isOk()) {
        setAuthProfileStatus(result.value.kycStatus);
      }
    });
  }, [getAuthProfile]);

  const filterValues: FiltersBarValues = useMemo(
    () => ({
      ...filters,
      viewMode,
    }),
    [filters, viewMode],
  );

  const handleFilterChange = (patch: Partial<FiltersBarValues>) => {
    if ("viewMode" in patch && patch.viewMode) {
      setViewMode(patch.viewMode);
    }
    const { viewMode: _viewMode, ...rest } = patch;
    if (Object.keys(rest).length > 0) {
      setFilters(rest);
    }
  };

  const handleReset = () => {
    setViewMode("grid");
    setFilters(() => ({
      q: undefined,
      status: "all",
      propertyType: undefined,
      city: undefined,
      state: undefined,
      priceMin: undefined,
      priceMax: undefined,
      sortBy: "recent",
    }));
  };

  const handleAction = (action: PropertyCardAction, property: PropertyDTO) => {
    switch (action) {
      case "quick_view":
        setSelectedId(property.id);
        setQuickViewOpen(true);
        break;
      case "edit":
        navigate(`/properties/${property.id}/admin`);
        break;
      case "publish":
        void actions.publishProperty({ id: property.id }).then(result => {
          if (result.isOk()) void refresh();
        });
        break;
      case "pause":
        void actions.pauseProperty({ id: property.id }).then(result => {
          if (result.isOk()) void refresh();
        });
        break;
      case "mark_sold":
        setMarkSoldFor(property);
        break;
      case "view_public": {
        const path = `/p/${property.id}`;
        window.open(path, "_blank", "noopener,noreferrer");
        break;
      }
      case "delete":
        setDeleteFor(property);
        break;
      default:
        break;
    }
  };

  const selectedProperty = selectedId ? getCachedById(selectedId) : null;

  const counts = useMemo(() => {
    const aggregate = { total: cache.size, drafts: 0, published: 0, sold: 0 };
    cache.forEach(prop => {
      if (prop.status === "draft") aggregate.drafts += 1;
      if (prop.status === "published") aggregate.published += 1;
      if (prop.status === "sold") aggregate.sold += 1;
    });
    return aggregate;
  }, [cache]);

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
        <nav style={{ fontSize: 13, color: "#94a3b8" }}>Dashboard / Mis propiedades</nav>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Mis propiedades
          </h1>
          <button
            type="button"
            onClick={() => navigate("/properties/new")}
            style={{
              border: "none",
              background: "#295DFF",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 14px 32px rgba(41,93,255,0.22)",
            }}
          >
            Nueva propiedad
          </button>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#475569" }}>
          <strong>{counts.total} propiedades</strong>
          <span>Borradores: {counts.drafts}</span>
          <span>Publicadas: {counts.published}</span>
          <span>Vendidas: {counts.sold}</span>
        </div>
      </header>

      <KycBanner visible={authProfileStatus !== "verified"} />

      <FiltersBar values={filterValues} onChange={handleFilterChange} onReset={handleReset} disabled={loading} />

      {error && (
        <div
          role="alert"
          style={{
            borderRadius: 12,
            border: "1px solid rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.1)",
            color: "#b91c1c",
            padding: "14px 16px",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {viewMode === "grid" ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {items.map(item => (
            <PropertyCard key={item.id} property={item} onAction={handleAction} />
          ))}
          {items.length === 0 && !loading && (
            <EmptyState onReset={handleReset} message="No encontramos propiedades con esos filtros." />
          )}
        </section>
      ) : (
        <PropertyListTable items={items} loading={loading} onAction={handleAction} />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />

      <QuickViewSheet
        propertyId={selectedId}
        initialProperty={selectedProperty ?? undefined}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        onRefresh={refresh}
        onEdit={id => navigate(`/properties/${id}/admin`)}
        onViewPublic={prop => window.open(`/p/${prop.id}`, "_blank", "noopener,noreferrer")}
      />

      <MarkSoldModal
        open={Boolean(markSoldFor)}
        onClose={() => setMarkSoldFor(null)}
        onConfirm={({ soldAt }) => {
          const prop = markSoldFor;
          if (!prop) return;
          void actions.markSold({ id: prop.id, soldAt: new Date(soldAt) }).then(result => {
            if (result.isOk()) {
              setMarkSoldFor(null);
              void refresh();
            }
          });
        }}
        defaultDate={markSoldFor?.soldAt ?? undefined}
      />

      <DeletePropertyModal
        open={Boolean(deleteFor)}
        propertyTitle={deleteFor?.title}
        onClose={() => setDeleteFor(null)}
        onConfirm={() => {
          const prop = deleteFor;
          if (!prop) return;
          void actions.deleteProperty({ id: prop.id }).then(result => {
            if (result.isOk()) {
              setDeleteFor(null);
              void refresh();
            }
          });
        }}
      />
    </main>
  );
}

function EmptyState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        textAlign: "center",
        borderRadius: 16,
        border: "1px dashed rgba(148,163,184,0.4)",
        padding: "48px 24px",
        color: "#64748b",
        fontSize: 15,
      }}
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onReset}
        style={{
          border: "none",
          background: "#295DFF",
          color: "#fff",
          padding: "10px 18px",
          borderRadius: 10,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 12px 24px rgba(41,93,255,0.18)",
        }}
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function PropertyListTable({
  items,
  loading,
  onAction,
}: {
  items: PropertyDTO[];
  loading: boolean;
  onAction: (action: PropertyCardAction, property: PropertyDTO) => void;
}) {
  if (!loading && items.length === 0) {
    return (
      <div style={{ borderRadius: 16, border: "1px solid rgba(148,163,184,0.35)", padding: 24, color: "#64748b" }}>
        No hay propiedades en esta vista.
      </div>
    );
  }
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.25)",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <thead style={{ background: "rgba(15,23,42,0.04)", textAlign: "left" }}>
          <tr>
            {["Propiedad", "Estado", "Tipo", "Precio", "Ubicaci\u00F3n", "Publicada", "Completitud", "RPP", "Acciones"].map(
              header => (
                <th key={header} style={{ padding: "12px 16px", fontSize: 12, color: "#475569" }}>
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {items.map(property => (
            <tr key={property.id} style={{ borderTop: "1px solid rgba(148,163,184,0.15)" }}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{property.title}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{property.id}</div>
              </td>
              <td style={tdStyle}>{formatStatus(property.status)}</td>
              <td style={tdStyle}>{property.propertyType}</td>
              <td style={tdStyle}>{formatCurrency(property.price.amount, property.price.currency)}</td>
              <td style={tdStyle}>
                {property.address.city}, {property.address.state}
              </td>
              <td style={tdStyle}>{property.publishedAt ? formatDate(property.publishedAt) : "-"}</td>
              <td style={tdStyle}>{Math.round(property.completenessScore)}%</td>
              <td style={tdStyle}>{formatVerification(property.rppVerification ?? null)}</td>
              <td style={tdStyle}>
                <button
                  type="button"
                  onClick={() => onAction("quick_view", property)}
                  style={{
                    border: "none",
                    background: "rgba(41,93,255,0.12)",
                    color: "#295DFF",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Acciones
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  color: "#475569",
};

function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 16,
        borderTop: "1px solid rgba(148,163,184,0.2)",
        fontSize: 13,
        color: "#475569",
      }}
    >
      <span>
        Página {page} de {totalPages}
      </span>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} style={paginationBtnStyle}>
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={paginationBtnStyle}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

const paginationBtnStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "#fff",
  color: "#1e293b",
  padding: "8px 12px",
  cursor: "pointer",
};
