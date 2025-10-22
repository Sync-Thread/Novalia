import { Outlet, useNavigate } from "react-router-dom";
import HeaderUpbarNovalia from "../components/HeaderUpbarNovalia/HeaderUpbarNovalia";
import { supabase } from "../../core/supabase/client";

export default function AppShell() {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate("/auth/login");
  };

  const handleSignUp = () => {
    navigate("/auth/register");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  return (
    <div className="app-shell">
      <HeaderUpbarNovalia onSignIn={handleSignIn} onSignUp={handleSignUp} onSignOut={handleSignOut} />
      <div className="app-shell__content">
        <div className="app-shell__main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
