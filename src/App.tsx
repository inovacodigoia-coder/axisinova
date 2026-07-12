import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { QueueSystemProvider } from "@/context/QueueSystemContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { QueueProvider } from "@/context/QueueContext";
import { SchedulingProvider } from "@/context/SchedulingContext";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
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
import TotemPage from "./pages/public/TotemPage";
import CallingPanelPage from "./pages/public/CallingPanelPage";
import DoctorPanelPage from "./pages/public/DoctorPanelPage";
import TVPanelPage from "./pages/company/queue/TVPanelPage";
import PatientPortalLayout from "./pages/patient/PatientPortalLayout";
import NotFound from "./pages/NotFound";
import GreenScreenPage from "./pages/GreenScreenPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <QueueProvider>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/verde" element={<GreenScreenPage />} />
                <Route path="/cadastro" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Public kiosk/panel routes */}
                <Route path="/totem" element={<SchedulingProvider><TotemPage /></SchedulingProvider>} />
                <Route path="/totem/:slug" element={<SchedulingProvider><TotemPage /></SchedulingProvider>} />
                <Route path="/painel-chamada" element={<CallingPanelPage />} />
                <Route path="/painel/:slug" element={<CallingPanelPage />} />
                <Route path="/painel-medico" element={<DoctorPanelPage />} />
                <Route path="/painel-tv" element={<QueueSystemProvider><TVPanelPage /></QueueSystemProvider>} />

                {/* Patient Portal */}
                <Route path="/resultado" element={<PatientPortalLayout />} />
                <Route path="/resultado/*" element={<PatientPortalLayout />} />

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

                {/* Redirects for short paths */}
                <Route path="/confirmacoes" element={<Navigate to="/app/confirmacoes" replace />} />
                <Route path="/agendamento" element={<Navigate to="/app/agendamento" replace />} />
                <Route path="/recepcao" element={<Navigate to="/app/recepcao" replace />} />

                {/* Company Portal */}
                <Route path="/app/*" element={<PrivateRoute><CompanyPortalLayout /></PrivateRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              </QueueProvider>
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
