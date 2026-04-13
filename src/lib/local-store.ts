/**
 * local-store.ts – Supabase-backed store with synchronous API.
 *
 * Reads return cached data instantly.  Writes go to both the in-memory
 * cache (for immediate UI updates) AND Supabase (for persistence).
 * On app boot the cache is populated from Supabase.
 */
import { Project, Team, WorkItem, User, TeamMember } from "@/types/schema";
import { supabase } from "@/integrations/supabase/client";

// ── In-memory caches ────────────────────────────────────────────────
let _projects: Project[] = [];
let _teams: Team[] = [];
let _workItems: WorkItem[] = [];
let _users: User[] = [];
let _teamMembers: TeamMember[] = [];
let _initialised = false;

// ── Event bus for reactivity ────────────────────────────────────────
function notifyChange() {
  window.dispatchEvent(new Event("store-change"));
}

// ── Row mappers (snake_case DB → camelCase app) ─────────────────────

function mapProfile(row: any): User {
  return {
    id: row.id,
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
    projectKey: row.projects?.key ?? "",
    projectName: row.projects?.name ?? "",
  };
}

// ── camelCase → snake_case converters ───────────────────────────────

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
// ║  Bootstrap – load all data from Supabase into cache             ║
// ╚══════════════════════════════════════════════════════════════════╝

let _bootPromise: Promise<void> | null = null;

export function initStore(): Promise<void> {
  if (_bootPromise) return _bootPromise;
  _bootPromise = (async () => {
    try {
      const [projectsRes, teamsRes, usersRes, teamMembersRes, workItemsRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("teams").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("team_members").select("*"),
        supabase.from("work_items").select("*, projects(key, name)").order("created_at", { ascending: false }),
      ]);
      _projects = (projectsRes.data || []).map(mapProject);
      _teams = (teamsRes.data || []).map(mapTeam);
      _users = (usersRes.data || []).map(mapProfile);
      _teamMembers = (teamMembersRes.data || []).map(mapTeamMember);
      _workItems = (workItemsRes.data || []).map(mapWorkItem);
      _initialised = true;
      console.log(`[store] Loaded from Supabase: ${_projects.length} projects, ${_teams.length} teams, ${_users.length} users, ${_workItems.length} work items`);
      notifyChange();
    } catch (err) {
      console.error("[store] Failed to initialise from Supabase:", err);
    }
  })();
  return _bootPromise;
}

// Force refresh from Supabase
export async function refreshStore(): Promise<void> {
  _bootPromise = null;
  _initialised = false;
  return initStore();
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  Stores (synchronous API, async Supabase writes)                ║
// ╚══════════════════════════════════════════════════════════════════╝

export interface ProjectCategory {
  value: string;
  label: string;
}

const DEFAULT_CATEGORIES: ProjectCategory[] = [
  { value: "CLIENT", label: "Client Project" },
  { value: "IN_HOUSE", label: "In-House Project" },
];

// ── Projects ────────────────────────────────────────────────────────
export const projectStore = {
  all: (): Project[] => _projects,

  get: (id: number): Project | undefined => _projects.find((p) => p.id === id),

  save: (project: Partial<Project> & { name: string; key: string }): Project => {
    const authUser = getLocalUser();
    const now = new Date().toISOString();
    const row = projectToRow(project);
    row.created_by_name = row.created_by_name ?? authUser.fullName;
    row.created_by_email = row.created_by_email ?? authUser.email;

    if (project.id) {
      // Update in cache
      const idx = _projects.findIndex((p) => p.id === project.id);
      if (idx >= 0) {
        _projects[idx] = { ..._projects[idx], ...project, updatedAt: now };
      }
      notifyChange();
      // Async write to Supabase
      supabase.from("projects").update({ ...row, updated_at: now } as any).eq("id", project.id).then(({ error }) => {
        if (error) console.error("[projectStore.save] update error:", error);
      });
      return idx >= 0 ? _projects[idx] : (project as Project);
    } else {
      // Insert – use a temp ID, replace when Supabase responds
      const tempId = Date.now();
      const newProject: Project = {
        id: tempId,
        name: project.name,
        key: project.key,
        description: project.description || "",
        category: (project.category as any) || "IN_HOUSE",
        status: (project.status as any) || "ACTIVE",
        teamId: project.teamId ?? null,
        startDate: project.startDate || null,
        targetDate: project.targetDate || null,
        githubUrl: project.githubUrl || null,
        createdBy: project.createdBy ?? (authUser.id as any),
        createdByName: authUser.fullName,
        createdByEmail: authUser.email,
        createdAt: now,
        updatedAt: now,
        clientCompanyName: project.clientCompanyName || null,
        clientIndustry: project.clientIndustry || null,
        clientWebsite: project.clientWebsite || null,
        clientContactName: project.clientContactName || null,
        clientContactEmail: project.clientContactEmail || null,
        clientContactPhone: project.clientContactPhone || null,
        clientAccountManager: project.clientAccountManager ?? null,
        clientStatus: (project.clientStatus as any) || null,
        clientNotes: project.clientNotes || null,
      };
      _projects.unshift(newProject);
      notifyChange();
      // Async insert
      supabase.from("projects").insert(row as any).select().single().then(({ data, error }) => {
        if (error) { console.error("[projectStore.save] insert error:", error); return; }
        if (data) {
          const idx = _projects.findIndex((p) => p.id === tempId);
          if (idx >= 0) _projects[idx] = mapProject(data);
          notifyChange();
        }
      });
      return newProject;
    }
  },

  delete: (id: number) => {
    _projects = _projects.filter((p) => p.id !== id);
    _workItems = _workItems.filter((w) => w.projectId !== id);
    notifyChange();
    supabase.from("work_items").delete().eq("project_id", id).then(() =>
      supabase.from("projects").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("[projectStore.delete] error:", error);
      })
    );
  },
};

