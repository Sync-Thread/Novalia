import React, { useCallback, useMemo, useRef, useState } from "react";
import type { MediaDTO } from "../../application/dto/MediaDTO";
import styles from "./MediaDropzone.module.css";

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

/**
 * Dropzone y rejilla de medios. Controla solo estilo y accesibilidad, manteniendo la lógica de props.
 */
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
    [onUpload]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (!event.dataTransfer?.files?.length) return;
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
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
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onReorder(next.map((item) => item.id));
  };

  return (
    <section className={styles.contenedor}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneActivo : ""}`.trim()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <strong>
          {uploading
            ? "Subiendo archivos..."
            : "Arrastra archivos o haz clic para seleccionar"}
        </strong>
        <span>
          Acepta imágenes, videos o PDFs. Recomendado mínimo 8 fotos
          {maxFiles ? ` (máximo ${maxFiles})` : ""}.
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: "none" }}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className={styles.resumen}>
        <span>Fotos: {counts.images}</span>
        <span>Videos: {counts.videos}</span>
        <span>Planos: {counts.floorplans}</span>
      </div>

      {items.length > 0 && (
        <div className={styles.rejilla}>
          {items.map((item, index) => {
            const isCover = item.isCover;
            return (
              <article key={item.id} className={styles.tarjeta}>
                <div className={styles.preview}>
                  {item.url && item.type === "image" ? (
                    <img
                      src={item.url}
                      alt={`Media ${index + 1}`}
                      onError={(e) => {
                        console.error("Error cargando imagen:", item.url);
                        e.currentTarget.style.display = "none";
                      }}
                      onLoad={() => console.log("Imagen cargada:", item.url)}
                    />
                  ) : item.type === "video" ? (
                    <video
                      src={item.url}
                      controls
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div className={styles.placeholder} aria-hidden="true" />
                  )}
                  {isCover && <span className={styles.cover}>Portada</span>}
                </div>
                <div className={styles.cuerpo}>
                  <div className={styles.meta}>
                    <span>Posición {index + 1}</span>
                    <span>{item.type}</span>
                  </div>
                  <div className={styles.acciones}>
                    <button
                      type="button"
                      onClick={() => onSetCover?.(item.id)}
                      disabled={isCover}
                      className={`${styles.boton} ${styles.botonDestacado}`}
                    >
                      {isCover ? "Portada actual" : "Marcar como portada"}
                    </button>
                    <div className={styles.fila}>
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={!onReorder || index === 0}
                        className={styles.boton}
                        aria-label={`Mover elemento ${index + 1} hacia arriba`}
                      >
                        Arriba
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={!onReorder || index === items.length - 1}
                        className={styles.boton}
                        aria-label={`Mover elemento ${index + 1} hacia abajo`}
                      >
                        Abajo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove?.(item.id)}
                      className={`${styles.boton} ${styles.botonPeligro}`}
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
