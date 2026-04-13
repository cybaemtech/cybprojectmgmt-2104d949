/**
 * seed-data.ts – Insert synthetic test data directly into Supabase.
 * Call seedDatabase() to populate 10 teams and 25 projects with work items.
 */
import { supabase } from "@/integrations/supabase/client";
import { refreshStore } from "./local-store";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// ── Teams (10) ──────────────────────────────────────────────────────
const TEAMS = [
  { name: "Frontend Squad", description: "UI/UX and React development team", is_active: true },
  { name: "Backend Engineers", description: "API, microservices, and database team", is_active: true },
  { name: "QA & Testing", description: "Quality assurance and automated testing", is_active: true },
  { name: "DevOps & Cloud", description: "Infrastructure, CI/CD, and cloud services", is_active: true },
  { name: "Mobile Development", description: "iOS and Android native app development", is_active: true },
  { name: "Data Science", description: "Analytics, ML models, and data pipelines", is_active: true },
  { name: "Security Team", description: "Application security and compliance", is_active: true },
  { name: "UX Research", description: "User research, usability testing, and design systems", is_active: true },
  { name: "Platform Engineering", description: "Internal tooling and developer experience", is_active: true },
  { name: "Customer Success", description: "Client onboarding, support escalations, and feedback", is_active: true },
];

// ── Projects (25) ───────────────────────────────────────────────────
const PROJECTS = [
  { key: "DMS", name: "Document Management System", description: "Enterprise document management with OCR and versioning", category: "CLIENT", status: "ACTIVE", client_company_name: "Acme Corp", client_industry: "Technology", client_contact_name: "John Doe", client_contact_email: "john@acme.com", client_status: "ACTIVE" },
  { key: "CRM", name: "Customer Relationship Manager", description: "CRM platform for sales pipeline and lead tracking", category: "CLIENT", status: "ACTIVE", client_company_name: "Global Industries", client_industry: "Manufacturing", client_contact_name: "Sarah Lee", client_contact_email: "sarah@global.com", client_status: "ONBOARDING" },
  { key: "HRM", name: "HR Management Portal", description: "Internal HR, payroll, and employee onboarding system", category: "IN_HOUSE", status: "PLANNING" },
  { key: "ECS", name: "E-Commerce Store", description: "Online retail platform with payment integration", category: "CLIENT", status: "ACTIVE", client_company_name: "ShopWell Ltd", client_industry: "Retail", client_contact_name: "Raj Kumar", client_contact_email: "raj@shopwell.com", client_status: "ACTIVE" },
  { key: "MBL", name: "Mobile Banking App", description: "Mobile banking application with biometric auth", category: "CLIENT", status: "COMPLETED", client_company_name: "FinServe Bank", client_industry: "Finance", client_status: "ACTIVE" },
  { key: "LMS", name: "Learning Management System", description: "Online course platform with progress tracking and certificates", category: "CLIENT", status: "ACTIVE", client_company_name: "EduTech Inc", client_industry: "Education", client_contact_name: "Maria Santos", client_contact_email: "maria@edutech.com", client_status: "ACTIVE" },
  { key: "INV", name: "Inventory Tracker", description: "Real-time inventory management with barcode scanning", category: "CLIENT", status: "ACTIVE", client_company_name: "LogiFlow", client_industry: "Logistics", client_contact_name: "Tom Baker", client_contact_email: "tom@logiflow.com", client_status: "ONBOARDING" },
  { key: "ANA", name: "Analytics Dashboard", description: "Business intelligence dashboard with custom reports", category: "IN_HOUSE", status: "ACTIVE" },
  { key: "CMS", name: "Content Management System", description: "Headless CMS with multi-language support", category: "CLIENT", status: "ACTIVE", client_company_name: "MediaHouse", client_industry: "Media", client_contact_name: "Lisa Park", client_contact_email: "lisa@mediahouse.com", client_status: "ACTIVE" },
  { key: "TMS", name: "Transport Management System", description: "Fleet tracking and route optimization platform", category: "CLIENT", status: "PLANNING", client_company_name: "TransGo", client_industry: "Transportation", client_contact_name: "James Wilson", client_contact_email: "james@transgo.com", client_status: "LEAD" },
  { key: "POS", name: "Point of Sale System", description: "Cloud-based POS with inventory sync", category: "CLIENT", status: "ACTIVE", client_company_name: "RetailPro", client_industry: "Retail", client_contact_name: "Anna Chen", client_contact_email: "anna@retailpro.com", client_status: "ACTIVE" },
  { key: "HMS", name: "Hospital Management System", description: "Patient records, scheduling, and billing platform", category: "CLIENT", status: "ACTIVE", client_company_name: "HealthFirst", client_industry: "Healthcare", client_contact_name: "Dr. Patel", client_contact_email: "patel@healthfirst.com", client_status: "ACTIVE" },
  { key: "FIN", name: "Financial Planning Tool", description: "Budgeting, forecasting, and expense tracking", category: "IN_HOUSE", status: "ACTIVE" },
  { key: "SCM", name: "Supply Chain Manager", description: "End-to-end supply chain visibility and vendor management", category: "CLIENT", status: "PLANNING", client_company_name: "ChainLink Corp", client_industry: "Manufacturing", client_contact_name: "Robert Kim", client_contact_email: "robert@chainlink.com", client_status: "LEAD" },
  { key: "RES", name: "Restaurant Ordering App", description: "Online ordering and table reservation system", category: "CLIENT", status: "ACTIVE", client_company_name: "FoodieHub", client_industry: "Food & Beverage", client_contact_name: "Chef Marco", client_contact_email: "marco@foodiehub.com", client_status: "ACTIVE" },
  { key: "IOT", name: "IoT Dashboard", description: "Real-time IoT device monitoring and alerting", category: "IN_HOUSE", status: "ACTIVE" },
  { key: "BKG", name: "Booking Platform", description: "Hotel and travel booking with payment gateway", category: "CLIENT", status: "ACTIVE", client_company_name: "TravelEase", client_industry: "Travel", client_contact_name: "Sophie Turner", client_contact_email: "sophie@travelease.com", client_status: "ACTIVE" },
  { key: "WMS", name: "Warehouse Management System", description: "Warehouse operations with pick-pack-ship workflows", category: "CLIENT", status: "ACTIVE", client_company_name: "StoreMax", client_industry: "Logistics", client_contact_name: "David Lee", client_contact_email: "david@storemax.com", client_status: "ONBOARDING" },
  { key: "EVT", name: "Event Management Platform", description: "Event planning, ticketing, and attendee management", category: "CLIENT", status: "COMPLETED", client_company_name: "EventPro", client_industry: "Events", client_contact_name: "Rachel Adams", client_contact_email: "rachel@eventpro.com", client_status: "ACTIVE" },
  { key: "CHT", name: "Live Chat Support", description: "Real-time customer chat with AI-powered suggestions", category: "IN_HOUSE", status: "ACTIVE" },
  { key: "PAY", name: "Payment Gateway Integration", description: "Unified payment processing with multiple providers", category: "IN_HOUSE", status: "ACTIVE" },
  { key: "RPT", name: "Report Generator", description: "Automated PDF/Excel report generation engine", category: "IN_HOUSE", status: "PLANNING" },
  { key: "API", name: "API Gateway", description: "Centralized API management with rate limiting and auth", category: "IN_HOUSE", status: "ACTIVE" },
  { key: "SSO", name: "Single Sign-On Service", description: "Enterprise SSO with SAML and OAuth2 support", category: "IN_HOUSE", status: "COMPLETED" },
  { key: "NTF", name: "Notification Service", description: "Multi-channel notifications: email, SMS, push, in-app", category: "IN_HOUSE", status: "ACTIVE" },
];

