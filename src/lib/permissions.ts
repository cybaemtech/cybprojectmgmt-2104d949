// Centralized definitions for role-based access controls used by the
// Configuration page and the sidebar gate.

import type { UserRole } from "@/types/schema";

export type PageKey =
  | "dashboard"
  | "strategic_roadmap"
  | "team_management"
  | "project_management"
  | "daily_standup"
  | "timeline"
  | "template_settings"
  | "reports"
  | "raise_ticket";

export type FeatureKey =
  | "create_project"
  | "delete_project"
  | "create_team"
  | "delete_team"
  | "create_global_template"
  | "delete_epic_feature"
  | "manage_strategic_roadmap"
  | "edit_client_details"
  | "manage_team_members"
  | "configure_smtp"
  | "assign_user_roles";

export const PAGES: { key: PageKey; label: string; description: string }[] = [
  { key: "dashboard", label: "Dashboard", description: "Workspace overview" },
  { key: "strategic_roadmap", label: "Strategic Roadmap", description: "Portfolio-level roadmap" },
  { key: "team_management", label: "Team Management", description: "Manage teams" },
  { key: "project_management", label: "Project Management", description: "Browse and manage projects" },
  { key: "daily_standup", label: "Daily Standup", description: "Daily activity matrix" },
  { key: "timeline", label: "Timeline", description: "Calendar / timeline view" },
  { key: "template_settings", label: "Template Settings", description: "Manage work-item templates" },
  { key: "reports", label: "Reports", description: "Operational reports" },
  { key: "raise_ticket", label: "Raise Ticket", description: "Submit a bug ticket" },
];

export const FEATURES: { key: FeatureKey; label: string; description: string }[] = [
  { key: "create_project", label: "Create Project", description: "Create new projects" },
  { key: "delete_project", label: "Delete Project", description: "Delete projects (cascades)" },
  { key: "create_team", label: "Create Team", description: "Create new teams" },
  { key: "delete_team", label: "Delete Team", description: "Delete teams" },
  { key: "create_global_template", label: "Create Global Template", description: "Publish a template visible to everyone" },
  { key: "delete_epic_feature", label: "Delete Epic / Feature", description: "Cascade-delete EPIC and FEATURE work items" },
  { key: "manage_strategic_roadmap", label: "Manage Strategic Roadmap", description: "Edit portfolio roadmap items" },
  { key: "edit_client_details", label: "Edit Client Details", description: "Edit confidential client / CRM fields" },
  { key: "manage_team_members", label: "Manage Team Members", description: "Add or remove team members" },
  { key: "configure_smtp", label: "Configure SMTP", description: "Change email service credentials" },
  { key: "assign_user_roles", label: "Assign User Roles", description: "Promote / demote users" },
];

export const ROLES: { key: UserRole; label: string; locked?: boolean }[] = [
  { key: "ADMIN", label: "Admin", locked: true },
  { key: "SCRUM_MASTER", label: "Scrum Master" },
  { key: "USER", label: "Team Member" },
];

export interface RolePermissionRow {
  role: UserRole;
  allowed_pages: string[];
  allowed_features: string[];
  updated_at?: string;
}

export type PermissionMap = Record<UserRole, { pages: Set<PageKey>; features: Set<FeatureKey> }>;

export const DEFAULT_PERMISSIONS: PermissionMap = {
  ADMIN: {
    pages: new Set(PAGES.map((p) => p.key)),
    features: new Set(FEATURES.map((f) => f.key)),
  },
  SCRUM_MASTER: {
    pages: new Set<PageKey>([
      "dashboard",
      "strategic_roadmap",
      "team_management",
      "project_management",
      "daily_standup",
      "timeline",
      "template_settings",
      "reports",
      "raise_ticket",
    ]),
    features: new Set<FeatureKey>([
      "create_project",
      "create_team",
      "manage_strategic_roadmap",
      "edit_client_details",
      "manage_team_members",
    ]),
  },
  USER: {
    pages: new Set<PageKey>([
      "dashboard",
      "team_management",
      "project_management",
      "timeline",
      "template_settings",
      "reports",
      "raise_ticket",
    ]),
    features: new Set<FeatureKey>([]),
  },
};

export function rowsToMap(rows: RolePermissionRow[] | null | undefined): PermissionMap {
  const map: PermissionMap = {
    ADMIN: { pages: new Set(DEFAULT_PERMISSIONS.ADMIN.pages), features: new Set(DEFAULT_PERMISSIONS.ADMIN.features) },
    SCRUM_MASTER: { pages: new Set(DEFAULT_PERMISSIONS.SCRUM_MASTER.pages), features: new Set(DEFAULT_PERMISSIONS.SCRUM_MASTER.features) },
    USER: { pages: new Set(DEFAULT_PERMISSIONS.USER.pages), features: new Set(DEFAULT_PERMISSIONS.USER.features) },
  };
  if (!rows) return map;
  for (const row of rows) {
    if (!map[row.role]) continue;
    if (row.role === "ADMIN") continue; // Admin is always full access
    map[row.role] = {
      pages: new Set((row.allowed_pages || []) as PageKey[]),
      features: new Set((row.allowed_features || []) as FeatureKey[]),
    };
  }
  return map;
}
