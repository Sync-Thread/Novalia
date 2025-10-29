// GalleryPlaceholder: placeholder para galería de imágenes
import { ImageIcon } from "lucide-react";
import styles from "./GalleryPlaceholder.module.css";

export interface GalleryPlaceholderProps {
  coverUrl: string | null;
  title: string;
}

/**
 * Galería placeholder. Muestra imagen de portada si existe,
 * o placeholder "Próximamente". Thumbnails son placeholders.
 * TODO: implementar galería completa con lightbox.
 */
export function GalleryPlaceholder({
  coverUrl,
  title,
}: GalleryPlaceholderProps) {
  return (
    <div className={styles.galleryContainer}>
      <div
        className={styles.mainImage}
        role="img"
        aria-label={`Imagen principal de ${title}`}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={title} />
        ) : (
          <div className={styles.placeholderContent}>
            <ImageIcon aria-hidden="true" />
            <span className={styles.placeholderText}>Galería próximamente</span>
          </div>
        )}
      </div>

      <div
        className={styles.thumbnails}
        aria-label="Miniaturas de galería (próximamente)"
      >
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className={styles.thumbnail} aria-hidden="true">
            <ImageIcon size={16} />
          </div>
        ))}
      </div>
    </div>
  );
}
