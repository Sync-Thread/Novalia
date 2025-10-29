import { useId, useMemo, type ReactNode } from "react";
import styles from "./HeroSection.module.css";
import heroBackground from "../../../../../../../shared/assets/images/login-hero.jpg";

interface HeroSectionProps {
  mode: "expanded" | "compact";
  searchBar: ReactNode;
}

// Hero con SearchBar integrado que se expande/colapsa según filtros activos.
export function HeroSection({ mode, searchBar }: HeroSectionProps) {
  const sectionTitleId = useId();
  const sectionSubtitleId = useId();

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: `url(${heroBackground})`,
    }),
    []
  );

  return (
    <section
      className={styles.hero}
      aria-labelledby={sectionTitleId}
      aria-describedby={sectionSubtitleId}
      style={backgroundStyle}
      data-mode={mode}
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 id={sectionTitleId} className={styles.title}>
            La forma inteligente de{" "}
            <span className={styles.accent}>encontrar tu proximo hogar</span>
          </h1>
          <p id={sectionSubtitleId} className={styles.subtitle}>
            Descubre propiedades verificadas en todo el pais y personaliza tu
            busqueda con filtros claros y accesibles.
          </p>
        </div>
        <div className={styles.card}>{searchBar}</div>
      </div>
    </section>
  );
}
