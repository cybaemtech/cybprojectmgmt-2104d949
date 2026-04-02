import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Project, User, WorkItem } from "@/types/schema";
import { apiRequest } from "@/lib/queryClient";
import { workItemStore, getLocalUser } from "@/lib/local-store";
import { apiGet } from "@/lib/api-config";

// Template types & storage helpers (mirrored from template-settings)
interface TemplateOption {
  id: number;
  name: string;
  ownerId: number;
  isLocked?: boolean;
}
interface TemplateTaskOption {
  id: number;
  templateId: number;
  title: string;
  isActive: boolean;
}
function getTemplatesFromStorage(): TemplateOption[] {
  try { return JSON.parse(localStorage.getItem("user-templates") || "[]"); } catch { return []; }
}
function getTemplateTasksFromStorage(): TemplateTaskOption[] {
  try { return JSON.parse(localStorage.getItem("user-template-tasks") || "[]"); } catch { return []; }
}
import { useToast } from "@/hooks/use-toast";

// Function to get user-friendly display names for work item types
const getTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'EPIC':
      return 'Client Details';
    case 'FEATURE':
      return 'Client Requirement';
    case 'STORY':
      return 'Change Request';
    case 'TASK':
      return 'Task';
    case 'BUG':
      return 'Bug';
    default:
      return type.charAt(0) + type.slice(1).toLowerCase();
  }
};

const workItemFormSchema = z.object({
  title: z.string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(200, { message: "Title cannot exceed 200 characters" }),
  description: z.string().optional(),
  tags: z.string().optional(),
  type: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  projectId: z.number(),
  parentId: z.number().optional().nullable(),
  assigneeId: z.number().optional().nullable(),
  estimate: z.string().optional(),
  actualHours: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  // Bug-specific fields
  bugType: z.string().optional(),
  currentBehavior: z.string().optional(),
  expectedBehavior: z.string().optional(),
  referenceUrl: z.string().optional(),
  severity: z.string().optional(),
  // FEATURE-specific fields
  prototypeLink: z.string().optional(),
  attachmentFile: z.instanceof(File).optional().nullable(),
  githubUrl: z.string().optional(),
  autoCreateTemplateTasks: z.boolean().default(true),
}).refine((data) => {
  // Description/Instruction is required for FEATURE, STORY and BUG types
  if (['FEATURE', 'STORY', 'BUG'].includes(data.type)) {
    return data.description && data.description.trim().length > 0;
  }
  return true;
}, {
  message: "Client Requirement Description is required",
  path: ["description"],
}).refine((data) => {
  // PDF is mandatory for Client Requirement (FEATURE)
  if (data.type === 'FEATURE') {
    return data.attachmentFile !== null && data.attachmentFile !== undefined;
  }
  return true;
}, {
  message: "PDF upload is mandatory for Client Requirement",
  path: ["attachmentFile"],
}).refine((data) => {
  // Actual hours is required when status is DONE for leaf items
  if (data.status === 'DONE' && ['TASK', 'BUG'].includes(data.type)) {
    return data.actualHours !== undefined && data.actualHours !== null && data.actualHours.trim().length > 0;
  }
  return true;
}, {
  message: "Actual hours is required when status is DONE",
  path: ["actualHours"],
}).refine((data) => {
  // Estimate is required for all types except EPIC
  if (data.type === 'EPIC') return true;
  return data.estimate && data.estimate.trim().length > 0;
}, {
  message: "Estimate/Story Point is required",
  path: ["estimate"],
}).refine((data) => {
  // Parent is required for FEATURE, STORY, TASK, BUG (not EPIC)
  if (['FEATURE', 'STORY', 'TASK', 'BUG'].includes(data.type)) {
    return data.parentId && data.parentId > 0;
  }
  return true;
}, {
  message: "Parent is required for this item type",
  path: ["parentId"],
}).refine((data) => {
  // For BUG type: bugType is required
  if (data.type === 'BUG') {
    return data.bugType && data.bugType.trim().length > 0;
  }
  return true;
}, {
  message: "Bug type is required",
  path: ["bugType"],
}).refine((data) => {
  // For BUG with DEFECT or PROD_INCIDENT: current and expected behavior required
  if (data.type === 'BUG' && ['DEFECT', 'PROD_INCIDENT'].includes(data.bugType || '')) {
    return (data.currentBehavior && data.currentBehavior.trim().length > 0) &&
      (data.expectedBehavior && data.expectedBehavior.trim().length > 0);
  }
  return true;
}, {
  message: "Current and Expected Behavior are required for Defects and Production Incidents",
  path: ["currentBehavior"],
}).refine((data) => {
  // Company Website is required for EPIC (Client Details)
  if (data.type === 'EPIC') {
    return data.githubUrl && data.githubUrl.trim().length > 0;
  }
  return true;
}, {
  message: "Company Website is required",
  path: ["githubUrl"],
});