// ── Teams ───────────────────────────────────────────────────────────
export const teamStore = {
  all: (): Team[] => _teams,

  get: (id: number): Team | undefined => _teams.find((t) => t.id === id),

  save: (team: Partial<Team> & { name: string }): Team => {
    const authUser = getLocalUser();
    const now = new Date().toISOString();
    const row: Record<string, any> = {
      name: team.name,
      description: team.description ?? null,
      created_by: team.createdBy ?? authUser.id,
      is_active: team.isActive ?? true,
    };

    if (team.id) {
      const idx = _teams.findIndex((t) => t.id === team.id);
      if (idx >= 0) _teams[idx] = { ..._teams[idx], ...team, updatedAt: now };
      notifyChange();
      supabase.from("teams").update({ ...row, updated_at: now } as any).eq("id", team.id).then(({ error }) => {
        if (error) console.error("[teamStore.save] update error:", error);
      });
      return idx >= 0 ? _teams[idx] : (team as Team);
    } else {
      const tempId = Date.now();
      const newTeam: Team = {
        id: tempId,
        name: team.name,
        description: team.description || null,
        createdBy: team.createdBy ?? (authUser.id as any),
        isActive: team.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      _teams.unshift(newTeam);
      notifyChange();
      supabase.from("teams").insert(row as any).select().single().then(({ data, error }) => {
        if (error) { console.error("[teamStore.save] insert error:", error); return; }
        if (data) {
          const idx = _teams.findIndex((t) => t.id === tempId);
          if (idx >= 0) _teams[idx] = mapTeam(data);
          notifyChange();
        }
      });
      return newTeam;
    }
  },

  delete: (id: number) => {
    _teams = _teams.filter((t) => t.id !== id);
    _teamMembers = _teamMembers.filter((m) => m.teamId !== id);
    notifyChange();
    supabase.from("team_members").delete().eq("team_id", id).then(() =>
      supabase.from("teams").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("[teamStore.delete] error:", error);
      })
    );
  },
};

// ── Users ───────────────────────────────────────────────────────────
export const userStore = {
  all: (): User[] => _users,

  get: (id: number | string): User | undefined => _users.find((u) => String(u.id) === String(id)),

  update: (id: number | string, updates: Partial<User>) => {
    const idx = _users.findIndex((u) => String(u.id) === String(id));
    if (idx >= 0) {
      _users[idx] = { ..._users[idx], ...updates, updatedAt: new Date().toISOString() };
      notifyChange();
    }
    const row: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.fullName !== undefined) row.full_name = updates.fullName;
    if (updates.username !== undefined) row.username = updates.username;
    if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.isActive !== undefined) row.is_active = updates.isActive;
    supabase.from("profiles").update(row as any).eq("id", String(id)).then(({ error }) => {
      if (error) console.error("[userStore.update] error:", error);
    });
  },
};

