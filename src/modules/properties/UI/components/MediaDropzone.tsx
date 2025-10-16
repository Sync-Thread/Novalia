import React, { useCallback, useMemo, useRef, useState } from "react";
import type { MediaDTO } from "../../application/dto/MediaDTO";

export interface MediaDropzoneProps {
  items: MediaDTO[];
  onUpload?: (files: File[]) => void;
  onRemove?: (mediaId: string) => void;
  onSetCover?: (mediaId: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  uploading?: boolean;
  maxFiles?: number;
  accept?: string;
}

export function MediaDropzone({
  items,
  onUpload,
  onRemove,
  onSetCover,
  onReorder,
  uploading,
  maxFiles,
  accept = "image/*,video/*,.pdf",
}: MediaDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || !onUpload) return;
      const files = Array.from(fileList);
      onUpload(files);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (!event.dataTransfer?.files?.length) return;
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const counts = useMemo(() => {
    const base = { images: 0, videos: 0, floorplans: 0 };
    for (const item of items) {
      if (item.type === "video") base.videos += 1;
      else if (item.type === "floorplan") base.floorplans += 1;
      else base.images += 1;
    }
    return base;
  }, [items]);

  const move = (index: number, direction: -1 | 1) => {
    if (!onReorder) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered.map(item => item.id));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        onDragOver={event => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        style={{
          padding: "32px 24px",
          borderRadius: 16,
          border: dragging ? "2px dashed #295DFF" : "2px dashed rgba(148,163,184,0.6)",
          background: dragging ? "rgba(41,93,255,0.1)" : "#fff",
          textAlign: "center",
          cursor: uploading ? "progress" : "pointer",
          transition: "border 0.2s ease, background 0.2s ease",
          boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "#1e293b",
          }}
        >
          {uploading ? "Subiendo archivosâ€¦" : "Arrastra archivos aquÃ­ o haz clic para seleccionar"}
        </p>
        <p
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Acepta imÃ¡genes, videos o PDFs. Recomendado mÃ­nimo 8 fotos.
          {maxFiles ? ` (mÃ¡ximo ${maxFiles})` : ""}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: "none" }}
        onChange={event => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 13,
          color: "#475569",
        }}
      >
        <span>Fotos: {counts.images}</span>
        <span>Videos: {counts.videos}</span>
        <span>Planos: {counts.floorplans}</span>
      </div>

      {items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((item, index) => {
            const isCover = item.isCover;
            return (
              <div
                key={item.id}
                style={{
                  borderRadius: 14,
                  border: isCover ? "2px solid #295DFF" : "1px solid rgba(148,163,184,0.35)",
                  overflow: "hidden",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    paddingBottom: "56%",
                    background: `linear-gradient(135deg, rgba(15,23,42,0.12), rgba(15,23,42,0.22))`,
                  }}
                >
                  {item.url && item.type === "image" && (
                    <img
                      src={item.url}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  {isCover && (
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        background: "#295DFF",
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Portada
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "12px 14px",
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>PosiciÃ³n {index + 1}</span>
                    <span style={{ textTransform: "capitalize" }}>{item.type}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSetCover?.(item.id)}
                      disabled={isCover}
                      style={{
                        ...actionButtonStyle,
                        background: isCover ? "rgba(148,163,184,0.15)" : "rgba(41,93,255,0.1)",
                        color: isCover ? "#94a3b8" : "#295DFF",
                      }}
                    >
                      {isCover ? "Portada actual" : "Marcar como portada"}
                    </button>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={!onReorder || index === 0}
                        style={actionButtonStyle}
                      >
                        â†‘ Arriba
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={!onReorder || index === items.length - 1}
                        style={actionButtonStyle}
                      >
                        â†“ Abajo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove?.(item.id)}
                      style={{
                        ...actionButtonStyle,
                        background: "rgba(248,113,113,0.15)",
                        color: "#b91c1c",
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const actionButtonStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.4)",
  background: "#fff",
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  cursor: "pointer",
  flex: 1,
};

export default MediaDropzone;


