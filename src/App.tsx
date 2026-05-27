import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { DemoModeProvider, useDemoMode } from "@/hooks/useDemoMode";
import { useEffect } from "react";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { initStore, refreshStore, clearStore } from "@/lib/local-store";
import { supabaseCustom } from "@/lib/supabase-custom";

import LoginPage from "@/pages/login";

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
import EmailSettings from "@/pages/email-settings";

import NotFound from "@/pages/NotFound";

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, isUnauthenticated } = useAuth();
  const { isDemoMode } = useDemoMode();

  const effectivelyAuthenticated = isAuthenticated || isDemoMode;

  useEffect(() => {
    // In demo mode, init immediately (uses static demo data)
    if (isDemoMode) {
      initStore();
      return;
    }
    // Otherwise, wait for a real auth session before hitting Supabase,
    // so RLS-protected reads use the authenticated role (not anon → 0 rows).
    let cancelled = false;
    supabaseCustom.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) refreshStore();
    });
    const { data: { subscription } } = supabaseCustom.auth.onAuthStateChange((_event, session) => {
      if (session) refreshStore();
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    if (isLoading) return;

    if (isUnauthenticated) {
      if (!location.pathname.startsWith("/login")) {
        navigate("/login");
      }
    } else if (isAuthenticated && location.pathname === "/") {
      navigate("/login");
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
      
      
      {/* Authenticated routes with shared layout */}
      <Route element={effectivelyAuthenticated ? <AuthenticatedLayout /> : <LoginPage />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamDetails />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/calendar" element={<Timeline />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/report-bug" element={<ReportBug />} />
        <Route path="/project-bug-reports" element={<ProjectBugReports />} />
        <Route path="/standup" element={<DailyStandup />} />
        <Route path="/roadmap" element={<StrategicRoadmap />} />
        <Route path="/templates" element={<TemplateSettings />} />
        <Route path="/email-settings" element={<EmailSettings />} />
        
      </Route>
      
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