// Work item templates per project - generates a realistic hierarchy
interface WorkItemTemplate {
  type: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG";
  title: string;
  status: "TODO" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  children?: WorkItemTemplate[];
  bugType?: string;
  severity?: string;
  currentBehavior?: string;
  expectedBehavior?: string;
  estimate?: string;
}

function generateWorkItems(projectKey: string): WorkItemTemplate[] {
  // Generate different items based on project key for variety
  const templates: Record<string, WorkItemTemplate[]> = {
    DMS: [
      { type: "EPIC", title: "Document Upload & Storage", status: "IN_PROGRESS", priority: "HIGH", children: [
        { type: "FEATURE", title: "File Upload Module", status: "IN_PROGRESS", priority: "HIGH", children: [
          { type: "STORY", title: "Drag-and-drop upload", status: "DONE", priority: "HIGH", children: [
            { type: "TASK", title: "Create upload dropzone component", status: "DONE", priority: "HIGH", estimate: "9" },
            { type: "TASK", title: "Add progress bar for uploads", status: "DONE", priority: "MEDIUM", estimate: "9" },
          ]},
          { type: "STORY", title: "Bulk file upload support", status: "IN_PROGRESS", priority: "MEDIUM", children: [
            { type: "TASK", title: "Implement multi-file selection", status: "IN_PROGRESS", priority: "MEDIUM", estimate: "9" },
            { type: "TASK", title: "Add file type validation", status: "TODO", priority: "HIGH", estimate: "9" },
          ]},
        ]},
        { type: "FEATURE", title: "Document Search & Indexing", status: "TODO", priority: "HIGH", children: [
          { type: "STORY", title: "Full-text search", status: "TODO", priority: "HIGH", children: [
            { type: "TASK", title: "Set up search index", status: "TODO", priority: "HIGH", estimate: "18" },
            { type: "TASK", title: "Build search results UI", status: "TODO", priority: "MEDIUM", estimate: "18" },
          ]},
        ]},
      ]},
      { type: "BUG", title: "PDF preview not rendering on Safari", status: "IN_PROGRESS", priority: "CRITICAL", bugType: "UI", severity: "CRITICAL", currentBehavior: "PDF shows blank on Safari", expectedBehavior: "PDF should render on all browsers" },
    ],
    CRM: [
      { type: "EPIC", title: "Sales Pipeline Management", status: "IN_PROGRESS", priority: "HIGH", children: [
        { type: "FEATURE", title: "Lead Tracking Dashboard", status: "IN_PROGRESS", priority: "HIGH", children: [
          { type: "STORY", title: "Lead status Kanban board", status: "DONE", priority: "HIGH", children: [
            { type: "TASK", title: "Design Kanban board for leads", status: "DONE", priority: "HIGH", estimate: "9" },
            { type: "TASK", title: "Implement drag-and-drop pipeline", status: "DONE", priority: "MEDIUM", estimate: "18" },
          ]},
          { type: "STORY", title: "Contact import from CSV", status: "IN_PROGRESS", priority: "MEDIUM", children: [
            { type: "TASK", title: "Build CSV parser", status: "DONE", priority: "MEDIUM", estimate: "9" },
            { type: "TASK", title: "Add duplicate detection", status: "IN_PROGRESS", priority: "HIGH", estimate: "9" },
          ]},
        ]},
        { type: "FEATURE", title: "Email Integration", status: "TODO", priority: "MEDIUM", children: [
          { type: "STORY", title: "Gmail sync setup", status: "TODO", priority: "MEDIUM", children: [
            { type: "TASK", title: "Implement OAuth for Gmail", status: "TODO", priority: "HIGH", estimate: "18" },
            { type: "TASK", title: "Build email thread view", status: "TODO", priority: "MEDIUM", estimate: "18" },
          ]},
        ]},
      ]},
      { type: "BUG", title: "Contact search returns stale results", status: "TODO", priority: "HIGH", bugType: "FUNCTIONAL", severity: "HIGH", currentBehavior: "Search doesn't update after editing", expectedBehavior: "Search should reflect latest data" },
    ],
  };

  // Generic template for projects without specific items
  const generic: WorkItemTemplate[] = [
    { type: "EPIC", title: "Core Module Development", status: "IN_PROGRESS", priority: "HIGH", children: [
      { type: "FEATURE", title: "User Interface", status: "IN_PROGRESS", priority: "HIGH", children: [
        { type: "STORY", title: "Main dashboard layout", status: "DONE", priority: "HIGH", children: [
          { type: "TASK", title: "Design dashboard wireframe", status: "DONE", priority: "HIGH", estimate: "9" },
          { type: "TASK", title: "Implement responsive layout", status: "DONE", priority: "MEDIUM", estimate: "9" },
          { type: "TASK", title: "Add navigation components", status: "DONE", priority: "MEDIUM", estimate: "9" },
        ]},
        { type: "STORY", title: "Data table views", status: "IN_PROGRESS", priority: "MEDIUM", children: [
          { type: "TASK", title: "Build sortable data table", status: "IN_PROGRESS", priority: "MEDIUM", estimate: "9" },
          { type: "TASK", title: "Add filter controls", status: "TODO", priority: "MEDIUM", estimate: "9" },
          { type: "TASK", title: "Export to CSV/PDF", status: "TODO", priority: "LOW", estimate: "9" },
        ]},
      ]},
      { type: "FEATURE", title: "Backend API", status: "IN_PROGRESS", priority: "HIGH", children: [
        { type: "STORY", title: "REST API endpoints", status: "IN_PROGRESS", priority: "HIGH", children: [
          { type: "TASK", title: "Design API schema", status: "DONE", priority: "HIGH", estimate: "9" },
          { type: "TASK", title: "Implement CRUD endpoints", status: "IN_PROGRESS", priority: "HIGH", estimate: "18" },
          { type: "TASK", title: "Add input validation", status: "TODO", priority: "HIGH", estimate: "9" },
        ]},
      ]},
    ]},
    { type: "EPIC", title: "Testing & Quality", status: "TODO", priority: "MEDIUM", children: [
      { type: "FEATURE", title: "Automated Testing", status: "TODO", priority: "MEDIUM", children: [
        { type: "STORY", title: "Unit test suite", status: "TODO", priority: "MEDIUM", children: [
          { type: "TASK", title: "Set up testing framework", status: "TODO", priority: "HIGH", estimate: "9" },
          { type: "TASK", title: "Write unit tests for core modules", status: "TODO", priority: "MEDIUM", estimate: "18" },
        ]},
      ]},
    ]},
    { type: "BUG", title: "Session timeout not handled gracefully", status: "TODO", priority: "HIGH", bugType: "FUNCTIONAL", severity: "HIGH", currentBehavior: "App shows blank screen on session expiry", expectedBehavior: "Should redirect to login with message" },
    { type: "BUG", title: "Mobile layout breaks on small screens", status: "IN_PROGRESS", priority: "MEDIUM", bugType: "UI", severity: "MEDIUM", currentBehavior: "Sidebar overlaps content on 320px screens", expectedBehavior: "Sidebar should collapse to hamburger menu" },
  ];

  return templates[projectKey] || generic;
}

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || "";
}

