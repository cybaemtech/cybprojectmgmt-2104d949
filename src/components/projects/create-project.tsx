import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Team, User } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";
import { projectStore, userStore, categoryStore, workItemStore } from "@/lib/local-store";
import { supabaseCustom as supabase } from "@/lib/supabase-custom";
import { Combobox } from "@/components/ui/combobox";
import { useState } from "react";
import { ChevronDown, ChevronRight, Users, Plus } from "lucide-react";
import { KickoffProgressModal } from "@/components/modals/kickoff-progress-modal";

// Define the form schema
function generateProjectKey(name: string): string {
  const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'PRJ';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${suffix}`;
}

const projectFormSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters" }).trim(),
  description: z.string().optional(),
  teamId: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]).default("ACTIVE"),
  category: z.string().min(1, { message: "Category is required" }),
  githubUrl: z.string().url({ message: "Please enter a valid GitHub URL" }).optional().or(z.literal("")),
  startDate: z.string().optional(),
  targetDate: z.string().optional().refine((date) => {
    if (!date) return true;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, { message: "Please enter a valid date" }),
  // Client Details fields
  clientCompanyName: z.string().min(1, { message: "Company name is required" }).trim(),
  clientIndustry: z.string().min(1, { message: "Industry is required" }).trim(),
  clientWebsite: z.string().min(1, { message: "Company website is required" }).trim(),
  clientContactName: z.string().min(1, { message: "Contact name is required" }).trim(),
  clientContactEmail: z.string().email({ message: "Please enter a valid email" }).min(1, { message: "Contact email is required" }),
  clientContactPhone: z.string().min(1, { message: "Phone number is required" }).trim(),
  clientAccountManager: z.string().optional(),
  clientStatus: z.enum(["LEAD", "ONBOARDING", "ACTIVE", "CHURNED"], { required_error: "Client status is required" }),
  clientNotes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateProjectProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teams: Team[];
  userId: number;
  currentUser?: User;
}

export function CreateProject({ 
  isOpen, 
  onClose, 
  onSuccess,
  teams,
  userId,
  currentUser
}: CreateProjectProps) {
  const { toast } = useToast();
  const [clientDetailsOpen, setClientDetailsOpen] = useState(true);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categories, setCategories] = useState(categoryStore.all());
  const [kickoffOpen, setKickoffOpen] = useState(false);
  const [kickoffComplete, setKickoffComplete] = useState(false);
  
  const isAdmin = currentUser?.role === 'ADMIN';
  const allUsers = userStore.all();
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      teamId: teams.length > 0 ? teams[0].id.toString() : "none",
      status: "ACTIVE",
      category: "IN_HOUSE",
      githubUrl: "",
      startDate: "",
      targetDate: "",
      clientCompanyName: "",
      clientIndustry: "",
      clientWebsite: "",
      clientContactName: "",
      clientContactEmail: "",
      clientContactPhone: "",
      clientAccountManager: "none",
      clientStatus: undefined,
      clientNotes: "",
    },
  });
  
  const runKickoffAutomation = async (newProject: any) => {
    const creatorId = currentUser?.id || null;
    // 1) EPIC (Client Details)
    const epic = await workItemStore.saveAsync({
      title: newProject.name,
      type: 'EPIC',
      projectId: newProject.id,
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: creatorId,
      tags: newProject.clientIndustry || null,
      githubUrl: newProject.clientWebsite || null,
      currentBehavior: newProject.clientContactName || null,
      expectedBehavior: newProject.clientContactEmail || null,
      referenceUrl: newProject.clientContactPhone || null,
    });

    // 2) FEATURE
    const feature = await workItemStore.saveAsync({
      title: "Project Kick-Off",
      type: 'FEATURE',
      projectId: newProject.id,
      status: 'TODO',
      priority: 'MEDIUM',
      parentId: epic.id,
      assigneeId: creatorId,
    });

    // 3) STORY
    const story = await workItemStore.saveAsync({
      title: "Project Kick-Off",
      type: 'STORY',
      projectId: newProject.id,
      status: 'TODO',
      priority: 'MEDIUM',
      parentId: feature.id,
      assigneeId: creatorId,
      description: `Kick-off activities for "${newProject.name}"`,
    });

    // 4) TASKs from the Project Kick-Off template
    let templateRow: any = null;
    try {
      const { data } = await supabase
        .from("work_item_templates")
        .select("*")
        .eq("scope", "GLOBAL")
        .eq("name", "Project Kick-Off")
        .maybeSingle();
      templateRow = data;
    } catch (e) {
      console.warn("[kickoff] template lookup failed", e);
    }

    let taskCount = 0;
    if (templateRow && Array.isArray(templateRow.tasks)) {
      const tasks = [...templateRow.tasks]
        .filter((t: any) => t.isActive !== false)
        .sort((a: any, b: any) => (a.itemOrder || 0) - (b.itemOrder || 0));
      for (const t of tasks) {
        await workItemStore.saveAsync({
          title: t.title,
          type: 'TASK',
          projectId: newProject.id,
          status: 'TODO',
          priority: 'MEDIUM',
          parentId: story.id,
          assigneeId: creatorId,
          estimate: t.estimatedHours ? String(t.estimatedHours) : undefined,
        });
        taskCount++;
      }
    } else {
      console.warn("[kickoff] 'Project Kick-Off' template not found — created shell only");
    }
    return taskCount;
  };

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      const autoKey = generateProjectKey(data.name);
      const projectData = {
        name: data.name,
        key: autoKey,
        description: data.description || "",
        teamId: data.teamId && data.teamId !== "none" ? parseInt(data.teamId) : null,
        status: data.status,
        category: data.category,
        createdBy: userId,
        githubUrl: data.githubUrl || null,
        startDate: data.startDate || null,
        targetDate: data.targetDate || null,
        clientCompanyName: data.clientCompanyName || null,
        clientIndustry: data.clientIndustry || null,
        clientWebsite: data.clientWebsite || null,
        clientContactName: data.clientContactName || null,
        clientContactEmail: data.clientContactEmail || null,
        clientContactPhone: data.clientContactPhone || null,
        clientAccountManager: data.clientAccountManager && data.clientAccountManager !== "none" ? data.clientAccountManager : null,
        clientStatus: data.clientStatus || null,
        clientNotes: data.clientNotes || null,
      };

      // Auto-generated key; ensure uniqueness by retrying
      const existing = projectStore.all();
      while (existing.some(p => p.key === projectData.key)) {
        projectData.key = generateProjectKey(data.name);
      }

      // Open kick-off progress modal immediately for fluid UX
      setKickoffComplete(false);
      setKickoffOpen(true);

      // Persist project (awaits real DB id) then run automation chain
      const newProject = await projectStore.saveAsync(projectData as any);
      let taskCount = 0;
      try {
        taskCount = await runKickoffAutomation(newProject);
      } catch (autoErr) {
        console.error("[kickoff] automation error", autoErr);
        toast({
          title: "Project created, kick-off incomplete",
          description: "Some kick-off items could not be created. You can add them manually from the Backlog.",
          variant: "destructive",
        });
      }

      // Mark progress complete; modal will snap to 100% and call onKickoffDone
      setKickoffComplete(true);

      // Stash success info on a ref so the toast fires when modal finishes
      pendingSuccessRef.current = { taskCount };
    } catch (error: any) {
      console.error("Error creating project:", error);
      setKickoffOpen(false);
      setKickoffComplete(false);
      toast({
        title: "Error",
        description: "Could not create the project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pendingSuccessRef = (function () {
    // tiny inline ref via useState fallback
    return { current: null as null | { taskCount: number } };
  })();

  const handleKickoffDone = () => {
    setKickoffOpen(false);
    setKickoffComplete(false);
    const info = pendingSuccessRef.current;
    pendingSuccessRef.current = null;
    toast({
      title: "Project ready",
      description: info
        ? `Created Project Kick-Off chain${info.taskCount ? ` with ${info.taskCount} task${info.taskCount !== 1 ? "s" : ""}` : " (template empty — shell only)"}.`
        : "Project has been created.",
    });
    onSuccess();
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Project</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter project name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            

            {/* Project Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" value={field.value || ""} />
                    </FormControl>
                    <FormDescription>When the project is planned to begin</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" value={field.value || ""} />
                    </FormControl>
                    <FormDescription>Expected completion date for the project</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Category field - only visible to admins */}
            {isAdmin && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Category</FormLabel>
                    <Select value={field.value} onValueChange={(val) => {
                      if (val === "__add_new__") {
                        setIsAddingCategory(true);
                        return;
                      }
                      field.onChange(val);
                    }}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                        <SelectItem value="__add_new__" className="text-primary font-medium">
                          <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add New Category</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isAddingCategory && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          placeholder="New category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button type="button" size="sm" onClick={() => {
                          if (newCategoryName.trim()) {
                            const newCat = categoryStore.add(newCategoryName.trim());
                            setCategories(categoryStore.all());
                            field.onChange(newCat.value);
                            setNewCategoryName("");
                            setIsAddingCategory(false);
                          }
                        }}>Add</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => {
                          setIsAddingCategory(false);
                          setNewCategoryName("");
                        }}>Cancel</Button>
                      </div>
                    )}
                    <FormDescription>Select a category or create a new one.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team (Optional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>You can assign a team to this project or leave it unassigned.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PLANNING">Planning</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client Details - Collapsible Section */}
            <Collapsible open={clientDetailsOpen} onOpenChange={setClientDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-between gap-2 py-3 font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Client Details
                  </span>
                  {clientDetailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Core Client Information */}
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold text-sm text-primary">Core Client Information</h3>
                  <FormField
                    control={form.control}
                    name="clientCompanyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter company name" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientIndustry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry / Sector <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Combobox
                            options={[
                              // Technology & Communications
                              { value: "Information Technology (IT) & Services", label: "Information Technology (IT) & Services" },
                              { value: "Software (SaaS / PaaS)", label: "Software (SaaS / PaaS)" },
                              { value: "Hardware & Electronics", label: "Hardware & Electronics" },
                              { value: "Telecommunications", label: "Telecommunications" },
                              // Finance & Professional Services
                              { value: "Financial Services (Banking, Wealth Management, Insurance)", label: "Financial Services (Banking, Wealth Management, Insurance)" },
                              { value: "Accounting & Tax", label: "Accounting & Tax" },
                              { value: "Legal Services", label: "Legal Services" },
                              { value: "Consulting & Business Services", label: "Consulting & Business Services" },
                              { value: "Human Resources & Staffing", label: "Human Resources & Staffing" },
                              // Healthcare & Sciences
                              { value: "Healthcare Providers (Hospitals, Clinics, Medical Practices)", label: "Healthcare Providers (Hospitals, Clinics, Medical Practices)" },
                              { value: "Pharmaceuticals & Biotech", label: "Pharmaceuticals & Biotech" },
                              { value: "Medical Devices", label: "Medical Devices" },
                              // Consumer & Retail
                              { value: "Retail & E-commerce", label: "Retail & E-commerce" },
                              { value: "Consumer Goods (FMCG)", label: "Consumer Goods (FMCG)" },
                              { value: "Food & Beverage", label: "Food & Beverage" },
                              // Industrial, Energy & Manufacturing
                              { value: "Manufacturing", label: "Manufacturing" },
                              { value: "Construction & Engineering", label: "Construction & Engineering" },
                              { value: "Energy & Utilities (Oil, Gas, Renewables)", label: "Energy & Utilities (Oil, Gas, Renewables)" },
                              { value: "Automotive & Aerospace", label: "Automotive & Aerospace" },
                              { value: "Agriculture & Mining", label: "Agriculture & Mining" },
                              // Media, Travel & Entertainment
                              { value: "Media & Publishing", label: "Media & Publishing" },
                              { value: "Entertainment & Gaming", label: "Entertainment & Gaming" },
                              { value: "Travel, Tourism & Hospitality", label: "Travel, Tourism & Hospitality" },
                              { value: "Marketing & Advertising", label: "Marketing & Advertising" },
                              // Public Sector & Non-Profit
                              { value: "Education (K-12, Higher Ed, EdTech)", label: "Education (K-12, Higher Ed, EdTech)" },
                              { value: "Government & Public Administration", label: "Government & Public Administration" },
                              { value: "Non-Profit & Philanthropy", label: "Non-Profit & Philanthropy" },
                              // Real Estate & Logistics
                              { value: "Real Estate (Commercial & Residential)", label: "Real Estate (Commercial & Residential)" },
                              { value: "Transportation & Logistics", label: "Transportation & Logistics" },
                              // Other
                              { value: "Other", label: "Other" },
                            ]}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        {field.value === "Other" && (
                          <Input
                            placeholder="Please specify your industry"
                            className="mt-2"
                            onChange={(e) => {
                              if (e.target.value.trim()) {
                                form.setValue("clientIndustry", `Other: ${e.target.value.trim()}`);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                form.setValue("clientIndustry", `Other: ${e.target.value.trim()}`);
                              }
                            }}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://www.example.com" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-4 p-4 bg-accent/30 rounded-lg border border-accent">
                  <h3 className="font-semibold text-sm text-accent-foreground">Contact Information</h3>
                  <FormField
                    control={form.control}
                    name="clientContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name of the main point of contact" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="client@example.com" value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone Number <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="+1 (555) 000-0000" value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Relationship Management */}
                <div className="space-y-4 p-4 bg-secondary/30 rounded-lg border border-secondary">
                  <h3 className="font-semibold text-sm text-secondary-foreground">Relationship Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientAccountManager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Manager</FormLabel>
                          <FormControl>
                            <Combobox
                              options={[
                                { value: "none", label: "Unassigned" },
                                ...allUsers.map(u => ({ value: u.id.toString(), label: u.fullName || u.username }))
                              ]}
                              value={field.value || "none"}
                              onValueChange={field.onChange}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Internal team member responsible for this client</p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Status <span className="text-destructive">*</span></FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LEAD">Lead</SelectItem>
                              <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="CHURNED">Inactive / Churned</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="clientNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Description / Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Background information, special requirements, relationship history..." value={field.value || ""} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
