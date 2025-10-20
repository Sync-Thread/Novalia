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
import styles from "./MyPropertiesPage.module.css";

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
  const [authStatus, setAuthStatus] = useState<"verified" | "pending" | "rejected">("pending");
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markSoldFor, setMarkSoldFor] = useState<PropertyDTO | null>(null);
  const [deleteFor, setDeleteFor] = useState<PropertyDTO | null>(null);

  useEffect(() => {
    void getAuthProfile().then(result => {
      if (result.isOk()) setAuthStatus(result.value.kycStatus);
    });
  }, [getAuthProfile]);

  const filterValues: FiltersBarValues = useMemo(
    () => ({
      ...filters,
      viewMode,
    }),
    [filters, viewMode],
  );

  const stats = useMemo(() => {
    const acc = { total: cache.size, draft: 0, published: 0, sold: 0 };
    cache.forEach(property => {
      if (property.status === "draft") acc.draft += 1;
      if (property.status === "published") acc.published += 1;
      if (property.status === "sold") acc.sold += 1;
    });
    return acc;
  }, [cache]);

  const handleFilterChange = (patch: Partial<FiltersBarValues>) => {
    if ("viewMode" in patch && patch.viewMode) {
      setViewMode(patch.viewMode);
    }
    const { viewMode: _omit, ...rest } = patch;
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
        setQuickOpen(true);
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

  return (
    <main className={styles.pagina}>
      <DesignBanner
        note="Esta vista replica la referencia de dashboard de propiedades. Sustituye placeholders y remueve el banner cuando integres assets finales."
        storageId="properties-dashboard"
      />

      <header className={styles.cabecera}>
        <nav className={styles.migas} aria-label="Ruta de navegación">
          <span>Dashboard</span>
          <span>/</span>
          <span>Mis propiedades</span>
        </nav>
        <div className={styles.tituloFila}>
          <h1 className={styles.titulo}>Mis propiedades</h1>
          <button type="button" onClick={() => navigate("/properties/new")} className={styles.btnPrincipal}>
            Nueva propiedad
          </button>
        </div>
        <section className={styles.resumen} aria-label="Resumen de propiedades">
          <ResumenCard label="Borradores" value={stats.draft} />
          <ResumenCard label="Publicadas" value={stats.published} />
          <ResumenCard label="Vendidas" value={stats.sold} />
          <ResumenCard label="Total" value={stats.total} />
        </section>
      </header>

      {authStatus !== "verified" && <KycBanner visible />}

      <FiltersBar values={filterValues} onChange={handleFilterChange} onReset={handleReset} disabled={loading} />

      {error && (
        <div role="alert" className={styles.alerta}>
          {error}
        </div>
      )}

      {viewMode === "grid" ? (
        <section className={styles.lista} aria-live="polite">
          {items.map(property => (
            <PropertyCard key={property.id} property={property} onAction={handleAction} />
          ))}
          {!loading && items.length === 0 && (
            <div className={styles.vacio}>
              <p>No encontramos propiedades con esos filtros.</p>
              <button type="button" onClick={handleReset} className={styles.btnPrincipal}>
                Limpiar filtros
              </button>
            </div>
          )}
        </section>
      ) : (
        <PropertyListTable items={items} loading={loading} onAction={handleAction} />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />

      <QuickViewSheet
        propertyId={selectedId}
        initialProperty={selectedProperty ?? undefined}
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onRefresh={refresh}
        onEdit={id => navigate(`/properties/${id}/admin`)}
        onViewPublic={prop => window.open(`/p/${prop.id}`, "_blank", "noopener,noreferrer")}
      />

      <MarkSoldModal
        open={Boolean(markSoldFor)}
        onClose={() => setMarkSoldFor(null)}
        defaultDate={markSoldFor?.soldAt ?? undefined}
        loading={actions.loading.markSold}
        onConfirm={({ soldAt }) => {
          const property = markSoldFor;
          if (!property) return;
          void actions.markSold({ id: property.id, soldAt: new Date(soldAt) }).then(result => {
            if (result.isOk()) {
              setMarkSoldFor(null);
              void refresh();
            }
          });
        }}
      />

      <DeletePropertyModal
        open={Boolean(deleteFor)}
        propertyTitle={deleteFor?.title}
        onClose={() => setDeleteFor(null)}
        loading={actions.loading.deleteProperty}
        onConfirm={() => {
          const property = deleteFor;
          if (!property) return;
          void actions.deleteProperty({ id: property.id }).then(result => {
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

function ResumenCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.tarjeta}>
      <span className={styles.tarjetaLabel}>{label}</span>
      <span className={styles.tarjetaValor}>{value}</span>
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
    return <div className={styles.vacio}>No hay propiedades en esta vista.</div>;
  }

  return (
    <div className={styles.tabla}>
      <table className={styles.tablaTable}>
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
                <div style={{ fontSize: 12, color: "var(--text-500, #64748b)" }}>{property.id}</div>
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
                <button type="button" onClick={() => onAction("quick_view", property)} className={styles.tablaBtn}>
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
    <div className={styles.paginacion}>
      <span>
        Página {page} de {totalPages}
      </span>
      <div className={styles.paginacionControles}>
        <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className={styles.paginacionBtn}>
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={styles.paginacionBtn}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
