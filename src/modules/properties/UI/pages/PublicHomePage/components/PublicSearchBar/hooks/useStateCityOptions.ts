import { useEffect, useMemo, useRef, useState } from "react";
import { Result } from "../../../../../../application/_shared/result";
import { MEXICO_STATES_OPTIONS } from "../../../../../constants";

export interface CityOption {
  value: string;
  label: string;
  lat: number;
  lng: number;
}

interface StateCityState {
  cities: CityOption[];
  loading: boolean;
  result: Result<CityOption[], string> | null;
  statusMessage: string | null;
}

const CITIES_ENDPOINT = "https://raw.githubusercontent.com/angelsantosa/inegi-lista-estados/refs/heads/master/cities";

/**
 * El Wizard (PublishWizardPage.tsx, paso "Ubicacion") obtiene ciudades asi:
 * 1) Busca el inegiId del estado seleccionado en MEXICO_STATES_OPTIONS.
 * 2) Descarga {inegiId}.json desde GitHub (primer elemento = "Todo el estado").
 * 3) Transforma a { value, label, lat, lng } y ordena alfabeticamente, manejando errores.
 * Reproducimos el mismo flujo para la barra publica sin tocar el Wizard.
 */
export function useStateCityOptions(stateValue: string): StateCityState {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result<CityOption[], string> | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const lastStateRef = useRef<string>("");

  useEffect(() => {
    if (!stateValue) {
      setCities([]);
      setResult(null);
      setStatusMessage(null);
      lastStateRef.current = "";
      return;
    }

    const selectedState = MEXICO_STATES_OPTIONS.find((state) => state.value === stateValue);
    if (!selectedState?.inegiId) {
      setCities([]);
      setResult(Result.fail("Estado no disponible."));
      setStatusMessage("No pudimos cargar las ciudades para ese estado.");
      lastStateRef.current = "";
      return;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setResult(null);
    setStatusMessage("Cargando ciudades...");
    lastStateRef.current = stateValue;

    const load = async () => {
      try {
        const response = await fetch(`${CITIES_ENDPOINT}/${selectedState.inegiId}.json`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as unknown[];
        const rawItems = Array.isArray(payload) ? payload.slice(1) : [];

        const options = rawItems
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const record = item as { [key: string]: unknown };
            const name = String(record.nombre_municipio ?? "").trim();
            if (!name) return null;

            return {
              value: name,
              label: name,
              lat: Number.parseFloat(String(record.lat ?? "0")),
              lng: Number.parseFloat(String(record.lng ?? "0")),
            };
          })
          .filter((option): option is CityOption => Boolean(option))
          .sort((a, b) => a.label.localeCompare(b.label, "es"));

        if (!active) return;

        setCities(options);
        setResult(Result.ok(options));
        setStatusMessage(
          options.length > 0
            ? `Ciudades de ${selectedState.label} disponibles.`
            : `No encontramos ciudades en ${selectedState.label}.`,
        );
      } catch (error) {
        if (!active) return;
        if (error instanceof DOMException && error.name === "AbortError") return;

        const message =
          error instanceof Error ? error.message : "Fallo desconocido al cargar ciudades.";
        setCities([]);
        setResult(Result.fail(message));
        setStatusMessage("No pudimos cargar las ciudades. Intenta nuevamente.");
        console.error("[public-search] city loading failed", message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [stateValue]);

  const memoizedStatus = useMemo(() => {
    if (loading) return "Cargando ciudades...";
    return statusMessage;
  }, [loading, statusMessage]);

  return {
    cities,
    loading,
    result,
    statusMessage: memoizedStatus,
  };
}
