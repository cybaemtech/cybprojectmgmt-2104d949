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
import { projectStore, userStore } from "@/lib/local-store";
import { Combobox } from "@/components/ui/combobox";
import { useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";

// Define the form schema
const projectFormSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters" }).trim(),
  key: z.string()
        .min(2, { message: "Project key must be at least 2 characters" })
        .max(10, { message: "Project key must be at most 10 characters" })
        .refine(val => /^[A-Z0-9]+$/.test(val), { 
          message: "Project key must contain only uppercase letters and numbers (A-Z, 0-9)" 
        }),
  description: z.string().optional(),
  teamId: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]).default("ACTIVE"),
  category: z.enum(["CLIENT", "IN_HOUSE"]).default("IN_HOUSE"),
  githubUrl: z.string().url({ message: "Please enter a valid GitHub URL" }).optional().or(z.literal("")),
  startDate: z.string().optional(),
  targetDate: z.string().optional().refine((date) => {
    if (!date) return true;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, { message: "Please enter a valid date" }),
  // Client Details fields
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
  
  const isAdmin = currentUser?.role === 'ADMIN';
  const allUsers = userStore.all();
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      teamId: teams.length > 0 ? teams[0].id.toString() : "none",
      status: "ACTIVE",
      category: "IN_HOUSE",
      githubUrl: "",
      startDate: "",
      targetDate: "",
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
  
  const onSubmit = async (data: ProjectFormValues) => {
    try {
      const projectData = {
        name: data.name,
        key: data.key.toUpperCase(),
        description: data.description || "",
        teamId: data.teamId && data.teamId !== "none" ? parseInt(data.teamId) : null,
        status: data.status,
        category: data.category,
        createdBy: userId,
        githubUrl: data.githubUrl || null,
        startDate: data.startDate || null,
        targetDate: data.targetDate || null,
        clientIndustry: data.clientIndustry || null,
        clientWebsite: data.clientWebsite || null,
        clientContactName: data.clientContactName || null,
        clientContactEmail: data.clientContactEmail || null,
        clientContactPhone: data.clientContactPhone || null,
        clientAccountManager: data.clientAccountManager && data.clientAccountManager !== "none" ? parseInt(data.clientAccountManager) : null,
        clientStatus: data.clientStatus || null,
        clientNotes: data.clientNotes || null,
      };

      const existing = projectStore.all();
      if (existing.some(p => p.key === projectData.key)) {
        form.setError('key', { message: 'Project key already exists' });
        return;
      }

      projectStore.save(projectData as any);
      
      toast({
        title: "Project created",
        description: "The project has been created successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Could not create the project. Please try again.",
        variant: "destructive",
      });
    }
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
            
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Key</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g. PROJ, CRM, HR" 
                      maxLength={10} 
                      style={{ textTransform: 'uppercase' }}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        field.onChange(value);
                      }}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Short uppercase key used for work item IDs (e.g., PROJ-123)
                  </FormDescription>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CLIENT">Client Project</SelectItem>
                        <SelectItem value="IN_HOUSE">In-House Project</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Select whether this is a client project or an internal project.</FormDescription>
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
                    name="clientIndustry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry / Sector <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Healthcare, Finance, E-commerce" value={field.value || ""} />
                        </FormControl>
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
                          <FormLabel>Contact Email</FormLabel>
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
                          <FormLabel>Contact Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="+1 (555) 000-0000" value={field.value || ""} />
                          </FormControl>
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
                          <FormLabel>Client Status</FormLabel>
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
