// src/app/auth/components/SiteFooter.tsx
export default function SiteFooter(){
  const y = new Date().getFullYear();
  return (
    <footer className="auth-footer">
      <div className="auth-footer__bar">
        <span>© {y} Novalia. Todos los derechos reservados.</span>
        <a href="#">Términos</a>
        <a href="#">Privacidad</a>
        <a href="#">Ayuda</a>
      </div>
    </footer>
  );
}