// ── Team Members ────────────────────────────────────────────────────
export const teamMemberStore = {
  all: (): TeamMember[] => _teamMembers,

  byTeam: (teamId: number): TeamMember[] => _teamMembers.filter((m) => m.teamId === teamId),

  usersForTeam: (teamId: number): User[] => {
    const memberIds = teamMemberStore.byTeam(teamId).map((m) => String(m.userId));
    return _users.filter((u) => memberIds.includes(String(u.id)));
  },

  add: (teamId: number, userId: number | string, role: string = "MEMBER"): TeamMember => {
    const now = new Date().toISOString();
    const tempId = Date.now();
    const newMember: TeamMember = {
      id: tempId,
      teamId,
      userId: userId as any,
      role: role as any,
      joinedAt: now,
      updatedAt: now,
    };
    _teamMembers.push(newMember);
    notifyChange();
    supabase.from("team_members").insert({ team_id: teamId, user_id: String(userId), role } as any).select().single().then(({ data, error }) => {
      if (error) { console.error("[teamMemberStore.add] error:", error); return; }
      if (data) {
        const idx = _teamMembers.findIndex((m) => m.id === tempId);
        if (idx >= 0) _teamMembers[idx] = mapTeamMember(data);
        notifyChange();
      }
    });
    return newMember;
  },

  remove: (teamId: number, userId: number | string) => {
    _teamMembers = _teamMembers.filter((m) => !(m.teamId === teamId && String(m.userId) === String(userId)));
    notifyChange();
    supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", String(userId)).then(({ error }) => {
      if (error) console.error("[teamMemberStore.remove] error:", error);
    });
  },

  updateRole: (teamId: number, userId: number | string, role: string) => {
    const idx = _teamMembers.findIndex((m) => m.teamId === teamId && String(m.userId) === String(userId));
    if (idx >= 0) {
      _teamMembers[idx] = { ..._teamMembers[idx], role: role as any, updatedAt: new Date().toISOString() };
      notifyChange();
    }
    supabase.from("team_members").update({ role, updated_at: new Date().toISOString() } as any).eq("team_id", teamId).eq("user_id", String(userId)).then(({ error }) => {
      if (error) console.error("[teamMemberStore.updateRole] error:", error);
    });
  },
};

