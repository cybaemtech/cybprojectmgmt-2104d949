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
export const DEMO_TEAM_MEMBERS: TeamMember[] = [];

export const DEMO_TEAMS: Team[] = [];

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
