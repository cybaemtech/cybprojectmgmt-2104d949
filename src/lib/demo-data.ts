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

export const DEMO_PROJECTS: Project[] = [];

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

export const DEMO_WORK_ITEMS: WorkItem[] = [];
