import { User, Project, WorkItem, Team, TeamMember } from "@/types/schema";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();

export const DEMO_USER: User = {
  id: 1,
  username: "demo",
  email: "demo@cybaemtech.com",
  fullName: "Demo User",
  password: "",
  avatarUrl: null,
  isActive: true,
  role: "ADMIN",
  lastLogin: now.toISOString(),
  createdAt: "2024-01-01",
  updatedAt: now.toISOString(),
};

// ── Users ────────────────────────────────────────────────────────────
const makeUser = (id: number, first: string, last: string, role: "ADMIN" | "USER" | "SCRUM_MASTER" = "USER"): User => ({
  id,
  username: `${first.toLowerCase()}.${last.toLowerCase()}`,
  email: `${first.toLowerCase()}.${last.toLowerCase()}@cybaemtech.com`,
  fullName: `${first} ${last}`,
  password: "",
  avatarUrl: null,
  isActive: true,
  role,
  lastLogin: daysAgo(Math.floor(Math.random() * 7)),
  createdAt: daysAgo(120 + id),
  updatedAt: daysAgo(Math.floor(Math.random() * 3)),
});

export const DEMO_USERS: User[] = [
  DEMO_USER,
  makeUser(2, "Alice", "Smith", "SCRUM_MASTER"),
  makeUser(3, "Bob", "Johnson"),
  makeUser(4, "Diana", "Patel", "ADMIN"),
  makeUser(5, "Ethan", "Garcia"),
  makeUser(6, "Fiona", "Chen"),
  makeUser(7, "George", "Brown"),
  makeUser(8, "Hannah", "Kim"),
  makeUser(9, "Ivan", "Davis"),
  makeUser(10, "Julia", "Wilson"),
  makeUser(11, "Kevin", "Taylor"),
  makeUser(12, "Laura", "Anderson"),
  makeUser(13, "Mike", "Thomas"),
  makeUser(14, "Nina", "Martinez"),
  makeUser(15, "Priya", "Robinson"),
];

