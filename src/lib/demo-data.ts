import { User, Project, WorkItem, Team, TeamMember } from "@/types/schema";

export const DEMO_USER: User = {
  id: 1,
  username: "demo",
  email: "demo@cybaemtech.com",
  fullName: "Demo User",
  password: "",
  avatarUrl: null,
  isActive: true,
  role: "ADMIN",
  lastLogin: new Date().toISOString(),
  createdAt: "2024-01-01",
  updatedAt: new Date().toISOString(),
};

// Generate demo users for teams
const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ivan", "Julia",
  "Kevin", "Laura", "Mike", "Nina", "Oscar", "Priya", "Quinn", "Rachel", "Sam", "Tina",
  "Uma", "Victor", "Wendy", "Xander", "Yuki", "Zara", "Arjun", "Beth", "Carlos", "Deepa"];
const lastNames = ["Smith", "Johnson", "Lee", "Patel", "Garcia", "Chen", "Brown", "Kim", "Davis", "Wilson",
  "Taylor", "Anderson", "Thomas", "Martinez", "Robinson", "Clark", "Lewis", "Walker", "Hall", "Allen",
  "Young", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Nelson"];

export const DEMO_USERS: User[] = [
  DEMO_USER,
  ...Array.from({ length: 30 }, (_, i) => ({
    id: i + 100,
    username: firstNames[i].toLowerCase() + "." + lastNames[i].toLowerCase(),
    email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@cybaemtech.com`,
    fullName: `${firstNames[i]} ${lastNames[i]}`,
    password: "",
    avatarUrl: null,
    isActive: true,
    role: (i % 10 === 0 ? "SCRUM_MASTER" : "USER") as User["role"],
    lastLogin: new Date().toISOString(),
    createdAt: "2024-01-15",
    updatedAt: new Date().toISOString(),
  })),
];

// Team members: 10 users per team
export const DEMO_TEAM_MEMBERS: TeamMember[] = [
  // Frontend Team (id: 1) - users 100-109
  ...Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    teamId: 1,
    userId: i + 100,
    role: (i === 0 ? "ADMIN" : "MEMBER") as TeamMember["role"],
    joinedAt: "2024-01-15",
    updatedAt: new Date().toISOString(),
  })),
  // Backend Team (id: 2) - users 110-119
  ...Array.from({ length: 10 }, (_, i) => ({
    id: i + 11,
    teamId: 2,
    userId: i + 110,
    role: (i === 0 ? "ADMIN" : "MEMBER") as TeamMember["role"],
    joinedAt: "2024-02-01",
    updatedAt: new Date().toISOString(),
  })),
  // QA Team (id: 3) - users 120-129
  ...Array.from({ length: 10 }, (_, i) => ({
    id: i + 21,
    teamId: 3,
    userId: i + 120,
    role: (i === 0 ? "ADMIN" : "MEMBER") as TeamMember["role"],
    joinedAt: "2024-03-01",
    updatedAt: new Date().toISOString(),
  })),
];

export const DEMO_TEAMS: Team[] = [
  { id: 1, name: "Frontend Team", description: "UI/UX development team", isActive: true, createdBy: 1, createdAt: "2024-01-15", updatedAt: new Date().toISOString() },
  { id: 2, name: "Backend Team", description: "API and server development", isActive: true, createdBy: 1, createdAt: "2024-02-01", updatedAt: new Date().toISOString() },
  { id: 3, name: "QA Team", description: "Quality assurance and testing", isActive: true, createdBy: 1, createdAt: "2024-03-01", updatedAt: new Date().toISOString() },
];

export const DEMO_PROJECTS: Project[] = [
  { id: 1, name: "Agile Platform v2", key: "APV2", description: "Next-gen project management platform", category: "IN_HOUSE", status: "ACTIVE", teamId: 1, startDate: "2024-06-01", targetDate: "2025-06-01", githubUrl: null, createdBy: 1, createdByName: "Demo User", createdByEmail: "demo@cybaemtech.com", createdAt: "2024-06-01", updatedAt: new Date().toISOString() },
  { id: 2, name: "Mobile App", key: "MOBI", description: "Cross-platform mobile companion app", category: "IN_HOUSE", status: "ACTIVE", teamId: 2, startDate: "2024-09-01", targetDate: "2025-03-01", githubUrl: null, createdBy: 1, createdByName: "Demo User", createdByEmail: "demo@cybaemtech.com", createdAt: "2024-09-01", updatedAt: new Date().toISOString() },
  { id: 3, name: "API Gateway", key: "APIG", description: "Centralized API gateway service", category: "IN_HOUSE", status: "ACTIVE", teamId: 2, startDate: "2025-01-01", targetDate: "2025-09-01", githubUrl: null, createdBy: 1, createdByName: "Demo User", createdByEmail: "demo@cybaemtech.com", createdAt: "2025-01-01", updatedAt: new Date().toISOString() },
  { id: 4, name: "Design System", key: "DSYS", description: "Shared component library", category: "IN_HOUSE", status: "COMPLETED", teamId: 1, startDate: "2024-03-01", targetDate: "2024-12-01", githubUrl: null, createdBy: 1, createdByName: "Demo User", createdByEmail: "demo@cybaemtech.com", createdAt: "2024-03-01", updatedAt: new Date().toISOString() },
];

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();

const baseItem = {
  externalId: "",
  description: null,
  tags: null,
  parentId: null,
  reporterId: null,
  createdByName: "Demo User",
  createdByEmail: "demo@cybaemtech.com",
  updatedBy: null,
  updatedByName: null,
  estimate: null,
  actualHours: null,
  completedAt: null,
  bugType: null,
  severity: null,
  currentBehavior: null,
  expectedBehavior: null,
  referenceUrl: null,
  screenshotPath: null,
  screenshot: null,
  screenshotBlob: null,
  githubUrl: null,
  prototypeLink: null,
  prototypeStatus: null,
  pdfUploadPath: null,
  pdfUploadBlob: null,
};

export const DEMO_WORK_ITEMS: WorkItem[] = [
  { ...baseItem, id: 1, projectId: 1, title: "User authentication flow", type: "EPIC", status: "DONE", priority: "HIGH", assigneeId: 1, startDate: daysAgo(60), endDate: daysAgo(20), createdAt: daysAgo(60), updatedAt: daysAgo(5), projectKey: "APV2", projectName: "Agile Platform v2" },
  { ...baseItem, id: 2, projectId: 1, title: "Dashboard analytics widgets", type: "FEATURE", status: "IN_PROGRESS", priority: "HIGH", assigneeId: 1, startDate: daysAgo(14), endDate: daysFromNow(7), createdAt: daysAgo(14), updatedAt: daysAgo(1), projectKey: "APV2", projectName: "Agile Platform v2" },
  { ...baseItem, id: 3, projectId: 1, title: "Kanban board drag & drop", type: "STORY", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: 1, startDate: daysAgo(7), endDate: daysFromNow(10), createdAt: daysAgo(7), updatedAt: daysAgo(2), projectKey: "APV2", projectName: "Agile Platform v2" },
  { ...baseItem, id: 4, projectId: 1, title: "Fix sidebar navigation lag", type: "BUG", status: "DONE", priority: "CRITICAL", assigneeId: 1, startDate: daysAgo(5), endDate: daysAgo(2), createdAt: daysAgo(5), updatedAt: daysAgo(2), projectKey: "APV2", projectName: "Agile Platform v2" },
  { ...baseItem, id: 5, projectId: 1, title: "Sprint planning view", type: "FEATURE", status: "TODO", priority: "MEDIUM", assigneeId: 1, startDate: daysFromNow(3), endDate: daysFromNow(14), createdAt: daysAgo(3), updatedAt: daysAgo(1), projectKey: "APV2", projectName: "Agile Platform v2" },
  { ...baseItem, id: 6, projectId: 1, title: "Export reports to PDF", type: "TASK", status: "TODO", priority: "LOW", assigneeId: 1, startDate: daysFromNow(5), endDate: daysFromNow(12), createdAt: daysAgo(2), updatedAt: daysAgo(1), projectKey: "APV2", projectName: "Agile Platform v2" },
  { ...baseItem, id: 7, projectId: 1, title: "Real-time notifications", type: "FEATURE", status: "DONE", priority: "HIGH", assigneeId: 1, startDate: daysAgo(30), endDate: daysAgo(10), createdAt: daysAgo(30), updatedAt: daysAgo(3), projectKey: "APV2", projectName: "Agile Platform v2" },
  { ...baseItem, id: 8, projectId: 2, title: "React Native setup", type: "TASK", status: "DONE", priority: "HIGH", assigneeId: 1, startDate: daysAgo(45), endDate: daysAgo(40), createdAt: daysAgo(45), updatedAt: daysAgo(40), projectKey: "MOBI", projectName: "Mobile App" },
  { ...baseItem, id: 9, projectId: 2, title: "Push notification service", type: "FEATURE", status: "IN_PROGRESS", priority: "HIGH", assigneeId: 1, startDate: daysAgo(10), endDate: daysFromNow(5), createdAt: daysAgo(10), updatedAt: daysAgo(1), projectKey: "MOBI", projectName: "Mobile App" },
  { ...baseItem, id: 10, projectId: 2, title: "Offline mode support", type: "EPIC", status: "TODO", priority: "MEDIUM", assigneeId: 1, startDate: daysFromNow(7), endDate: daysFromNow(30), createdAt: daysAgo(5), updatedAt: daysAgo(2), projectKey: "MOBI", projectName: "Mobile App" },
  { ...baseItem, id: 11, projectId: 2, title: "Login screen crashes on Android", type: "BUG", status: "IN_PROGRESS", priority: "CRITICAL", assigneeId: 1, startDate: daysAgo(3), endDate: daysFromNow(2), createdAt: daysAgo(3), updatedAt: daysAgo(1), projectKey: "MOBI", projectName: "Mobile App" },
  { ...baseItem, id: 12, projectId: 3, title: "Rate limiting middleware", type: "FEATURE", status: "DONE", priority: "HIGH", assigneeId: 1, startDate: daysAgo(30), endDate: daysAgo(15), createdAt: daysAgo(30), updatedAt: daysAgo(4), projectKey: "APIG", projectName: "API Gateway" },
  { ...baseItem, id: 13, projectId: 3, title: "Request logging & monitoring", type: "STORY", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: 1, startDate: daysAgo(7), endDate: daysFromNow(7), createdAt: daysAgo(7), updatedAt: daysAgo(1), projectKey: "APIG", projectName: "API Gateway" },
  { ...baseItem, id: 14, projectId: 3, title: "WebSocket proxy support", type: "FEATURE", status: "TODO", priority: "LOW", assigneeId: 1, startDate: daysFromNow(10), endDate: daysFromNow(25), createdAt: daysAgo(2), updatedAt: daysAgo(1), projectKey: "APIG", projectName: "API Gateway" },
  { ...baseItem, id: 15, projectId: 4, title: "Button component variants", type: "TASK", status: "DONE", priority: "HIGH", assigneeId: 1, startDate: daysAgo(90), endDate: daysAgo(80), createdAt: daysAgo(90), updatedAt: daysAgo(80), projectKey: "DSYS", projectName: "Design System" },
  { ...baseItem, id: 16, projectId: 4, title: "Color token system", type: "TASK", status: "DONE", priority: "HIGH", assigneeId: 1, startDate: daysAgo(85), endDate: daysAgo(70), createdAt: daysAgo(85), updatedAt: daysAgo(70), projectKey: "DSYS", projectName: "Design System" },
  { ...baseItem, id: 17, projectId: 4, title: "Documentation site", type: "FEATURE", status: "DONE", priority: "MEDIUM", assigneeId: 1, startDate: daysAgo(60), endDate: daysAgo(30), createdAt: daysAgo(60), updatedAt: daysAgo(30), projectKey: "DSYS", projectName: "Design System" },
];
