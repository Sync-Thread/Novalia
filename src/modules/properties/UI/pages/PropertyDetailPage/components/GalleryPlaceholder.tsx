// GalleryPlaceholder: galería de imágenes con thumbnails
import { useState, useEffect } from "react";
import {
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from "lucide-react";
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
  const [isMaximized, setIsMaximized] = useState(false);

  const hasImages = galleryUrls.length > 0;
  const displayImage = selectedImage || coverUrl;

  // Encontrar índice de la imagen actual (-1 si no existe)
  const currentIndex = galleryUrls.findIndex((url) => url === displayImage);
  // Si no se encuentra, usar 0 como índice por defecto
  const validIndex = currentIndex === -1 ? 0 : currentIndex;
  const canNavigate = hasImages && galleryUrls.length > 1;

  const handlePrevious = () => {
    if (!canNavigate) return;
    const newIndex = validIndex <= 0 ? galleryUrls.length - 1 : validIndex - 1;
    setSelectedImage(galleryUrls[newIndex]);
  };

  const handleNext = () => {
    if (!canNavigate) return;
    const newIndex = validIndex >= galleryUrls.length - 1 ? 0 : validIndex + 1;
    setSelectedImage(galleryUrls[newIndex]);
  };

  const handleMaximize = () => {
    if (displayImage) {
      setIsMaximized(true);
    }
  };

  const handleCloseMaximized = () => {
    setIsMaximized(false);
  };

  // Navegación con teclado
  useEffect(() => {
    if (!isMaximized || !canNavigate) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCloseMaximized();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized, canNavigate, validIndex, galleryUrls]);

  return (
    <>
      <div className={styles.galleryContainer}>
        <div
          className={styles.mainImage}
          role="img"
          aria-label={`Imagen principal de ${title}`}
        >
          {displayImage ? (
            <>
              <img
                src={displayImage}
                alt={title}
                onClick={handleMaximize}
                className={styles.mainImageClickable}
              />

              {/* Botón maximizar */}
              <button
                type="button"
                className={styles.maximizeButton}
                onClick={handleMaximize}
                aria-label="Maximizar imagen"
              >
                <Maximize2 size={20} aria-hidden="true" />
              </button>

              {/* Flechas de navegación */}
              {canNavigate && (
                <>
                  <button
                    type="button"
                    className={`${styles.navButton} ${styles.navButtonPrev}`}
                    onClick={handlePrevious}
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft size={32} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.navButton} ${styles.navButtonNext}`}
                    onClick={handleNext}
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight size={32} aria-hidden="true" />
                  </button>
                </>
              )}
            </>
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
            ? galleryUrls.map((url, idx) => (
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

      {/* Modal maximizado */}
      {isMaximized && displayImage && (
        <div className={styles.lightbox} onClick={handleCloseMaximized}>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={handleCloseMaximized}
            aria-label="Cerrar imagen maximizada"
          >
            <X size={32} aria-hidden="true" />
          </button>

          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={displayImage}
              alt={title}
              className={styles.lightboxImage}
            />

            {canNavigate && (
              <>
                <button
                  type="button"
                  className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
                  onClick={handlePrevious}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft size={48} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
                  onClick={handleNext}
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight size={48} aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {hasImages && (
            <div className={styles.lightboxCounter}>
              {validIndex + 1} / {galleryUrls.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
