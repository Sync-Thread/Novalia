// src/app/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import MyPropertiesPage from "../modules/properties/UI/pages/MyPropertiesPage";
import PublishWizardPage from "../modules/properties/UI/pages/PublishWizardPage";
import PropertyAdminDetailPage from "../modules/properties/UI/pages/PropertyAdminDetailPage";
import AuthGuard from "./guards/AuthGuard";
import Login from "../modules/auth/UI/pages/Login";
import Register from "../modules/auth/UI/pages/Register";
import ForgotPassword from "../modules/auth/UI/pages/ForgotPassword";
import ResetPassword from "../modules/auth/UI/pages/ResetPassword";
import OAuthCallback from "../modules/auth/UI/pages/Callback";
import AppShell from "../shared/layouts/AppShell";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/auth/login" replace /> },
  {
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/properties", element: <MyPropertiesPage /> },
      { path: "/properties/new", element: <PublishWizardPage /> },
      { path: "/properties/:id/admin", element: <PropertyAdminDetailPage /> },
    ],
  },
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/register", element: <Register /> },
  { path: "/auth/forgot-password", element: <ForgotPassword /> },
  { path: "/auth/reset-password", element: <ResetPassword /> },
  { path: "/auth/callback", element: <OAuthCallback /> },
  { path: "*", element: <Navigate to="/auth/login" replace /> },
]);
