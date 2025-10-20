// Gestor mínimo de medios para propiedades.
// No tocar lógica de Application/Domain.
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
      onUpload(Array.from(fileList));
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

  const dropzoneStyle: React.CSSProperties = {
    border: `2px dashed ${dragging ? "var(--accent)" : "rgba(148,163,184,0.6)"}`,
    borderRadius: "var(--radius)",
    padding: "calc(var(--gap) * 1.5)",
    background: dragging ? "rgba(41,93,255,0.06)" : "var(--surface)",
    cursor: uploading ? "wait" : "pointer",
    transition: "background 160ms ease, border-color 160ms ease",
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "0.95rem",
    display: "grid",
    gap: "6px",
  };

  return (
    <section className="stack" style={{ gap: "var(--gap)" }}>
      <div
        style={dropzoneStyle}
        onDragOver={event => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <strong>{uploading ? "Subiendo archivos..." : "Arrastra archivos o haz clic para seleccionar"}</strong>
        <span>
          Acepta imágenes, videos o PDFs. Recomendado mínimo 8 fotos{maxFiles ? ` (máximo ${maxFiles})` : ""}.
        </span>
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

      <div className="card-meta" style={{ justifyContent: "flex-start", gap: "var(--gap)" }}>
        <span>Fotos: {counts.images}</span>
        <span>Videos: {counts.videos}</span>
        <span>Planos: {counts.floorplans}</span>
      </div>

      {items.length > 0 && (
        <div className="grid-responsive">
          {items.map((item, index) => {
            const isCover = item.isCover;
            return (
              <article key={item.id} className="card" style={{ overflow: "hidden" }}>
                <div className="card-cover ratio-16x9">
                  {/* TODO(IMAGEN): Reemplazar placeholder por asset real en docs/ui/properties/refs/ */}
                  {item.url && item.type === "image" ? (
                    <img src={item.url} alt="" />
                  ) : (
                    <div className="placeholder" aria-hidden="true" />
                  )}
                  {isCover && (
                    <span
                      className="badge badge-tonal"
                      style={{ position: "absolute", top: "12px", left: "12px" }}
                    >
                      Portada
                    </span>
                  )}
                </div>
                <div className="card-body">
                  <div className="card-meta" style={{ justifyContent: "space-between" }}>
                    <span>Posición {index + 1}</span>
                    <span>{item.type}</span>
                  </div>
                  <div className="stack" style={{ gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => onSetCover?.(item.id)}
                      disabled={isCover}
                      className="btn btn-ghost"
                    >
                      {isCover ? "Portada actual" : "Marcar como portada"}
                    </button>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={!onReorder || index === 0}
                        className="btn btn-ghost"
                        aria-label={`Mover elemento ${index + 1} hacia arriba`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={!onReorder || index === items.length - 1}
                        className="btn btn-ghost"
                        aria-label={`Mover elemento ${index + 1} hacia abajo`}
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove?.(item.id)}
                      className="btn btn-ghost"
                      style={{ color: "var(--danger)" }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MediaDropzone;
