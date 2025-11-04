import { useNavigate } from "react-router-dom";
import { PropertiesProvider } from "../../containers/PropertiesProvider";
import { usePropertyList } from "../../hooks/usePropertyList";
import { usePropertiesActions } from "../../hooks/usePropertiesActions";
import type { FiltersBarValues, PropertyCardAction, ViewMode } from "./components";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PropertyDTO } from "../../../application/dto/PropertyDTO";
import { SearchIcon } from "lucide-react";
import DesignBanner from "../../utils/DesignBanner";
import styles from "./TransactionsAndContracts.module.css";
import { FiltersBar, PropertyCard, PropertyQuickView } from "../..";
import { formatCurrency, formatDate, formatStatus, formatVerification } from "../../utils/format";



export default function TransactionContracts() {
  return (
    <PropertiesProvider>
        <PropertyDashboard/>
    </PropertiesProvider>
  );
}

function PropertyDashboard() {
    const navigate = useNavigate();
    const {
        filters,
        items,
        loading,
        error,
        setFilters,
        refresh,
        setPage,
        page,
        pageSize,
        total,
        cache,
      } = usePropertyList();
    
    const actions = usePropertiesActions();

    const { getAuthProfile } = actions;

    const [viewMode, setViewMode] = useState<ViewMode>("grid");
      const [authStatus, setAuthStatus] = useState<
        "verified" | "pending" | "rejected"
      >("pending");
    
    const [quickOpen, setQuickOpen] = useState(false);
      const [selectedId, setSelectedId] = useState<string | null>(null);
      const [markSoldFor, setMarkSoldFor] = useState<PropertyDTO | null>(null);
      const [deleteFor, setDeleteFor] = useState<PropertyDTO | null>(null);
    
      const closeQuickView = useCallback(() => {
        setQuickOpen(false);
        setSelectedId(null);
      }, []);
    
      useEffect(() => {
        void getAuthProfile().then((result) => {
          if (result.isOk()) setAuthStatus(result.value.kycStatus);
          console.log("resultado: ", result);
          console.log("resultadOK: ", result.isOk());
        });
      }, [getAuthProfile]);
    
      const filterValues: FiltersBarValues = useMemo(
        () => ({
          ...filters,
          viewMode,
        }),
        [filters, viewMode]
      );
    
      const stats = useMemo(() => {
        const acc = { total: cache.size, pending: 0, canceled: 0, vigent: 0 };
        cache.forEach((property) => {
          const status = String(property.status);
          if (status === "pending") acc.pending += 1;
          if (status === "canceled") acc.canceled += 1;
          if (status === "vigent") acc.vigent += 1;
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
            navigate(`/properties/${property.id}/edit`);
            break;
          case "publish":
            void actions.publishProperty({ id: property.id }).then((result) => {
              if (result.isOk()) void refresh();
            });
            break;
          case "pause":
            void actions.pauseProperty({ id: property.id }).then((result) => {
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
      
    return(
        <>
            <main className={`${styles.pagina} app-container`}>
              <DesignBanner
              note="Vista unificada de Propiedades y Contratos. Puedes eliminar este banner cuando integres tu API."
              storageId="properties-contracts-dashboard"
            />
            <header className={styles.cabecera}>
              <div className={styles.tituloFila}>
                <h1 className={styles.titulo}>Mis contratos</h1>
              </div>
              <section className={styles.resumen} aria-label="Resumen de propiedades">
                <ResumenCard label="Pendientes" value={stats.pending} />
                <ResumenCard label="Vigentes" value={stats.vigent} />
                <ResumenCard label="Rechazadas" value={stats.canceled} />
                <ResumenCard label="Total" value={stats.total} />
              </section>
            </header>
            <section aria-label="Contract dashboard">
              <FiltersBar
                values={filterValues}
                onChange={handleFilterChange}
                onReset={handleReset}
                disabled={loading}
              />

              {error && (
                <div role="alert" className={styles.alerta}>
                  {error}
                </div>
              )}
              {viewMode === "grid" ? (
                <section className={styles.lista} aria-live="polite">
                  {items.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onAction={handleAction}
                    />
                  ))}
                  {!loading && items.length === 0 && (
                    <div className={styles.vacio}>
                      <p>No encontramos propiedades con esos filtros.</p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className={styles.btnPrincipal}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                <PropertyListTable
                  items={items}
                  loading={loading}
                  onAction={handleAction}
                />
              )}
            </section>
            <footer>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onChange={setPage}
              />
              <PropertyQuickView
                propertyId={selectedId}
                open={quickOpen}
                onClose={closeQuickView}
              />
            </footer>
            </main>
        </>
    );
}

function propiedades() {abel, value }: { label: string; value: number }) {
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
    return (
      <div className={styles.vacio}>No hay propiedades en esta vista.</div>
    );
  }

  return (
    <div className={styles.tabla}>
      <table className={styles.tablaTable}>
        <thead>
          <tr>
            {[
              "Propiedad",
              "Estado",
              "Tipo",
              "Precio",
              "Ubicación",
              "Publicada",
              "Completitud",
              "RPP",
              "Acciones",
            ].map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((property) => (
            <tr
              key={property.id}
              onClick={() => onAction("quick_view", property)}
              style={{ cursor: "pointer" }}
            >
              <td>
                <strong>{property.title}</strong>
                <div
                  style={{ fontSize: 12, color: "var(--text-500, #64748b)" }}
                >
                  {property.id}
                </div>
              </td>
              <td>{formatStatus(property.status)}</td>
              <td>{property.propertyType}</td>
              <td>
                {formatCurrency(property.price.amount, property.price.currency)}
              </td>
              <td>
                {property.address.city}, {property.address.state}
              </td>
              <td>
                {property.publishedAt ? formatDate(property.publishedAt) : "-"}
              </td>
              <td>{Math.round(property.completenessScore)}%</td>
              <td>
                {formatVerification(property.rppVerification ?? "pending")}
              </td>
              <td>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAction("quick_view", property);
                  }}
                  className={styles.tablaBtn}
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
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={styles.paginacionBtn}
        >
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