async function insertWorkItemTree(
  items: WorkItemTemplate[],
  projectId: number,
  projectKey: string,
  projectName: string,
  parentId: number | null,
  counter: { value: number }
): Promise<void> {
  for (const item of items) {
    counter.value++;
    const externalId = `${projectKey}-${counter.value}`;
    const row: Record<string, any> = {
      title: item.title,
      type: item.type,
      status: item.status,
      priority: item.priority,
      project_id: projectId,
      parent_id: parentId,
      external_id: externalId,
      created_by_name: "Admin User",
      created_by_email: "admin@cybaemtech.com",
      estimate: item.estimate || null,
      bug_type: item.bugType || null,
      severity: item.severity || null,
      current_behavior: item.currentBehavior || null,
      expected_behavior: item.expectedBehavior || null,
      completed_at: item.status === "DONE" ? daysAgo(Math.floor(Math.random() * 10)) : null,
    };

    const { data, error } = await supabase.from("work_items").insert(row as any).select("id").single();
    if (error) {
      console.error(`[seed] Failed to insert work item "${item.title}":`, error);
      continue;
    }

    if (item.children && data) {
      await insertWorkItemTree(item.children, projectId, projectKey, projectName, data.id, counter);
    }
  }
}

export async function seedDatabase(): Promise<{ teams: number; projects: number; workItems: number }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  console.log("[seed] Starting database seed...");

  // Check if data already exists
  const { count: existingTeams } = await supabase.from("teams").select("*", { count: "exact", head: true });
  const { count: existingProjects } = await supabase.from("projects").select("*", { count: "exact", head: true });
  
  if ((existingTeams || 0) >= 10 && (existingProjects || 0) >= 25) {
    throw new Error("Database already has sufficient data. Delete existing data first if you want to re-seed.");
  }

  // Insert teams
  let teamsInserted = 0;
  const teamIds: number[] = [];
  for (const team of TEAMS) {
    const { data, error } = await supabase.from("teams").insert({
      ...team,
      created_by: userId,
    }).select("id").single();
    if (error) {
      console.error(`[seed] Team "${team.name}" failed:`, error);
      continue;
    }
    teamIds.push(data.id);
    teamsInserted++;
  }
  console.log(`[seed] Inserted ${teamsInserted} teams`);

  // Insert projects
  let projectsInserted = 0;
  let totalWorkItems = 0;
  
  for (let i = 0; i < PROJECTS.length; i++) {
    const proj = PROJECTS[i];
    const teamId = teamIds[i % teamIds.length] || null;
    const row: Record<string, any> = {
      key: proj.key,
      name: proj.name,
      description: proj.description,
      category: proj.category,
      status: proj.status,
      created_by: userId,
      created_by_name: "Admin User",
      created_by_email: "admin@cybaemtech.com",
      team_id: teamId,
      start_date: daysAgo(30 + Math.floor(Math.random() * 60)),
      target_date: daysFromNow(30 + Math.floor(Math.random() * 90)),
    };
    if (proj.client_company_name) row.client_company_name = proj.client_company_name;
    if (proj.client_industry) row.client_industry = proj.client_industry;
    if (proj.client_contact_name) row.client_contact_name = proj.client_contact_name;
    if (proj.client_contact_email) row.client_contact_email = proj.client_contact_email;
    if ((proj as any).client_status) row.client_status = (proj as any).client_status;

    const { data, error } = await supabase.from("projects").insert(row as any).select("id").single();
    if (error) {
      console.error(`[seed] Project "${proj.name}" failed:`, error);
      continue;
    }

    // Insert work items for this project
    const workItemTemplates = generateWorkItems(proj.key);
    const counter = { value: 0 };
    await insertWorkItemTree(workItemTemplates, data.id, proj.key, proj.name, null, counter);
    totalWorkItems += counter.value;
    projectsInserted++;
  }

  console.log(`[seed] Inserted ${projectsInserted} projects, ${totalWorkItems} work items`);

  // Refresh the local store
  await refreshStore();

  return { teams: teamsInserted, projects: projectsInserted, workItems: totalWorkItems };
}
