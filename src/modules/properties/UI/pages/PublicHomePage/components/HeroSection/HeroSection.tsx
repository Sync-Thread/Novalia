import { FormEvent, useMemo, useId } from "react";
import styles from "./HeroSection.module.css";
import heroBackground from "../../../../../../../shared/assets/images/login-hero.jpg";

// HeroSection muestra el bloque de bienvenida para público general; se conectará a FilterBar pronto.
export function HeroSection() {
  const sectionTitleId = useId();
  const sectionSubtitleId = useId();
  const stateFieldId = useId();
  const priceFieldId = useId();
  const typeFieldId = useId();

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: `url(${heroBackground})`,
    }),
    []
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <section
      className={styles.hero}
      aria-labelledby={sectionTitleId}
      aria-describedby={sectionSubtitleId}
      style={backgroundStyle}
    >
      <div className={styles.inner}>
        <h1 id={sectionTitleId} className={styles.title}>
          La forma inteligente de{" "}
          <span className={styles.accent}>encontrar tu próximo hogar</span>
        </h1>
        <p id={sectionSubtitleId} className={styles.subtitle}>
          Descubre propiedades verificadas en todo el país y prepara tu
          búsqueda personalizada con filtros avanzados que llegarán muy pronto.
        </p>

        <form
          role="search"
          aria-label="Buscar propiedades disponibles"
          className={styles.search}
          onSubmit={handleSubmit}
        >
          <div className={styles.fieldGroup}>
            <label className={styles.field} htmlFor={stateFieldId}>
              <span className={styles.srOnly}>Estado</span>
              <select
                id={stateFieldId}
                aria-label="Selecciona el estado"
                className={styles.select}
                defaultValue=""
              >
                <option value="" disabled>
                  Estado
                </option>
                <option value="cdmx">Ciudad de México</option>
                <option value="jal">Jalisco</option>
                <option value="nl">Nuevo León</option>
                <option value="mich">Michoacán</option>
              </select>
            </label>

            <label className={styles.field} htmlFor={priceFieldId}>
              <span className={styles.srOnly}>Rango de precio</span>
              <select
                id={priceFieldId}
                aria-label="Selecciona el rango de precio"
                className={styles.select}
                defaultValue=""
              >
                <option value="" disabled>
                  Rango de precio
                </option>
                <option value="0-1m">$0 - $1,000,000</option>
                <option value="1-3m">$1,000,000 - $3,000,000</option>
                <option value="3-5m">$3,000,000 - $5,000,000</option>
                <option value="5m+">$5,000,000 o más</option>
              </select>
            </label>

            <label className={styles.field} htmlFor={typeFieldId}>
              <span className={styles.srOnly}>Tipo de propiedad</span>
              <select
                id={typeFieldId}
                aria-label="Selecciona el tipo de propiedad"
                className={styles.select}
                defaultValue=""
              >
                <option value="" disabled>
                  Tipo de propiedad
                </option>
                <option value="house">Casa</option>
                <option value="apartment">Departamento</option>
                <option value="land">Terreno</option>
                <option value="office">Oficina</option>
              </select>
            </label>
          </div>

          <button type="button" className={styles.button}>
            <span className={styles.buttonIcon} aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.25 14.25C11.5637 14.25 14.25 11.5637 14.25 8.25C14.25 4.93629 11.5637 2.25 8.25 2.25C4.93629 2.25 2.25 4.93629 2.25 8.25C2.25 11.5637 4.93629 14.25 8.25 14.25Z"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.75 15.75L12.4875 12.4875"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Buscar
          </button>
        </form>
      </div>
    </section>
  );
}