// ── Teams ────────────────────────────────────────────────────────────
export const DEMO_TEAMS: Team[] = [
  { id: 1, name: "Frontend Squad", description: "UI/UX development team", createdBy: 1, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(2) },
  { id: 2, name: "Backend Engineers", description: "API and services team", createdBy: 1, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(5) },
  { id: 3, name: "QA & Testing", description: "Quality assurance team", createdBy: 4, isActive: true, createdAt: daysAgo(80), updatedAt: daysAgo(1) },
  { id: 4, name: "DevOps", description: "Infrastructure and CI/CD team", createdBy: 4, isActive: true, createdAt: daysAgo(70), updatedAt: daysAgo(3) },
  { id: 5, name: "Mobile Team", description: "iOS and Android development", createdBy: 1, isActive: false, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
];

// ── Team Members ─────────────────────────────────────────────────────
let tmId = 0;
const tm = (teamId: number, userId: number, role: "ADMIN" | "MEMBER" | "VIEWER" = "MEMBER"): TeamMember => ({
  id: ++tmId, teamId, userId, role, joinedAt: daysAgo(60), updatedAt: daysAgo(1),
});

export const DEMO_TEAM_MEMBERS: TeamMember[] = [
  // Frontend Squad
  tm(1, 1, "ADMIN"), tm(1, 2), tm(1, 3), tm(1, 6), tm(1, 8),
  // Backend Engineers
  tm(2, 4, "ADMIN"), tm(2, 5), tm(2, 7), tm(2, 9), tm(2, 11),
  // QA
  tm(3, 10, "ADMIN"), tm(3, 12), tm(3, 13), tm(3, 14),
  // DevOps
  tm(4, 9, "ADMIN"), tm(4, 11), tm(4, 15),
  // Mobile
  tm(5, 3, "ADMIN"), tm(5, 6), tm(5, 7),
];

// ── Projects ─────────────────────────────────────────────────────────
const proj = (id: number, key: string, name: string, cat: "CLIENT" | "IN_HOUSE", status: "ACTIVE" | "PLANNING" | "COMPLETED" | "ARCHIVED", teamId: number | null, extra?: Partial<Project>): Project => ({
  id, key, name, description: extra?.description || `${name} project`, category: cat, status,
  createdBy: 1, createdByName: "Demo User", createdByEmail: "demo@cybaemtech.com",
  teamId, startDate: extra?.startDate || daysAgo(30), targetDate: extra?.targetDate || daysFromNow(60),
  githubUrl: null, createdAt: daysAgo(45), updatedAt: daysAgo(1),
  clientCompanyName: extra?.clientCompanyName || null, clientIndustry: extra?.clientIndustry || null,
  clientWebsite: extra?.clientWebsite || null, clientContactName: extra?.clientContactName || null,
  clientContactEmail: extra?.clientContactEmail || null, clientContactPhone: extra?.clientContactPhone || null,
  clientAccountManager: extra?.clientAccountManager ?? null, clientStatus: extra?.clientStatus || null,
  clientNotes: extra?.clientNotes || null,
});

export const DEMO_PROJECTS: Project[] = [
  proj(1, "DMS", "Document Management System", "CLIENT", "ACTIVE", 1, {
    description: "Enterprise document management solution",
    clientCompanyName: "Acme Corp", clientIndustry: "Technology", clientContactName: "John Doe",
    clientContactEmail: "john@acme.com", clientStatus: "ACTIVE",
  }),
  proj(2, "CRM", "Customer Relationship Manager", "CLIENT", "ACTIVE", 2, {
    description: "CRM platform for sales tracking",
    clientCompanyName: "Global Industries", clientIndustry: "Manufacturing", clientContactName: "Sarah Lee",
    clientContactEmail: "sarah@global.com", clientStatus: "ONBOARDING",
  }),
  proj(3, "HRM", "HR Management Portal", "IN_HOUSE", "PLANNING", 1, {
    description: "Internal HR and payroll management system",
  }),
  proj(4, "ECS", "E-Commerce Store", "CLIENT", "ACTIVE", 2, {
    description: "Online retail platform with payment integration",
    clientCompanyName: "ShopWell Ltd", clientIndustry: "Retail", clientContactName: "Raj Kumar",
    clientContactEmail: "raj@shopwell.com", clientStatus: "ACTIVE",
  }),
  proj(5, "MBL", "Mobile Banking App", "CLIENT", "COMPLETED", 5, {
    description: "Mobile banking application", clientCompanyName: "FinServe Bank",
    clientIndustry: "Finance", clientStatus: "ACTIVE",
  }),
];

// ── Work Items ───────────────────────────────────────────────────────
const baseItem = {
  description: null, tags: null, parentId: null, reporterId: null,
  createdByName: "Demo User", createdByEmail: "demo@cybaemtech.com",
  updatedBy: null, updatedByName: null, estimate: null, actualHours: null,
  completedAt: null, bugType: null, severity: null, currentBehavior: null,
  expectedBehavior: null, referenceUrl: null, screenshotPath: null, screenshot: null,
  screenshotBlob: null, githubUrl: null, prototypeLink: null, prototypeStatus: null,
  pdfUploadPath: null, pdfUploadBlob: null,
};

let wiId = 0;
const wi = (
  projectId: number, pKey: string, pName: string, type: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG",
  title: string, status: "TODO" | "IN_PROGRESS" | "DONE" | "ON_HOLD", priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  extra?: Partial<WorkItem>
): WorkItem => {
  const id = ++wiId;
  return {
    ...baseItem, id, projectId, title, type, status, priority,
    externalId: extra?.externalId || `${pKey}-${id}`,
    assigneeId: extra?.assigneeId ?? null,
    parentId: extra?.parentId ?? null,
    description: extra?.description ?? null,
    estimate: extra?.estimate ?? null,
    startDate: extra?.startDate ?? null,
    endDate: extra?.endDate ?? null,
    tags: extra?.tags ?? null,
    bugType: extra?.bugType ?? null,
    severity: extra?.severity ?? null,
    currentBehavior: extra?.currentBehavior ?? null,
    expectedBehavior: extra?.expectedBehavior ?? null,
    completedAt: status === "DONE" ? daysAgo(2) : null,
    projectKey: pKey, projectName: pName,
    createdAt: daysAgo(20 + Math.floor(Math.random() * 20)),
    updatedAt: daysAgo(Math.floor(Math.random() * 5)),
  };
};

// ── DMS Project (id=1) ──────────────────────────────────────────────
const dmsEpic1 = wi(1, "DMS", "Document Management System", "EPIC", "Document Upload & Storage", "IN_PROGRESS", "HIGH");
const dmsFeat1 = wi(1, "DMS", "Document Management System", "FEATURE", "File Upload Module", "IN_PROGRESS", "HIGH", { parentId: dmsEpic1.id, assigneeId: 2 });
const dmsStory1 = wi(1, "DMS", "Document Management System", "STORY", "Drag-and-drop upload", "DONE", "HIGH", { parentId: dmsFeat1.id, assigneeId: 3, estimate: "18" });
const dmsTask1 = wi(1, "DMS", "Document Management System", "TASK", "Create upload dropzone component", "DONE", "HIGH", { parentId: dmsStory1.id, assigneeId: 3, estimate: "9" });
const dmsTask2 = wi(1, "DMS", "Document Management System", "TASK", "Add progress bar for uploads", "DONE", "MEDIUM", { parentId: dmsStory1.id, assigneeId: 6, estimate: "9" });
const dmsStory2 = wi(1, "DMS", "Document Management System", "STORY", "Bulk file upload support", "IN_PROGRESS", "MEDIUM", { parentId: dmsFeat1.id, assigneeId: 5, estimate: "27" });
const dmsTask3 = wi(1, "DMS", "Document Management System", "TASK", "Implement multi-file selection", "IN_PROGRESS", "MEDIUM", { parentId: dmsStory2.id, assigneeId: 5, estimate: "9" });
const dmsTask4 = wi(1, "DMS", "Document Management System", "TASK", "Add file type validation", "TODO", "HIGH", { parentId: dmsStory2.id, assigneeId: 8, estimate: "9" });
const dmsTask5 = wi(1, "DMS", "Document Management System", "TASK", "Write unit tests for upload", "TODO", "MEDIUM", { parentId: dmsStory2.id, assigneeId: 3, estimate: "9" });

const dmsFeat2 = wi(1, "DMS", "Document Management System", "FEATURE", "Document Search & Indexing", "TODO", "HIGH", { parentId: dmsEpic1.id });
const dmsStory3 = wi(1, "DMS", "Document Management System", "STORY", "Full-text search implementation", "TODO", "HIGH", { parentId: dmsFeat2.id, assigneeId: 7, estimate: "36" });
const dmsTask6 = wi(1, "DMS", "Document Management System", "TASK", "Set up search index", "TODO", "HIGH", { parentId: dmsStory3.id, assigneeId: 7, estimate: "18" });
const dmsTask7 = wi(1, "DMS", "Document Management System", "TASK", "Build search results UI", "TODO", "MEDIUM", { parentId: dmsStory3.id, assigneeId: 6, estimate: "18" });

const dmsBug1 = wi(1, "DMS", "Document Management System", "BUG", "PDF preview not rendering on Safari", "IN_PROGRESS", "CRITICAL", {
  assigneeId: 3, bugType: "UI", severity: "CRITICAL",
  currentBehavior: "PDF files show blank screen on Safari browser",
  expectedBehavior: "PDF should render correctly across all browsers",
});
const dmsBug2 = wi(1, "DMS", "Document Management System", "BUG", "File size limit error not displayed", "TODO", "HIGH", {
  assigneeId: 8, bugType: "FUNCTIONAL", severity: "HIGH",
  currentBehavior: "Upload silently fails for files > 50MB",
  expectedBehavior: "Show clear error message with file size limit",
});

// ── CRM Project (id=2) ──────────────────────────────────────────────
const crmEpic1 = wi(2, "CRM", "Customer Relationship Manager", "EPIC", "Sales Pipeline Management", "IN_PROGRESS", "HIGH");
const crmFeat1 = wi(2, "CRM", "Customer Relationship Manager", "FEATURE", "Lead Tracking Dashboard", "IN_PROGRESS", "HIGH", { parentId: crmEpic1.id, assigneeId: 4 });
const crmStory1 = wi(2, "CRM", "Customer Relationship Manager", "STORY", "Lead status board", "DONE", "HIGH", { parentId: crmFeat1.id, assigneeId: 5, estimate: "27" });
const crmTask1 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Design Kanban board for leads", "DONE", "HIGH", { parentId: crmStory1.id, assigneeId: 5, estimate: "9" });
const crmTask2 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Implement drag-and-drop pipeline", "DONE", "MEDIUM", { parentId: crmStory1.id, assigneeId: 9, estimate: "18" });
const crmStory2 = wi(2, "CRM", "Customer Relationship Manager", "STORY", "Contact import from CSV", "IN_PROGRESS", "MEDIUM", { parentId: crmFeat1.id, assigneeId: 11, estimate: "18" });
const crmTask3 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Build CSV parser", "DONE", "MEDIUM", { parentId: crmStory2.id, assigneeId: 11, estimate: "9" });
const crmTask4 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Add duplicate detection", "IN_PROGRESS", "HIGH", { parentId: crmStory2.id, assigneeId: 7, estimate: "9" });

const crmFeat2 = wi(2, "CRM", "Customer Relationship Manager", "FEATURE", "Email Integration", "TODO", "MEDIUM", { parentId: crmEpic1.id });
const crmStory3 = wi(2, "CRM", "Customer Relationship Manager", "STORY", "Gmail sync setup", "TODO", "MEDIUM", { parentId: crmFeat2.id, assigneeId: 9, estimate: "36" });
const crmTask5 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Implement OAuth for Gmail", "TODO", "HIGH", { parentId: crmStory3.id, assigneeId: 9, estimate: "18" });
const crmTask6 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Build email thread view", "TODO", "MEDIUM", { parentId: crmStory3.id, assigneeId: 5, estimate: "18" });

const crmBug1 = wi(2, "CRM", "Customer Relationship Manager", "BUG", "Contact search returns stale results", "TODO", "HIGH", {
  assigneeId: 7, bugType: "FUNCTIONAL", severity: "HIGH",
  currentBehavior: "Search results don't update after editing a contact",
  expectedBehavior: "Search should reflect latest data immediately",
});

// ── HRM Project (id=3) ──────────────────────────────────────────────
const hrmEpic1 = wi(3, "HRM", "HR Management Portal", "EPIC", "Employee Onboarding", "TODO", "MEDIUM");
const hrmFeat1 = wi(3, "HRM", "HR Management Portal", "FEATURE", "Onboarding Checklist", "TODO", "MEDIUM", { parentId: hrmEpic1.id });
const hrmStory1 = wi(3, "HRM", "HR Management Portal", "STORY", "New hire form wizard", "TODO", "MEDIUM", { parentId: hrmFeat1.id, assigneeId: 2, estimate: "27" });
const hrmTask1 = wi(3, "HRM", "HR Management Portal", "TASK", "Design multi-step form", "TODO", "MEDIUM", { parentId: hrmStory1.id, assigneeId: 2, estimate: "9" });
const hrmTask2 = wi(3, "HRM", "HR Management Portal", "TASK", "Add document upload step", "TODO", "LOW", { parentId: hrmStory1.id, assigneeId: 8, estimate: "9" });
const hrmTask3 = wi(3, "HRM", "HR Management Portal", "TASK", "Integrate e-signature", "TODO", "HIGH", { parentId: hrmStory1.id, assigneeId: 6, estimate: "9" });

// ── ECS Project (id=4) ──────────────────────────────────────────────
const ecsEpic1 = wi(4, "ECS", "E-Commerce Store", "EPIC", "Product Catalog", "IN_PROGRESS", "HIGH");
const ecsFeat1 = wi(4, "ECS", "E-Commerce Store", "FEATURE", "Product Listing Page", "IN_PROGRESS", "HIGH", { parentId: ecsEpic1.id, assigneeId: 4 });
const ecsStory1 = wi(4, "ECS", "E-Commerce Store", "STORY", "Product grid with filters", "DONE", "HIGH", { parentId: ecsFeat1.id, assigneeId: 6, estimate: "27" });
const ecsTask1 = wi(4, "ECS", "E-Commerce Store", "TASK", "Build filter sidebar", "DONE", "MEDIUM", { parentId: ecsStory1.id, assigneeId: 6, estimate: "9" });
const ecsTask2 = wi(4, "ECS", "E-Commerce Store", "TASK", "Add sorting options", "DONE", "LOW", { parentId: ecsStory1.id, assigneeId: 8, estimate: "9" });
const ecsTask3 = wi(4, "ECS", "E-Commerce Store", "TASK", "Implement pagination", "DONE", "MEDIUM", { parentId: ecsStory1.id, assigneeId: 3, estimate: "9" });
const ecsStory2 = wi(4, "ECS", "E-Commerce Store", "STORY", "Product detail page", "IN_PROGRESS", "HIGH", { parentId: ecsFeat1.id, assigneeId: 5, estimate: "18" });
const ecsTask4 = wi(4, "ECS", "E-Commerce Store", "TASK", "Design product image carousel", "IN_PROGRESS", "HIGH", { parentId: ecsStory2.id, assigneeId: 5, estimate: "9" });
const ecsTask5 = wi(4, "ECS", "E-Commerce Store", "TASK", "Build reviews section", "TODO", "MEDIUM", { parentId: ecsStory2.id, assigneeId: 12, estimate: "9" });

const ecsBug1 = wi(4, "ECS", "E-Commerce Store", "BUG", "Cart total calculation wrong with discounts", "IN_PROGRESS", "CRITICAL", {
  assigneeId: 9, bugType: "FUNCTIONAL", severity: "CRITICAL",
  currentBehavior: "Discount applied after tax instead of before",
  expectedBehavior: "Discount should be applied before tax calculation",
});

// ── MBL Project (id=5) ──────────────────────────────────────────────
const mblEpic1 = wi(5, "MBL", "Mobile Banking App", "EPIC", "Account Management", "DONE", "HIGH");
const mblFeat1 = wi(5, "MBL", "Mobile Banking App", "FEATURE", "Account Overview Screen", "DONE", "HIGH", { parentId: mblEpic1.id, assigneeId: 3 });
const mblStory1 = wi(5, "MBL", "Mobile Banking App", "STORY", "Balance display widget", "DONE", "HIGH", { parentId: mblFeat1.id, assigneeId: 6, estimate: "18" });
const mblTask1 = wi(5, "MBL", "Mobile Banking App", "TASK", "Create balance card component", "DONE", "HIGH", { parentId: mblStory1.id, assigneeId: 6, estimate: "9" });
const mblTask2 = wi(5, "MBL", "Mobile Banking App", "TASK", "Add transaction mini-list", "DONE", "MEDIUM", { parentId: mblStory1.id, assigneeId: 7, estimate: "9" });

export const DEMO_WORK_ITEMS: WorkItem[] = [
  // DMS (15 items)
  dmsEpic1, dmsFeat1, dmsStory1, dmsTask1, dmsTask2,
  dmsStory2, dmsTask3, dmsTask4, dmsTask5,
  dmsFeat2, dmsStory3, dmsTask6, dmsTask7,
  dmsBug1, dmsBug2,
  // CRM (13 items)
  crmEpic1, crmFeat1, crmStory1, crmTask1, crmTask2,
  crmStory2, crmTask3, crmTask4,
  crmFeat2, crmStory3, crmTask5, crmTask6,
  crmBug1,
  // HRM (6 items)
  hrmEpic1, hrmFeat1, hrmStory1, hrmTask1, hrmTask2, hrmTask3,
  // ECS (10 items)
  ecsEpic1, ecsFeat1, ecsStory1, ecsTask1, ecsTask2, ecsTask3,
  ecsStory2, ecsTask4, ecsTask5, ecsBug1,
  // MBL (5 items)
  mblEpic1, mblFeat1, mblStory1, mblTask1, mblTask2,
];
