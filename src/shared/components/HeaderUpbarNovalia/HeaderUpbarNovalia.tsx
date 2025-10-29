// Header global de Novalia. Reutilizable. No modificar logica de negocio aqui.
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoSvg from "../../assets/icons/logo.svg";
import { supabase } from "../../../core/supabase/client";

type HeaderRole = "visitor" | "buyer" | "agent_org";
type HeaderSize = "desktop" | "mobile";

export interface HeaderUpbarNovaliaProps {
  role?: HeaderRole;
  size?: HeaderSize;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onSignOut?: () => void;
}

interface HeaderUser {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  initials: string;
}

interface NavItem {
  key: string;
  label: string;
  to: string;
  icon: ReactNode;
  match?: (input: { pathname: string; searchParams: URLSearchParams }) => boolean;
  "aria-label"?: string;
}

interface DropdownItem {
  key: string;
  label: string;
  to?: string;
  action?: () => void;
  tone?: "default" | "danger";
}

const MOBILE_BREAKPOINT = 768;

const navItemsByRole: Record<HeaderRole, NavItem[]> = {
  visitor: [
    {
      key: "saved",
      label: "Guardados 🔒",
      to: "/auth/login",
      icon: <BookmarkIcon />,
      "aria-label": "Abrir guardados (requiere iniciar sesion)",
    },
    {
      key: "chats",
      label: "Chats 🔒",
      to: "/auth/login",
      icon: <MailIcon />,
      "aria-label": "Abrir chats (requiere iniciar sesion)",
    },
  ],
  buyer: [
    // TODO(NAVEGACION): reemplazar rutas con vistas reales de guardados y chats cuando esten disponibles.
    {
      key: "home",
      label: "Inicio",
      to: "/dashboard",
      icon: <HomeIcon />,
      match: ({ pathname, searchParams }) =>
        pathname === "/dashboard" && !searchParams.has("view"),
    },
    //añadi esto para contratos
    {
      key: "contracts",
      label: "Contratos",
      to: "/contracts",
      icon: <FileIcon />,
      match: ({ pathname }) => pathname === "/contracts",
    },
    {
      key: "saved",
      label: "Guardados",
      to: "/dashboard?view=saved",
      icon: <BookmarkIcon />,
      match: ({ pathname, searchParams }) =>
        pathname === "/dashboard" && searchParams.get("view") === "saved",
    },
    {
      key: "chats",
      label: "Chats",
      to: "/dashboard?view=chats",
      icon: <MailIcon />,
      match: ({ pathname, searchParams }) =>
        pathname === "/dashboard" && searchParams.get("view") === "chats",
    },
  ],
  agent_org: [
    // TODO(NAVEGACION): enlazar Documentos y Chats con pantallas finales del modulo correspondiente.
    {
      key: "home",
      label: "Inicio",
      to: "/dashboard",
      icon: <HomeIcon />,
      match: ({ pathname, searchParams }) => pathname === "/dashboard" && !searchParams.has("view"),
    },
    {
      key: "properties",
      label: "Mis propiedades",
      to: "/properties",
      icon: <BuildingIcon />,
      match: ({ pathname }) => pathname.startsWith("/properties"),
    },
    {
      key: "documents",
      label: "Documentos",
      to: "/properties?view=documentos",
      icon: <FileIcon />,
      match: ({ pathname, searchParams }) =>
        pathname === "/properties" && searchParams.get("view") === "documentos",
    },
    { //añadi esto para contratos
      key: "contracts",
      label: "Contratos",
      to: "/contracts",
      icon: <FileIcon />,
      match: ({ pathname }) => pathname === "/contracts",
    },
    {
      key: "chats",
      label: "Chats",
      to: "/dashboard?view=chats",
      icon: <MailIcon />,
      match: ({ pathname, searchParams }) =>
        pathname === "/dashboard" && searchParams.get("view") === "chats",
    },
  ],
};

