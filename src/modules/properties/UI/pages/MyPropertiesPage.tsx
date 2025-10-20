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
import DesignBanner from "../utils/DesignBanner";
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

  const statItems = [
    { id: "borradores", label: "Borradores", value: counts.drafts },
    { id: "publicadas", label: "Publicadas", value: counts.published },
    { id: "vendidas", label: "Vendidas", value: counts.sold },
    { id: "total", label: "Total", value: counts.total },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.bannerStack}>
        <DesignBanner
          note="Esta vista replica la referencia 'dashboard-grid.png'. Sustituye los placeholders de imagen y remueve este banner al integrar assets y lógica final."
          storageKey="properties-dashboard-banner"
        />
        <header className={styles.header}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <span>Dashboard</span>
            <span aria-hidden="true">/</span>
            <span>Mis propiedades</span>
          </nav>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Mis propiedades</h1>
            <button type="button" onClick={() => navigate("/properties/new")} className={styles.newButton}>
              Nueva propiedad
            </button>
          </div>
          <section className={styles.stats} aria-label="Resumen de propiedades">
            {statItems.map(item => (
              <div key={item.id} className={styles.statCard}>
                <span className={styles.statLabel}>{item.label}</span>
                <span className={styles.statValue}>{item.value}</span>
              </div>
            ))}
          </section>
        </header>
      </div>

      {authProfileStatus !== "verified" && <KycBanner visible message="Para publicar propiedades necesitas tu KYC (INE) verificado." />}

      <div className={styles.filtersArea}>
        <FiltersBar values={filterValues} onChange={handleFilterChange} onReset={handleReset} disabled={loading} />
      </div>

      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}

      {viewMode === "grid" ? (
        <section className={styles.grid} aria-live="polite">
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
    <div className={styles.emptyCard}>
      <p>{message}</p>
      <button type="button" onClick={onReset} className={styles.emptyButton}>
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
    return <div className={styles.tableEmpty}>No hay propiedades en esta vista.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            {["Propiedad", "Estado", "Tipo", "Precio", "Ubicación", "Publicada", "Completitud", "RPP", "Acciones"].map(header => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(property => (
            <tr key={property.id} className={styles.row}>
              <td className={styles.cell}>
                <strong>{property.title}</strong>
                <span className={styles.cellMeta}>{property.id}</span>
              </td>
              <td className={styles.cell}>{formatStatus(property.status)}</td>
              <td className={styles.cell}>{property.propertyType}</td>
              <td className={styles.cell}>{formatCurrency(property.price.amount, property.price.currency)}</td>
              <td className={styles.cell}>
                {property.address.city}, {property.address.state}
              </td>
              <td className={styles.cell}>{property.publishedAt ? formatDate(property.publishedAt) : "-"}</td>
              <td className={styles.cell}>{Math.round(property.completenessScore)}%</td>
              <td className={styles.cell}>{formatVerification(property.rppVerification ?? null)}</td>
              <td className={styles.cell}>
                <button type="button" onClick={() => onAction("quick_view", property)} className={styles.tableAction}>
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
    <div className={styles.pagination}>
      <span>
        Página {page} de {totalPages}
      </span>
      <div className={styles.paginationControls}>
        <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className={styles.paginationBtn}>
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={styles.paginationBtn}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
