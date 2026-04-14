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
  { id: 5, name: "Mobile Team", description: "iOS and Android development", createdBy: 1, isActive: true, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
  { id: 6, name: "Data Science", description: "Analytics, ML models, and data pipelines", createdBy: 4, isActive: true, createdAt: daysAgo(55), updatedAt: daysAgo(4) },
  { id: 7, name: "Security Team", description: "Application security and compliance", createdBy: 1, isActive: true, createdAt: daysAgo(50), updatedAt: daysAgo(6) },
  { id: 8, name: "Platform Engineering", description: "Internal tooling and developer experience", createdBy: 4, isActive: false, createdAt: daysAgo(45), updatedAt: daysAgo(15) },
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
  // Data Science
  tm(6, 14, "ADMIN"), tm(6, 15), tm(6, 12),
  // Security
  tm(7, 4, "ADMIN"), tm(7, 13), tm(7, 11),
  // Platform Engineering
  tm(8, 9, "ADMIN"), tm(8, 5),
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
    description: "Enterprise document management solution with OCR and versioning",
    startDate: daysAgo(60), targetDate: daysFromNow(90),
    clientCompanyName: "Acme Corp", clientIndustry: "Technology", clientContactName: "John Doe",
    clientContactEmail: "john@acme.com", clientStatus: "ACTIVE",
  }),
  proj(2, "CRM", "Customer Relationship Manager", "CLIENT", "ACTIVE", 2, {
    description: "CRM platform for sales pipeline and lead tracking",
    startDate: daysAgo(45), targetDate: daysFromNow(75),
    clientCompanyName: "Global Industries", clientIndustry: "Manufacturing", clientContactName: "Sarah Lee",
    clientContactEmail: "sarah@global.com", clientStatus: "ONBOARDING",
  }),
  proj(3, "HRM", "HR Management Portal", "IN_HOUSE", "PLANNING", 1, {
    description: "Internal HR, payroll, and employee onboarding system",
    startDate: daysFromNow(10), targetDate: daysFromNow(120),
  }),
  proj(4, "ECS", "E-Commerce Store", "CLIENT", "ACTIVE", 2, {
    description: "Online retail platform with payment integration",
    startDate: daysAgo(90), targetDate: daysFromNow(30),
    clientCompanyName: "ShopWell Ltd", clientIndustry: "Retail", clientContactName: "Raj Kumar",
    clientContactEmail: "raj@shopwell.com", clientStatus: "ACTIVE",
  }),
  proj(5, "MBL", "Mobile Banking App", "CLIENT", "COMPLETED", 5, {
    description: "Mobile banking application with biometric auth",
    startDate: daysAgo(180), targetDate: daysAgo(10),
    clientCompanyName: "FinServe Bank", clientIndustry: "Finance", clientStatus: "ACTIVE",
  }),
  proj(6, "LMS", "Learning Management System", "CLIENT", "ACTIVE", 3, {
    description: "Online course platform with progress tracking and certificates",
    startDate: daysAgo(30), targetDate: daysFromNow(100),
    clientCompanyName: "EduTech Inc", clientIndustry: "Education", clientContactName: "Maria Santos",
    clientContactEmail: "maria@edutech.com", clientStatus: "ACTIVE",
  }),
  proj(7, "ANA", "Analytics Dashboard", "IN_HOUSE", "ACTIVE", 6, {
    description: "Business intelligence dashboard with custom reports",
    startDate: daysAgo(50), targetDate: daysFromNow(40),
  }),
  proj(8, "IOT", "IoT Dashboard", "IN_HOUSE", "PLANNING", 4, {
    description: "Real-time IoT device monitoring and alerting",
    startDate: daysFromNow(5), targetDate: daysFromNow(150),
  }),
  proj(9, "SEC", "Security Audit Platform", "IN_HOUSE", "ACTIVE", 7, {
    description: "Automated security scanning and compliance reporting",
    startDate: daysAgo(20), targetDate: daysFromNow(60),
  }),
  proj(10, "API", "API Gateway", "IN_HOUSE", "ARCHIVED", 4, {
    description: "Centralized API management with rate limiting and auth",
    startDate: daysAgo(200), targetDate: daysAgo(30),
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
const dmsEpic1 = wi(1, "DMS", "Document Management System", "EPIC", "Document Upload & Storage", "IN_PROGRESS", "HIGH", { startDate: daysAgo(50), endDate: daysFromNow(30) });
const dmsFeat1 = wi(1, "DMS", "Document Management System", "FEATURE", "File Upload Module", "IN_PROGRESS", "HIGH", { parentId: dmsEpic1.id, assigneeId: 2, startDate: daysAgo(40), endDate: daysFromNow(10) });
const dmsStory1 = wi(1, "DMS", "Document Management System", "STORY", "Drag-and-drop upload", "DONE", "HIGH", { parentId: dmsFeat1.id, assigneeId: 3, estimate: "18", startDate: daysAgo(40), endDate: daysAgo(20) });
const dmsTask1 = wi(1, "DMS", "Document Management System", "TASK", "Create upload dropzone component", "DONE", "HIGH", { parentId: dmsStory1.id, assigneeId: 3, estimate: "9", startDate: daysAgo(40), endDate: daysAgo(32) });
const dmsTask2 = wi(1, "DMS", "Document Management System", "TASK", "Add progress bar for uploads", "DONE", "MEDIUM", { parentId: dmsStory1.id, assigneeId: 6, estimate: "9", startDate: daysAgo(32), endDate: daysAgo(24) });
const dmsStory2 = wi(1, "DMS", "Document Management System", "STORY", "Bulk file upload support", "IN_PROGRESS", "MEDIUM", { parentId: dmsFeat1.id, assigneeId: 5, estimate: "27", startDate: daysAgo(20), endDate: daysFromNow(10) });
const dmsTask3 = wi(1, "DMS", "Document Management System", "TASK", "Implement multi-file selection", "IN_PROGRESS", "MEDIUM", { parentId: dmsStory2.id, assigneeId: 5, estimate: "9", startDate: daysAgo(15), endDate: daysFromNow(2) });
const dmsTask4 = wi(1, "DMS", "Document Management System", "TASK", "Add file type validation", "TODO", "HIGH", { parentId: dmsStory2.id, assigneeId: 8, estimate: "9", startDate: daysFromNow(2), endDate: daysFromNow(10) });
const dmsTask5 = wi(1, "DMS", "Document Management System", "TASK", "Write unit tests for upload", "TODO", "MEDIUM", { parentId: dmsStory2.id, assigneeId: 3, estimate: "9", startDate: daysFromNow(5), endDate: daysFromNow(12) });

const dmsFeat2 = wi(1, "DMS", "Document Management System", "FEATURE", "Document Search & Indexing", "TODO", "HIGH", { parentId: dmsEpic1.id, startDate: daysFromNow(10), endDate: daysFromNow(50) });
const dmsStory3 = wi(1, "DMS", "Document Management System", "STORY", "Full-text search implementation", "TODO", "HIGH", { parentId: dmsFeat2.id, assigneeId: 7, estimate: "36", startDate: daysFromNow(10), endDate: daysFromNow(35) });
const dmsTask6 = wi(1, "DMS", "Document Management System", "TASK", "Set up search index", "TODO", "HIGH", { parentId: dmsStory3.id, assigneeId: 7, estimate: "18", startDate: daysFromNow(10), endDate: daysFromNow(22) });
const dmsTask7 = wi(1, "DMS", "Document Management System", "TASK", "Build search results UI", "TODO", "MEDIUM", { parentId: dmsStory3.id, assigneeId: 6, estimate: "18", startDate: daysFromNow(20), endDate: daysFromNow(35) });

const dmsBug1 = wi(1, "DMS", "Document Management System", "BUG", "PDF preview not rendering on Safari", "IN_PROGRESS", "CRITICAL", {
  assigneeId: 3, bugType: "UI", severity: "CRITICAL",
  currentBehavior: "PDF files show blank screen on Safari browser",
  expectedBehavior: "PDF should render correctly across all browsers",
  startDate: daysAgo(5), endDate: daysFromNow(2),
});
const dmsBug2 = wi(1, "DMS", "Document Management System", "BUG", "File size limit error not displayed", "TODO", "HIGH", {
  assigneeId: 8, bugType: "FUNCTIONAL", severity: "HIGH",
  currentBehavior: "Upload silently fails for files > 50MB",
  expectedBehavior: "Show clear error message with file size limit",
  startDate: daysFromNow(3), endDate: daysFromNow(8),
});
const dmsBug3 = wi(1, "DMS", "Document Management System", "BUG", "Document version history shows wrong dates", "ON_HOLD", "MEDIUM", {
  assigneeId: 6, bugType: "FUNCTIONAL", severity: "MEDIUM",
  currentBehavior: "Version timestamps display UTC instead of local timezone",
  expectedBehavior: "Timestamps should reflect the user's local timezone",
  startDate: daysAgo(3), endDate: daysFromNow(5),
});

// ── CRM Project (id=2) ──────────────────────────────────────────────
const crmEpic1 = wi(2, "CRM", "Customer Relationship Manager", "EPIC", "Sales Pipeline Management", "IN_PROGRESS", "HIGH", { startDate: daysAgo(40), endDate: daysFromNow(50) });
const crmFeat1 = wi(2, "CRM", "Customer Relationship Manager", "FEATURE", "Lead Tracking Dashboard", "IN_PROGRESS", "HIGH", { parentId: crmEpic1.id, assigneeId: 4, startDate: daysAgo(35), endDate: daysFromNow(15) });
const crmStory1 = wi(2, "CRM", "Customer Relationship Manager", "STORY", "Lead status board", "DONE", "HIGH", { parentId: crmFeat1.id, assigneeId: 5, estimate: "27", startDate: daysAgo(35), endDate: daysAgo(10) });
const crmTask1 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Design Kanban board for leads", "DONE", "HIGH", { parentId: crmStory1.id, assigneeId: 5, estimate: "9", startDate: daysAgo(35), endDate: daysAgo(28) });
const crmTask2 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Implement drag-and-drop pipeline", "DONE", "MEDIUM", { parentId: crmStory1.id, assigneeId: 9, estimate: "18", startDate: daysAgo(28), endDate: daysAgo(12) });
const crmStory2 = wi(2, "CRM", "Customer Relationship Manager", "STORY", "Contact import from CSV", "IN_PROGRESS", "MEDIUM", { parentId: crmFeat1.id, assigneeId: 11, estimate: "18", startDate: daysAgo(10), endDate: daysFromNow(8) });
const crmTask3 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Build CSV parser", "DONE", "MEDIUM", { parentId: crmStory2.id, assigneeId: 11, estimate: "9", startDate: daysAgo(10), endDate: daysAgo(3) });
const crmTask4 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Add duplicate detection", "IN_PROGRESS", "HIGH", { parentId: crmStory2.id, assigneeId: 7, estimate: "9", startDate: daysAgo(3), endDate: daysFromNow(5) });

const crmFeat2 = wi(2, "CRM", "Customer Relationship Manager", "FEATURE", "Email Integration", "TODO", "MEDIUM", { parentId: crmEpic1.id, startDate: daysFromNow(15), endDate: daysFromNow(50) });
const crmStory3 = wi(2, "CRM", "Customer Relationship Manager", "STORY", "Gmail sync setup", "TODO", "MEDIUM", { parentId: crmFeat2.id, assigneeId: 9, estimate: "36", startDate: daysFromNow(15), endDate: daysFromNow(40) });
const crmTask5 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Implement OAuth for Gmail", "TODO", "HIGH", { parentId: crmStory3.id, assigneeId: 9, estimate: "18", startDate: daysFromNow(15), endDate: daysFromNow(28) });
const crmTask6 = wi(2, "CRM", "Customer Relationship Manager", "TASK", "Build email thread view", "TODO", "MEDIUM", { parentId: crmStory3.id, assigneeId: 5, estimate: "18", startDate: daysFromNow(25), endDate: daysFromNow(40) });

const crmBug1 = wi(2, "CRM", "Customer Relationship Manager", "BUG", "Contact search returns stale results", "TODO", "HIGH", {
  assigneeId: 7, bugType: "FUNCTIONAL", severity: "HIGH",
  currentBehavior: "Search results don't update after editing a contact",
  expectedBehavior: "Search should reflect latest data immediately",
  startDate: daysFromNow(1), endDate: daysFromNow(6),
});
const crmBug2 = wi(2, "CRM", "Customer Relationship Manager", "BUG", "Pipeline drag-and-drop fails on touch devices", "IN_PROGRESS", "HIGH", {
  assigneeId: 5, bugType: "UI", severity: "HIGH",
  currentBehavior: "Cannot move leads between pipeline stages on tablets",
  expectedBehavior: "Touch drag-and-drop should work on all devices",
  startDate: daysAgo(4), endDate: daysFromNow(3),
});

// ── HRM Project (id=3) ──────────────────────────────────────────────
const hrmEpic1 = wi(3, "HRM", "HR Management Portal", "EPIC", "Employee Onboarding", "TODO", "MEDIUM", { startDate: daysFromNow(10), endDate: daysFromNow(90) });
const hrmFeat1 = wi(3, "HRM", "HR Management Portal", "FEATURE", "Onboarding Checklist", "TODO", "MEDIUM", { parentId: hrmEpic1.id, startDate: daysFromNow(10), endDate: daysFromNow(50) });
const hrmStory1 = wi(3, "HRM", "HR Management Portal", "STORY", "New hire form wizard", "TODO", "MEDIUM", { parentId: hrmFeat1.id, assigneeId: 2, estimate: "27", startDate: daysFromNow(10), endDate: daysFromNow(30) });
const hrmTask1 = wi(3, "HRM", "HR Management Portal", "TASK", "Design multi-step form", "TODO", "MEDIUM", { parentId: hrmStory1.id, assigneeId: 2, estimate: "9", startDate: daysFromNow(10), endDate: daysFromNow(17) });
const hrmTask2 = wi(3, "HRM", "HR Management Portal", "TASK", "Add document upload step", "TODO", "LOW", { parentId: hrmStory1.id, assigneeId: 8, estimate: "9", startDate: daysFromNow(17), endDate: daysFromNow(24) });
const hrmTask3 = wi(3, "HRM", "HR Management Portal", "TASK", "Integrate e-signature", "TODO", "HIGH", { parentId: hrmStory1.id, assigneeId: 6, estimate: "9", startDate: daysFromNow(22), endDate: daysFromNow(30) });

const hrmFeat2 = wi(3, "HRM", "HR Management Portal", "FEATURE", "Payroll Module", "TODO", "HIGH", { parentId: hrmEpic1.id, startDate: daysFromNow(40), endDate: daysFromNow(90) });
const hrmStory2 = wi(3, "HRM", "HR Management Portal", "STORY", "Salary calculation engine", "TODO", "HIGH", { parentId: hrmFeat2.id, assigneeId: 9, estimate: "36", startDate: daysFromNow(40), endDate: daysFromNow(70) });

// ── ECS Project (id=4) ──────────────────────────────────────────────
const ecsEpic1 = wi(4, "ECS", "E-Commerce Store", "EPIC", "Product Catalog", "IN_PROGRESS", "HIGH", { startDate: daysAgo(80), endDate: daysFromNow(20) });
const ecsFeat1 = wi(4, "ECS", "E-Commerce Store", "FEATURE", "Product Listing Page", "IN_PROGRESS", "HIGH", { parentId: ecsEpic1.id, assigneeId: 4, startDate: daysAgo(70), endDate: daysFromNow(5) });
const ecsStory1 = wi(4, "ECS", "E-Commerce Store", "STORY", "Product grid with filters", "DONE", "HIGH", { parentId: ecsFeat1.id, assigneeId: 6, estimate: "27", startDate: daysAgo(70), endDate: daysAgo(40) });
const ecsTask1 = wi(4, "ECS", "E-Commerce Store", "TASK", "Build filter sidebar", "DONE", "MEDIUM", { parentId: ecsStory1.id, assigneeId: 6, estimate: "9", startDate: daysAgo(70), endDate: daysAgo(60) });
const ecsTask2 = wi(4, "ECS", "E-Commerce Store", "TASK", "Add sorting options", "DONE", "LOW", { parentId: ecsStory1.id, assigneeId: 8, estimate: "9", startDate: daysAgo(60), endDate: daysAgo(50) });
const ecsTask3 = wi(4, "ECS", "E-Commerce Store", "TASK", "Implement pagination", "DONE", "MEDIUM", { parentId: ecsStory1.id, assigneeId: 3, estimate: "9", startDate: daysAgo(50), endDate: daysAgo(42) });
const ecsStory2 = wi(4, "ECS", "E-Commerce Store", "STORY", "Product detail page", "IN_PROGRESS", "HIGH", { parentId: ecsFeat1.id, assigneeId: 5, estimate: "18", startDate: daysAgo(15), endDate: daysFromNow(5) });
const ecsTask4 = wi(4, "ECS", "E-Commerce Store", "TASK", "Design product image carousel", "IN_PROGRESS", "HIGH", { parentId: ecsStory2.id, assigneeId: 5, estimate: "9", startDate: daysAgo(10), endDate: daysFromNow(2) });
const ecsTask5 = wi(4, "ECS", "E-Commerce Store", "TASK", "Build reviews section", "TODO", "MEDIUM", { parentId: ecsStory2.id, assigneeId: 12, estimate: "9", startDate: daysFromNow(2), endDate: daysFromNow(10) });

const ecsEpic2 = wi(4, "ECS", "E-Commerce Store", "EPIC", "Checkout & Payments", "ON_HOLD", "CRITICAL", { startDate: daysAgo(10), endDate: daysFromNow(45), description: "Payment gateway integration on hold pending vendor selection" });
const ecsFeat3 = wi(4, "ECS", "E-Commerce Store", "FEATURE", "Stripe Payment Integration", "ON_HOLD", "CRITICAL", { parentId: ecsEpic2.id, assigneeId: 9, startDate: daysAgo(5), endDate: daysFromNow(30) });

const ecsBug1 = wi(4, "ECS", "E-Commerce Store", "BUG", "Cart total calculation wrong with discounts", "IN_PROGRESS", "CRITICAL", {
  assigneeId: 9, bugType: "FUNCTIONAL", severity: "CRITICAL",
  currentBehavior: "Discount applied after tax instead of before",
  expectedBehavior: "Discount should be applied before tax calculation",
  startDate: daysAgo(3), endDate: daysFromNow(1),
});
const ecsBug2 = wi(4, "ECS", "E-Commerce Store", "BUG", "Product images not loading on slow connections", "TODO", "MEDIUM", {
  assigneeId: 6, bugType: "PERFORMANCE", severity: "MEDIUM",
  currentBehavior: "Images timeout on 3G connections, showing broken icons",
  expectedBehavior: "Progressive loading with low-res placeholders",
  startDate: daysFromNow(5), endDate: daysFromNow(12),
});
const ecsBug3 = wi(4, "ECS", "E-Commerce Store", "BUG", "Search autocomplete flickers on fast typing", "DONE", "LOW", {
  assigneeId: 8, bugType: "UI", severity: "LOW",
  currentBehavior: "Dropdown flickers rapidly when user types quickly",
  expectedBehavior: "Debounce search input to prevent flickering",
  startDate: daysAgo(12), endDate: daysAgo(5),
});

// ── MBL Project (id=5) ──────────────────────────────────────────────
const mblEpic1 = wi(5, "MBL", "Mobile Banking App", "EPIC", "Account Management", "DONE", "HIGH", { startDate: daysAgo(150), endDate: daysAgo(20) });
const mblFeat1 = wi(5, "MBL", "Mobile Banking App", "FEATURE", "Account Overview Screen", "DONE", "HIGH", { parentId: mblEpic1.id, assigneeId: 3, startDate: daysAgo(140), endDate: daysAgo(60) });
const mblStory1 = wi(5, "MBL", "Mobile Banking App", "STORY", "Balance display widget", "DONE", "HIGH", { parentId: mblFeat1.id, assigneeId: 6, estimate: "18", startDate: daysAgo(130), endDate: daysAgo(100) });
const mblTask1 = wi(5, "MBL", "Mobile Banking App", "TASK", "Create balance card component", "DONE", "HIGH", { parentId: mblStory1.id, assigneeId: 6, estimate: "9", startDate: daysAgo(130), endDate: daysAgo(115) });
const mblTask2 = wi(5, "MBL", "Mobile Banking App", "TASK", "Add transaction mini-list", "DONE", "MEDIUM", { parentId: mblStory1.id, assigneeId: 7, estimate: "9", startDate: daysAgo(115), endDate: daysAgo(100) });

// ── LMS Project (id=6) ──────────────────────────────────────────────
const lmsEpic1 = wi(6, "LMS", "Learning Management System", "EPIC", "Course Creation Engine", "IN_PROGRESS", "HIGH", { startDate: daysAgo(25), endDate: daysFromNow(60) });
const lmsFeat1 = wi(6, "LMS", "Learning Management System", "FEATURE", "Video Upload & Streaming", "IN_PROGRESS", "HIGH", { parentId: lmsEpic1.id, assigneeId: 3, startDate: daysAgo(20), endDate: daysFromNow(20) });
const lmsStory1 = wi(6, "LMS", "Learning Management System", "STORY", "Video transcoding pipeline", "IN_PROGRESS", "HIGH", { parentId: lmsFeat1.id, assigneeId: 11, estimate: "36", startDate: daysAgo(15), endDate: daysFromNow(15) });
const lmsTask1 = wi(6, "LMS", "Learning Management System", "TASK", "Set up FFmpeg transcoding service", "DONE", "HIGH", { parentId: lmsStory1.id, assigneeId: 11, estimate: "18", startDate: daysAgo(15), endDate: daysAgo(3) });
const lmsTask2 = wi(6, "LMS", "Learning Management System", "TASK", "Build video player component", "IN_PROGRESS", "MEDIUM", { parentId: lmsStory1.id, assigneeId: 3, estimate: "18", startDate: daysAgo(5), endDate: daysFromNow(10) });

const lmsFeat2 = wi(6, "LMS", "Learning Management System", "FEATURE", "Quiz & Assessment Module", "TODO", "MEDIUM", { parentId: lmsEpic1.id, startDate: daysFromNow(20), endDate: daysFromNow(55) });
const lmsStory2 = wi(6, "LMS", "Learning Management System", "STORY", "Multiple choice question builder", "TODO", "MEDIUM", { parentId: lmsFeat2.id, assigneeId: 8, estimate: "18", startDate: daysFromNow(20), endDate: daysFromNow(35) });
const lmsStory3 = wi(6, "LMS", "Learning Management System", "STORY", "Auto-grading engine", "TODO", "HIGH", { parentId: lmsFeat2.id, assigneeId: 7, estimate: "27", startDate: daysFromNow(30), endDate: daysFromNow(55) });

const lmsBug1 = wi(6, "LMS", "Learning Management System", "BUG", "Certificate PDF generation fails for special characters", "IN_PROGRESS", "HIGH", {
  assigneeId: 12, bugType: "FUNCTIONAL", severity: "HIGH",
  currentBehavior: "PDF crashes when student name contains accented characters",
  expectedBehavior: "PDF should render all Unicode characters correctly",
  startDate: daysAgo(2), endDate: daysFromNow(4),
});
const lmsBug2 = wi(6, "LMS", "Learning Management System", "BUG", "Progress bar shows 101% on course completion", "TODO", "LOW", {
  assigneeId: 3, bugType: "UI", severity: "LOW",
  currentBehavior: "Rounding error causes progress to exceed 100%",
  expectedBehavior: "Progress should cap at exactly 100%",
  startDate: daysFromNow(5), endDate: daysFromNow(8),
});

// ── ANA Project (id=7) ──────────────────────────────────────────────
const anaEpic1 = wi(7, "ANA", "Analytics Dashboard", "EPIC", "Data Visualization Suite", "IN_PROGRESS", "HIGH", { startDate: daysAgo(45), endDate: daysFromNow(30) });
const anaFeat1 = wi(7, "ANA", "Analytics Dashboard", "FEATURE", "Real-time Charts", "IN_PROGRESS", "HIGH", { parentId: anaEpic1.id, assigneeId: 14, startDate: daysAgo(30), endDate: daysFromNow(10) });
const anaStory1 = wi(7, "ANA", "Analytics Dashboard", "STORY", "Line chart with time-series data", "DONE", "HIGH", { parentId: anaFeat1.id, assigneeId: 14, estimate: "18", startDate: daysAgo(30), endDate: daysAgo(15) });
const anaTask1 = wi(7, "ANA", "Analytics Dashboard", "TASK", "Integrate D3.js for charting", "DONE", "HIGH", { parentId: anaStory1.id, assigneeId: 14, estimate: "9", startDate: daysAgo(30), endDate: daysAgo(22) });
const anaTask2 = wi(7, "ANA", "Analytics Dashboard", "TASK", "Add zoom and pan controls", "DONE", "MEDIUM", { parentId: anaStory1.id, assigneeId: 15, estimate: "9", startDate: daysAgo(22), endDate: daysAgo(15) });
const anaStory2 = wi(7, "ANA", "Analytics Dashboard", "STORY", "Bar chart comparisons", "IN_PROGRESS", "MEDIUM", { parentId: anaFeat1.id, assigneeId: 12, estimate: "18", startDate: daysAgo(10), endDate: daysFromNow(8) });
const anaTask3 = wi(7, "ANA", "Analytics Dashboard", "TASK", "Build stacked bar chart", "IN_PROGRESS", "MEDIUM", { parentId: anaStory2.id, assigneeId: 12, estimate: "9", startDate: daysAgo(8), endDate: daysFromNow(3) });
const anaTask4 = wi(7, "ANA", "Analytics Dashboard", "TASK", "Add export to PNG/SVG", "TODO", "LOW", { parentId: anaStory2.id, assigneeId: 15, estimate: "9", startDate: daysFromNow(3), endDate: daysFromNow(10) });

const anaFeat2 = wi(7, "ANA", "Analytics Dashboard", "FEATURE", "Custom Report Builder", "TODO", "MEDIUM", { parentId: anaEpic1.id, startDate: daysFromNow(10), endDate: daysFromNow(35) });
const anaStory3 = wi(7, "ANA", "Analytics Dashboard", "STORY", "Drag-and-drop widget layout", "TODO", "MEDIUM", { parentId: anaFeat2.id, assigneeId: 14, estimate: "27", startDate: daysFromNow(10), endDate: daysFromNow(30) });

// ── SEC Project (id=9) ──────────────────────────────────────────────
const secEpic1 = wi(9, "SEC", "Security Audit Platform", "EPIC", "Vulnerability Scanner", "IN_PROGRESS", "CRITICAL", { startDate: daysAgo(18), endDate: daysFromNow(45) });
const secFeat1 = wi(9, "SEC", "Security Audit Platform", "FEATURE", "OWASP Top 10 Checks", "IN_PROGRESS", "CRITICAL", { parentId: secEpic1.id, assigneeId: 13, startDate: daysAgo(15), endDate: daysFromNow(20) });
const secStory1 = wi(9, "SEC", "Security Audit Platform", "STORY", "SQL injection detection", "DONE", "CRITICAL", { parentId: secFeat1.id, assigneeId: 13, estimate: "18", startDate: daysAgo(15), endDate: daysAgo(3) });
const secTask1 = wi(9, "SEC", "Security Audit Platform", "TASK", "Build SQL pattern matcher", "DONE", "CRITICAL", { parentId: secStory1.id, assigneeId: 13, estimate: "9", startDate: daysAgo(15), endDate: daysAgo(8) });
const secTask2 = wi(9, "SEC", "Security Audit Platform", "TASK", "Add parameterized query analyzer", "DONE", "HIGH", { parentId: secStory1.id, assigneeId: 11, estimate: "9", startDate: daysAgo(8), endDate: daysAgo(3) });
const secStory2 = wi(9, "SEC", "Security Audit Platform", "STORY", "XSS vulnerability scanner", "IN_PROGRESS", "HIGH", { parentId: secFeat1.id, assigneeId: 4, estimate: "27", startDate: daysAgo(5), endDate: daysFromNow(15) });
const secTask3 = wi(9, "SEC", "Security Audit Platform", "TASK", "DOM-based XSS detection", "IN_PROGRESS", "HIGH", { parentId: secStory2.id, assigneeId: 4, estimate: "18", startDate: daysAgo(5), endDate: daysFromNow(10) });

const secBug1 = wi(9, "SEC", "Security Audit Platform", "BUG", "False positive rate too high for CSRF detection", "ON_HOLD", "HIGH", {
  assigneeId: 13, bugType: "FUNCTIONAL", severity: "HIGH",
  currentBehavior: "CSRF scanner flags 60% false positives on API endpoints",
  expectedBehavior: "False positive rate should be below 5%",
  startDate: daysAgo(7), endDate: daysFromNow(14),
  description: "On hold pending research into improved heuristic algorithms",
});

export const DEMO_WORK_ITEMS: WorkItem[] = [
  // DMS (16 items)
  dmsEpic1, dmsFeat1, dmsStory1, dmsTask1, dmsTask2,
  dmsStory2, dmsTask3, dmsTask4, dmsTask5,
  dmsFeat2, dmsStory3, dmsTask6, dmsTask7,
  dmsBug1, dmsBug2, dmsBug3,
  // CRM (14 items)
  crmEpic1, crmFeat1, crmStory1, crmTask1, crmTask2,
  crmStory2, crmTask3, crmTask4,
  crmFeat2, crmStory3, crmTask5, crmTask6,
  crmBug1, crmBug2,
  // HRM (8 items)
  hrmEpic1, hrmFeat1, hrmStory1, hrmTask1, hrmTask2, hrmTask3,
  hrmFeat2, hrmStory2,
  // ECS (14 items)
  ecsEpic1, ecsFeat1, ecsStory1, ecsTask1, ecsTask2, ecsTask3,
  ecsStory2, ecsTask4, ecsTask5,
  ecsEpic2, ecsFeat3,
  ecsBug1, ecsBug2, ecsBug3,
  // MBL (5 items)
  mblEpic1, mblFeat1, mblStory1, mblTask1, mblTask2,
  // LMS (10 items)
  lmsEpic1, lmsFeat1, lmsStory1, lmsTask1, lmsTask2,
  lmsFeat2, lmsStory2, lmsStory3,
  lmsBug1, lmsBug2,
  // ANA (10 items)
  anaEpic1, anaFeat1, anaStory1, anaTask1, anaTask2,
  anaStory2, anaTask3, anaTask4,
  anaFeat2, anaStory3,
  // SEC (8 items)
  secEpic1, secFeat1, secStory1, secTask1, secTask2,
  secStory2, secTask3,
  secBug1,
];

// ── Demo Invitations ─────────────────────────────────────────────────
export const DEMO_INVITATIONS = [
  { id: 1, email: "sarah.connor@example.com", full_name: "Sarah Connor", team_id: 1, team_role: "MEMBER", global_role: "USER", invited_by: "demo@cybaemtech.com", status: "ACTIVE", created_at: daysAgo(30), updated_at: daysAgo(2) },
  { id: 2, email: "james.lee@example.com", full_name: "James Lee", team_id: 2, team_role: "MEMBER", global_role: "USER", invited_by: "demo@cybaemtech.com", status: "CONFIRMED", created_at: daysAgo(14), updated_at: daysAgo(5) },
  { id: 3, email: "maria.santos@example.com", full_name: "Maria Santos", team_id: 3, team_role: "ADMIN", global_role: "SCRUM_MASTER", invited_by: "demo@cybaemtech.com", status: "SIGNED_UP", created_at: daysAgo(7), updated_at: daysAgo(3) },
  { id: 4, email: "alex.turner@example.com", full_name: "Alex Turner", team_id: 1, team_role: "MEMBER", global_role: "USER", invited_by: "demo@cybaemtech.com", status: "PENDING", created_at: daysAgo(3), updated_at: daysAgo(3) },
  { id: 5, email: "priya.sharma@example.com", full_name: "Priya Sharma", team_id: 5, team_role: "MEMBER", global_role: "USER", invited_by: "diana.patel@cybaemtech.com", status: "PENDING", created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 6, email: "tom.wilson@example.com", full_name: "Tom Wilson", team_id: 4, team_role: "MEMBER", global_role: "USER", invited_by: "demo@cybaemtech.com", status: "ACTIVE", created_at: daysAgo(45), updated_at: daysAgo(10) },
  { id: 7, email: "linda.nguyen@example.com", full_name: "Linda Nguyen", team_id: 6, team_role: "MEMBER", global_role: "USER", invited_by: "diana.patel@cybaemtech.com", status: "CONFIRMED", created_at: daysAgo(10), updated_at: daysAgo(4) },
];