function mapRoleFromHint(input: string | null | undefined): HeaderRole {
  if (!input) return "buyer";
  const normalized = input.toLowerCase();
  if (["agent", "org_admin", "owner", "agent_org"].includes(normalized)) {
    return "agent_org";
  }
  if (normalized === "buyer") {
    return "buyer";
  }
  return "buyer";
}

function computeInitials(name: string | null, fallback: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    if (parts.length > 0) {
      return parts
        .map(part => part.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2);
    }
  }
  if (fallback) {
    return fallback.charAt(0).toUpperCase();
  }
  return "NV";
}

function useHeaderAuth(roleOverride?: HeaderRole) {
  const [state, setState] = useState<{ role: HeaderRole; user: HeaderUser | null; loading: boolean }>({
    role: roleOverride ?? "visitor",
    user: null,
    loading: !roleOverride,
  });

  useEffect(() => {
    let isMounted = true;

    if (roleOverride) {
      setState({
        role: roleOverride,
        user: null,
        loading: false,
      });
      return () => {
        isMounted = false;
      };
    }

    setState(prev => ({ ...prev, loading: true }));

    const load = async () => {
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.warn("[upbar] supabase session error", error);
        }
        const sessionUser = sessionData.session?.user ?? null;
        if (!sessionUser) {
          setState({ role: "visitor", user: null, loading: false });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, role_hint, email")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (!isMounted) return;

        if (profileError) {
          console.warn("[upbar] no se pudo leer perfil", profileError);
        }

        const roleHint =
          (profile?.role_hint as string | null | undefined) ??
          (sessionUser.user_metadata?.role as string | undefined) ??
          (sessionUser.app_metadata?.role as string | undefined) ??
          null;

        const role = mapRoleFromHint(roleHint);
        const fullName =
          (profile?.full_name as string | null | undefined) ??
          (sessionUser.user_metadata?.full_name as string | undefined) ??
          null;
        const email =
          (profile?.email as string | null | undefined) ?? sessionUser.email ?? null;
        const avatarUrl = (sessionUser.user_metadata?.avatar_url as string | undefined) ?? null;

        setState({
          role,
          user: {
            fullName,
            email,
            avatarUrl,
            initials: computeInitials(fullName, email),
          },
          loading: false,
        });
      } catch (err) {
        console.warn("[upbar] fallback a rol buyer por error", err);
        if (!isMounted) return;
        setState(prev => ({
          role: prev.role === "visitor" ? "buyer" : prev.role,
          user: prev.user,
          loading: false,
        }));
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [roleOverride]);

  return state;
}

function useResponsiveSize(sizeOverride?: HeaderSize) {
  const [size, setSize] = useState<HeaderSize>(() => {
    if (sizeOverride) return sizeOverride;
    if (typeof window === "undefined") return "desktop";
    return window.innerWidth <= MOBILE_BREAKPOINT ? "mobile" : "desktop";
  });

  useEffect(() => {
    if (sizeOverride) {
      setSize(sizeOverride);
      return;
    }

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setSize(event.matches ? "mobile" : "desktop");
    };

    update(media);

    const listener = (event: MediaQueryListEvent) => update(event);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [sizeOverride]);

  return size;
}

export default function HeaderUpbarNovalia({
  role: roleOverride,
  size: sizeOverride,
  onSignIn,
  onSignUp,
  onSignOut,
}: HeaderUpbarNovaliaProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user } = useHeaderAuth(roleOverride);
  const size = useResponsiveSize(sizeOverride);
  const isMobile = size === "mobile";
  const isOnPropertiesList = location.pathname === "/properties";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownItemsRef = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);

  const navItems = navItemsByRole[role];

  const notificationsCount = 0; // TODO(CONTADORES): notificaciones y badges al integrar Telemetry/Chats.

  useEffect(() => {
    setSheetOpen(false);
    setDropdownOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(event.target as Node)) return;
      setDropdownOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    if (isMobile) {
      setDropdownOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!sheetOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheetOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    if (sheetCloseRef.current) {
      sheetCloseRef.current.focus();
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!isMobile) {
      setSheetOpen(false);
    }
  }, [isMobile]);

  const handleSignIn = useCallback(() => {
    if (onSignIn) {
      void onSignIn();
      return;
    }
    // TODO(LOGICA): conectar onSignIn con el modulo de Auth.
    navigate("/auth/login");
  }, [navigate, onSignIn]);

  const handleSignUp = useCallback(() => {
    if (onSignUp) {
      void onSignUp();
      return;
    }
    // TODO(LOGICA): conectar onSignUp con el modulo de Auth.
    navigate("/auth/register");
  }, [navigate, onSignUp]);

  const handleSignOut = useCallback(async () => {
    setDropdownOpen(false);
    setSheetOpen(false);
    if (onSignOut) {
      void onSignOut();
      return;
    }
    // TODO(LOGICA): conectar onSignOut con el modulo de Auth.
    await supabase.auth.signOut();
    navigate("/auth/login");
  }, [navigate, onSignOut]);

  const toggleSheet = () => setSheetOpen(prev => !prev);

  const toggleDropdown = () => setDropdownOpen(prev => !prev);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const mobileCta = useMemo(() => {
    if (role === "agent_org") {
      if (isOnPropertiesList) return null;
      return (
        <Link to="/properties/new" className="btn btn-primary" onClick={closeSheet}>
          Publicar propiedad
        </Link>
      );
    }
    if (role === "buyer") {
      return (
        <Link to="/auth/register?type=agent" className="btn btn-outline" onClick={closeSheet}>
          Publica tu propiedad
        </Link>
      );
    }
    return (
      <button type="button" className="btn btn-primary" onClick={handleSignUp}>
        Publica tu propiedad
      </button>
    );
  }, [closeSheet, handleSignUp, isOnPropertiesList, role]);

  const dropdownItems = useMemo<DropdownItem[]>(() => {
    if (role === "buyer") {
      return [
        { key: "profile", label: "Mi perfil", to: "/dashboard?view=perfil" },
        { key: "saved", label: "Mis guardados", to: "/dashboard?view=saved" },
        { key: "chats", label: "Mis chats", to: "/dashboard?view=chats" },
        { key: "divider", label: "" },
        { key: "logout", label: "Cerrar sesion", action: handleSignOut, tone: "danger" },
      ];
    }
    if (role === "agent_org") {
      return [
        { key: "profile", label: "Perfil", to: "/dashboard?view=perfil" },
        { key: "settings", label: "Configuracion", to: "/dashboard?view=configuracion" },
        { key: "divider", label: "" },
        { key: "logout", label: "Cerrar sesion", action: handleSignOut, tone: "danger" },
      ];
    }
    return [
      { key: "signin", label: "Iniciar sesion", action: handleSignIn },
      { key: "signup", label: "Crear cuenta", action: handleSignUp },
    ];
  }, [handleSignIn, handleSignOut, handleSignUp, role]);

  useEffect(() => {
    dropdownItemsRef.current = Array(dropdownItems.length).fill(null);
  }, [dropdownItems]);

  const setDropdownItemRef = useCallback(
    (element: HTMLAnchorElement | HTMLButtonElement | null, index: number) => {
      dropdownItemsRef.current[index] = element;
    },
    [],
  );

  useEffect(() => {
    if (dropdownOpen && dropdownItemsRef.current[0]) {
      dropdownItemsRef.current[0]?.focus();
    }
  }, [dropdownOpen]);

  const handleDropdownTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDropdownOpen(prev => !prev);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setDropdownOpen(true);
      requestAnimationFrame(() => {
        dropdownItemsRef.current[0]?.focus();
      });
    }
  };

  const handleDropdownItemKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % dropdownItemsRef.current.length;
      dropdownItemsRef.current[next]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = (index - 1 + dropdownItemsRef.current.length) % dropdownItemsRef.current.length;
      dropdownItemsRef.current[prev]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      dropdownItemsRef.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      dropdownItemsRef.current[dropdownItemsRef.current.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDropdownOpen(false);
    }
  };

  const isNavItemActive = (item: NavItem) => {
    const { pathname } = location;
    const searchParams = new URLSearchParams(location.search);
    const [path, search] = item.to.split("?");
    if (item.match) {
      return item.match({ pathname, searchParams });
    }
    if (pathname !== path) return false;
    if (!search) return true;
    return location.search === `?${search}`;
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = isNavItemActive(item);

    return (
      <Link
        key={item.key}
        to={item.to}
        className={`nav-item${isActive ? " nav-item--active" : ""}`}
        aria-label={item["aria-label"]}
      >
        <span className="nav-icon" aria-hidden="true">
          {item.icon}
        </span>
        <span>{item.label}</span>
      </Link>
    );
  };

  const renderDesktopActions = () => {
    if (role === "visitor") {
      return (
        <>
          <button type="button" className="btn btn-outline" onClick={handleSignIn}>
            Iniciar sesion
          </button>
          <button type="button" className="btn btn-outline" onClick={handleSignUp}>
            Registrarse
          </button>
        </>
      );
    }
    const avatarInitials = user?.initials ?? "NV";
    const avatarLabel = user?.fullName ?? user?.email ?? "Cuenta";

    const bellButton = (
      <button
        type="button"
        className="icon-btn"
        aria-label={`Abrir notificaciones (${notificationsCount})`}
        aria-haspopup="true"
      >
        <BellIcon />
        {notificationsCount > 0 && (
          <span className="badge badge--count" aria-live="polite">
            {notificationsCount}
          </span>
        )}
      </button>
    );

    const avatarButton = (
      <button
        type="button"
        className="upbar-avatar"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        onClick={toggleDropdown}
        onKeyDown={handleDropdownTriggerKeyDown}
      >
        {avatarInitials}
      </button>
    );

    if (role === "buyer") {
      return (
        <>
          <Link to="/auth/register?type=agent" className="btn btn-outline">
            Publica tu propiedad
          </Link>
          {bellButton}
          <div className="upbar-dropdown" ref={dropdownRef}>
            <span className="sr-only">{avatarLabel}</span>
            {avatarButton}
            {dropdownOpen && (
              <div className="menu" role="menu" aria-label="Menu de cuenta">
                {dropdownItems.map((entry, index) => renderDropdownItem(entry, index))}
              </div>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {!isOnPropertiesList && (
          <Link to="/properties/new" className="btn btn-primary">
            Publicar propiedad
          </Link>
        )}
        {bellButton}
        <div className="upbar-dropdown" ref={dropdownRef}>
          <span className="sr-only">{avatarLabel}</span>
          {avatarButton}
          {dropdownOpen && (
            <div className="menu" role="menu" aria-label="Menu de cuenta">
              {dropdownItems.map((entry, index) => renderDropdownItem(entry, index))}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderDropdownItem = (item: DropdownItem, index: number) => {
    if (item.key === "divider") {
      return <div key="divider" className="menu-divider" role="presentation" />;
    }

    if (item.to) {
      return (
        <Link
          key={item.key}
          to={item.to}
          className="menu-item"
          role="menuitem"
          ref={element => setDropdownItemRef(element, index)}
          onClick={() => setDropdownOpen(false)}
          onKeyDown={event => handleDropdownItemKeyDown(event, index)}
        >
          {item.label}
        </Link>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        className={`menu-item${item.tone === "danger" ? " menu-item--danger" : ""}`}
        role="menuitem"
        ref={element => setDropdownItemRef(element, index)}
        onClick={item.action}
        onKeyDown={event => handleDropdownItemKeyDown(event, index)}
      >
        {item.label}
      </button>
    );
  };

  const handleSheetOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setSheetOpen(false);
    }
  };

  const sheetNav = (
    <nav aria-label="Navegacion principal movil">
      <div className="nav nav--stacked">
        {navItems.map(item => {
          const active = isNavItemActive(item);
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`nav-item${active ? " nav-item--active" : ""}`}
              onClick={() => setSheetOpen(false)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const sheetActions = (
    <div className="sheet-footer">
      {role === "visitor" && (
        <>
          <button type="button" className="btn btn-outline" onClick={handleSignIn}>
            Iniciar sesion
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSignUp}>
            Registrarse
          </button>
        </>
      )}
      {role === "buyer" && (
        <>
          <Link to="/auth/register?type=agent" className="btn btn-outline" onClick={closeSheet}>
            Publica tu propiedad
          </Link>
          <button type="button" className="btn btn-outline" onClick={handleSignOut}>
            Cerrar sesion
          </button>
        </>
      )}
      {role === "agent_org" && (
        <>
          {!isOnPropertiesList && (
            <Link to="/properties/new" className="btn btn-primary" onClick={closeSheet}>
              Publicar propiedad
            </Link>
          )}
          <button type="button" className="btn btn-outline" onClick={handleSignOut}>
            Cerrar sesion
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <header className={`upbar${isMobile ? " upbar--mobile" : ""}`} role="navigation" aria-label="Barra superior Novalia">
        <div className="app-container upbar-inner">
          <div className="upbar-left">
            <Link className="upbar-brand" to={role === "visitor" ? "/" : "/dashboard"} aria-label="Ir al inicio">
              <img src={logoSvg} alt="" aria-hidden="true" />
              <span>Novalia</span>
            </Link>
          </div>
          {!isMobile && (
            <div className="upbar-center">
              <nav aria-label="Navegacion principal">
                <div className="nav">{navItems.map(renderNavItem)}</div>
              </nav>
            </div>
          )}
          <div className="upbar-right">
            {!isMobile && <div className="upbar-actions">{renderDesktopActions()}</div>}
            {isMobile && (
              <div className="upbar-mobile-row">
                {mobileCta}
                <button
                  type="button"
                  className="upbar-burger"
                  aria-label={sheetOpen ? "Cerrar menu" : "Abrir menu"}
                  aria-expanded={sheetOpen}
                  onClick={toggleSheet}
                >
                  {sheetOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {isMobile && sheetOpen && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Menu principal" onClick={handleSheetOverlayClick}>
          <div className="sheet-panel">
            <div className="sheet-header">
              <Link className="upbar-brand" to={role === "visitor" ? "/" : "/dashboard"} onClick={closeSheet}>
                <img src={logoSvg} alt="" aria-hidden="true" />
                <span>Novalia</span>
              </Link>
              <button
                ref={sheetCloseRef}
                type="button"
                className="upbar-burger"
                aria-label="Cerrar menu"
                onClick={closeSheet}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="sheet-body">
              {sheetNav}
              {role !== "visitor" && (
                <div className="upbar-sheet-nav">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      closeSheet();
                      // TODO(CONTADORES): integrar detalle de notificaciones en mobile sheet.
                    }}
                  >
                    Notificaciones
                  </button>
                </div>
              )}
            </div>
            {sheetActions}
          </div>
        </div>
      )}
    </>
  );
}

function BookmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-3-6 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 0 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-6v-6h-4v6H4a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 21h18M5 21V5a1 1 0 0 1 1-1h6v17M13 21V9h5a1 1 0 0 1 1 1v11M7 8h2m-2 4h2m-2 4h2m4-3h2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3v4a1 1 0 0 0 1 1h4M7 21h10a1 1 0 0 0 1-1V8.828a1 1 0 0 0-.293-.707L13.879 3.293A1 1 0 0 0 13.172 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1Zm2-7h6m-6-3h1m-1 6h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.25A4.75 4.75 0 0 1 16.75 9v1.18c0 .68.21 1.34.61 1.89l1.09 1.54c.75 1.06.04 2.54-1.29 2.54H6.84c-1.33 0-2.04-1.48-1.29-2.54l1.09-1.54c.4-.55.61-1.21.61-1.89V9A4.75 4.75 0 0 1 12 4.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17.5" cy="6.5" r="2" fill="#295dff" stroke="#ffffff" strokeWidth="0.8" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
