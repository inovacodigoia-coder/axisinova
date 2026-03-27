import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { SuperAdminRoute, PrivateRoute } from "@/router/guards";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ProfileSelectorPage from "./pages/ProfileSelectorPage";
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import CompaniesListPage from "./pages/superadmin/CompaniesListPage";
import CompanyDetailPage from "./pages/superadmin/CompanyDetailPage";
import SuperAdminUsersPage from "./pages/superadmin/SuperAdminUsersPage";
import PlansManagerPage from "./pages/superadmin/PlansManagerPage";
import AuditLogPage from "./pages/superadmin/AuditLogPage";
import SystemSettingsPage from "./pages/superadmin/SystemSettingsPage";
import CompanyPortalLayout from "./pages/company/CompanyPortalLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Profile Selector */}
            <Route path="/selecionar-perfil" element={<PrivateRoute><ProfileSelectorPage /></PrivateRoute>} />

            {/* Super Admin */}
            <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="empresas" element={<CompaniesListPage />} />
              <Route path="empresas/:companyId" element={<CompanyDetailPage />} />
              <Route path="usuarios" element={<SuperAdminUsersPage />} />
              <Route path="planos" element={<PlansManagerPage />} />
              <Route path="auditoria" element={<AuditLogPage />} />
              <Route path="configuracoes" element={<SystemSettingsPage />} />
              <Route path="alertas" element={<SuperAdminDashboard />} />
            </Route>

            {/* Company Portal */}
            <Route path="/app/*" element={<PrivateRoute><CompanyPortalLayout /></PrivateRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
