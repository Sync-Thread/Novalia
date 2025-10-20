// Indicador circular de avance en propiedades.
// No tocar lógica de Application/Domain.
import { useMemo } from "react";

export interface ProgressThresholds {
  warn: number;
  good: number;
}

export interface ProgressCircleProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  thresholds?: ProgressThresholds;
  ariaLabel?: string;
}

const DEFAULT_THRESHOLDS: ProgressThresholds = {
  warn: 50,
  good: 80,
};

export function ProgressCircle({
  value,
  size = 64,
  strokeWidth = 6,
  thresholds = DEFAULT_THRESHOLDS,
  ariaLabel = "Completitud",
}: ProgressCircleProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const tone = useMemo(() => {
    if (clamped >= thresholds.good) return "#2563EB";
    if (clamped >= thresholds.warn) return "#F97316";
    return "#EF4444";
  }, [clamped, thresholds.good, thresholds.warn]);

  return (
    <div className="progress-circle" aria-label={ariaLabel} role="img" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle stroke="#E2E8F0" fill="transparent" strokeWidth={strokeWidth} r={radius} cx={size / 2} cy={size / 2} />
        <circle
          stroke={tone}
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 240ms ease, stroke 240ms ease" }}
        />
      </svg>
      <span>{Math.round(clamped)}%</span>
    </div>
  );
}

export default ProgressCircle;


