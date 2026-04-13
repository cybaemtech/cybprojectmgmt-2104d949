/**
 * Supabase-backed data store.
 * Mirrors the local-store.ts API but reads/writes from Supabase.
 * All functions are async — consumer files must await them.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Project, Team, WorkItem, User, TeamMember } from "@/types/schema";

// ── Helper: map snake_case DB row → camelCase app type ──────────────

function mapProfile(row: any): User {
  return {
    id: row.id,               // uuid string from Supabase
    username: row.username ?? "",
    email: row.email ?? "",
    fullName: row.full_name ?? "",
    password: "",
    avatarUrl: row.avatar_url,
    isActive: row.is_active ?? true,
    role: row.role ?? "USER",
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as any;
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    teamId: row.team_id,
    startDate: row.start_date,
    targetDate: row.target_date,
    githubUrl: row.github_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientCompanyName: row.client_company_name,
    clientIndustry: row.client_industry,
    clientWebsite: row.client_website,
    clientContactName: row.client_contact_name,
    clientContactEmail: row.client_contact_email,
    clientContactPhone: row.client_contact_phone,
    clientAccountManager: row.client_account_manager,
    clientStatus: row.client_status,
    clientNotes: row.client_notes,
  };
}

function mapTeam(row: any): Team {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTeamMember(row: any): TeamMember {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkItem(row: any): WorkItem {
  return {
    id: row.id,
    externalId: row.external_id ?? "",
    title: row.title,
    description: row.description,
    tags: row.tags,
    type: row.type,
    status: row.status,
    priority: row.priority,
    projectId: row.project_id,
    parentId: row.parent_id,
    assigneeId: row.assignee_id,
    reporterId: row.reporter_id,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name,
    estimate: row.estimate,
    actualHours: row.actual_hours,
    startDate: row.start_date,
    endDate: row.end_date,
    completedAt: row.completed_at,
    bugType: row.bug_type,
    severity: row.severity,
    currentBehavior: row.current_behavior,
    expectedBehavior: row.expected_behavior,
    referenceUrl: row.reference_url,
    screenshotPath: row.screenshot_path,
    screenshot: row.screenshot,
    screenshotBlob: row.screenshot_blob,
    githubUrl: row.github_url,
    prototypeLink: row.prototype_link,
    prototypeStatus: row.prototype_status,
    pdfUploadPath: row.pdf_upload_path,
    pdfUploadBlob: row.pdf_upload_blob,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // These will be joined separately
    projectKey: row.projects?.key ?? row.project_key ?? "",
    projectName: row.projects?.name ?? row.project_name ?? "",
  };
}

// ── camelCase → snake_case for inserts/updates ──────────────────────

function projectToRow(p: Partial<Project>): Record<string, any> {
  const row: Record<string, any> = {};
  if (p.key !== undefined) row.key = p.key;
  if (p.name !== undefined) row.name = p.name;
  if (p.description !== undefined) row.description = p.description;
  if (p.category !== undefined) row.category = p.category;
  if (p.status !== undefined) row.status = p.status;
  if (p.createdBy !== undefined) row.created_by = p.createdBy;
  if (p.createdByName !== undefined) row.created_by_name = p.createdByName;
  if (p.createdByEmail !== undefined) row.created_by_email = p.createdByEmail;
  if (p.teamId !== undefined) row.team_id = p.teamId;
  if (p.startDate !== undefined) row.start_date = p.startDate;
  if (p.targetDate !== undefined) row.target_date = p.targetDate;
  if (p.githubUrl !== undefined) row.github_url = p.githubUrl;
  if (p.clientCompanyName !== undefined) row.client_company_name = p.clientCompanyName;
  if (p.clientIndustry !== undefined) row.client_industry = p.clientIndustry;
  if (p.clientWebsite !== undefined) row.client_website = p.clientWebsite;
  if (p.clientContactName !== undefined) row.client_contact_name = p.clientContactName;
  if (p.clientContactEmail !== undefined) row.client_contact_email = p.clientContactEmail;
  if (p.clientContactPhone !== undefined) row.client_contact_phone = p.clientContactPhone;
  if (p.clientAccountManager !== undefined) row.client_account_manager = p.clientAccountManager;
  if (p.clientStatus !== undefined) row.client_status = p.clientStatus;
  if (p.clientNotes !== undefined) row.client_notes = p.clientNotes;
  return row;
}

function workItemToRow(w: Partial<WorkItem>): Record<string, any> {
  const row: Record<string, any> = {};
  if (w.externalId !== undefined) row.external_id = w.externalId;
  if (w.title !== undefined) row.title = w.title;
  if (w.description !== undefined) row.description = w.description;
  if (w.tags !== undefined) row.tags = w.tags;
  if (w.type !== undefined) row.type = w.type;
  if (w.status !== undefined) row.status = w.status;
  if (w.priority !== undefined) row.priority = w.priority;
  if (w.projectId !== undefined) row.project_id = w.projectId;
  if (w.parentId !== undefined) row.parent_id = w.parentId;
  if (w.assigneeId !== undefined) row.assignee_id = w.assigneeId;
  if (w.reporterId !== undefined) row.reporter_id = w.reporterId;
  if (w.createdByName !== undefined) row.created_by_name = w.createdByName;
  if (w.createdByEmail !== undefined) row.created_by_email = w.createdByEmail;
  if (w.updatedBy !== undefined) row.updated_by = w.updatedBy;
  if (w.updatedByName !== undefined) row.updated_by_name = w.updatedByName;
  if (w.estimate !== undefined) row.estimate = w.estimate;
  if (w.actualHours !== undefined) row.actual_hours = w.actualHours;
  if (w.startDate !== undefined) row.start_date = w.startDate;
  if (w.endDate !== undefined) row.end_date = w.endDate;
  if (w.completedAt !== undefined) row.completed_at = w.completedAt;
  if (w.bugType !== undefined) row.bug_type = w.bugType;
  if (w.severity !== undefined) row.severity = w.severity;
  if (w.currentBehavior !== undefined) row.current_behavior = w.currentBehavior;
  if (w.expectedBehavior !== undefined) row.expected_behavior = w.expectedBehavior;
  if (w.referenceUrl !== undefined) row.reference_url = w.referenceUrl;
  if (w.screenshotPath !== undefined) row.screenshot_path = w.screenshotPath;
  if (w.screenshot !== undefined) row.screenshot = w.screenshot;
  if (w.screenshotBlob !== undefined) row.screenshot_blob = w.screenshotBlob;
  if (w.githubUrl !== undefined) row.github_url = w.githubUrl;
  if (w.prototypeLink !== undefined) row.prototype_link = w.prototypeLink;
  if (w.prototypeStatus !== undefined) row.prototype_status = w.prototypeStatus;
  if (w.pdfUploadPath !== undefined) row.pdf_upload_path = w.pdfUploadPath;
  if (w.pdfUploadBlob !== undefined) row.pdf_upload_blob = w.pdfUploadBlob;
  return row;
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  Stores                                                         ║
// ╚══════════════════════════════════════════════════════════════════╝

export const projectStore = {
  all: async (): Promise<Project[]> => {
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) { console.error("projectStore.all error:", error); return []; }
    return (data || []).map(mapProject);
  },

  get: async (id: number): Promise<Project | undefined> => {
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error || !data) return undefined;
    return mapProject(data);
  },

  save: async (project: Partial<Project> & { name: string; key: string }): Promise<Project> => {
    const row = projectToRow(project);
    if (project.id) {
      // Update
      const { data, error } = await supabase.from("projects").update(row as any).eq("id", project.id).select().single();
      if (error) throw error;
      return mapProject(data);
    } else {
      // Insert
      const { data, error } = await supabase.from("projects").insert(row as any).select().single();
      if (error) throw error;
      return mapProject(data);
    }
  },

  delete: async (id: number): Promise<void> => {
    await supabase.from("work_items").delete().eq("project_id", id);
    await supabase.from("projects").delete().eq("id", id);
  },
};

export const teamStore = {
  all: async (): Promise<Team[]> => {
    const { data, error } = await supabase.from("teams").select("*").order("created_at", { ascending: false });
    if (error) { console.error("teamStore.all error:", error); return []; }
    return (data || []).map(mapTeam);
  },

  get: async (id: number): Promise<Team | undefined> => {
    const { data, error } = await supabase.from("teams").select("*").eq("id", id).single();
    if (error || !data) return undefined;
    return mapTeam(data);
  },

  save: async (team: Partial<Team> & { name: string }): Promise<Team> => {
    const row: Record<string, any> = {
      name: team.name,
      description: team.description ?? null,
      created_by: team.createdBy ?? null,
      is_active: team.isActive ?? true,
    };
    if (team.id) {
      const { data, error } = await supabase.from("teams").update(row as any).eq("id", team.id).select().single();
      if (error) throw error;
      return mapTeam(data);
    } else {
      const { data, error } = await supabase.from("teams").insert(row as any).select().single();
      if (error) throw error;
      return mapTeam(data);
    }
  },

  delete: async (id: number): Promise<void> => {
    await supabase.from("team_members").delete().eq("team_id", id);
    await supabase.from("teams").delete().eq("id", id);
  },
};

export const userStore = {
  all: async (): Promise<User[]> => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) { console.error("userStore.all error:", error); return []; }
    return (data || []).map(mapProfile);
  },

  get: async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error || !data) return undefined;
    return mapProfile(data);
  },

  update: async (id: string, updates: Partial<User>): Promise<void> => {
    const row: Record<string, any> = {};
    if (updates.fullName !== undefined) row.full_name = updates.fullName;
    if (updates.username !== undefined) row.username = updates.username;
    if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.isActive !== undefined) row.is_active = updates.isActive;
    if (updates.lastLogin !== undefined) row.last_login = updates.lastLogin;
    row.updated_at = new Date().toISOString();
    await supabase.from("profiles").update(row as any).eq("id", id);
  },
};

export const teamMemberStore = {
  all: async (): Promise<TeamMember[]> => {
    const { data, error } = await supabase.from("team_members").select("*");
    if (error) { console.error("teamMemberStore.all error:", error); return []; }
    return (data || []).map(mapTeamMember);
  },

  byTeam: async (teamId: number): Promise<TeamMember[]> => {
    const { data, error } = await supabase.from("team_members").select("*").eq("team_id", teamId);
    if (error) return [];
    return (data || []).map(mapTeamMember);
  },

  usersForTeam: async (teamId: number): Promise<User[]> => {
    const { data, error } = await supabase
      .from("team_members")
      .select("user_id, profiles(*)")
      .eq("team_id", teamId);
    if (error) return [];
    return (data || []).map((row: any) => mapProfile(row.profiles)).filter(Boolean);
  },

  add: async (teamId: number, userId: string, role: string = "MEMBER"): Promise<TeamMember> => {
    const { data, error } = await supabase
      .from("team_members")
      .insert({ team_id: teamId, user_id: userId, role } as any)
      .select()
      .single();
    if (error) throw error;
    return mapTeamMember(data);
  },

  remove: async (teamId: number, userId: string): Promise<void> => {
    await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  },

  updateRole: async (teamId: number, userId: string, role: string): Promise<void> => {
    await supabase
      .from("team_members")
      .update({ role, updated_at: new Date().toISOString() } as any)
      .eq("team_id", teamId)
      .eq("user_id", userId);
  },
};

export const workItemStore = {
  all: async (): Promise<WorkItem[]> => {
    const { data, error } = await supabase
      .from("work_items")
      .select("*, projects(key, name)")
      .order("created_at", { ascending: false });
    if (error) { console.error("workItemStore.all error:", error); return []; }
    return (data || []).map(mapWorkItem);
  },

  byProject: async (projectId: number): Promise<WorkItem[]> => {
    const { data, error } = await supabase
      .from("work_items")
      .select("*, projects(key, name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map(mapWorkItem);
  },

  get: async (id: number): Promise<WorkItem | undefined> => {
    const { data, error } = await supabase
      .from("work_items")
      .select("*, projects(key, name)")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return mapWorkItem(data);
  },

  save: async (item: Partial<WorkItem> & { title: string; projectId: number; type: string }): Promise<WorkItem> => {
    const row = workItemToRow(item);
    if (item.id) {
      row.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from("work_items").update(row as any).eq("id", item.id).select("*, projects(key, name)").single();
      if (error) throw error;
      return mapWorkItem(data);
    } else {
      const { data, error }: any = await supabase.from("work_items").insert(row as any).select("*, projects(key, name)").single();
      if (error) throw error;
      // Auto-generate external_id if needed
      if (!data.external_id) {
        const extId = `${data.projects?.key || "WI"}-${data.id}`;
        await supabase.from("work_items").update({ external_id: extId }).eq("id", data.id);
        data.external_id = extId;
      }
      return mapWorkItem(data);
    }
  },

  update: async (id: number, updates: Partial<WorkItem>): Promise<WorkItem | undefined> => {
    const row = workItemToRow(updates);
    row.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from("work_items").update(row as any).eq("id", id).select("*, projects(key, name)").single();
    if (error) return undefined;
    return mapWorkItem(data);
  },

  delete: async (id: number): Promise<void> => {
    await supabase.from("work_items").delete().eq("id", id);
  },
};

export interface ProjectCategory {
  value: string;
  label: string;
}

const DEFAULT_CATEGORIES: ProjectCategory[] = [
  { value: "CLIENT", label: "Client Project" },
  { value: "IN_HOUSE", label: "In-House Project" },
];

export const categoryStore = {
  all: (): ProjectCategory[] => DEFAULT_CATEGORIES,
  add: (label: string): ProjectCategory => {
    const value = label.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const existing = DEFAULT_CATEGORIES.find((c) => c.value === value);
    if (existing) return existing;
    const newCat = { value, label };
    DEFAULT_CATEGORIES.push(newCat);
    return newCat;
  },
};

// ── Auth user helper (from Supabase session) ────────────────────────
export async function getLocalUser(): Promise<User> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    // Return a fallback
    return {
      id: "",
      username: "anonymous",
      email: "",
      fullName: "Anonymous",
      password: "",
      avatarUrl: null,
      isActive: true,
      role: "USER",
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;
  }
  // Fetch profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
  if (profile) return mapProfile(profile);
  return {
    id: authUser.id,
    username: authUser.email?.split("@")[0] ?? "",
    email: authUser.email ?? "",
    fullName: authUser.user_metadata?.full_name ?? authUser.email?.split("@")[0] ?? "",
    password: "",
    avatarUrl: null,
    isActive: true,
    role: "USER",
    lastLogin: null,
    createdAt: authUser.created_at,
    updatedAt: authUser.updated_at ?? authUser.created_at,
  } as any;
}

// Synchronous version using cached session (for components that need immediate data)
let _cachedUser: User | null = null;

export function getCachedUser(): User {
  if (_cachedUser) return _cachedUser;
  // Fallback to localStorage auth-user if available (backwards compat during migration)
  try {
    const stored = localStorage.getItem("supabase-user-cache");
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    id: "",
    username: "anonymous",
    email: "",
    fullName: "Anonymous",
    password: "",
    avatarUrl: null,
    isActive: true,
    role: "USER",
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any;
}

export function setCachedUser(user: User) {
  _cachedUser = user;
  localStorage.setItem("supabase-user-cache", JSON.stringify(user));
}

export function clearCachedUser() {
  _cachedUser = null;
  localStorage.removeItem("supabase-user-cache");
}
