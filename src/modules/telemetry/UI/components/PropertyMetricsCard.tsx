import { useEffect, useState } from "react";
import { Eye, MousePointer, MessageSquare, Share2, Mail } from "lucide-react";
import { supabase } from "../../../../core/supabase/client";
import { SupabaseEventRepository } from "../../../infrastructure/SupabaseEventRepository";
import { GetPropertyMetricsUseCase } from "../../../application/GetPropertyMetricsUseCase";
import type { PropertyMetrics } from "../../../domain/entities/Event";

const eventRepository = new SupabaseEventRepository(supabase);
const getMetricsUseCase = new GetPropertyMetricsUseCase(eventRepository);

export interface PropertyMetricsCardProps {
  propertyId: string;
  showTitle?: boolean;
}

/**
 * Componente que muestra las métricas de una propiedad
 * Uso:
 * ```tsx
 * <PropertyMetricsCard propertyId="123" />
 * ```
 */
export function PropertyMetricsCard({
  propertyId,
  showTitle = true,
}: PropertyMetricsCardProps) {
  const [metrics, setMetrics] = useState<PropertyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getMetricsUseCase.execute(propertyId);
        if (active) {
          setMetrics(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Error al cargar métricas"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMetrics();

    return () => {
      active = false;
    };
  }, [propertyId]);

  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#666",
        }}
      >
        Cargando métricas...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#dc2626",
        }}
      >
        {error}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#666",
        }}
      >
        No hay métricas disponibles para esta propiedad.
      </div>
    );
  }

  const metricsData = [
    {
      icon: Eye,
      label: "Vistas",
      value: metrics.viewsCount,
      color: "#3b82f6",
    },
    {
      icon: MousePointer,
      label: "Clicks",
      value: metrics.clicksCount,
      color: "#8b5cf6",
    },
    {
      icon: Mail,
      label: "Contactos",
      value: metrics.contactsCount,
      color: "#10b981",
    },
    {
      icon: Share2,
      label: "Compartidas",
      value: metrics.sharesCount,
      color: "#f59e0b",
    },
    {
      icon: MessageSquare,
      label: "Mensajes",
      value: metrics.chatMessagesCount,
      color: "#ef4444",
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      {showTitle && (
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: "#1f2937",
          }}
        >
          Métricas de la Propiedad
        </h3>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "16px",
        }}
      >
        {metricsData.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              style={{
                textAlign: "center",
                padding: "16px",
                background: "#f9fafb",
                borderRadius: "8px",
                transition: "transform 0.2s",
              }}
            >
              <Icon
                size={24}
                style={{
                  color: metric.color,
                  marginBottom: "8px",
                }}
              />
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#1f2937",
                  marginBottom: "4px",
                }}
              >
                {metric.value.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  fontWeight: "500",
                }}
              >
                {metric.label}
              </div>
            </div>
          );
        })}
      </div>

      {metrics.lastEventAt && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #e5e7eb",
            fontSize: "13px",
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          Última actividad:{" "}
          {new Date(metrics.lastEventAt).toLocaleString("es-MX", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </div>
      )}
    </div>
  );
}
