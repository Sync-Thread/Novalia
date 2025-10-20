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

  const dropzoneClass = [
    styles.dropzone,
    dragging ? styles.dropzoneDragging : "",
    uploading ? styles.dropzoneDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      <div
        className={dropzoneClass}
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
      >
        <p className={styles.dropzoneTitle}>
          {uploading ? "Subiendo archivos..." : "Arrastra archivos aquí o haz clic para seleccionar"}
        </p>
        <p className={styles.dropzoneSubtitle}>
          Acepta imágenes, videos o PDFs. Recomendado mínimo 8 fotos{maxFiles ? ` (máximo ${maxFiles})` : ""}.
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

      <div className={styles.summary}>
        <span>Fotos: {counts.images}</span>
        <span>Videos: {counts.videos}</span>
        <span>Planos: {counts.floorplans}</span>
      </div>

      {items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item, index) => {
            const isCover = item.isCover;
            const cardClass = [styles.card, isCover ? styles.cardCover : ""].filter(Boolean).join(" ");
            return (
              <div key={item.id} className={cardClass}>
                <div className={styles.preview}>
                  {/* TODO(IMAGEN): Reemplazar por asset real según referencia 'refs/media-grid.png' */}
                  {item.url && item.type === "image" ? (
                    <img src={item.url} alt="" />
                  ) : (
                    <div className={styles.placeholder} aria-hidden="true" />
                  )}
                  {isCover && <span className={styles.coverTag}>Portada</span>}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardMeta}>
                    <span>Posición {index + 1}</span>
                    <span>{item.type}</span>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => onSetCover?.(item.id)}
                      disabled={isCover}
                      className={[
                        styles.actionBtn,
                        isCover ? styles.coverToggleDisabled : styles.coverToggle,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {isCover ? "Portada actual" : "Marcar como portada"}
                    </button>
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={!onReorder || index === 0}
                        className={styles.actionBtn}
                        aria-label={`Mover elemento ${index + 1} hacia arriba`}
                      >
                        Mover arriba
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={!onReorder || index === items.length - 1}
                        className={styles.actionBtn}
                        aria-label={`Mover elemento ${index + 1} hacia abajo`}
                      >
                        Mover abajo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove?.(item.id)}
                      className={`${styles.actionBtn} ${styles.danger}`.trim()}
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

export default MediaDropzone;
