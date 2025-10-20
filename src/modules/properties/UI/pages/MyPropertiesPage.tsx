// Página principal de listado de propiedades.
// No tocar lógica de Application/Domain.
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
import DesignBanner from "../utils/DesignBanner";
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
  const {
    getAuthProfile,
    publishProperty,
    pauseProperty,
    markSold,
    deleteProperty,
    loading: actionLoading,
  } = usePropertiesActions();
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
    setFilters({
      q: undefined,
      status: "all",
      propertyType: undefined,
      city: undefined,
      state: undefined,
      priceMin: undefined,
      priceMax: undefined,
      sortBy: "recent",
      page: 1,
      pageSize,
    });
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
        void publishProperty({ id: property.id }).then(result => {
          if (result.isOk()) void refresh();
        });
        break;
      case "pause":
        void pauseProperty({ id: property.id }).then(result => {
          if (result.isOk()) void refresh();
        });
        break;
      case "mark_sold":
        setMarkSoldFor(property);
        break;
      case "view_public":
        window.open(`/p/${property.id}`, "_blank", "noopener,noreferrer");
        break;
      case "delete":
        setDeleteFor(property);
        break;
      default:
        break;
    }
  };

  const selectedProperty = selectedId ? getCachedById(selectedId) : null;

  const stats = useMemo(() => {
    const aggregate = { total: cache.size, draft: 0, published: 0, sold: 0 };
    cache.forEach(prop => {
      if (prop.status === "draft") aggregate.draft += 1;
      if (prop.status === "published") aggregate.published += 1;
      if (prop.status === "sold") aggregate.sold += 1;
    });
    return aggregate;
  }, [cache]);

  return (
    <main className="container stack" style={{ gap: "var(--gap)" }}>
      <DesignBanner
        note="Vista temporal de dashboard: sustituye placeholders e integra assets finales antes de liberar UI."
        storageKey="properties-dashboard-banner"
      />

      <header className="card" style={{ padding: "var(--gap)", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <nav aria-label="Breadcrumb" className="card-meta" style={{ gap: "8px" }}>
          <span>Dashboard</span>
          <span aria-hidden="true">/</span>
          <span>Mis propiedades</span>
        </nav>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap)", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 600 }}>Mis propiedades</h1>
          <button type="button" onClick={() => navigate("/properties/new")} className="btn btn-primary">
            Nueva propiedad
          </button>
        </div>
        <section aria-label="Resumen de propiedades" style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <StatCard label="Borradores" value={stats.draft} />
          <StatCard label="Publicadas" value={stats.published} />
          <StatCard label="Vendidas" value={stats.sold} />
          <StatCard label="Total" value={stats.total} />
        </section>
      </header>

      {authProfileStatus !== "verified" && (
        <KycBanner visible message="Para publicar propiedades necesitas tu KYC (INE) verificado." />
      )}

      <FiltersBar values={filterValues} onChange={handleFilterChange} onReset={handleReset} disabled={loading} />

      {error && (
        <div role="alert" className="card" style={{ padding: "var(--gap)", borderColor: "var(--danger)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {viewMode === "grid" ? (
        <section className="grid-responsive" aria-live="polite">
          {items.map(item => (
            <PropertyCard key={item.id} property={item} onAction={handleAction} />
          ))}
          {items.length === 0 && !loading && <EmptyState onReset={handleReset} message="No encontramos propiedades con esos filtros." />}
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
          void markSold({ id: prop.id, soldAt: new Date(soldAt) }).then(result => {
            if (result.isOk()) {
              setMarkSoldFor(null);
              void refresh();
            }
          });
        }}
        loading={actionLoading.markSold}
        defaultDate={markSoldFor?.soldAt ?? undefined}
      />

      <DeletePropertyModal
        open={Boolean(deleteFor)}
        propertyTitle={deleteFor?.title}
        onClose={() => setDeleteFor(null)}
        onConfirm={() => {
          const prop = deleteFor;
          if (!prop) return;
          void deleteProperty({ id: prop.id }).then(result => {
            if (result.isOk()) {
              setDeleteFor(null);
              void refresh();
            }
          });
        }}
        loading={actionLoading.deleteProperty}
      />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: "var(--gap)", gap: "4px" }}>
      <span className="muted" style={{ fontSize: "0.85rem" }}>
        {label}
      </span>
      <strong style={{ fontSize: "1.2rem" }}>{value}</strong>
    </div>
  );
}

function EmptyState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="card" style={{ padding: "var(--gap)", textAlign: "center", gap: "12px" }}>
      <p>{message}</p>
      <button type="button" onClick={onReset} className="btn">
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
    return <div className="card" style={{ padding: "var(--gap)" }}>No hay propiedades en esta vista.</div>;
  }

  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            {["Propiedad", "Estado", "Tipo", "Precio", "Ubicación", "Publicada", "Completitud", "RPP", "Acciones"].map(header => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(property => (
            <tr key={property.id}>
              <td>
                <strong>{property.title}</strong>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {property.id}
                </div>
              </td>
              <td>{formatStatus(property.status)}</td>
              <td>{property.propertyType}</td>
              <td>{formatCurrency(property.price.amount, property.price.currency)}</td>
              <td>
                {property.address.city}, {property.address.state}
              </td>
              <td>{property.publishedAt ? formatDate(property.publishedAt) : "-"}</td>
              <td>{Math.round(property.completenessScore)}%</td>
              <td>{formatVerification(property.rppVerification ?? "pending")}</td>
              <td>
                <button type="button" onClick={() => onAction("quick_view", property)} className="btn btn-ghost">
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
        flexWrap: "wrap",
        gap: "var(--gap)",
      }}
    >
      <span className="muted">
        Página {page} de {totalPages}
      </span>
      <div style={{ display: "flex", gap: "12px" }}>
        <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="btn">
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
