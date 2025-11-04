import React, { useRef, useState, useEffect } from "react";
import {
  RotateCcwIcon,
  SaveIcon,
  PenIcon,
  DownloadIcon,
  XIcon,
} from "lucide-react";
import styles from "./SignaturePad.module.css";

interface SignaturePadProps {
  width?: number;
  height?: number;
  onSave?: (dataUrl: string) => void;
  onClear?: () => void;
  onCancel?: () => void;
  backgroundColor?: string;
  penColor?: string;
  penWidth?: number;
  showActions?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  width = 800,
  height = 400,
  onSave,
  onClear,
  onCancel,
  backgroundColor = "#ffffff",
  penColor = "#000000",
  penWidth = 2,
  showActions = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [currentPenWidth, setCurrentPenWidth] = useState(penWidth);
  const [currentPenColor, setCurrentPenColor] = useState(penColor);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar el canvas con fondo blanco
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Configurar el estilo del trazo
    ctx.strokeStyle = currentPenColor;
    ctx.lineWidth = currentPenWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [backgroundColor, currentPenColor, currentPenWidth, width, height]);

  const getCoordinates = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in event) {
      // Touch event
      const touch = event.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      // Mouse event
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    event.preventDefault();
    if (!isDrawing) return;

    const coords = getCoordinates(event);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    setIsEmpty(true);
    onClear?.();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    // Convertir el canvas a imagen (base64)
    const dataUrl = canvas.toDataURL("image/png");
    onSave?.(dataUrl);
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `firma_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <label className={styles.toolLabel}>
            <PenIcon size={16} />
            Grosor:
            <input
              type="range"
              min="1"
              max="10"
              value={currentPenWidth}
              onChange={(e) => setCurrentPenWidth(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.toolValue}>{currentPenWidth}px</span>
          </label>
        </div>

        <div className={styles.toolbarGroup}>
          <label className={styles.toolLabel}>
            Color:
            <input
              type="color"
              value={currentPenColor}
              onChange={(e) => setCurrentPenColor(e.target.value)}
              className={styles.colorPicker}
            />
          </label>
        </div>
      </div>

      <div
        className={styles.canvasWrapper}
        style={{
          border: "1px solid #adadadff ",
          // boxShadow: "inset 10px 10px 9px #11111111",
          boxShadow: "5px 5px 10px rgba(0, 0, 0, 0.5)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={styles.canvas}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {isEmpty && (
          <div className={styles.placeholder}>
            <PenIcon size={48} className={styles.placeholderIcon} />
            <p>Firma aquí con tu mouse o dedo</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className={styles.actionsBar}>
          {onCancel && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onCancel}
              title="Cancelar y volver"
            >
              <XIcon size={16} />
              Cancelar
            </button>
          )}

          <div className={styles.actionsRight}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={clearCanvas}
              disabled={isEmpty}
              title="Limpiar firma"
            >
              <RotateCcwIcon size={16} />
              Limpiar
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={downloadSignature}
              disabled={isEmpty}
              title="Descargar como imagen"
            >
              <DownloadIcon size={16} />
              Descargar
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={saveSignature}
              disabled={isEmpty}
              title="Guardar firma"
            >
              <SaveIcon size={16} />
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className={styles.hint}>
        <p className="muted">
          💡 Tip: Usa dos dedos para hacer zoom o desplazar la página sin firmar
        </p>
      </div>
    </div>
  );
};
