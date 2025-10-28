import styles from "./PublicHomePage.module.css";
import { HeroSection } from "./components/HeroSection/HeroSection";
import { PublicHomeFooter } from "./components/Footer/Footer";

// PublicHomePage reúne hero, contenido en progreso y footer; integrará FilterBar y listados más adelante.
export default function PublicHomePage() {
  return (
    <div className={styles.page} id="top">
      <HeroSection />

      <section
        className={styles.placeholder}
        aria-label="Vista pública en construcción"
      >
        <div className={styles.placeholderContent}>
          <p>[Contenido de Home pública — próximamente]</p>
        </div>
      </section>

      <PublicHomeFooter />
    </div>
  );
}
