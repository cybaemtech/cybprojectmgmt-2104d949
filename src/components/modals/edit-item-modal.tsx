import { useState, useEffect } from "react";
import { workItemStore } from "@/lib/local-store";
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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Project, User, WorkItem } from "@/types/schema";
import { apiRequest } from "@/lib/queryClient";
import { apiGet } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { TagsInput } from "@/components/ui/tags-input";
import { Trash2 } from "lucide-react";
import { getScreenshotUrl } from "@/lib/screenshot-utils";
import { queryClient } from "@/lib/queryClient";

// Create a schema specifically for the form - matching CreateItemModal
const workItemFormSchema = z.object({
  title: z.string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(200, { message: "Title cannot exceed 200 characters" }),
  description: z.string().optional(),
  tags: z.string().optional(),
  status: z.string(),
  priority: z.string().optional(),
  parentId: z.number().optional().nullable(),
  assigneeId: z.number().optional().nullable(),
  estimate: z.string().optional(),
  actualHours: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  projectId: z.number(),
  type: z.string(), // Added type to schema for validation logic
  bugType: z.string().optional(),
  severity: z.string().optional(),
  currentBehavior: z.string().optional(),
  expectedBehavior: z.string().optional(),
  referenceUrl: z.string().optional(),
  // New fields for EPIC and FEATURE
  githubUrl: z.string().optional(),
  prototypeLink: z.string().optional(),
  prototypeStatus: z.string().optional(),
  attachmentFile: z.instanceof(File).optional().nullable(),
  hasExistingPdf: z.boolean().optional(),
}).refine((data) => {
  // Description/Instruction is required for FEATURE, STORY and BUG types
  if (['STORY', 'BUG', 'FEATURE'].includes(data.type)) {
    return data.description && data.description.trim().length > 0;
  }
  return true;
}, {
  message: "Client Requirement Description is required",
  path: ["description"],
}).refine((data) => {
  // Bug-specific fields: Actual hours is required when status is DONE, but only for leaf items (TASK, BUG)
  if (data.status === 'DONE' && ['TASK', 'BUG'].includes(data.type)) {
    return data.actualHours !== undefined && data.actualHours !== null && data.actualHours.trim().length > 0;
  }
  return true;
}, {
  message: "Actual hours is required when status is DONE",
  path: ["actualHours"],
}).refine((data) => {
  // Estimate is required only for TASK and BUG types
  if (['TASK', 'BUG'].includes(data.type)) {
    return data.estimate && data.estimate.trim().length > 0;
  }
  return true;
}, {
  message: "Estimate is required",
  path: ["estimate"],
}).refine((data) => {
  // Current Behavior and Expected Behavior are required ONLY for DEFECT or PROD_INCIDENT bug types
  if (data.type === 'BUG' && (data.bugType === 'DEFECT' || data.bugType === 'PROD_INCIDENT')) {
    return data.currentBehavior && data.currentBehavior.trim().length > 0 &&
      data.expectedBehavior && data.expectedBehavior.trim().length > 0;
  }
  return true;
}, {
  message: "Current Behavior and Expected Behavior are required for Defects and Prod Incidents",
  path: ["currentBehavior"],
}).refine((data) => {
  // PDF is mandatory for Client Requirement (FEATURE) in Edit mode too
  if (data.type === 'FEATURE') {
    // Must have either an existing PDF on the server OR a new file selected for upload
    return (data.hasExistingPdf === true) || (data.attachmentFile !== null && data.attachmentFile !== undefined);
  }
  return true;
}, {
  message: "PDF upload is mandatory for Client Requirement",
  path: ["attachmentFile"],
});

type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workItem?: WorkItem;
  projects?: Project[];
  workItems?: WorkItem[];
}

