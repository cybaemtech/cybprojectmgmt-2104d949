// TypeScript types matching the shared schema from the backend

export type UserRole = 'ADMIN' | 'SCRUM_MASTER' | 'USER';
export type TeamRole = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
export type ProjectCategory = 'CLIENT' | 'IN_HOUSE';
export type ItemType = 'EPIC' | 'FEATURE' | 'STORY' | 'TASK' | 'BUG';
export type ItemStatus = 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  password: string;
  avatarUrl: string | null;
  isActive: boolean;
  role: UserRole;
  lastLogin: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  sessionExpiry?: number;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: TeamRole;
  joinedAt: Date | string;
  updatedAt: Date | string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: TeamRole;
  expiresAt: Date | string | null;
  joinedAt: Date | string;
  updatedAt: Date | string;
}

export type ClientStatus = 'LEAD' | 'ONBOARDING' | 'ACTIVE' | 'CHURNED';

export interface Project {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: ProjectCategory;
  status: ProjectStatus;
  createdBy: number | null;
  createdByName: string | null;
  createdByEmail: string | null;
  teamId: number | null;
  startDate: Date | string | null;
  targetDate: Date | string | null;
  githubUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Client Details fields
  clientCompanyName: string | null;
  clientIndustry: string | null;
  clientWebsite: string | null;
  clientContactName: string | null;
  clientContactEmail: string | null;
  clientContactPhone: string | null;
  clientAccountManager: string | null;
  clientStatus: ClientStatus | null;
  clientNotes: string | null;
}

export interface WorkItem {
  id: number;
  externalId: string;
  title: string;
  description: string | null;
  tags: string | null;
  type: ItemType;
  status: ItemStatus;
  priority: Priority | null;
  projectId: number;
  parentId: number | null;
  assigneeId: string | null;
  reporterId: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  updatedBy: number | null;
  updatedByName: string | null;
  estimate: string | null;
  actualHours: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  completedAt: Date | string | null;
  bugType: string | null;
  severity: string | null;
  currentBehavior: string | null;
  expectedBehavior: string | null;
  referenceUrl: string | null;
  screenshotPath: string | null;
  screenshot: string | null;
  screenshotBlob: string | null;
  githubUrl: string | null;
  prototypeLink: string | null;
  prototypeStatus: string | null;
  pdfUploadPath: string | null;
  pdfUploadBlob: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Extended fields from API joins
  projectKey?: string;
  projectName?: string;
}

export interface Comment {
  id: number;
  workItemId: number;
  userId: number;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Attachment {
  id: number;
  workItemId: number;
  userId: number;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date | string;
}

export interface WorkItemHistory {
  id: number;
  workItemId: number;
  userId: number | null;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date | string;
}

export interface ActivityLog {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  createdAt: Date | string;
}

// Insert types (for creating new records)
export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertTeam = Omit<Team, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertTeamMember = Omit<TeamMember, 'id' | 'joinedAt' | 'updatedAt'>;
export type InsertProjectMember = Omit<ProjectMember, 'id' | 'joinedAt' | 'updatedAt'>;
export type InsertProject = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertWorkItem = Omit<WorkItem, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertComment = Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertAttachment = Omit<Attachment, 'id' | 'createdAt'>;
export type InsertWorkItemHistory = Omit<WorkItemHistory, 'id' | 'createdAt'>;
export type InsertActivityLog = Omit<ActivityLog, 'id' | 'createdAt'>;
