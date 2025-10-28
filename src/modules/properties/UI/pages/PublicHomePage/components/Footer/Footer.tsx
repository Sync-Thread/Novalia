import { useId } from "react";
import styles from "./Footer.module.css";

// PublicHomeFooter muestra navegación secundaria; se enlazará a contenidos y telemetry posteriormente.
export function PublicHomeFooter() {
  const footerTitleId = useId();

  const quickLinks = [
    { label: "Inicio", href: "#top", isCurrent: true },
    { label: "Sobre Nosotros", href: "/sobre" },
    { label: "Cómo Funciona", href: "/como-funciona" },
    { label: "Agentes", href: "/agentes" },
    { label: "Blog", href: "/blog" },
  ];

  const supportLinks = [
    { label: "Contacto", href: "/contacto" },
    { label: "Términos y Condiciones", href: "/terminos" },
    { label: "Aviso de Privacidad", href: "/aviso" },
    { label: "Centro de Ayuda", href: "/ayuda" },
    { label: "Reportar Problema", href: "/reporte" },
  ];

  const socialLinks = [
    { name: "Facebook", href: "https://www.facebook.com", icon: FacebookIcon },
    { name: "Twitter", href: "https://www.twitter.com", icon: TwitterIcon },
    { name: "Instagram", href: "https://www.instagram.com", icon: InstagramIcon },
    { name: "LinkedIn", href: "https://www.linkedin.com", icon: LinkedinIcon },
  ];

  return (
    <footer className={styles.footer} aria-labelledby={footerTitleId}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <div className={styles.brandHeader} id={footerTitleId}>
            <span className={styles.logo} aria-hidden="true">
              <HouseIcon />
            </span>
            Novalia
          </div>
          <p className={styles.description}>
            El marketplace inmobiliario que conecta compradores y vendedores de
            manera inteligente y sin fricciones. Tu próximo hogar te está
            esperando.
          </p>
          <div className={styles.social}>
            {socialLinks.map(({ name, href, icon: Icon }) => (
              <a
                key={name}
                className={styles.socialLink}
                href={href}
                aria-label={`Novalia en ${name}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <nav className={styles.column} aria-label="Enlaces rápidos">
          <h3 className={styles.columnTitle}>Enlaces Rápidos</h3>
          <ul className={styles.linkList}>
            {quickLinks.map(({ label, href, isCurrent }) => (
              <li key={label}>
                <a
                  className={styles.link}
                  href={href}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.column} aria-label="Soporte">
          <h3 className={styles.columnTitle}>Soporte</h3>
          <ul className={styles.linkList}>
            {supportLinks.map(({ label, href }) => (
              <li key={label}>
                <a className={styles.link} href={href}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.bottomBar}>
        <span>© 2025 Novalia. Todos los derechos reservados.</span>
        <span className={styles.madeIn}>
          Hecho con <span className={styles.heart}>❤️</span> en México
        </span>
      </div>
    </footer>
  );
}

function HouseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 10.5L12 4L20 10.5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20V14H14V20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M15 8H17.5V4.5H15C12.5147 4.5 10.5 6.51472 10.5 9V11.25H7.5V14.75H10.5V22.5H14V14.75H16.75L17.5 11.25H14V9C14 8.58579 14.3358 8.25 14.75 8.25L15 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20.6475 7.69999C20.6625 7.91249 20.6625 8.12499 20.6625 8.33999C20.6625 14.339 16.185 21 8.61746 21C6.43871 21 4.40371 20.3655 2.68246 19.2563C2.98871 19.2938 3.28746 19.3088 3.60121 19.3088C5.38371 19.3088 7.04021 18.6975 8.36746 17.6685C6.68871 17.6333 5.27621 16.5098 4.78621 14.9805C5.02871 15.018 5.27121 15.0458 5.52871 15.0458C5.87371 15.0458 6.21871 14.9985 6.54146 14.9115C4.79621 14.559 3.46121 13.0087 3.46121 11.112C3.46121 11.094 3.46121 11.076 3.46121 11.0595C3.98121 11.3483 4.58371 11.5313 5.21621 11.5575C4.16121 10.824 3.46121 9.59849 3.46121 8.20199C3.46121 7.44149 3.65621 6.72749 3.99621 6.10799C5.87371 8.38274 8.62371 9.91799 11.7165 10.0785C11.6572 9.79653 11.6241 9.50836 11.6175 9.21974C11.6175 7.06274 13.3612 5.31899 15.5182 5.31899C16.6357 5.31899 17.6407 5.78849 18.3352 6.55874C19.2157 6.38849 20.0572 6.07124 20.82 5.63174C20.54 6.53624 19.9102 7.28474 19.0672 7.74424C19.8937 7.64924 20.6925 7.42124 21.4275 7.08749C20.82 7.85174 20.0925 8.50499 19.2825 8.99999C20.1 8.91074 20.8927 8.70224 21.6472 8.38649C20.9514 9.16949 20.1757 9.87074 19.335 10.4655C19.275 10.8772 19.1 11.2612 18.8296 11.5759C18.5593 11.8906 18.2041 12.1244 17.8025 12.252C17.401 12.3797 16.9686 12.3951 16.5547 12.2967C16.1408 12.1982 15.7679 11.9902 15.48 11.6977"
        fill="currentColor"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 15.75C13.932 15.75 15.5 14.182 15.5 12.25C15.5 10.318 13.932 8.75 12 8.75C10.068 8.75 8.5 10.318 8.5 12.25C8.5 14.182 10.068 15.75 12 15.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="17.25" cy="7" r="1.25" fill="currentColor" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.5 9H9.5V21H6.5V9ZM8.0425 7.5C6.9825 7.5 6.125 6.6425 6.125 5.5825C6.125 4.5225 6.9825 3.665 8.0425 3.665C9.1025 3.665 9.96 4.5225 9.96 5.5825C9.96 6.6425 9.1025 7.5 8.0425 7.5ZM10.75 9H13.6V10.46H13.64C14.0375 9.705 15.0025 8.9025 16.51 8.9025C19.6525 8.9025 20.25 10.96 20.25 13.7375V21H17.25V14.6188C17.25 13.2613 17.22 11.5125 15.355 11.5125C13.46 11.5125 13.17 12.99 13.17 14.52V21H10.75V9Z"
        fill="currentColor"
      />
    </svg>
  );
}
