// GalleryPlaceholder: galería de imágenes con thumbnails
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import styles from "./GalleryPlaceholder.module.css";

export interface GalleryPlaceholderProps {
  coverUrl: string | null;
  galleryUrls: string[];
  title: string;
}

/**
 * Galería de imágenes. Muestra imagen principal y thumbnails clicables.
 * TODO: implementar lightbox completo con navegación.
 */
export function GalleryPlaceholder({
  coverUrl,
  galleryUrls,
  title,
}: GalleryPlaceholderProps) {
  const [selectedImage, setSelectedImage] = useState(coverUrl);

  const hasImages = galleryUrls.length > 0;
  const displayImage = selectedImage || coverUrl;

  return (
    <div className={styles.galleryContainer}>
      <div
        className={styles.mainImage}
        role="img"
        aria-label={`Imagen principal de ${title}`}
      >
        {displayImage ? (
          <img src={displayImage} alt={title} />
        ) : (
          <div className={styles.placeholderContent}>
            <ImageIcon aria-hidden="true" />
            <span className={styles.placeholderText}>
              Sin imágenes disponibles
            </span>
          </div>
        )}
      </div>

      <div className={styles.thumbnails} aria-label="Miniaturas de galería">
        {hasImages
          ? galleryUrls.slice(0, 4).map((url, idx) => (
              <button
                key={idx}
                type="button"
                className={`${styles.thumbnail} ${selectedImage === url ? styles.thumbnailActive : ""}`}
                onClick={() => setSelectedImage(url)}
                aria-label={`Ver imagen ${idx + 1}`}
              >
                <img src={url} alt={`Miniatura ${idx + 1}`} />
              </button>
            ))
          : [1, 2, 3, 4].map((idx) => (
              <div key={idx} className={styles.thumbnail} aria-hidden="true">
                <ImageIcon size={16} />
              </div>
            ))}
      </div>
    </div>
  );
}
