import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderUpbarNovalia from "../components/HeaderUpbarNovalia/HeaderUpbarNovalia";
import { supabase } from "../../core/supabase/client";
import { ChatProvider } from "../../modules/comunication/UI/contexts/ChatProvider";

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const buildAuthPath = (basePath: string) => {
    const current = `${location.pathname}${location.search}${location.hash}`;
    if (current.startsWith("/auth")) {
      return basePath;
    }
    const target = current || "/";
    const separator = basePath.includes("?") ? "&" : "?";
    return `${basePath}${separator}returnTo=${encodeURIComponent(target)}`;
  };

  const handleSignIn = () => {
    navigate(buildAuthPath("/auth/login"));
  };

  const handleSignUp = () => {
    navigate(buildAuthPath("/auth/register"));
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <ChatProvider>
      <div className="app-shell">
        <HeaderUpbarNovalia onSignIn={handleSignIn} onSignUp={handleSignUp} onSignOut={handleSignOut} />
        <div className="app-shell__content">
          <div className="app-shell__main">
            <Outlet />
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}
