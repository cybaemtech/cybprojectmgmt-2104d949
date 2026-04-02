import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getLocalUser, projectStore, teamStore } from "@/lib/local-store";

export function AuthenticatedLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentUser = getLocalUser();
  const teams = teamStore.all();
  const projects = projectStore.all();

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
