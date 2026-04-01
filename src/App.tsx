import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
// Session hooks removed - no backend
import { DemoModeProvider, useDemoMode } from "@/hooks/useDemoMode";
import { useEffect } from "react";

import LoginPage from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetails from "@/pages/project-details";
import Teams from "@/pages/teams";
import TeamDetails from "@/pages/team-details";
import Timeline from "@/pages/timeline";
import Reports from "@/pages/reports";
import ReportBug from "@/pages/report-bug";
import ProjectBugReports from "@/pages/project-bug-reports";
import DailyStandup from "@/pages/standup";
import StrategicRoadmap from "@/pages/strategic-roadmap";
import TemplateSettings from "@/pages/template-settings";
import NotFound from "@/pages/NotFound";

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, isUnauthenticated } = useAuth();
  const { isDemoMode } = useDemoMode();

  const effectivelyAuthenticated = isAuthenticated || isDemoMode;

  // No backend session hooks needed

  useEffect(() => {
    if (isDemoMode) return;
    if (isLoading) return;

    if (isUnauthenticated) {
      if (!location.pathname.startsWith("/login") && !location.pathname.startsWith("/register")) {
        navigate("/login");
      }
    } else if (isAuthenticated && location.pathname === "/") {
      navigate("/dashboard");
    }
  }, [location.pathname, navigate, isAuthenticated, isUnauthenticated, isLoading, isDemoMode]);

  if (!isDemoMode && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={effectivelyAuthenticated ? <Dashboard /> : <LoginPage />} />
      <Route path="/projects" element={effectivelyAuthenticated ? <Projects /> : <LoginPage />} />
      <Route path="/projects/:id" element={effectivelyAuthenticated ? <ProjectDetails /> : <LoginPage />} />
      <Route path="/teams" element={effectivelyAuthenticated ? <Teams /> : <LoginPage />} />
      <Route path="/teams/:id" element={effectivelyAuthenticated ? <TeamDetails /> : <LoginPage />} />
      <Route path="/timeline" element={effectivelyAuthenticated ? <Timeline /> : <LoginPage />} />
      <Route path="/calendar" element={effectivelyAuthenticated ? <Timeline /> : <LoginPage />} />
      <Route path="/reports" element={effectivelyAuthenticated ? <Reports /> : <LoginPage />} />
      <Route path="/report-bug" element={effectivelyAuthenticated ? <ReportBug /> : <LoginPage />} />
      <Route path="/project-bug-reports" element={effectivelyAuthenticated ? <ProjectBugReports /> : <LoginPage />} />
      <Route path="/standup" element={effectivelyAuthenticated ? <DailyStandup /> : <LoginPage />} />
      <Route path="/roadmap" element={effectivelyAuthenticated ? <StrategicRoadmap /> : <LoginPage />} />
      <Route path="/templates" element={effectivelyAuthenticated ? <TemplateSettings /> : <LoginPage />} />
      <Route path="*" element={effectivelyAuthenticated ? <NotFound /> : <LoginPage />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DemoModeProvider>
        <div className="min-h-screen">
          <Toaster />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </div>
      </DemoModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
