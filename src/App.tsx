import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { QueueSystemProvider } from "@/context/QueueSystemContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { RegistersProvider } from "@/context/RegistersContext";
import { QueueProvider } from "@/context/QueueContext";
import { SchedulingProvider } from "@/context/SchedulingContext";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { SuperAdminRoute, PrivateRoute } from "@/router/guards";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";

// Lazy loading components
const LandingPage = lazy(() => import("./pages/LandingPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const FirstAccessPasswordPage = lazy(() => import("./pages/FirstAccessPasswordPage"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const ProfileSelectorPage = lazy(() => import("./pages/ProfileSelectorPage"));
const SuperAdminLayout = lazy(() => import("./pages/superadmin/SuperAdminLayout"));
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const CompaniesManagementPage = lazy(() => import("./pages/superadmin/companies/CompaniesManagementPage"));
const CompanyDetailPage = lazy(() => import("./pages/superadmin/CompanyDetailPage"));
const SuperAdminUsersPage = lazy(() => import("./pages/superadmin/SuperAdminUsersPage"));
const PlansManagerPage = lazy(() => import("./pages/superadmin/PlansManagerPage"));
const AuditLogPage = lazy(() => import("./pages/superadmin/AuditLogPage"));
const SystemSettingsPage = lazy(() => import("./pages/superadmin/SystemSettingsPage"));
const CompanyPortalLayout = lazy(() => import("./pages/company/CompanyPortalLayout"));
const TotemPage = lazy(() => import("./pages/public/TotemPage"));
const CallingPanelPage = lazy(() => import("./pages/public/CallingPanelPage"));
const DoctorPanelPage = lazy(() => import("./pages/public/DoctorPanelPage"));
const TVPanelPage = lazy(() => import("./pages/company/queue/TVPanelPage"));
const PatientPortalLayout = lazy(() => import("./pages/patient/PatientPortalLayout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GreenScreenPage = lazy(() => import("./pages/GreenScreenPage"));
const OriginSelectorPage = lazy(() => import("./pages/company/OriginSelectorPage"));
const LabColetaPage = lazy(() => import("./pages/company/lab/LabColetaPage"));
const DesignSystemPage = lazy(() => import("./pages/DesignSystemPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));

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
              <RegistersProvider>
                <QueueProvider>
                  <Suspense fallback={<LoadingScreen />}>
                    <Routes>
                      {/* Public */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/verde" element={<GreenScreenPage />} />
                      <Route path="/design-system" element={<DesignSystemPage />} />
                      <Route path="/cadastro" element={<RegisterPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/unauthorized" element={<UnauthorizedPage />} />
                      <Route path="/primeiro-acesso" element={<FirstAccessPasswordPage />} />

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
                      <Route path="/selecionar-origem" element={<PrivateRoute><OriginSelectorPage /></PrivateRoute>} />
                      <Route path="/app/lab/coleta" element={<PrivateRoute><LabColetaPage /></PrivateRoute>} />

                      {/* Super Admin */}
                      <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
                        <Route path="dashboard" element={<SuperAdminDashboard />} />
                        <Route path="empresas" element={<CompaniesManagementPage />} />
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
                  </Suspense>
                </QueueProvider>
              </RegistersProvider>
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;