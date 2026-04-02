import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DEMO_USER, DEMO_TEAMS, DEMO_PROJECTS } from "@/lib/demo-data";
import { localStore } from "@/lib/local-store";

export function AuthenticatedLayout() {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentUser = isDemoMode ? DEMO_USER : (user as any);
  const teams = isDemoMode ? DEMO_TEAMS : localStore.teams.getAll();
  const projects = isDemoMode ? DEMO_PROJECTS : localStore.projects.getAll();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={currentUser} teams={teams} projects={projects} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={currentUser}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
