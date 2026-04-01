import { Project, Team, WorkItem, User, TeamMember } from "@/types/schema";
import { DEMO_PROJECTS, DEMO_TEAMS, DEMO_WORK_ITEMS, DEMO_USER, DEMO_USERS, DEMO_TEAM_MEMBERS } from "./demo-data";

const PROJECTS_KEY = "local-projects";
const TEAMS_KEY = "local-teams";
const WORK_ITEMS_KEY = "local-work-items";
const USERS_KEY = "local-users";
const TEAM_MEMBERS_KEY = "local-team-members";

function getOrInit<T>(key: string, seed: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---- Projects ----
export const projectStore = {
  all: (): Project[] => getOrInit(PROJECTS_KEY, DEMO_PROJECTS),
  get: (id: number): Project | undefined => projectStore.all().find(p => p.id === id),
  save: (project: Partial<Project> & { name: string; key: string }): Project => {
    const projects = projectStore.all();
    const maxId = projects.reduce((m, p) => Math.max(m, p.id), 0);
    const authUser = JSON.parse(localStorage.getItem("auth-user") || "null") || DEMO_USER;
    const now = new Date().toISOString();
    const newProject: Project = {
      id: project.id ?? maxId + 1,
      name: project.name,
      key: project.key,
      description: project.description || "",
      category: (project.category as any) || "IN_HOUSE",
      status: (project.status as any) || "ACTIVE",
      teamId: project.teamId ?? null,
      startDate: project.startDate || null,
      targetDate: project.targetDate || null,
      githubUrl: project.githubUrl || null,
      createdBy: project.createdBy ?? authUser.id,
      createdByName: authUser.fullName,
      createdByEmail: authUser.email,
      createdAt: project.createdAt || now,
      updatedAt: now,
    };
    const idx = projects.findIndex(p => p.id === newProject.id);
    if (idx >= 0) projects.splice(idx, 1, newProject);
    else projects.unshift(newProject);
    save(PROJECTS_KEY, projects);
    return newProject;
  },
  delete: (id: number) => {
    save(PROJECTS_KEY, projectStore.all().filter(p => p.id !== id));
  },
};

// ---- Teams ----
export const teamStore = {
  all: (): Team[] => getOrInit(TEAMS_KEY, DEMO_TEAMS),
  get: (id: number): Team | undefined => teamStore.all().find(t => t.id === id),
};

// ---- Users ----
export const userStore = {
  all: (): User[] => getOrInit(USERS_KEY, DEMO_USERS),
  get: (id: number): User | undefined => userStore.all().find(u => u.id === id),
};

// ---- Team Members ----
export const teamMemberStore = {
  all: (): TeamMember[] => getOrInit(TEAM_MEMBERS_KEY, DEMO_TEAM_MEMBERS),
  byTeam: (teamId: number): TeamMember[] => teamMemberStore.all().filter(m => m.teamId === teamId),
  usersForTeam: (teamId: number): User[] => {
    const memberIds = teamMemberStore.byTeam(teamId).map(m => m.userId);
    return userStore.all().filter(u => memberIds.includes(u.id));
  },
};

// ---- Work Items ----
export const workItemStore = {
  all: (): WorkItem[] => getOrInit(WORK_ITEMS_KEY, DEMO_WORK_ITEMS),
  byProject: (projectId: number): WorkItem[] => workItemStore.all().filter(w => w.projectId === projectId),
  get: (id: number): WorkItem | undefined => workItemStore.all().find(w => w.id === id),
  save: (item: Partial<WorkItem> & { title: string; projectId: number; type: string }): WorkItem => {
    const items = workItemStore.all();
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
    const now = new Date().toISOString();
    const authUser = JSON.parse(localStorage.getItem("auth-user") || "null") || DEMO_USER;
    const project = projectStore.get(item.projectId);
    const newItem: WorkItem = {
      id: item.id ?? maxId + 1,
      projectId: item.projectId,
      title: item.title,
      type: item.type as any,
      status: (item.status as any) || "TODO",
      priority: (item.priority as any) || "MEDIUM",
      assigneeId: item.assigneeId ?? null,
      parentId: item.parentId ?? null,
      description: item.description ?? null,
      externalId: item.externalId || "",
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
      createdAt: item.createdAt || now,
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
    const idx = items.findIndex(i => i.id === newItem.id);
    if (idx >= 0) items.splice(idx, 1, newItem);
    else items.unshift(newItem);
    save(WORK_ITEMS_KEY, items);
    return newItem;
  },
  update: (id: number, updates: Partial<WorkItem>): WorkItem | undefined => {
    const items = workItemStore.all();
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return undefined;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    save(WORK_ITEMS_KEY, items);
    return items[idx];
  },
  delete: (id: number) => {
    save(WORK_ITEMS_KEY, workItemStore.all().filter(i => i.id !== id));
  },
};

// ---- Auth user helper ----
export function getLocalUser(): User {
  try {
    const stored = localStorage.getItem("auth-user");
    return stored ? JSON.parse(stored) : DEMO_USER;
  } catch {
    return DEMO_USER;
  }
}