type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Project[];
  workItems: WorkItem[];
  currentProject?: Project;
  preselectedParent?: WorkItem;
  preselectedType?: string;
}

export function CreateItemModal({
  isOpen,
  onClose,
  onSuccess,
  projects,
  workItems,
  currentProject,
  preselectedParent,
  preselectedType,
}: CreateItemModalProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<number>(currentProject?.id || (projects.length > 0 ? projects[0].id : 0));
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Load available templates for the current user
  const currentLocalUser = getLocalUser();
  const availableTemplates = getTemplatesFromStorage().filter(t => t.ownerId === currentLocalUser?.id);
  const availableTemplateTasks = getTemplateTasksFromStorage();

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      tags: "",
      type: preselectedType || "FEATURE",
      status: "TODO",
      priority: "MEDIUM",
      projectId: currentProject?.id || (projects.length > 0 ? projects[0].id : 0),
      parentId: preselectedParent?.id || null,
      assigneeId: null,
      estimate: "",
      actualHours: "",
      startDate: null,
      endDate: null,
      bugType: "BUG",
      severity: "LOW",
      currentBehavior: "",
      expectedBehavior: "",
      referenceUrl: "",
      githubUrl: "",
      prototypeLink: "",
      autoCreateTemplateTasks: true,
    },
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
  });

  const isAdminOrScrum = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER');

  const { data: projectTeamMembers = [] } = useQuery<User[]>({
    queryKey: [`/projects/${selectedProjectId}/team-members`],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      return await apiGet(`/projects/${selectedProjectId}/team-members`);
    },
    enabled: isOpen && !!selectedProjectId
  });

  const watchedType = form.watch("type");
  const watchedBugType = form.watch("bugType");
  const watchedStatus = form.watch("status");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  // Calculate working days (Mon-Fri) between two dates
  const calculateWorkingHours = useCallback((start: string | null | undefined, end: string | null | undefined): string => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) return "";
    let workingDays = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      current.setDate(current.getDate() + 1);
    }
    return (workingDays * 9).toString();
  }, []);

  // Auto-calculate estimated hours for FEATURE when dates change
  useEffect(() => {
    if (watchedType === 'FEATURE' && watchedStartDate && watchedEndDate) {
      const hours = calculateWorkingHours(watchedStartDate, watchedEndDate);
      if (hours) form.setValue("estimate", hours);
    }
  }, [watchedStartDate, watchedEndDate, watchedType, calculateWorkingHours, form]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedType) {
        form.setValue("type", preselectedType);
      }
      if (preselectedParent) {
        form.setValue("parentId", preselectedParent.id);
      }
    }
  }, [preselectedType, preselectedParent, form, isOpen]);

  useEffect(() => {
    if (currentUser && isOpen && !form.getValues("assigneeId")) {
      form.setValue("assigneeId", currentUser.id);
    }
  }, [currentUser, isOpen, form]);

  // Auto-populate EPIC (Client Details) fields from the selected project's client info
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const hasProjectClientData = !!(selectedProject?.clientCompanyName || selectedProject?.clientIndustry || selectedProject?.clientWebsite || selectedProject?.clientContactName || selectedProject?.clientContactEmail || selectedProject?.clientContactPhone);

  useEffect(() => {
    if (isOpen && watchedType === 'EPIC' && selectedProject) {
      if (selectedProject.clientCompanyName) form.setValue("title", selectedProject.clientCompanyName);
      if (selectedProject.clientIndustry) form.setValue("tags", selectedProject.clientIndustry);
      if (selectedProject.clientWebsite) form.setValue("githubUrl", selectedProject.clientWebsite);
      if (selectedProject.clientContactName) form.setValue("currentBehavior", selectedProject.clientContactName);
      if (selectedProject.clientContactEmail) form.setValue("expectedBehavior", selectedProject.clientContactEmail);
      if (selectedProject.clientContactPhone) form.setValue("referenceUrl", selectedProject.clientContactPhone);
    }
  }, [isOpen, watchedType, selectedProject?.id]);

  const onSubmit = async (data: WorkItemFormValues) => {
    try {
      const submitData: any = {
        ...data,
        parentId: data.parentId || null,
        assigneeId: data.assigneeId || null,
        estimate: data.estimate || null,
        actualHours: data.actualHours || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        githubUrl: data.githubUrl || null,
        referenceUrl: data.referenceUrl || null,
        prototypeLink: data.prototypeLink || null,
        autoCreateTemplateTasks: data.autoCreateTemplateTasks,
      };

      if (selectedAttachmentFile) {
        const base64String = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedAttachmentFile);
        });
        if (data.type === 'FEATURE') {
          submitData.pdfUploadBlob = base64String;
          submitData.pdfUploadPath = `pdf_${new Date().getTime()}_${selectedAttachmentFile.name}`;
        } else {
          submitData.screenshot_blob = base64String;
          submitData.attachment_path = `attachment_${new Date().getTime()}_${selectedAttachmentFile.name}`;
        }
      }

      // Use local store for creating work items
      workItemStore.save(submitData);
      toast({ title: "Item created", description: "Created successfully." });
      onSuccess();
      onClose();
      form.reset();
      setSelectedAttachmentFile(null);
    } catch (e) {
      toast({ title: "Error", description: "Could not create item.", variant: "destructive" });
    }
  };

  const getValidParents = () => {
    if (!workItems) return [];
    return workItems.filter(item => {
      if (watchedType === 'FEATURE') return item.type === 'EPIC';
      if (watchedType === 'STORY') return item.type === 'FEATURE';
      if (['TASK', 'BUG'].includes(watchedType)) return item.type === 'STORY';
      return false;
    }).filter(item => item.projectId === selectedProjectId);
  };

  const getParentLabel = () => {
    if (watchedType === 'FEATURE') return 'Client Details';
    if (watchedType === 'STORY') return 'Client Requirement';
    if (['TASK', 'BUG'].includes(watchedType)) return 'Change Request';
    return 'Parent';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg font-semibold">Create New Work Item</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">

              {/* Item Type Selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="font-semibold">Select Item Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 md:grid-cols-5 gap-3"
                      >
                        {['EPIC', 'FEATURE', 'STORY', 'TASK', 'BUG'].map((type) => (
                          <div key={type} className="flex items-center space-x-2 border rounded-md p-2 hover:bg-neutral-50 cursor-pointer">
                            <RadioGroupItem value={type} id={`type-${type}`} />
                            <Label htmlFor={`type-${type}`} className="text-sm font-medium cursor-pointer flex-1">
                              {getTypeDisplayName(type)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project field - always shown, topmost */}
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <FormControl>
                      <Combobox
                        options={projects.map(p => ({ value: p.id.toString(), label: p.name }))}
                        value={selectedProjectId.toString()}
                        onValueChange={v => {
                          const id = parseInt(v); setSelectedProjectId(id); field.onChange(id); form.setValue("parentId", null);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Title / Client Company Name */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchedType === 'EPIC' ? 'Client / Company Name' : 'Title'} <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={watchedType === 'EPIC' ? "Enter client or company name" : "Enter work item title"} maxLength={200} className="py-2" disabled={watchedType === 'EPIC' && !!selectedProject?.clientCompanyName} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* EPIC / Client Details specific block */}
              {watchedType === 'EPIC' && (
                <div className="space-y-6">
                  {hasProjectClientData && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      Fields pre-filled from project client details are non-editable.
                    </p>
                  )}
                  {/* Core Client Information */}
                  <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h3 className="font-semibold text-sm text-primary">Core Client Information</h3>
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry / Sector</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Healthcare, Finance, E-commerce" value={field.value || ""} disabled={!!selectedProject?.clientIndustry} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="githubUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Website <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://www.example.com" value={field.value || ""} disabled={!!selectedProject?.clientWebsite} />
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
                      name="currentBehavior"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Name</FormLabel>
                          <FormControl>
                             <Input {...field} placeholder="Name of the main point of contact" value={field.value || ""} disabled={!!selectedProject?.clientContactName} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">The main person you speak to at the company</p>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="expectedBehavior"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                               <Input {...field} type="email" placeholder="client@example.com" value={field.value || ""} disabled={!!selectedProject?.clientContactEmail} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="referenceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone Number</FormLabel>
                            <FormControl>
                               <Input {...field} type="tel" placeholder="+1 (555) 000-0000" value={field.value || ""} disabled={!!selectedProject?.clientContactPhone} />
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
                        name="assigneeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Manager</FormLabel>
                            <FormControl>
                              <Combobox
                                options={[{ value: "unassigned", label: "Unassigned" }, ...projectTeamMembers.map(u => ({ value: u.id.toString(), label: u.fullName || u.username }))]}
                                value={field.value?.toString() || "unassigned"}
                                onValueChange={v => field.onChange(v === "unassigned" ? null : parseInt(v))}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Internal team member responsible for this client</p>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Status <span className="text-destructive">*</span></FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="TODO">Lead</SelectItem>
                                <SelectItem value="IN_PROGRESS">Onboarding</SelectItem>
                                <SelectItem value="ON_HOLD">Active</SelectItem>
                                <SelectItem value="DONE">Inactive / Churned</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Description / Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Background information, special requirements, relationship history..." value={field.value || ""} rows={4} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Description - shown for non-TASK, non-BUG, non-FEATURE, non-EPIC */}
              {!['TASK', 'BUG', 'FEATURE', 'EPIC'].includes(watchedType) && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchedType === 'STORY' ? 'Requirement Point' : 'Description'}
                        {watchedType === 'STORY' && <span className="text-destructive"> *</span>}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={watchedType === 'STORY' ? "Enter requirement points" : "Enter description"}
                          value={field.value || ""}
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* FEATURE specific block */}
              {watchedType === 'FEATURE' && (
                <div className="space-y-4 p-4 bg-orange-50/30 rounded-lg border border-orange-100">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Requirement Description <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter requirement details" value={field.value || ""} rows={2} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel className="font-semibold text-orange-900">Requirement Document (PDF) <span className="text-destructive">*</span></FormLabel>
                    <div
                      className="border-2 border-dashed border-orange-200 rounded-lg p-4 text-center hover:border-orange-400 cursor-pointer bg-background transition-colors"
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                      <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setSelectedAttachmentFile(file); form.setValue('attachmentFile', file); }
                      }} />
                      {selectedAttachmentFile ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-green-600 font-bold">✓ Selected:</span>
                          <span className="text-sm">{selectedAttachmentFile.name}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click to upload mandatory requirement PDF</p>
                      )}
                    </div>
                    <FormMessage>{form.formState.errors.attachmentFile?.message}</FormMessage>
                  </div>
                  <FormField
                    control={form.control}
                    name="prototypeLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-orange-900">GitHub / Prototype Link (Optional)</FormLabel>
                        <FormControl><Input {...field} placeholder="https://..." value={field.value || ""} className="bg-background" /></FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoCreateTemplateTasks"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-semibold text-orange-900 cursor-pointer">
                            Auto-create Template Tasks
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Create "Initial Requirement Gathering" tasks automatically for this requirement.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* BUG specific block */}
              {watchedType === 'BUG' && (
                <div className="space-y-4 bg-blue-50 p-4 rounded border border-blue-200">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bugType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Bug Type <span className="text-red-500">*</span></FormLabel>
                          <Select value={field.value || "BUG"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="BUG">Bug</SelectItem>
                              <SelectItem value="DEFECT">Defect</SelectItem>
                              <SelectItem value="PROD_INCIDENT">Prod Incident</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Priority <span className="text-red-500">*</span></FormLabel>
                          <Select value={field.value || "MEDIUM"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Severity <span className="text-red-500">*</span></FormLabel>
                          <Select value={field.value || "LOW"} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="CRITICAL">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Description for BUG */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Defect Description <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Textarea {...field} placeholder="Provide detailed description of the bug" rows={2} className="text-sm" value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(watchedBugType === 'DEFECT' || watchedBugType === 'PROD_INCIDENT') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-2 border-t border-blue-200">
                      <FormField
                        control={form.control}
                        name="currentBehavior"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Current Behavior <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Textarea {...field} placeholder="What is happening?" rows={2} className="text-sm" value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="expectedBehavior"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Expected Behavior <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Textarea {...field} placeholder="What should happen?" rows={2} className="text-sm" value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Screenshot upload for BUG */}
                  <div className="space-y-2 mt-4">
                    <FormLabel className="text-sm font-semibold">Screenshot / Attachment (Optional)</FormLabel>
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 bg-white hover:bg-neutral-50 transition-colors"
                      onClick={() => document.getElementById('screenshot-upload')?.click()}
                    >
                      <input id="screenshot-upload" type="file" accept="image/*, application/pdf" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setSelectedAttachmentFile(file); }
                      }} />
                      {selectedAttachmentFile ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-green-600 font-bold">✓ Selected:</span>
                          <span className="text-sm">{selectedAttachmentFile.name}</span>
                        </div>
                      ) : (
                        <p className="font-medium text-sm text-neutral-500">Click to upload screenshot</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STORY complexity */}
              {watchedType === 'STORY' && (
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Efforts</FormLabel>
                      <Select value={field.value ?? "MEDIUM"} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="LOW">Simple</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">Semi-complex</SelectItem>
                          <SelectItem value="CRITICAL">Complex</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}


              {/* Non-EPIC fields: Assignee, Parent, Status, Estimates, Dates */}
              {watchedType !== 'EPIC' && (
                <>
                  {watchedType !== 'FEATURE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignee</FormLabel>
                          <FormControl>
                            <Combobox
                              options={[{ value: "unassigned", label: "Unassigned" }, ...projectTeamMembers.map(u => ({ value: u.id.toString(), label: u.fullName || u.username }))]}
                              value={field.value?.toString() || "unassigned"}
                              onValueChange={v => field.onChange(v === "unassigned" ? null : parseInt(v))}
                              disabled={!isAdminOrScrum}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="TODO">To Do</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="ON_HOLD">On Hold</SelectItem>
                              <SelectItem value="DONE">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  )}


                  {/* For FEATURE: Dates first, then Estimate (auto-calculated) */}
                  {watchedType === 'FEATURE' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem><FormLabel>Scheduled Start Date</FormLabel><FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem><FormLabel>Scheduled End Date</FormLabel><FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="estimate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Hours <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input {...field} placeholder="Auto-calculated from dates" readOnly className="bg-muted" /></FormControl>
                            <p className="text-xs text-muted-foreground">Auto-calculated: Working days (Mon–Fri) × 9 hrs</p>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="actualHours" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Actual Hours</FormLabel>
                            <FormControl><Input {...field} placeholder="Hours" disabled={watchedStatus !== "DONE"} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </>
                  )}

                  {/* For non-FEATURE: Original order (Estimate first, then Dates) */}
                  {watchedType !== 'FEATURE' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="estimate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{watchedType === 'STORY' ? 'Story Points' : 'Estimated Hours'} <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input {...field} placeholder="Value" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="actualHours" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Actual Hours</FormLabel>
                            <FormControl><Input {...field} placeholder="Hours" disabled={watchedStatus !== "DONE"} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem><FormLabel>Scheduled Start Date</FormLabel><FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem><FormLabel>Scheduled End Date</FormLabel><FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl></FormItem>
                        )} />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0">
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button type="submit">Create Work Item</Button>
              </div>

            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