export function EditItemModal({
  isOpen,
  onClose,
  onSuccess,
  workItem,
  projects = [],
  workItems = []
}: EditItemModalProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null);

  // Function to calculate total estimated hours for an item based on its children
  const calculateTotalEstimatedHours = (itemId: number, itemType: string): number => {
    if (!Array.isArray(workItems)) return 0;

    let totalHours = 0;

    if (itemType === 'EPIC') {
      const childFeatures = workItems.filter(item => item.type === 'FEATURE' && item.parentId === itemId);
      for (const feature of childFeatures) {
        totalHours += calculateTotalEstimatedHours(feature.id, 'FEATURE');
      }
    } else if (itemType === 'FEATURE') {
      const childStories = workItems.filter(item => item.type === 'STORY' && item.parentId === itemId);
      for (const story of childStories) {
        totalHours += calculateTotalEstimatedHours(story.id, 'STORY');
      }
    } else if (itemType === 'STORY') {
      const childItems = workItems.filter(item =>
        (item.type === 'TASK' || item.type === 'BUG') && item.parentId === itemId
      );
      for (const child of childItems) {
        totalHours += Number(child.estimate) || 0;
      }
    } else if (itemType === 'TASK' || itemType === 'BUG') {
      return Number(workItems.find(item => item.id === itemId)?.estimate) || 0;
    }

    return totalHours;
  };

  const calculateTotalActualHours = (itemId: number, itemType: string): number => {
    if (!Array.isArray(workItems)) return 0;

    let totalHours = 0;

    if (itemType === 'EPIC') {
      const childFeatures = workItems.filter(item => item.type === 'FEATURE' && item.parentId === itemId);
      for (const feature of childFeatures) {
        totalHours += calculateTotalActualHours(feature.id, 'FEATURE');
      }
    } else if (itemType === 'FEATURE') {
      const childStories = workItems.filter(item => item.type === 'STORY' && item.parentId === itemId);
      for (const story of childStories) {
        totalHours += calculateTotalActualHours(story.id, 'STORY');
      }
    } else if (itemType === 'STORY') {
      const childItems = workItems.filter(item =>
        (item.type === 'TASK' || item.type === 'BUG') && item.parentId === itemId
      );
      for (const child of childItems) {
        if (child.actualHours != null && child.actualHours !== '' && Number(child.actualHours) !== 0) {
          const childHours = parseFloat(String(child.actualHours));
          if (!isNaN(childHours) && childHours > 0) {
            totalHours += childHours;
          }
        }
      }
    } else if (itemType === 'TASK' || itemType === 'BUG') {
      const item = workItems.find(item => item.id === itemId);
      if (item?.actualHours != null && item.actualHours !== '' && Number(item.actualHours) !== 0) {
        const hours = parseFloat(String(item.actualHours));
        return (!isNaN(hours) && hours > 0) ? hours : 0;
      }
      return 0;
    }

    return totalHours;
  };

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      tags: "",
      status: "TODO",
      priority: "MEDIUM",
      parentId: null,
      assigneeId: null,
      estimate: "",
      startDate: null,
      endDate: null,
      projectId: 0,
      type: "STORY",
      bugType: "BUG",
      severity: "LOW",
      currentBehavior: "",
      expectedBehavior: "",
      referenceUrl: "",
      githubUrl: "",
      prototypeLink: "",
      prototypeStatus: "",
    },
  });

  const selectedProjectId = form.watch("projectId");
  const watchedBugType = form.watch("bugType");
  const watchedStatus = form.watch("status");

  const { data: freshWorkItem } = useQuery<WorkItem>({
    queryKey: [`/work-items/${workItem?.id}`],
    queryFn: async () => {
      if (!workItem?.id) return workItem;
      const item = await apiGet(`/work-items/${workItem.id}`);
      return item;
    },
    enabled: !!workItem?.id && isOpen,
    staleTime: 0,
  });

  const displayWorkItem = freshWorkItem || workItem;

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
  });

  const isAdminOrScrum = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER');

  const { data: projectTeamMembers = [] } = useQuery<User[]>({
    queryKey: [`/projects/${selectedProjectId}/team-members`],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const members = await apiGet(`/projects/${selectedProjectId}/team-members`);
      return members;
    },
    enabled: !!selectedProjectId && isOpen
  });

  const { data: allWorkItems = [] } = useQuery<WorkItem[]>({
    queryKey: [`/projects/${selectedProjectId}/work-items`],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const items = await apiGet(`/projects/${selectedProjectId}/work-items`);
      return items;
    },
    enabled: !!selectedProjectId && isOpen
  });

  const getValidParents = () => {
    if (!workItem || !allWorkItems.length) return [];
    const projectWorkItems = allWorkItems.filter(item =>
      item.projectId === selectedProjectId && item.id !== workItem.id
    );
    switch (workItem.type) {
      case "FEATURE": return projectWorkItems.filter(item => item.type === "EPIC");
      case "STORY": return projectWorkItems.filter(item => item.type === "FEATURE");
      case "TASK":
      case "BUG": return projectWorkItems.filter(item => item.type === "STORY");
      default: return [];
    }
  };

  const getParentLabel = () => {
    if (!workItem) return "Parent";
    switch (workItem.type) {
      case "FEATURE": return "Client Details";
      case "STORY": return "Client Requirement";
      case "TASK":
      case "BUG": return "Change Request";
      default: return "Parent";
    }
  };

  useEffect(() => {
    if (displayWorkItem && isOpen) {
      const formatLocalDateForInput = (dateValue: string | Date | null): string | null => {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateFormatted = formatLocalDateForInput(displayWorkItem.startDate);
      const endDateFormatted = formatLocalDateForInput(displayWorkItem.endDate);

      const formData: WorkItemFormValues = {
        title: displayWorkItem.title,
        description: displayWorkItem.description ?? "",
        tags: displayWorkItem.tags ?? "",
        status: displayWorkItem.status,
        priority: displayWorkItem.priority ?? "MEDIUM",
        parentId: displayWorkItem.parentId ?? null,
        assigneeId: displayWorkItem.assigneeId ?? null,
        estimate: displayWorkItem.estimate !== undefined && displayWorkItem.estimate !== null ? displayWorkItem.estimate.toString() : "",
        actualHours: displayWorkItem.actualHours !== undefined && displayWorkItem.actualHours !== null ? displayWorkItem.actualHours.toString() : "",
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        projectId: displayWorkItem.projectId,
        type: displayWorkItem.type,
        bugType: displayWorkItem.bugType ?? "BUG",
        severity: displayWorkItem.severity ?? "LOW",
        currentBehavior: displayWorkItem.currentBehavior ?? "",
        expectedBehavior: displayWorkItem.expectedBehavior ?? "",
        referenceUrl: displayWorkItem.referenceUrl ?? "",
        githubUrl: displayWorkItem.githubUrl ?? "",
        prototypeLink: displayWorkItem.prototypeLink ?? "",
        prototypeStatus: displayWorkItem.prototypeStatus ?? "",
        hasExistingPdf: !!(displayWorkItem as any).pdfUploadBlob || !!(displayWorkItem as any).pdfUploadPath,
      };
      form.reset(formData);
    }
  }, [displayWorkItem, isOpen, form]);

  const onSubmit = async (data: WorkItemFormValues) => {
    if (!workItem) return;
    try {
      const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
      const actualHoursNum = data.actualHours !== undefined && data.actualHours !== null && data.actualHours !== '' ? Number(data.actualHours) : null;
      // For TASK/BUG: hidden dates. Auto-stamp endDate to today when status flips to DONE with actual hours filled.
      let finalStart = data.startDate || null;
      let finalEnd = data.endDate || null;
      if (['TASK', 'BUG'].includes(workItem.type)) {
        finalStart = (workItem.startDate as any) || todayStr;
        if (data.status === 'DONE' && actualHoursNum && actualHoursNum > 0) {
          finalEnd = (workItem.status !== 'DONE' || !workItem.endDate) ? todayStr : (workItem.endDate as any);
        } else {
          finalEnd = null;
        }
      }
      const submitData: any = {
        ...data,
        tags: data.tags?.trim() || null,
        parentId: data.parentId || null,
        assigneeId: data.assigneeId || null,
        estimate: data.estimate || null,
        actualHours: actualHoursNum,
        startDate: finalStart,
        endDate: finalEnd,
        githubUrl: data.githubUrl || null,
        prototypeLink: data.prototypeLink || null,
        prototypeStatus: data.prototypeStatus || null,
      };

      if (selectedFile) {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
        submitData.screenshot_blob = base64String;
        submitData.screenshot_path = `screenshot_${new Date().getTime()}_${selectedFile.name}`;
      }

      if (selectedAttachmentFile && ['FEATURE', 'STORY'].includes(data.type)) {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedAttachmentFile);
        });
        const timestamp = new Date().getTime();
        if (data.type === 'FEATURE') {
          submitData.pdfUploadBlob = base64String;
          submitData.pdfUploadPath = `pdf_${timestamp}_${selectedAttachmentFile.name}`;
        } else {
          submitData.screenshot_blob = base64String;
          submitData.attachment_path = `attachment_${timestamp}_${selectedAttachmentFile.name}`;
        }
      }

      // Use workItemStore to update via Supabase directly
      submitData.id = workItem.id;
      workItemStore.save(submitData);
      toast({ title: "Item updated", description: "The item has been updated successfully." });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating work item", error);
      toast({ title: "Error", description: "Could not update the item.", variant: "destructive" });
    }
  };

  const handleDeleteWorkItem = () => {
    if (!workItem) return;
    try {
      workItemStore.delete(workItem.id);
      toast({ title: "Item deleted", description: "The work item has been deleted successfully." });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: "Could not delete the item.", variant: "destructive" });
    }
  };

  const getEstimateLabel = () => {
    return "Estimated Hours";
  };

  if (!workItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden text-neutral-900 bg-white">
        <DialogHeader className="p-6 pb-0 bg-white">
          <DialogTitle className="text-lg font-semibold">Edit {workItem.externalId}: {workItem.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] px-6 py-4 bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter title" maxLength={200} className="py-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Instruction/Requirement Point field */}
              {workItem?.type !== 'TASK' && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {workItem?.type === 'FEATURE' ? 'Client Requirement Description' :
                          workItem?.type === 'STORY' ? 'Requirement Point' :
                            'Description'}
                        {['STORY', 'BUG', 'FEATURE'].includes(workItem?.type || '') && <span className="text-red-500"> *</span>}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={
                            workItem?.type === 'FEATURE' ? "Enter requirement details" :
                              workItem?.type === 'STORY' ? "Enter requirement points" :
                                "Enter description"
                          }
                          value={field.value || ""}
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* FEATURE specific: Prototype and PDF - MOVED UP */}
              {workItem?.type === "FEATURE" && (
                <div className="space-y-4 p-4 bg-orange-50/30 rounded-lg border border-orange-100">
                  <div className="space-y-2">
                    <FormLabel className="font-semibold text-orange-900">Requirement Document (PDF)</FormLabel>
                    {(displayWorkItem as any)?.pdfUploadBlob && (
                      <div className="flex items-center gap-3 p-3 border rounded-md bg-white">
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-medium truncate">{(displayWorkItem as any).pdfUploadPath || 'Requirement Document.pdf'}</p>
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-xs text-primary"
                            onClick={() => {
                              const pdfData = (displayWorkItem as any).pdfUploadBlob;
                              if (!pdfData) return;
                              try {
                                const base64Content = pdfData.split(',')[1];
                                const binaryString = window.atob(base64Content);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                const blob = new Blob([bytes], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              } catch (e) { window.open(pdfData, '_blank'); }
                            }}
                          >
                            View current document
                          </Button>
                        </div>
                      </div>
                    )}
                    <div
                      className="border-2 border-dashed border-orange-200 rounded-lg p-4 text-center hover:border-orange-400 cursor-pointer bg-white transition-colors"
                      onClick={() => document.getElementById('edit-pdf-input')?.click()}
                    >
                      <input
                        id="edit-pdf-input"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) { 
                            setSelectedAttachmentFile(file); 
                            form.setValue('attachmentFile', file); 
                          }
                        }}
                      />
                      <div className="text-neutral-600">
                        {selectedAttachmentFile ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-green-600 font-bold">✓ Selected:</span>
                            <span className="text-sm">{selectedAttachmentFile.name}</span>
                          </div>
                        ) : (
                          <p className="text-sm">Upload new requirement document (PDF)</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="prototypeLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-orange-900">GitHub / Prototype Link (Optional)</FormLabel>
                        <FormControl><Input {...field} placeholder="https://..." value={field.value || ""} className="bg-white" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Bug-specific fields */}
              {workItem?.type === "BUG" && (
                <div className="space-y-4 bg-blue-50 p-4 rounded border border-blue-200">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bugType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Bug Type <span className="text-red-500">*</span></FormLabel>
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
                    <FormLabel className="font-semibold">Screenshot / Attachment (Optional)</FormLabel>
                    
                    {/* Show existing screenshot if available */}
                    {(displayWorkItem as any)?.screenshot_path && (
                      <div className="mb-2 p-2 border rounded-md bg-white">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">{(displayWorkItem as any).screenshot_path}</span>
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-xs ml-auto"
                            onClick={() => {
                              const b64 = (displayWorkItem as any).screenshot_blob;
                              if (b64) {
                                try {
                                  let base64Content = b64.includes(',') ? b64.split(',')[1] : b64;
                                  const binaryString = window.atob(base64Content);
                                  const bytes = new Uint8Array(binaryString.length);
                                  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                  const fileType = (displayWorkItem as any).screenshot_path?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
                                  const blob = new Blob([bytes], { type: fileType });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                } catch (e) { console.error("Could not view screenshot", e); }
                              }
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    )}

                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 bg-white hover:bg-neutral-50 transition-colors"
                      onClick={() => document.getElementById('edit-screenshot-input')?.click()}
                    >
                      <input id="edit-screenshot-input" type="file" accept="image/*, application/pdf" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setSelectedFile(file); }
                      }} />
                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-green-600 font-bold">✓ Selected:</span>
                          <span className="text-sm">{selectedFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-neutral-500">
                          <p className="font-medium text-sm">Click to upload new screenshot</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* STORY Complexity (Efforts) */}
              {workItem?.type === "STORY" && (
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

              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <FormControl>
                        <Combobox options={projects.map(p => ({ value: p.id.toString(), label: p.name }))} value={field.value?.toString()} onValueChange={() => { }} disabled={true} />
                      </FormControl>
                    </FormItem>
                  )}
                />
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
                          onValueChange={(v) => field.onChange(v && v !== "unassigned" ? parseInt(v) : null)}
                          disabled={!isAdminOrScrum}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getParentLabel()}</FormLabel>
                      <FormControl>
                        <Combobox
                          options={[{ value: "none", label: "None" }, ...getValidParents().map(item => ({ value: item.id.toString(), label: `${item.externalId}: ${item.title}` }))]}
                          value={field.value?.toString() || "none"}
                          onValueChange={(v) => field.onChange(v && v !== "none" ? parseInt(v) : null)}
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
                      <FormLabel>Status <span className="text-red-500">*</span></FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getEstimateLabel()}</FormLabel>
                      <FormControl><Input {...field} placeholder="Value" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actualHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Hours</FormLabel>
                      <FormControl><Input {...field} placeholder="Hours" disabled={watchedStatus !== "DONE"} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Dates - hidden for TASK/BUG (auto-stamped on create/complete) */}
              {!['TASK', 'BUG'].includes(workItem?.type || '') && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel>Scheduled Start Date</FormLabel><FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel>Scheduled End Date</FormLabel><FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl></FormItem>
                  )} />
                </div>
              )}

              <div className="flex justify-between pt-4 border-t bg-white sticky bottom-0">
                {(isAdminOrScrum || (workItem && ['TASK', 'BUG'].includes(workItem.type))) && (
                  <Button variant="destructive" type="button" onClick={() => setShowDeleteDialog(true)} className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Delete Item
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                  <Button type="submit">Update Item</Button>
                </div>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Work Item</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete "{workItem?.title}"?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteWorkItem} className="bg-red-600">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}