// ── Work Items ──────────────────────────────────────────────────────
export const workItemStore = {
  all: (): WorkItem[] => _workItems,

  byProject: (projectId: number): WorkItem[] => _workItems.filter((w) => w.projectId === projectId),

  get: (id: number): WorkItem | undefined => _workItems.find((w) => w.id === id),

  save: (item: Partial<WorkItem> & { title: string; projectId: number; type: string }): WorkItem => {
    const authUser = getLocalUser();
    const now = new Date().toISOString();
    const project = projectStore.get(item.projectId);
    const row = workItemToRow(item);
    row.created_by_name = row.created_by_name ?? authUser.fullName;
    row.created_by_email = row.created_by_email ?? authUser.email;

    if (item.id) {
      // Update
      const idx = _workItems.findIndex((w) => w.id === item.id);
      if (idx >= 0) {
        _workItems[idx] = { ..._workItems[idx], ...item, updatedAt: now } as WorkItem;
      }
      notifyChange();
      supabase.from("work_items").update({ ...row, updated_at: now } as any).eq("id", item.id).then(({ error }) => {
        if (error) console.error("[workItemStore.save] update error:", error);
      });
      return idx >= 0 ? _workItems[idx] : (item as WorkItem);
    } else {
      const tempId = Date.now();
      const autoExternalId = item.externalId || `${project?.key || "WI"}-${tempId}`;
      const newItem: WorkItem = {
        id: tempId,
        projectId: item.projectId,
        title: item.title,
        type: item.type as any,
        status: (item.status as any) || "TODO",
        priority: (item.priority as any) || "MEDIUM",
        assigneeId: item.assigneeId ?? null,
        parentId: item.parentId ?? null,
        description: item.description ?? null,
        externalId: autoExternalId,
        tags: item.tags ?? null,
        reporterId: item.reporterId ?? null,
        createdByName: authUser.fullName,
        createdByEmail: authUser.email,
        updatedBy: null,
        updatedByName: null,
        updatedAt: now,
        estimate: item.estimate ?? null,
        actualHours: item.actualHours ?? null,
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        completedAt: item.completedAt ?? null,
        createdAt: now,
        bugType: item.bugType ?? null,
        severity: item.severity ?? null,
        currentBehavior: item.currentBehavior ?? null,
        expectedBehavior: item.expectedBehavior ?? null,
        referenceUrl: item.referenceUrl ?? null,
        screenshotPath: item.screenshotPath ?? null,
        screenshot: item.screenshot ?? null,
        screenshotBlob: item.screenshotBlob ?? null,
        githubUrl: item.githubUrl ?? null,
        prototypeLink: item.prototypeLink ?? null,
        prototypeStatus: item.prototypeStatus ?? null,
        pdfUploadPath: item.pdfUploadPath ?? null,
        pdfUploadBlob: item.pdfUploadBlob ?? null,
        projectKey: project?.key || "",
        projectName: project?.name || "",
      };
      _workItems.unshift(newItem);
      notifyChange();
      // Don't set external_id in the insert row - let it be auto-assigned
      if (!row.external_id) delete row.external_id;
      supabase.from("work_items").insert(row as any).select("*, projects(key, name)").single().then(({ data, error }: any) => {
        if (error) { console.error("[workItemStore.save] insert error:", error); return; }
        if (data) {
          // Auto-set external_id
          const extId = data.external_id || `${data.projects?.key || "WI"}-${data.id}`;
          if (!data.external_id) {
            supabase.from("work_items").update({ external_id: extId } as any).eq("id", data.id);
            data.external_id = extId;
          }
          const idx = _workItems.findIndex((w) => w.id === tempId);
          if (idx >= 0) _workItems[idx] = mapWorkItem(data);
          notifyChange();
        }
      });
      console.log("[workItemStore] Saved item:", newItem.id, newItem.externalId, newItem.type, newItem.title);
      return newItem;
    }
  },

  /** Async save that awaits the Supabase insert and returns the item with the real DB ID */
  saveAsync: async (item: Partial<WorkItem> & { title: string; projectId: number; type: string }): Promise<WorkItem> => {
    const authUser = getLocalUser();
    const now = new Date().toISOString();
    const project = projectStore.get(item.projectId);
    const row = workItemToRow(item);
    row.created_by_name = row.created_by_name ?? authUser.fullName;
    row.created_by_email = row.created_by_email ?? authUser.email;

    if (item.id) {
      // Update
      row.updated_at = now;
      const { data, error } = await supabase.from("work_items").update(row as any).eq("id", item.id).select("*, projects(key, name)").single();
      if (error) { console.error("[workItemStore.saveAsync] update error:", error); throw error; }
      const mapped = mapWorkItem(data);
      const idx = _workItems.findIndex((w) => w.id === item.id);
      if (idx >= 0) _workItems[idx] = mapped;
      notifyChange();
      return mapped;
    } else {
      // Insert
      if (!row.external_id) delete row.external_id;
      const { data, error }: any = await supabase.from("work_items").insert(row as any).select("*, projects(key, name)").single();
      if (error) { console.error("[workItemStore.saveAsync] insert error:", error); throw error; }
      // Auto-set external_id
      const extId = data.external_id || `${data.projects?.key || "WI"}-${data.id}`;
      if (!data.external_id) {
        await supabase.from("work_items").update({ external_id: extId } as any).eq("id", data.id);
        data.external_id = extId;
      }
      const mapped = mapWorkItem(data);
      _workItems.unshift(mapped);
      notifyChange();
      console.log("[workItemStore.saveAsync] Saved item:", mapped.id, mapped.externalId, mapped.type, mapped.title);
      return mapped;
    }
  },

  update: (id: number, updates: Partial<WorkItem>): WorkItem | undefined => {
    const idx = _workItems.findIndex((w) => w.id === id);
    if (idx < 0) return undefined;
    const now = new Date().toISOString();
    _workItems[idx] = { ..._workItems[idx], ...updates, updatedAt: now };
    notifyChange();
    const row = workItemToRow(updates);
    row.updated_at = now;
    supabase.from("work_items").update(row as any).eq("id", id).then(({ error }) => {
      if (error) console.error("[workItemStore.update] error:", error);
    });
    return _workItems[idx];
  },

  delete: (id: number) => {
    _workItems = _workItems.filter((w) => w.id !== id);
    notifyChange();
    supabase.from("work_items").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("[workItemStore.delete] error:", error);
    });
  },

  /** Cascade delete: removes item and all descendants recursively */
  deleteCascade: (id: number): number => {
    // Collect all descendant IDs recursively
    const idsToDelete = new Set<number>();
    const collectChildren = (parentId: number) => {
      idsToDelete.add(parentId);
      _workItems
        .filter((w) => w.parentId === parentId)
        .forEach((child) => collectChildren(child.id));
    };
    collectChildren(id);

    const count = idsToDelete.size;
    _workItems = _workItems.filter((w) => !idsToDelete.has(w.id));
    notifyChange();

    // Delete from Supabase – children first (bottom-up) to respect FK constraints
    const idArray = Array.from(idsToDelete);
    // Supabase delete with .in() handles it; DB cascade or multiple deletes
    supabase.from("work_items").delete().in("id", idArray).then(({ error }) => {
      if (error) console.error("[workItemStore.deleteCascade] error:", error);
    });

    console.log(`[workItemStore.deleteCascade] Deleted ${count} items (root: ${id})`);
    return count;
  },
};

// ── Project Categories ──────────────────────────────────────────────
export const categoryStore = {
  all: (): ProjectCategory[] => DEFAULT_CATEGORIES,
  add: (label: string): ProjectCategory => {
    const value = label.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const existing = DEFAULT_CATEGORIES.find((c) => c.value === value);
    if (existing) return existing;
    const newCat: ProjectCategory = { value, label };
    DEFAULT_CATEGORIES.push(newCat);
    return newCat;
  },
};

// ── Auth user helper ────────────────────────────────────────────────
export function getLocalUser(): User {
  try {
    const stored = localStorage.getItem("supabase-user-cache");
    if (stored) return JSON.parse(stored);
  } catch {}
  // Fallback
  return {
    id: "" as any,
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
  };
}
