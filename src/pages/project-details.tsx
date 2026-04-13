import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Project, User, Team, WorkItem } from "@/types/schema";

import { Button } from "@/components/ui/button";
import { CreateItemModal } from "@/components/modals/create-item-modal";
import { EditItemModal } from "@/components/modals/edit-item-modal";
import { ViewItemModal } from "@/components/modals/view-item-modal";
import { DeleteItemModal } from "@/components/modals/delete-item-modal";
import { ArchiveProjectModal } from "@/components/modals/archive-project-modal";
import { ProjectMembersModal } from "@/components/modals/project-members-modal";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { TimelineView } from "@/components/ui/timeline-view";
import { DeadlinesView } from "@/components/ui/deadlines-view";
import { ProjectCalendar } from "@/components/ui/project-calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { projectStore, teamStore, workItemStore, getLocalUser } from "@/lib/local-store";

// Local shims that replace API calls with localStorage operations
const apiRequest = async (method: string, endpoint: string, data?: any): Promise<{ ok: boolean; json: () => Promise<any>; status: number }> => {
  const workItemMatch = endpoint.match(/\/work-items\/(\d+)/);
  const projectMatch = endpoint.match(/\/projects\/(\d+)/);
  
  if (method === 'PATCH' && workItemMatch) {
    const id = parseInt(workItemMatch[1]);
    const result = workItemStore.update(id, data);
    return { ok: !!result, json: async () => result || {}, status: result ? 200 : 404 };
  }
  if (method === 'PATCH' && projectMatch) {
    const id = parseInt(projectMatch[1]);
    const existing = projectStore.get(id);
    if (existing) {
      const updated = projectStore.save({ ...existing, ...data });
      return { ok: true, json: async () => updated, status: 200 };
    }
    return { ok: false, json: async () => ({ message: 'Not found' }), status: 404 };
  }
  if (method === 'DELETE' && projectMatch) {
    projectStore.delete(parseInt(projectMatch[1]));
    return { ok: true, json: async () => ({}), status: 200 };
  }
  if (method === 'DELETE' && endpoint.match(/\/teams\/\d+\/members\/\d+/)) {
    return { ok: true, json: async () => ({ user_removed_from_system: false }), status: 200 };
  }
  if (method === 'POST' && endpoint.match(/\/teams\/\d+\/members/)) {
    return { ok: true, json: async () => ({}), status: 200 };
  }
  // Default fallback
  return { ok: true, json: async () => ({}), status: 200 };
};

const apiGet = async (endpoint: string): Promise<any> => {
  const workItemMatch = endpoint.match(/\/work-items\/(\d+)/);
  if (workItemMatch) {
    return workItemStore.get(parseInt(workItemMatch[1])) || {};
  }
  return {};
};
import { useModal } from "@/hooks/use-modal";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Filter,
  Plus,
  Layers,
  ListFilter,
  ArrowDownUp,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  X,
  UserPlus,
  UserMinus,
  ShieldAlert,
  RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

// Helper function to check if a user can edit a work item - only assignees can edit
function canUserEditWorkItem(
  item: any,
  currentUser: any,
  allWorkItems: any[]
): boolean {
  // Admin and Scrum Master can always edit
  if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER') {
    return true;
  }

  // Regular users cannot edit EPIC or FEATURE items
  if (item.type === 'EPIC' || item.type === 'FEATURE') {
    return false;
  }

  // Only the assigned user can edit STORY, TASK, and BUG work items
  return (item.assigneeId === currentUser?.id);
}

// Helper function to check if user can create a specific work item type
function canUserCreateType(type: string, currentUser: any): boolean {
  if (!currentUser) return false;
  
  // Admin, Scrum Master, and Project Manager can create everything
  if (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER' || (currentUser.role as string) === 'PROJECT_MANAGER') {
    return true;
  }
  
  // Regular members can only create TASK and BUG
  if (currentUser.role === 'USER') {
    return type === 'TASK' || type === 'BUG';
  }
  
  return false;
}

// Helper function to get user role display name for UI messages
function getUserRoleMessage(currentUser: any): string {
  if (!currentUser) return 'Guest';
  
  switch (currentUser.role) {
    case 'ADMIN': return 'Admin';
    case 'SCRUM_MASTER': return 'Scrum Master';
    case 'PROJECT_MANAGER': return 'Project Manager';
    case 'USER': return 'Member (Developer/Tester)';
    default: return 'User';
  }
}

export default function ProjectDetails() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = params?.id ? parseInt(params.id) : 0;

  // Debug logging for production
  console.log('[ProjectDetails] Component loaded, projectId:', projectId);
  console.log('[ProjectDetails] URL params:', params);
  console.log('[ProjectDetails] Current location:', window?.location?.href);
  console.log('[ProjectDetails] API Base URL check:', {
    hostname: window?.location?.hostname,
    pathname: window?.location?.pathname,
    envVar: import.meta.env.VITE_API_BASE_URL
  });


  // Resizable column widths for backlog table
  const [columnWidths, setColumnWidths] = useState({
    title: 320,
    status: 80,
    priority: 80,
    severity: 80,
    estHr: 80,
    actualHrs: 96,
    assignee: 96,
  });
  const resizingCol = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[col as keyof typeof columnWidths];
    resizingCol.current = { col, startX, startWidth };

    const onMouseMove = (ev: MouseEvent) => {
      const current = resizingCol.current;
      if (!current) return;
      const diff = ev.clientX - current.startX;
      const newWidth = Math.max(50, current.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [current.col]: newWidth }));
    };
    const onMouseUp = () => {
      resizingCol.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);


  // New project view tab state
  const [projectView, setProjectView] = useState<'overview' | 'board' | 'backlog' | 'documentation' | 'settings'>('overview');
  const [docSearchTerm, setDocSearchTerm] = useState('');

  // Client info visibility toggle (persisted per project in localStorage)
  const [clientInfoVisible, setClientInfoVisible] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`project-${projectId}-client-info-visible`);
      return stored === 'true';
    } catch { return false; }
  });
  const toggleClientInfoVisibility = (checked: boolean) => {
    setClientInfoVisible(checked);
    localStorage.setItem(`project-${projectId}-client-info-visible`, String(checked));
  };

  // Timeline view settings
  const [timeUnit, setTimeUnit] = useState<'Quarter' | 'Month' | 'Week'>('Quarter');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterFeature, setFilterFeature] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for expanded items in the hierarchical view
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // State for project settings form
  const [editedProject, setEditedProject] = useState<{
    name: string;
    description: string;
  }>({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [showKeyResetDialog, setShowKeyResetDialog] = useState(false);
  const [newProjectKey, setNewProjectKey] = useState("");
  const [isResettingKey, setIsResettingKey] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState<string>("");
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false);
  const [showProjectMembersModal, setShowProjectMembersModal] = useState(false);

  // State for inline editing in backlog view
  type EditableField = 'title' | 'status' | 'priority' | 'assignee' | 'severity' | 'actualHours';
  const [editingCell, setEditingCell] = useState<{ itemId: number; field: EditableField } | null>(null);
  const [editValues, setEditValues] = useState<{ title?: string; status?: string; priority?: string; assignee?: string; severity?: string; actualHours?: string }>({});

  // State for tracking which item's actual hours is blinking
  const [blinkingItemId, setBlinkingItemId] = useState<number | null>(null);

  // State for actual hours popup dialog
  const [showActualHoursDialog, setShowActualHoursDialog] = useState(false);
  const [actualHoursInputValue, setActualHoursInputValue] = useState<string>("");
  const [pendingItemForHours, setPendingItemForHours] = useState<WorkItem | null>(null);

  // Quick action modal state for creating items under parent work items
  const [quickActionModal, setQuickActionModal] = useState<{
    isOpen: boolean;
    parentStory: WorkItem | null;
    type: 'FEATURE' | 'STORY' | 'TASK' | 'BUG' | null;
  }>({
    isOpen: false,
    parentStory: null,
    type: null,
  });

  const {
    modalType,
    isOpen,
    openModal,
    closeModal,
    modalProps
  } = useModal();

  const { toast } = useToast();

  // Local data - no API calls
  const currentUser = getLocalUser();
  const project = projectStore.get(projectId);
  const isProjectLoading = false;
  const projectError = project ? null : new Error("Project not found");
  const isError = !project;

  // Sync form state when project data loads
  useEffect(() => {
    if (project) {
      setEditedProject({
        name: project.name || '',
        description: project.description || ''
      });
    }
  }, [project?.id]);

  // Auto-filter all views to show only current user's assigned items
  useEffect(() => {
    if (projectView !== 'board' && projectView !== 'backlog' && projectView !== 'documentation') {
      setFilterType([]);
      setFilterStatus([]);
      setFilterPriority([]);
      setFilterFeature(undefined);
      setSearchTerm('');
    }
  }, [projectView]);

  const teams = teamStore.all();
  const projects = projectStore.all();

  const [workItems, setWorkItems] = useState<WorkItem[]>(() => workItemStore.byProject(projectId));
  const refetchWorkItems = () => setWorkItems(workItemStore.byProject(projectId));

  const projectTeamMembers: User[] = [currentUser];
  const refetchTeamMembers = () => {};

  const allUsers: User[] = [currentUser];

  // Mutation for inline editing work items
  const updateWorkItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: Partial<WorkItem> }) => {
      const result = workItemStore.update(itemId, updates);
      if (!result) throw new Error('Work item not found');
      return result;
    },
    onSuccess: async (data, { itemId, updates }) => {
      console.log('=== UPDATE SUCCESS ===');
      console.log('Updated item ID:', itemId);
      console.log('Updates applied:', updates);
      console.log('API response data:', data);

      // Invalidate and refetch the work items to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}/work-items`] });

      // For actualHours updates, force an immediate refetch 
      if ('actualHours' in updates) {
        console.log('Forcing immediate refetch for actualHours update...');
        await refetchWorkItems();
        console.log('Refetch complete');
      }

      // Only show toast if status is NOT changing to DONE, or if it's a parent item
      if (updates.status !== 'DONE') {
        toast({
          title: "Updated successfully",
          description: "Work item has been updated",
        });
      } else {
        // For DONE status, trigger blink animation on actual hours column
        setBlinkingItemId(itemId);
        setTimeout(() => setBlinkingItemId(null), 1500); // Remove blink after animation completes
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to start inline editing
  const startInlineEdit = (itemId: number, field: EditableField, currentValue: string) => {
    if (!canUserEditWorkItem(workItems?.find(i => i.id === itemId), currentUser, workItems || [])) {
      return;
    }
    setEditingCell({ itemId, field });
    setEditValues({ [field]: currentValue });
  };

  // Helper function to save inline edit
  const saveInlineEdit = async (itemId: number, field: EditableField) => {
    const value = editValues[field];

    // Special validation for title - check length limit
    if (field === 'title') {
      if (value === undefined || value.trim() === '') {
        toast({
          title: "Error",
          description: "Title cannot be empty",
          variant: "destructive",
        });
        cancelInlineEdit();
        return;
      }
      if (value.length > 200) {
        toast({
          title: "Title Too Long",
          description: "Title cannot exceed 200 characters. Please shorten your title.",
          variant: "destructive",
        });
        cancelInlineEdit();
        return;
      }
    }
    // Special validation for actualHours - allow 0 and empty (null) values
    else if (field === 'actualHours') {
      if (value !== undefined && value.trim() !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        toast({
          title: "Error",
          description: "Actual hours must be a valid non-negative number",
          variant: "destructive",
        });
        cancelInlineEdit();
        return;
      }
    } else if (field !== 'assignee' && (value === undefined || value.trim() === '')) {
      toast({
        title: "Error",
        description: "Value cannot be empty",
        variant: "destructive",
      });
      cancelInlineEdit();
      return;
    }

    const updateData: any = {};
    if (field === 'assignee') {
      // Handle assignee field specially - convert to number or null
      updateData.assigneeId = value && value !== 'unassigned' ? parseInt(value) : null;
    } else if (field === 'actualHours') {
      // Convert to float for actualHours - handle empty string as null
      updateData.actualHours = (value && value.trim() !== '') ? parseFloat(value) : null;
    } else {
      updateData[field] = value;
    }

    try {
      console.log(`=== SAVING INLINE EDIT ===`);
      console.log(`Field: ${field}, Value: ${value}, ItemId: ${itemId}`);
      console.log(`Update data:`, updateData);

      const result = await updateWorkItemMutation.mutateAsync({
        itemId,
        updates: updateData
      });

      // For actualHours updates, force aggressive cache invalidation and refetch
      if (field === 'actualHours') {
        console.log('Refreshing data after actualHours update...');
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}/work-items`] });
        await refetchWorkItems();
        console.log('Data refresh complete');
      }

      cancelInlineEdit();
    } catch (error) {
      console.error("Error updating work item:", error);
      let message = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      }
      toast({
        title: "Error",
        description: `Failed to update work item: ${message}`,
        variant: "destructive",
      });
      cancelInlineEdit();
    }
  };

  // Helper function to cancel inline edit
  const cancelInlineEdit = () => {
    setEditingCell(null);
    setEditValues({});
  };

  // Helper function to check if all child items are completed
  const canMarkParentAsDone = (parentItem: WorkItem, allItems: WorkItem[]): { canMark: boolean; incompleteChildren: WorkItem[] } => {
    // Only validate parent items (EPIC, FEATURE, STORY)
    if (!['EPIC', 'FEATURE', 'STORY'].includes(parentItem.type)) {
      return { canMark: true, incompleteChildren: [] };
    }

    // Find all direct child items
    const childItems = allItems.filter(item => item.parentId === parentItem.id);

    // Find incomplete children (any child that is not DONE, regardless of type)
    const incompleteChildren = childItems.filter(child => child.status !== 'DONE');

    // For hierarchical validation:
    // EPIC can only be DONE if all FEATURE children are DONE
    // FEATURE can only be DONE if all STORY children are DONE  
    // STORY can only be DONE if all TASK/BUG children are DONE

    return {
      canMark: incompleteChildren.length === 0,
      incompleteChildren
    };
  };

  // Helper function to handle status change with validation
  const handleStatusChange = (itemId: number, newStatus: string, item: WorkItem) => {
    // FIRST CHECK: Actual Hours required when status is DONE for non-parent items
    if (newStatus === 'DONE' && !item.actualHours && !['EPIC', 'FEATURE', 'STORY'].includes(item.type)) {
      // Do NOT update status - open popup dialog to enter actual hours first
      setBlinkingItemId(itemId); // Show blink on actual hours column to draw attention
      setTimeout(() => setBlinkingItemId(null), 2000);
      setPendingItemForHours(item);
      setActualHoursInputValue("");
      setShowActualHoursDialog(true);
      cancelInlineEdit();
      return; // STOP - don't update status yet
    }

    // SECOND CHECK: Validation for parent items with incomplete children
    if (newStatus === 'DONE' && ['EPIC', 'FEATURE', 'STORY'].includes(item.type)) {
      const validation = canMarkParentAsDone(item, workItems || []);

      if (!validation.canMark) {
        const childTypesText = validation.incompleteChildren.map(child => child.type.toLowerCase()).join(', ');
        toast({
          title: "Cannot mark as Done",
          description: `This ${item.type.toLowerCase()} has ${validation.incompleteChildren.length} incomplete child item(s): ${childTypesText}. Complete all child items first.`,
          variant: "destructive",
        });
        cancelInlineEdit();
        return;
      }
    }

    // If all validations pass, proceed with status update
    updateWorkItemMutation.mutate({
      itemId: itemId,
      updates: { status: newStatus as 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE' }
    });
    cancelInlineEdit();
  };

  // Helper function to save actual hours and mark as done
  const handleSaveActualHours = async () => {
    if (!pendingItemForHours || !actualHoursInputValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter actual hours",
        variant: "destructive",
      });
      return;
    }

    // Always send a float or null, never a string
    let hours = parseFloat(actualHoursInputValue);
    if (isNaN(hours) || hours < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    // Patch: always send actualHours as a float, never as a string or empty
    try {
      console.log('=== SAVING ACTUAL HOURS ===');
      console.log('Raw input value:', actualHoursInputValue);
      console.log('Parsed hours:', hours);
      console.log('Item ID:', pendingItemForHours.id);
      console.log('Updates payload:', { actualHours: hours, status: 'DONE' });

      await updateWorkItemMutation.mutateAsync({
        itemId: pendingItemForHours.id,
        updates: { actualHours: String(hours), status: 'DONE' }
      });

      console.log('Update successful, refetching work items...');
      // Force cache invalidation and refetch
      await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}/work-items`] });
      await refetchWorkItems();

      console.log('Refetch complete');
      // Close dialog
      setShowActualHoursDialog(false);
      setActualHoursInputValue("");
      setPendingItemForHours(null);

      toast({
        title: "Success",
        description: `Actual hours (${hours}h) saved and status updated to Done`,
      });
    } catch (error) {
      console.error("Error saving actual hours:", error);
      toast({
        title: "Error",
        description: "Failed to save actual hours",
        variant: "destructive",
      });
    }
  };

  // Function to handle navigation with null check
  const goToProjects = () => {
    if (navigate) navigate('/projects');
  };

  // Early return if no valid project ID
  if (!projectId || projectId <= 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Invalid Project</h2>
          <p className="text-gray-600 mb-4">The project ID is invalid or missing.</p>
          <Button onClick={goToProjects}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is authenticated first
  if (currentUser === null) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // Restore project handler
  const handleRestoreProject = async () => {
    // Don't proceed if project ID is invalid
    if (!projectId) return;

    try {
      // Call API to restore project (set status to ACTIVE)
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}`,
        { status: "ACTIVE" }
      );

      if (response.ok) {
        // Show success message
        toast({
          title: "Project restored",
          description: "The project has been restored successfully",
        });

        // Refresh the project data
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to restore project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error restoring project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while restoring the project",
        variant: "destructive",
      });
    }
  };

  // Delete project handler
  const handleDeleteProject = async () => {
    // Don't proceed if project ID is invalid
    if (!projectId) return;

    // Confirm with user before deleting - warn about all inner elements
    const workItems = workItemStore.byProject(projectId);
    const epics = workItems.filter(w => w.type === 'EPIC').length;
    const features = workItems.filter(w => w.type === 'FEATURE').length;
    const stories = workItems.filter(w => w.type === 'STORY').length;
    const tasks = workItems.filter(w => w.type === 'TASK').length;
    const bugs = workItems.filter(w => w.type === 'BUG').length;
    
    const itemSummary = [
      epics > 0 ? `${epics} Epic(s)` : '',
      features > 0 ? `${features} Feature(s)` : '',
      stories > 0 ? `${stories} Story/Stories` : '',
      tasks > 0 ? `${tasks} Task(s)` : '',
      bugs > 0 ? `${bugs} Bug(s)` : '',
    ].filter(Boolean).join(', ');

    const confirmMsg = `⚠️ Are you sure you want to delete "${project?.name}"?\n\nThis will permanently delete ALL inner elements:\n${itemSummary || 'No work items found.'}\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      projectStore.delete(projectId);
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully",
      });
      goToProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the project",
        variant: "destructive",
      });
    }
  };

  // Save project details handler
  const handleSaveProject = async () => {
    if (!projectId || !editedProject.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Call API to update project
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}`,
        {
          name: editedProject.name.trim(),
          description: editedProject.description.trim()
        }
      );

      if (response.ok) {
        // Show success message
        toast({
          title: "Project updated",
          description: "Project details have been saved successfully",
        });

        // Invalidate cache to refresh project data
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the project",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add team member handler - Enhanced to sync with project team
  const handleAddTeamMember = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to add",
        variant: "destructive",
      });
      return;
    }

    try {
      // If project has a team, add to that team
      if (project?.teamId) {
        const response = await apiRequest(
          'POST',
          `/teams/${project.teamId}/members`,
          {
            userId: parseInt(selectedUserId),
            role: 'MEMBER'
          }
        );

        if (response.ok) {
          toast({
            title: "Success",
            description: "Team member added successfully to both project and team",
          });
          setSelectedUserId("");
          refetchTeamMembers();
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.message || "Failed to add team member",
            variant: "destructive",
          });
        }
      } else {
        // Project has no team assigned, just add as project member
        toast({
          title: "Info",
          description: "This project has no team assigned. Please assign a team first or the member will only be added as a project collaborator.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding team member:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Assign team to project handler
  const handleAssignTeam = async () => {
    if (!assignTeamId) {
      toast({
        title: "Error",
        description: "Please select a team to assign",
        variant: "destructive",
      });
      return;
    }

    setIsAssigningTeam(true);

    try {
      const response = await apiRequest(
        'PATCH',
        `/projects/${projectId}`,
        {
          teamId: parseInt(assignTeamId)
        }
      );

      if (response.ok) {
        toast({
          title: "Team Assigned",
          description: "Team has been successfully assigned to this project",
        });
        setShowAssignTeamDialog(false);
        setAssignTeamId("");

        // Invalidate cache to refresh project data
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
        refetchTeamMembers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to assign team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error assigning team:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while assigning team",
        variant: "destructive",
      });
    } finally {
      setIsAssigningTeam(false);
    }
  };

  // Remove team member handler
  const handleRemoveTeamMember = async (userId: number) => {
    if (!project?.teamId) return;

    setRemovingMemberId(userId);

    try {
      const response = await apiRequest(
        'DELETE',
        `/teams/${project.teamId}/members/${userId}`
      );

      if (response.ok) {
        const result = await response.json();

        if (result.user_removed_from_system) {
          toast({
            title: "Success",
            description: `Team member removed successfully. ${result.removed_member} has been removed from the system as they were not part of any other teams.`,
            duration: 6000,
          });
        } else {
          toast({
            title: "Success",
            description: result.message || "Team member removed successfully",
          });
        }
        refetchTeamMembers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to remove team member",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  // Reset project key handler (Admin only)
  const handleResetProjectKey = async () => {
    if (!newProjectKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a new project key",
        variant: "destructive",
      });
      return;
    }

    // Validate project key format
    if (!/^[A-Z0-9]{2,10}$/.test(newProjectKey.trim())) {
      toast({
        title: "Error",
        description: "Project key must be 2-10 uppercase letters and numbers only",
        variant: "destructive",
      });
      return;
    }

    setIsResettingKey(true);

    try {
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}`,
        {
          key: newProjectKey.trim().toUpperCase()
        }
      );

      if (response.ok) {
        toast({
          title: "Project Key Updated",
          description: `Project key has been changed to ${newProjectKey.trim().toUpperCase()}. All work item IDs will now use this new key.`,
        });
        setShowKeyResetDialog(false);
        setNewProjectKey("");

        // Invalidate cache to refresh project data
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update project key",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating project key:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the project key",
        variant: "destructive",
      });
    } finally {
      setIsResettingKey(false);
    }
  };

  // Quick action handlers for creating items under parent work items
  const openQuickAction = (parentItem: WorkItem, type: 'FEATURE' | 'STORY' | 'TASK' | 'BUG') => {
    setQuickActionModal({
      isOpen: true,
      parentStory: parentItem,
      type,
    });
  };

  const closeQuickAction = () => {
    setQuickActionModal({
      isOpen: false,
      parentStory: null,
      type: null,
    });
  };

  const handleQuickActionSuccess = () => {
    closeQuickAction();
    // Refresh work items after creating new task/bug
    queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}/work-items`] });
  };

  // Show loading state
  if (isProjectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  // Robust role check
  const isAdminOrScrum =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';

  // User role for UI display
  const userRole = currentUser?.role;

  // Show error state 
  if (projectError || isError || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-4">
            The project you're looking for doesn't exist or couldn't be loaded.
          </p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="mr-2">
              Retry
            </Button>
            <Button variant="outline" onClick={goToProjects}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const features = Array.isArray(workItems) ? workItems.filter(item => item.type === 'FEATURE') : [];

  const handleWorkItemsUpdate = () => {
    refetchWorkItems();
  };

  // Quick action handlers for creating items under parent work items
  const openQuickActionModal = (parentItem: WorkItem, type: 'FEATURE' | 'STORY' | 'TASK' | 'BUG') => {
    openQuickAction(parentItem, type);
  };

  const closeQuickActionModal = () => {
    setQuickActionModal({
      isOpen: false,
      parentStory: null,
      type: null,
    });
  };

  // Toggle expansion state of an item
  const toggleItemExpansion = (itemId: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Organize work items in a hierarchical structure: Epics > Features > Stories > Tasks/Bugs
  // Function to calculate total estimated hours for an item based on its children
  const calculateTotalEstimatedHours = (itemId: number, itemType: string): number => {
    if (!Array.isArray(workItems)) return 0;

    let totalHours = 0;

    if (itemType === 'EPIC') {
      // Get all features under this epic
      const childFeatures = workItems.filter(item => item.type === 'FEATURE' && item.parentId === itemId);
      for (const feature of childFeatures) {
        totalHours += calculateTotalEstimatedHours(feature.id, 'FEATURE');
      }
    } else if (itemType === 'FEATURE') {
      // Get all stories under this feature
      const childStories = workItems.filter(item => item.type === 'STORY' && item.parentId === itemId);
      for (const story of childStories) {
        totalHours += calculateTotalEstimatedHours(story.id, 'STORY');
      }
    } else if (itemType === 'STORY') {
      // Get all tasks and bugs under this story
      const childItems = workItems.filter(item =>
        (item.type === 'TASK' || item.type === 'BUG') && item.parentId === itemId
      );
      for (const child of childItems) {
        totalHours += Number(child.estimate) || 0;
      }
    } else if (itemType === 'TASK' || itemType === 'BUG') {
      // For leaf items, return their own estimate
      return Number(workItems.find(item => item.id === itemId)?.estimate) || 0;
    }

    return totalHours;
  };

  // Function to calculate total actual hours for an item based on its children
  const calculateTotalActualHours = (itemId: number, itemType: string): number => {
    if (!Array.isArray(workItems)) return 0;

    let totalHours = 0;

    if (itemType === 'EPIC') {
      // Get all features under this epic
      const childFeatures = workItems.filter(item => item.type === 'FEATURE' && item.parentId === itemId);
      for (const feature of childFeatures) {
        totalHours += calculateTotalActualHours(feature.id, 'FEATURE');
      }
    } else if (itemType === 'FEATURE') {
      // Get all stories under this feature
      const childStories = workItems.filter(item => item.type === 'STORY' && item.parentId === itemId);
      for (const story of childStories) {
        totalHours += calculateTotalActualHours(story.id, 'STORY');
      }
    } else if (itemType === 'STORY') {
      // Get all tasks and bugs under this story
      const childItems = workItems.filter(item =>
        (item.type === 'TASK' || item.type === 'BUG') && item.parentId === itemId
      );
      for (const child of childItems) {
        // Only count actual hours that have been explicitly set (not null/undefined/0)
        if (child.actualHours != null && child.actualHours !== '' && child.actualHours !== '0') {
          const childHours = parseFloat(String(child.actualHours));
          if (!isNaN(childHours) && childHours > 0) {
            totalHours += childHours;
          }
        }
      }
    } else if (itemType === 'TASK' || itemType === 'BUG') {
      // For leaf items, return their own actual hours only if explicitly set
      const item = workItems.find(item => item.id === itemId);
      if (item?.actualHours != null && item.actualHours !== '' && item.actualHours !== '0') {
        const hours = parseFloat(String(item.actualHours));
        return (!isNaN(hours) && hours > 0) ? hours : 0;
      }
      return 0;
    }

    return totalHours;
  };

  // Helper function to check if an item matches the current filters
  const itemMatchesFilters = (item: WorkItem): boolean => {
    // Team members can see ALL work items from their team's projects
    // The server already filters by team access, so no need to filter by assignee here
    // This allows all team members to see the complete hierarchy of epics, features, stories, tasks, and bugs

    // Type filter
    if (filterType.length > 0 && !filterType.includes(item.type)) {
      return false;
    }

    // Status filter
    if (filterStatus.length > 0 && !filterStatus.includes(item.status)) {
      return false;
    }

    // Search filter (title and hierarchy)
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      const titleMatch = item.title.toLowerCase().includes(searchLower);
      const descriptionMatch = item.description?.toLowerCase().includes(searchLower);
      const externalIdMatch = item.externalId?.toLowerCase().includes(searchLower);
      
      if (!titleMatch && !descriptionMatch && !externalIdMatch) {
        return false;
      }
    }

    return true;
  };

  // Helper function to check if item should be shown (itself or has visible children)
  const shouldShowItem = (item: WorkItem, allItems: WorkItem[]): boolean => {
    // If item itself matches filters, show it
    if (itemMatchesFilters(item)) {
      return true;
    }

    // If item is a parent and has children that match filters, show it
    const children = allItems.filter(child => child.parentId === item.id);
    return children.some(child => shouldShowItem(child, allItems));
  };

  const organizeWorkItemsHierarchically = () => {
    if (!Array.isArray(workItems)) return [];

    // Apply filters first - only include items that match filters or have children that match
    const filteredItems = workItems.filter(item => shouldShowItem(item, workItems));

    // Extract all filtered items by type
    const epics = filteredItems.filter(item => item.type === 'EPIC');
    const features = filteredItems.filter(item => item.type === 'FEATURE');
    const stories = filteredItems.filter(item => item.type === 'STORY');
    const tasksAndBugs = filteredItems.filter(item => item.type === 'TASK' || item.type === 'BUG');

    // Debug logging
    console.log('[DEBUG] Work Items Organization:');
    console.log('Epics:', epics.map(e => ({ id: e.id, title: e.title, parentId: e.parentId })));
    console.log('Features:', features.map(f => ({ id: f.id, title: f.title, parentId: f.parentId })));
    console.log('Stories:', stories.map(s => ({ id: s.id, title: s.title, parentId: s.parentId })));

    // Create the hierarchy
    const hierarchicalItems = [];

    // Process epics
    for (const epic of epics) {
      hierarchicalItems.push({
        ...epic,
        level: 0,
        hasChildren: features.some(f => f.parentId === epic.id)
      });

      // If this epic is expanded OR if we're filtering for child items, add its features
      const shouldExpandEpic = expandedItems[epic.id] || 
        (filterType.length > 0 && (filterType.includes('FEATURE') || filterType.includes('STORY') || filterType.includes('TASK') || filterType.includes('BUG')));
      
      if (shouldExpandEpic) {
        const epicFeatures = features.filter(f => f.parentId === epic.id);
        for (const feature of epicFeatures) {
          hierarchicalItems.push({
            ...feature,
            level: 1,
            hasChildren: stories.some(s => s.parentId === feature.id)
          });

          // If this feature is expanded OR if we're filtering for child items, add its stories
          const shouldExpandFeature = expandedItems[feature.id] || 
            (filterType.length > 0 && (filterType.includes('STORY') || filterType.includes('TASK') || filterType.includes('BUG')));
          
          if (shouldExpandFeature) {
            const featureStories = stories.filter(s => s.parentId === feature.id);
            for (const story of featureStories) {
              hierarchicalItems.push({
                ...story,
                level: 2,
                hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
              });

              // If this story is expanded OR if we're filtering for tasks/bugs, add its tasks and bugs
              const shouldShowChildren = expandedItems[story.id] || 
                (filterType.length > 0 && (filterType.includes('TASK') || filterType.includes('BUG')));
              
              if (shouldShowChildren) {
                const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
                for (const taskOrBug of storyTasksAndBugs) {
                  // Always show all tasks/bugs under an expanded story that's being displayed
                  hierarchicalItems.push({
                    ...taskOrBug,
                    level: 3,
                    hasChildren: false
                  });
                }
              }
            }
          }
        }
      }
    }

    // Add orphaned features (those without epics) and always show their children
    const orphanedFeatures = features.filter(f => !f.parentId || !epics.some(e => e.id === f.parentId));
    for (const feature of orphanedFeatures) {
      hierarchicalItems.push({
        ...feature,
        level: 0,
        hasChildren: stories.some(s => s.parentId === feature.id)
      });

      // Always show stories under features regardless of expansion state
      const featureStories = stories.filter(s => s.parentId === feature.id);
      console.log(`[DEBUG] Feature "${feature.title}" has ${featureStories.length} stories:`, featureStories.map(s => s.title));

      for (const story of featureStories) {
        hierarchicalItems.push({
          ...story,
          level: 1,
          hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
        });

        // If this story is expanded OR if we're filtering for tasks/bugs, add its tasks and bugs
        const shouldShowChildren = expandedItems[story.id] || 
          (filterType.length > 0 && (filterType.includes('TASK') || filterType.includes('BUG')));
        
        if (shouldShowChildren) {
          const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
          for (const taskOrBug of storyTasksAndBugs) {
            // Always show all tasks/bugs under an expanded story that's being displayed
            hierarchicalItems.push({
              ...taskOrBug,
              level: 2,
              hasChildren: false
            });
          }
        }
      }
    }

    // Add orphaned stories (only if they truly don't belong to any feature)
    const orphanedStories = stories.filter(s => !s.parentId || !features.some(f => f.id === s.parentId));
    for (const story of orphanedStories) {
      hierarchicalItems.push({
        ...story,
        level: 0,
        hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
      });

      // If this story is expanded OR if we're filtering for tasks/bugs, add its tasks and bugs
      const shouldShowChildren = expandedItems[story.id] || 
        (filterType.length > 0 && (filterType.includes('TASK') || filterType.includes('BUG')));
      
      if (shouldShowChildren) {
        const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
        for (const taskOrBug of storyTasksAndBugs) {
          // Always show all tasks/bugs under an expanded story that's being displayed
          hierarchicalItems.push({
            ...taskOrBug,
            level: 1,
            hasChildren: false
          });
        }
      }
    }

    // Add orphaned tasks and bugs
    const orphanedTasksAndBugs = tasksAndBugs.filter(tb => !tb.parentId || !stories.some(s => s.id === tb.parentId));
    for (const taskOrBug of orphanedTasksAndBugs) {
      hierarchicalItems.push({
        ...taskOrBug,
        level: 0,
        hasChildren: false
      });
    }

    console.log('[DEBUG] Final hierarchy:', hierarchicalItems.map(item => ({
      title: item.title,
      type: item.type,
      level: item.level,
      parentId: item.parentId
    })));

    return hierarchicalItems;
  };

  const getFilterTypesOptions = () => {
    return [
      { value: 'STORY', label: 'Stories' },
      { value: 'TASK', label: 'Tasks' },
      { value: 'BUG', label: 'Bugs' },
    ];
  };

  // Generic filter handler for string-based filters
  const handleStringFilter = (
    value: string,
    currentValues: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clearValue: string = "ALL"
  ) => {
    if (value === clearValue) {
      setter([]);
    } else {
      if (currentValues.includes(value)) {
        setter(currentValues.filter(v => v !== value));
      } else {
        setter([...currentValues, value]);
      }
    }
  };

  // Generic filter handler for number-based filters
  const handleNumberFilter = (
    value: number,
    currentValues: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    clearValue: number = -1
  ) => {
    if (value === clearValue) {
      setter([]);
    } else {
      if (currentValues.includes(value)) {
        setter(currentValues.filter(v => v !== value));
      } else {
        setter([...currentValues, value]);
      }
    }
  };

  // Handler for type filter
  const handleFilterTypeChange = (value: string) => {
    handleStringFilter(value, filterType, setFilterType);
  };

  // Handler for status filter
  const handleFilterStatusChange = (value: string) => {
    handleStringFilter(value, filterStatus, setFilterStatus);
  };

  // Handler for priority filter
  const handleFilterPriorityChange = (value: string) => {
    handleStringFilter(value, filterPriority, setFilterPriority);
  };

  return (
    <div>
          {/* Project navigation */}
          <div className="bg-white border-b border-neutral-200">
            <div className="flex items-center px-6 py-3">
              <Button variant="ghost" className="mr-6 font-medium" onClick={goToProjects}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to projects
              </Button>

              <nav className="flex space-x-6 overflow-x-auto">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setProjectView('overview'); }}
                  className={`border-b-2 ${projectView === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    } font-medium py-3`}
                >
                  Overview
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setProjectView('backlog'); }}
                  className={`border-b-2 ${projectView === 'backlog'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    } font-medium py-3`}
                >
                  Backlog View
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setProjectView('board'); }}
                  className={`border-b-2 ${projectView === 'board'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    } font-medium py-3`}
                >
                  Board
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setProjectView('documentation'); }}
                  className={`border-b-2 ${projectView === 'documentation'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    } font-medium py-3 flex items-center gap-1.5`}
                >
                  Documentation
                  {(() => {
                    const docCount = workItems?.filter(item =>
                      item.pdfUploadBlob || item.pdfUploadPath || item.screenshotBlob || item.screenshotPath
                    ).length || 0;
                    return docCount > 0 ? (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{docCount}</Badge>
                    ) : null;
                  })()}
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setProjectView('settings'); }}
                  className={`border-b-2 ${projectView === 'settings'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    } font-medium py-3`}
                >
                  Settings
                </a>
              </nav>
            </div>
          </div>

          {/* Project content */}
          <div className="p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold mb-1">{project?.name || 'Loading project...'}</h1>
                
              </div>
              {/* Only show Create Item button on specific tabs */}
              {projectView !== 'overview' && projectView !== 'settings' && projectView !== 'documentation' && (
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={handleWorkItemsUpdate}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span>Refresh</span>
                  </Button>
                  <Button onClick={() => openModal("createItem")}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create Item</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Overview Tab Content */}
            {projectView === 'overview' && (
              <div>
                <div className="mb-6">
                  {/* Project Information section */}

                  <div className="bg-white border rounded-md shadow-sm p-4">
                    <h3 className="text-lg font-medium mb-4">Project Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-neutral-500">ID</h4>
                        <p className="text-sm font-medium break-all">{project?.key || 'N/A'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-neutral-500">Created by</h4>
                        <p className="text-sm break-all">
                          {(() => {
                            const creator = allUsers?.find(user => user.id === project?.createdBy);
                            return creator?.email || creator?.fullName || creator?.username || 'Unknown';
                          })()}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-neutral-500">Created at</h4>
                        <p className="text-sm">
                          {project?.createdAt
                            ? new Date(project.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-neutral-500">Start date</h4>
                        <p className="text-sm">
                          {project?.startDate
                            ? new Date(project.startDate).toLocaleDateString()
                            : 'No start date set'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-neutral-500">Target date</h4>
                        <p className="text-sm">
                          {project?.targetDate
                            ? new Date(project.targetDate).toLocaleDateString()
                            : 'No target date set'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-neutral-500">Team</h4>
                        <p className="text-sm break-all">
                          {teams && project?.teamId
                            ? teams.find(t => t.id === project.teamId)?.name
                            : 'No team assigned'}
                        </p>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <h4 className="text-sm font-medium mb-1 text-neutral-500">Description</h4>
                        <p className="text-sm">{project?.description || 'No description provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Client Information - Confidential (Admin Only) */}
                  {(currentUser?.role === 'ADMIN' || clientInfoVisible) && project && (
                    <div className="bg-white border border-amber-200 rounded-md shadow-sm p-4 mt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-medium">Client Information</h3>
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Confidential
                        </Badge>
                      </div>

                      {/* Core Client Information */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-primary mb-3">Core Client Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Company Name</h4>
                            <p className="text-sm">{project.clientCompanyName || 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Industry / Sector</h4>
                            <p className="text-sm">{project.clientIndustry || 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Company Website</h4>
                            <p className="text-sm">
                              {project.clientWebsite ? (
                                <a href={project.clientWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{project.clientWebsite}</a>
                              ) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-accent-foreground mb-3">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Primary Contact</h4>
                            <p className="text-sm">{project.clientContactName || 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Email</h4>
                            <p className="text-sm">
                              {project.clientContactEmail ? (
                                <a href={`mailto:${project.clientContactEmail}`} className="text-primary hover:underline">{project.clientContactEmail}</a>
                              ) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Phone</h4>
                            <p className="text-sm">{project.clientContactPhone || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Relationship Management */}
                      <div>
                        <h4 className="text-sm font-semibold text-secondary-foreground mb-3">Relationship Management</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Account Manager</h4>
                            <p className="text-sm">
                              {project.clientAccountManager
                                ? allUsers?.find(u => u.id === project.clientAccountManager)?.fullName || 'Unknown'
                                : 'Unassigned'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Client Status</h4>
                            <p className="text-sm">
                              {project.clientStatus
                                ? { LEAD: 'Lead', ONBOARDING: 'Onboarding', ACTIVE: 'Active', CHURNED: 'Inactive / Churned' }[project.clientStatus] || project.clientStatus
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="md:col-span-2 lg:col-span-1">
                            <h4 className="text-sm font-medium mb-1 text-neutral-500">Notes</h4>
                            <p className="text-sm whitespace-pre-wrap">{project.clientNotes || 'No notes'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Items with Deadlines section - moved after Project Information */}
                  <div className="bg-white border rounded-md shadow-sm mb-6 mt-6">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-medium">Items with Deadlines</h3>
                    </div>
                    <DeadlinesView
                      workItems={Array.isArray(workItems) ? workItems : []}
                      users={Array.isArray(projectTeamMembers) ? projectTeamMembers : []}
                      projects={project ? [project as Project] : []}
                    />
                  </div>

                </div>


              </div>
            )}

            {/* Board Tab Content */}
            {projectView === 'board' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-medium">
                        {currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER'
                          ? 'Project Kanban Board'
                          : 'My Kanban Board'}
                      </h3>
                      <p className="text-xs text-blue-600 mt-1">
                        {currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER'
                          ? 'Admin/Scrum Master: Showing all tasks.'
                          : 'Showing only your assigned tasks.'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-neutral-600">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                        <span>Can edit/delete</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-neutral-300 rounded-full mr-1"></div>
                        <span>View only</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Type Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Type:</span>
                      <Select
                        value={filterType.length > 0 ? filterType[0] : "ALL"}
                        onValueChange={handleFilterTypeChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All types</SelectItem>
                          <SelectItem value="FEATURE">Features</SelectItem>
                          <SelectItem value="STORY">Stories</SelectItem>
                          <SelectItem value="TASK">Tasks</SelectItem>
                          <SelectItem value="BUG">Bugs</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterType.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterType.map(type => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterTypeChange(type)}
                            >
                              {type}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Status:</span>
                      <Select
                        value={filterStatus.length > 0 ? filterStatus[0] : "ALL"}
                        onValueChange={handleFilterStatusChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All statuses</SelectItem>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterStatus.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterStatus.map(status => (
                            <Badge
                              key={status}
                              variant="outline"
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterStatusChange(status)}
                            >
                              {status.replace('_', ' ')}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Priority Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Priority:</span>
                      <Select
                        value={filterPriority.length > 0 ? filterPriority[0] : "ALL"}
                        onValueChange={handleFilterPriorityChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All priorities</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterPriority.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterPriority.map(priority => (
                            <Badge
                              key={priority}
                              variant="outline"
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterPriorityChange(priority)}
                            >
                              {priority}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Feature Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Feature:</span>
                      <Select
                        value={filterFeature ? String(filterFeature) : "ALL"}
                        onValueChange={(value) => {
                          setFilterFeature(value !== "ALL" ? parseInt(value) : undefined);
                        }}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All features" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All features</SelectItem>
                          {features.map(feature => (
                            <SelectItem key={feature.id} value={String(feature.id)}>
                              {feature.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filterFeature && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          <Badge
                            variant="outline"
                            className="text-xs py-0 h-6"
                            onClick={() => setFilterFeature(undefined)}
                          >
                            {features.find(f => f.id === filterFeature)?.title || 'Unknown Feature'}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <KanbanBoard
                  projectId={Number(projectId)}
                  users={projectTeamMembers || []}
                  currentUser={currentUser}
                  workItems={Array.isArray(workItems)
                    ? workItems.filter(item => {
                      // Role-based access: Admin/Scrum Master can see all items, regular users only their assigned items
                      if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SCRUM_MASTER') {
                        if (!currentUser || item.assigneeId !== currentUser.id) {
                          return false;
                        }
                      }

                      // Only show specific types in kanban (exclude EPICs)
                      if (item.type === 'EPIC') {
                        return false;
                      }

                      // Filter by type if any type filters are selected
                      if (filterType.length > 0 && !filterType.includes(item.type)) {
                        return false;
                      }

                      // Filter by status if any status filters are selected
                      if (filterStatus.length > 0 && !filterStatus.includes(item.status)) {
                        return false;
                      }

                      // Filter by priority if any priority filters are selected
                      if (filterPriority.length > 0 && (!item.priority || !filterPriority.includes(item.priority))) {
                        return false;
                      }

                      // If feature filter is active, only show items belonging to that feature
                      if (filterFeature && item.parentId !== filterFeature) {
                        return false;
                      }

                      return true;
                    })
                    : []
                  }
                  onItemEdit={async (item) => {
                    try {
                      // Fetch full work item details from API
                      const fullItem = await apiGet(`/work-items/${item.id}`);
                      openModal("editItem", { workItem: fullItem });
                    } catch (err) {
                      toast({
                        title: "Error loading item",
                        description: "Could not load full item details. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  onItemDelete={(item) => openModal("deleteItem", { workItem: item })}
                  onQuickAction={openQuickAction}
                  onStatusChange={async (itemId, status) => {
                    try {
                      // Find the item being updated
                      const item = workItems?.find(w => w.id === itemId);
                      if (!item) {
                        toast({
                          title: "Error",
                          description: "Item not found",
                          variant: "destructive"
                        });
                        return;
                      }

                      // Validate if marking as DONE for parent items (Epic, Feature, Story)
                      if (status === 'DONE' && ['EPIC', 'FEATURE', 'STORY'].includes(item.type)) {
                        const validation = canMarkParentAsDone(item, workItems || []);

                        if (!validation.canMark) {
                          const childTypesText = validation.incompleteChildren.map(child => child.type.toLowerCase()).join(', ');
                          toast({
                            title: "Cannot mark as Done",
                            description: `This ${item.type.toLowerCase()} has ${validation.incompleteChildren.length} incomplete child item(s): ${childTypesText}. Complete all child items first.`,
                            variant: "destructive",
                          });
                          return;
                        }
                      }

                      const response = await apiRequest(
                        'PATCH',
                        `/work-items/${itemId}`,
                        { status }
                      );

                      if (response.ok) {
                        refetchWorkItems();
                      } else {
                        toast({
                          title: "Error",
                          description: "Failed to update item status",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      console.error("Error updating item status:", error);
                      toast({
                        title: "Error",
                        description: "An unexpected error occurred",
                        variant: "destructive"
                      });
                    }
                  }}
                  onWorkItemsUpdate={refetchWorkItems}
                />
              </div>
            )}

            {/* Backlog View Tab Content */}
            {projectView === 'backlog' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="px-4 py-2 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER' || (currentUser?.role as string) === 'PROJECT_MANAGER'
                            ? 'Project Backlog View'
                            : 'Backlog View - Team Access'}
                        </h3>
                        <p className="text-xs text-blue-600 mt-0.5">
                          {currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER' || (currentUser?.role as string) === 'PROJECT_MANAGER'
                            ? 'Full access: View and manage all items.'
                            : 'Team Member: VIEW Epic/Feature/Story hierarchy. CREATE Task/Bug only.'}
                        </p>
                      </div>
                      
                      {/* Active filters indicator */}
                      {(filterType.length > 0 || filterStatus.length > 0 || (searchTerm && searchTerm.trim() !== '')) && (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-blue-600">Filters Active</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-2">
                      {/* Status Filter */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">Status:</span>
                        <select
                          value={filterStatus.length === 1 ? filterStatus[0] : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFilterStatus(value ? [value] : []);
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-20"
                        >
                          <option value="">All</option>
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="DONE">Done</option>
                        </select>
                      </div>

                      {/* Search Filter */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">Search:</span>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Filter by title..."
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-32"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="text-gray-400 hover:text-gray-600 ml-1"
                            title="Clear search"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Type Filter */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">Type:</span>
                        <select
                          value={filterType.length === 1 ? filterType[0] : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFilterType(value ? [value] : []);
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-20"
                        >
                          <option value="">All Types</option>
                          <option value="EPIC">Epic</option>
                          <option value="FEATURE">Feature</option>
                          <option value="STORY">Story</option>
                          <option value="TASK">Task</option>
                          <option value="BUG">Bug</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: columnWidths.title }} />
                      <col style={{ width: columnWidths.status }} />
                      <col style={{ width: columnWidths.priority }} />
                      <col style={{ width: columnWidths.severity }} />
                      <col style={{ width: columnWidths.estHr }} />
                      <col style={{ width: columnWidths.actualHrs }} />
                      <col style={{ width: columnWidths.assignee }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider relative group" style={{ width: columnWidths.title }}>
                          Title & Hierarchy
                          <div className="text-[8px] font-normal text-gray-500 normal-case mt-0.5">Click title text for modal • Click row for inline edit</div>
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 bg-transparent group-hover:bg-border transition-colors" onMouseDown={(e) => handleResizeStart('title', e)} />
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider relative group" style={{ width: columnWidths.status }}>
                          Status
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 bg-transparent group-hover:bg-border transition-colors" onMouseDown={(e) => handleResizeStart('status', e)} />
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider relative group" style={{ width: columnWidths.priority }}>
                          Priority
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 bg-transparent group-hover:bg-border transition-colors" onMouseDown={(e) => handleResizeStart('priority', e)} />
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider relative group" style={{ width: columnWidths.severity }}>
                          Severity
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 bg-transparent group-hover:bg-border transition-colors" onMouseDown={(e) => handleResizeStart('severity', e)} />
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider relative group" style={{ width: columnWidths.estHr }}>
                          Est.Hr
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 bg-transparent group-hover:bg-border transition-colors" onMouseDown={(e) => handleResizeStart('estHr', e)} />
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider relative group" style={{ width: columnWidths.actualHrs }}>
                          Actual Hrs
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 bg-transparent group-hover:bg-border transition-colors" onMouseDown={(e) => handleResizeStart('actualHrs', e)} />
                        </th>
                        <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider relative group" style={{ width: columnWidths.assignee }}>
                          Assignee
                          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 bg-transparent group-hover:bg-border transition-colors" onMouseDown={(e) => handleResizeStart('assignee', e)} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {organizeWorkItemsHierarchically().map((item: any) => {
                        const indentationStyles = {
                          0: "pl-2", // Epic
                          1: "pl-8", // Feature 
                          2: "pl-16", // Story
                          3: "pl-24" // Task/Bug
                        };
                        const paddingClass = indentationStyles[item.level as keyof typeof indentationStyles] || "pl-2";

                        const typeColors = {
                          'EPIC': 'bg-purple-500',
                          'FEATURE': 'bg-blue-500',
                          'STORY': 'bg-green-500',
                          'TASK': 'bg-orange-500',
                          'BUG': 'bg-red-500'
                        };

                        const statusColors = {
                          'TODO': 'bg-gray-100 text-gray-700 border-gray-300',
                          'IN_PROGRESS': 'bg-blue-100 text-blue-700 border-blue-300',
                          'ON_HOLD': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                          'DONE': 'bg-green-100 text-green-700 border-green-300'
                        };

                        const priorityColors = {
                          'LOW': 'bg-gray-100 text-gray-600 border-gray-300',
                          'MEDIUM': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                          'HIGH': 'bg-orange-100 text-orange-700 border-orange-300',
                          'CRITICAL': 'bg-red-100 text-red-700 border-red-300'
                        };

                        // Severity color map
                        const severityColors = {
                          'LOW': 'bg-gray-100 text-gray-600 border-gray-300',
                          'MEDIUM': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                          'HIGH': 'bg-orange-100 text-orange-700 border-orange-300',
                          'CRITICAL': 'bg-red-100 text-red-700 border-red-300'
                        };

                        return (
                          <tr
                            key={`${item.id}-${item.actualHours}-${item.updatedAt || ''}`}
                            className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                            onClick={(e) => {
                              // Only handle row click if not clicking on interactive elements
                              if (e.target === e.currentTarget ||
                                (e.target as HTMLElement).closest('.row-clickable')) {
                                if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                  // For row clicks, start inline editing of title
                                  startInlineEdit(item.id, 'title', item.title);
                                }
                              }
                            }}
                            title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click empty area to edit title inline' : ''}
                          >
                            {/* Title Column with Type Indicator and Hierarchy */}
                            <td className={`px-1 py-0.5 ${paddingClass} row-clickable`}>
                              <div className="flex items-start">
                                {/* Expand/Collapse Button */}
                                {item.hasChildren && (
                                  <button
                                    className="mr-2 p-0.5 hover:bg-gray-200 rounded focus:outline-none flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleItemExpansion(item.id);
                                    }}
                                  >
                                    {expandedItems[item.id] ? (
                                      <ChevronDown className="h-3 w-3 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-gray-500" />
                                    )}
                                  </button>
                                )}
                                {!item.hasChildren && <div className="w-5 flex-shrink-0" />}

                                {/* Type Circle Badge */}
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0 mr-2 ${typeColors[item.type as keyof typeof typeColors] || 'bg-gray-500'
                                  }`}>
                                  {item.type === 'EPIC' ? 'E' :
                                    item.type === 'FEATURE' ? 'F' :
                                      item.type === 'STORY' ? 'S' :
                                        item.type === 'TASK' ? 'T' :
                                          item.type === 'BUG' ? 'B' : '?'}
                                </div>

                                {/* Title */}
                                <div className="flex-1 min-w-0">
                                  {editingCell?.itemId === item.id && editingCell?.field === 'title' ? (
                                    <input
                                      type="text"
                                      value={editValues.title || ''}
                                      maxLength={200}
                                      onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                      onBlur={() => saveInlineEdit(item.id, 'title')}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          saveInlineEdit(item.id, 'title');
                                        } else if (e.key === 'Escape') {
                                          cancelInlineEdit();
                                        }
                                      }}
                                      autoFocus
                                      className="w-full text-xs px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white z-10 relative"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div
                                        className={`text-xs leading-snug break-words cursor-pointer hover:text-blue-600 hover:underline ${item.level === 0 ? 'text-gray-900' :
                                            item.level === 1 ? 'text-gray-800' :
                                              'text-gray-700'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openModal("viewItem" as any, { workItem: item, canEdit: canUserEditWorkItem(item, currentUser, workItems || []) });
                                        }}
                                        title="Click to view details"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-neutral-900 line-clamp-1">{item.title}</span>
                                        </div>
                                      </div>

                                      {/* Quick action buttons for EPIC items - Add Feature + Delete */}
                                      {item.type === 'EPIC' && currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER') && (
                                        <div className="flex gap-1 ml-auto">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openQuickAction(item, 'FEATURE');
                                            }}
                                            className="w-6 h-6 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded border border-gray-300 transition-colors flex items-center justify-center"
                                            title="Add Feature under this Epic"
                                          >
                                            +F
                                          </button>
                                          {currentUser.role === 'ADMIN' && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openModal("deleteItem", { workItem: item });
                                              }}
                                              className="w-6 h-6 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition-colors flex items-center justify-center"
                                              title="Delete Epic and all children"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* Quick action buttons for FEATURE items - Add Story + Delete */}
                                      {item.type === 'FEATURE' && currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER') && (
                                        <div className="flex gap-1 ml-auto">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openQuickAction(item, 'STORY');
                                            }}
                                            className="w-6 h-6 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded border border-green-300 transition-colors flex items-center justify-center"
                                            title="Add Story under this Feature"
                                          >
                                            +S
                                          </button>
                                          {currentUser.role === 'ADMIN' && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openModal("deleteItem", { workItem: item });
                                              }}
                                              className="w-6 h-6 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition-colors flex items-center justify-center"
                                              title="Delete Feature and all children"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* Quick action buttons for STORY items */}
                                      {item.type === 'STORY' && currentUser && (
                                        <div className="flex gap-1 ml-auto">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openQuickAction(item, 'TASK');
                                            }}
                                            className="w-6 h-6 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded border border-orange-300 transition-colors flex items-center justify-center"
                                            title="Add Task under this Story"
                                          >
                                            +T
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openQuickAction(item, 'BUG');
                                            }}
                                            className="w-6 h-6 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded border border-red-300 transition-colors flex items-center justify-center"
                                            title="Add Bug under this Story"
                                          >
                                            +B
                                          </button>
                                        </div>
                                      )}

                                      {/* Delete button for TASK and BUG items - all users */}
                                      {['TASK', 'BUG'].includes(item.type) && currentUser && (
                                        <div className="flex gap-1 ml-auto">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openModal("deleteItem", { workItem: item });
                                            }}
                                            className="w-6 h-6 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition-colors flex items-center justify-center"
                                            title={`Delete ${item.type === 'TASK' ? 'Task' : 'Bug'}`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Status Column */}
                            <td className="px-2 py-0.5">
                              {editingCell?.itemId === item.id && editingCell?.field === 'status' ? (
                                <Select
                                  value={editValues.status || item.status}
                                  onValueChange={(value) => {
                                    setEditValues({ ...editValues, status: value });
                                    handleStatusChange(item.id, value, item);
                                  }}
                                  open={true}
                                  onOpenChange={(open) => {
                                    if (!open) cancelInlineEdit();
                                  }}
                                >
                                  <SelectTrigger className="h-6 w-28 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="TODO">To Do</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                    <SelectItem value="DONE">Done</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span
                                  className={`px-1.5 py-0.5 inline-flex text-[10px] rounded border ${statusColors[item.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700 border-gray-300'} ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                      startInlineEdit(item.id, 'status', item.status);
                                    }
                                  }}
                                  title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to edit status' : ''}
                                >
                                  {item.status.replace('_', ' ')}
                                </span>
                              )}
                            </td>

                            {/* Priority Column */}
                            <td className="px-2 py-0.5">
                              {editingCell?.itemId === item.id && editingCell?.field === 'priority' ? (
                                <Select
                                  value={editValues.priority || item.priority || 'MEDIUM'}
                                  onValueChange={(value) => {
                                    setEditValues({ ...editValues, priority: value });
                                    updateWorkItemMutation.mutate({
                                      itemId: item.id,
                                      updates: { priority: value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null | undefined }
                                    });
                                    cancelInlineEdit();
                                  }}
                                  open={true}
                                  onOpenChange={(open) => {
                                    if (!open) cancelInlineEdit();
                                  }}
                                >
                                  <SelectTrigger className="h-6 w-24 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : item.priority ? (
                                <span
                                  className={`px-1.5 py-0.5 inline-flex text-[10px] rounded border ${priorityColors[item.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-600 border-gray-300'} ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                      startInlineEdit(item.id, 'priority', item.priority || 'MEDIUM');
                                    }
                                  }}
                                  title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to edit priority' : ''}
                                >
                                  {item.priority}
                                </span>
                              ) : (
                                <span
                                  className={`text-gray-400 text-[10px] ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                      startInlineEdit(item.id, 'priority', 'MEDIUM');
                                    }
                                  }}
                                  title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to set priority' : ''}
                                >
                                  -
                                </span>
                              )}
                            </td>

                            {/* Severity Column */}
                            <td className="px-2 py-0.5">
                              {editingCell?.itemId === item.id && editingCell?.field === 'severity' ? (
                                <Select
                                  value={editValues.severity || item.severity || 'LOW'}
                                  onValueChange={(value) => {
                                    setEditValues({ ...editValues, severity: value });
                                    updateWorkItemMutation.mutate({
                                      itemId: item.id,
                                      updates: { severity: value }
                                    });
                                    cancelInlineEdit();
                                  }}
                                  open={true}
                                  onOpenChange={(open) => {
                                    if (!open) cancelInlineEdit();
                                  }}
                                >
                                  <SelectTrigger className="h-6 w-24 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : item.type === 'BUG' ? (
                                (item.severity && item.severity !== '' && item.severity !== 'null') ? (
                                  <span
                                    className={`px-1.5 py-0.5 inline-flex text-[10px] rounded border ${severityColors[String(item.severity).toUpperCase() as keyof typeof severityColors] || 'bg-gray-100 text-gray-600 border-gray-300'} ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                        startInlineEdit(item.id, 'severity', item.severity || 'LOW');
                                      }
                                    }}
                                    title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to edit severity' : ''}
                                  >
                                    {String(item.severity).charAt(0).toUpperCase() + String(item.severity).slice(1).toLowerCase()}
                                  </span>
                                ) : (
                                  <span
                                    className={`px-1.5 py-0.5 inline-flex text-[10px] rounded border border-orange-300 bg-orange-50 text-orange-600 ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:ring-2 hover:ring-orange-300' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                        startInlineEdit(item.id, 'severity', 'LOW');
                                      }
                                    }}
                                    title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to set severity' : 'Severity not set'}
                                  >
                                    Not Set
                                  </span>
                                )
                              ) : (
                                <span className="text-gray-300 text-[10px]">N/A</span>
                              )}
                            </td>

                            {/* Est.Hr Column */}
                            <td className="px-2 py-0.5">
                              <span className={`text-[10px] ${(item.type === 'EPIC' || item.type === 'FEATURE' || item.type === 'STORY')
                                ? 'font-bold text-blue-600'
                                : 'text-gray-600'
                                }`}>
                                {(() => {
                                  if (item.type === 'EPIC' || item.type === 'FEATURE' || item.type === 'STORY') {
                                    // Show calculated total for parent items
                                    const totalHours = calculateTotalEstimatedHours(item.id, item.type);
                                    return totalHours > 0 ? `${totalHours.toFixed(1)}h` : '-';
                                  } else {
                                    // Show individual estimate for task/bug items
                                    return item.estimate ? `${Number(item.estimate).toFixed(1)}h` : '-';
                                  }
                                })()}
                              </span>
                            </td>

                            {/* Actual Hrs Column */}
                            <td className={`px-2 py-0.5 ${blinkingItemId === item.id ? 'animate-blink-cell' : ''}`}>
                              {editingCell?.itemId === item.id && editingCell?.field === 'actualHours' ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={editValues.actualHours ?? (item.actualHours ?? '')}
                                  onChange={e => setEditValues({ ...editValues, actualHours: e.target.value })}
                                  onBlur={() => saveInlineEdit(item.id, 'actualHours')}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveInlineEdit(item.id, 'actualHours');
                                    else if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  autoFocus
                                  className="w-16 text-xs px-2 py-1 border-2 border-orange-500 rounded focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white z-10 relative"
                                  title="Edit actual hours"
                                  placeholder="Actual hrs"
                                />
                              ) : (() => {
                                if (item.type === 'EPIC' || item.type === 'FEATURE' || item.type === 'STORY') {
                                  // Show calculated total for parent items
                                  const totalActualHours = calculateTotalActualHours(item.id, item.type);
                                  return totalActualHours > 0 ? (
                                    <span className="text-xs font-bold text-orange-600">
                                      {totalActualHours.toFixed(1)}h
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400 text-xs">-</span>
                                  );
                                } else {
                                  // Show individual actual hours for task/bug items
                                  // Handle both string and number types from database
                                  // Debug log to understand the data structure
                                  if (item.id % 10 === 0) { // Log occasionally to avoid spam
                                    console.log('[DEBUG] Actual hours display:', {
                                      itemId: item.id,
                                      actualHours: item.actualHours,
                                      type: typeof item.actualHours,
                                      isNull: item.actualHours === null,
                                      isUndefined: item.actualHours === undefined
                                    });
                                  }

                                  // Check if actualHours exists (not null/undefined)
                                  if (item.actualHours !== null && item.actualHours !== undefined && item.actualHours !== '') {
                                    // Convert to number (handles both string "5.50" and number 5.5)
                                    const actualHoursValue = typeof item.actualHours === 'string'
                                      ? parseFloat(item.actualHours)
                                      : Number(item.actualHours);

                                    // Now check if it's a valid number (including 0)
                                    if (!isNaN(actualHoursValue)) {
                                      return (
                                        <span
                                          className={`text-xs text-orange-600 font-medium ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:underline' : ''}`}
                                          onClick={e => {
                                            e.stopPropagation();
                                            if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                              startInlineEdit(item.id, 'actualHours', String(item.actualHours));
                                            }
                                          }}
                                          title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to edit actual hours' : ''}
                                        >
                                          {actualHoursValue.toFixed(1)}h
                                        </span>
                                      )
                                    }
                                  }


                                  // If no actual hours set, show different display based on item type
                                  return item.type === 'BUG' ? (
                                    <span
                                      className={`px-1.5 py-0.5 inline-flex text-[10px] rounded border border-orange-300 bg-orange-50 text-orange-600 ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:ring-2 hover:ring-orange-300' : ''}`}
                                      onClick={e => {
                                        e.stopPropagation();
                                        if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                          startInlineEdit(item.id, 'actualHours', '');
                                        }
                                      }}
                                      title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to set actual hours' : 'Actual hours not recorded'}
                                    >
                                      Not Set
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-neutral-400 text-xs ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:text-orange-600' : ''}`}
                                      onClick={e => {
                                        e.stopPropagation();
                                        if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                          startInlineEdit(item.id, 'actualHours', '');
                                        }
                                      }}
                                      title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to set actual hours' : ''}
                                    >
                                      -
                                    </span>
                                  );
                                }
                              })()}
                            </td>

                            {/* Assignee Column */}
                            <td className="px-2 py-0.5">
                              {editingCell?.itemId === item.id && editingCell?.field === 'assignee' ? (
                                <Select
                                  value={editValues.assignee || (item.assigneeId ? String(item.assigneeId) : 'unassigned')}
                                  onValueChange={async (value) => {
                                    setEditValues({ ...editValues, assignee: value });
                                    try {
                                      await updateWorkItemMutation.mutateAsync({
                                        itemId: item.id,
                                        updates: { assigneeId: value === 'unassigned' ? null : parseInt(value) }
                                      });
                                      await refetchWorkItems();
                                      cancelInlineEdit();
                                    } catch (error) {
                                      console.error("Error updating assignee:", error);
                                      let message = 'Unknown error';
                                      if (error && typeof error === 'object' && 'message' in error) {
                                        message = (error as any).message;
                                      }
                                      toast({
                                        title: "Error",
                                        description: `Failed to update assignee: ${message}`,
                                        variant: "destructive",
                                      });
                                      cancelInlineEdit();
                                    }
                                  }}
                                  open={true}
                                  onOpenChange={(open) => {
                                    if (!open) cancelInlineEdit();
                                  }}
                                >
                                  <SelectTrigger className="h-6 w-24 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {Array.isArray(projectTeamMembers) && projectTeamMembers.length > 0 ? projectTeamMembers.map(user => (
                                      <SelectItem key={user.id} value={String(user.id)}>
                                        {user.fullName || user.username}
                                      </SelectItem>
                                    )) : (
                                      <SelectItem value="no-members" disabled>No team members available</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : item.assigneeId ? (
                                <div
                                  className={`flex items-center ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:ring-2 hover:ring-blue-300 rounded px-1' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                      startInlineEdit(item.id, 'assignee', String(item.assigneeId));
                                    }
                                  }}
                                  title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to change assignee' : ''}
                                >
                                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[9px] text-blue-700 mr-1 flex-shrink-0">
                                    {(Array.isArray(projectTeamMembers) ? projectTeamMembers.find(u => u.id === item.assigneeId)?.fullName?.substring(0, 1)?.toUpperCase() : null) || "?"}
                                  </div>
                                  <span className="text-[10px] text-gray-700 truncate max-w-20">
                                    {(Array.isArray(projectTeamMembers) ? projectTeamMembers.find(u => u.id === item.assigneeId)?.fullName : null) || "Unknown"}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={`text-gray-400 text-[10px] ${canUserEditWorkItem(item, currentUser, workItems || []) ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                      startInlineEdit(item.id, 'assignee', 'unassigned');
                                    }
                                  }}
                                  title={canUserEditWorkItem(item, currentUser, workItems || []) ? 'Click to assign user' : ''}
                                >
                                  Unassigned
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {(!Array.isArray(workItems) || workItems.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                            No work items found. Create your first work item to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Documentation Tab Content */}
            {projectView === 'documentation' && (() => {
              // Aggregate all documents from work items
              const documents = (workItems || []).flatMap(item => {
                const docs: Array<{
                  id: string;
                  name: string;
                  type: 'PDF' | 'Screenshot';
                  workItemTitle: string;
                  workItemExternalId: string;
                  workItemType: string;
                  uploadedBy: string;
                  dateAttached: string;
                  blob: string | null;
                  path: string | null;
                }> = [];

                if (item.pdfUploadBlob || item.pdfUploadPath) {
                  let fileName = item.pdfUploadPath
                    ? item.pdfUploadPath.split('/').pop() || 'Document.pdf'
                    : 'Uploaded Document.pdf';
                  // Remove prefix like "pdf_1776083352106_" from filename
                  fileName = fileName.replace(/^pdf_\d+_/, '');
                  docs.push({
                    id: `pdf-${item.id}`,
                    name: fileName,
                    type: 'PDF',
                    workItemTitle: item.title,
                    workItemExternalId: item.externalId || `#${item.id}`,
                    workItemType: item.type,
                    uploadedBy: item.createdByName || item.createdByEmail || 'Unknown',
                    dateAttached: item.updatedAt as string || item.createdAt as string,
                    blob: item.pdfUploadBlob || null,
                    path: item.pdfUploadPath || null,
                  });
                }

                if (item.screenshotBlob || item.screenshotPath) {
                  let fileName = item.screenshotPath
                    ? item.screenshotPath.split('/').pop() || 'Screenshot.png'
                    : 'Screenshot.png';
                  // Remove prefix like "screenshot_1776083352106_" from filename
                  fileName = fileName.replace(/^screenshot_\d+_/, '');
                  docs.push({
                    id: `screenshot-${item.id}`,
                    name: fileName,
                    type: 'Screenshot',
                    workItemTitle: item.title,
                    workItemExternalId: item.externalId || `#${item.id}`,
                    workItemType: item.type,
                    uploadedBy: item.createdByName || item.createdByEmail || 'Unknown',
                    dateAttached: item.updatedAt as string || item.createdAt as string,
                    blob: item.screenshotBlob || item.screenshot || null,
                    path: item.screenshotPath || null,
                  });
                }

                return docs;
              });

              const filteredDocs = docSearchTerm
                ? documents.filter(doc =>
                    doc.name.toLowerCase().includes(docSearchTerm.toLowerCase()) ||
                    doc.workItemTitle.toLowerCase().includes(docSearchTerm.toLowerCase()) ||
                    doc.workItemExternalId.toLowerCase().includes(docSearchTerm.toLowerCase())
                  )
                : documents;

              const typeLabel = (type: string) => {
                switch (type) {
                  case 'FEATURE': return 'Client Requirement';
                  case 'STORY': return 'Change Request';
                  case 'BUG': return 'Bug Report';
                  case 'TASK': return 'Task';
                  case 'EPIC': return 'Epic';
                  default: return type;
                }
              };

              const typeBadgeColor = (type: string) => {
                switch (type) {
                  case 'FEATURE': return 'bg-blue-100 text-blue-800';
                  case 'STORY': return 'bg-amber-100 text-amber-800';
                  case 'BUG': return 'bg-red-100 text-red-800';
                  case 'TASK': return 'bg-green-100 text-green-800';
                  case 'EPIC': return 'bg-purple-100 text-purple-800';
                  default: return 'bg-muted text-muted-foreground';
                }
              };

              const handleViewDocument = (doc: typeof documents[0]) => {
                const triggerDownload = (url: string, fileName: string) => {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = fileName;
                  link.style.display = 'none';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                };

                if (doc.blob) {
                  if (doc.blob.startsWith('data:')) {
                    // Try opening in new tab first, fall back to download
                    const newTab = window.open();
                    if (newTab) {
                      if (doc.type === 'PDF') {
                        newTab.document.write(`<iframe src="${doc.blob}" width="100%" height="100%" style="border:none;position:absolute;top:0;left:0;right:0;bottom:0;"></iframe>`);
                      } else {
                        newTab.document.write(`<img src="${doc.blob}" style="max-width:100%;height:auto;" />`);
                      }
                    } else {
                      // Popup blocked — trigger download
                      triggerDownload(doc.blob, doc.name);
                    }
                  } else {
                    const newTab = window.open(doc.blob, '_blank');
                    if (!newTab) {
                      triggerDownload(doc.blob, doc.name);
                    }
                  }
                } else if (doc.path) {
                  const newTab = window.open(doc.path, '_blank');
                  if (!newTab) {
                    triggerDownload(doc.path, doc.name);
                  }
                }
              };

              return (
                <div className="bg-white border rounded-md shadow-sm">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-medium">Project Documentation</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          All documents attached to work items in this project — for audit and reference.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {documents.length} document{documents.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Search */}
                    <div className="mb-4">
                      <Input
                        placeholder="Search by document name, work item title or ID..."
                        value={docSearchTerm}
                        onChange={(e) => setDocSearchTerm(e.target.value)}
                        className="max-w-md"
                      />
                    </div>

                    {filteredDocs.length === 0 ? (
                      <div className="text-center py-16 border rounded-md bg-muted/20">
                        <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-muted-foreground mb-2">
                          {docSearchTerm ? 'No documents match your search' : 'No Documents Yet'}
                        </h4>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          {docSearchTerm
                            ? 'Try adjusting your search terms.'
                            : 'Documents attached to Client Requirements, Change Requests, and Bug Reports will appear here automatically.'}
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Document</th>
                              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Work Item</th>
                              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uploaded By</th>
                              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date Attached</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDocs.map((doc) => (
                              <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                      doc.type === 'PDF'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {doc.type === 'PDF' ? 'PDF' : 'IMG'}
                                    </div>
                                    <button
                                      onClick={() => handleViewDocument(doc)}
                                      disabled={!doc.blob && !doc.path}
                                      className="font-medium truncate max-w-[200px] text-primary hover:underline cursor-pointer text-left disabled:text-muted-foreground disabled:cursor-not-allowed disabled:no-underline"
                                      title={doc.name}
                                    >
                                      {doc.name}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">{doc.workItemExternalId}</span>
                                    <span className="truncate max-w-[200px]" title={doc.workItemTitle}>
                                      {doc.workItemTitle}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeColor(doc.workItemType)}`}>
                                    {typeLabel(doc.workItemType)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {doc.uploadedBy}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {new Date(doc.dateAttached).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Settings Tab Content */}
            {projectView === 'settings' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-6">Project Settings</h3>
                  <div className="space-y-8">
                    {/* Project Details Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium">Project Details</h4>
                        {!isAdminOrScrum && (
                          <div className="text-sm text-neutral-500 bg-neutral-50 px-3 py-1 rounded-md border">
                            <span className="text-xs">👤</span> Only Admin and Scrum Master can edit project details
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="projectName" className="block text-sm font-medium mb-1">
                            Project Name
                          </label>
                          <Input
                            id="projectName"
                            value={editedProject.name}
                            onChange={(e) => setEditedProject(prev => ({ ...prev, name: e.target.value }))}
                            disabled={!isAdminOrScrum}
                            className="max-w-lg"
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <label htmlFor="projectKey" className="block text-sm font-medium mb-1">
                            Project Key
                          </label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="projectKey"
                              value={project?.key || 'N/A'}
                              disabled
                              className="max-w-lg bg-gray-50"
                              placeholder="Project key will appear here"
                            />
                            {userRole === 'ADMIN' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowKeyResetDialog(true)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Reset Key
                              </Button>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-neutral-500">
                            <span className="inline-flex items-center">
                              🔒 The project key is used in work item IDs and cannot be changed after creation.
                              {userRole === 'ADMIN' && (
                                <span className="text-red-500 ml-1">
                                  • Reset only in emergency situations
                                </span>
                              )}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label htmlFor="projectDescription" className="block text-sm font-medium mb-1">
                            Description
                          </label>
                          <Textarea
                            id="projectDescription"
                            value={editedProject.description}
                            onChange={(e) => setEditedProject(prev => ({ ...prev, description: e.target.value }))}
                            disabled={!isAdminOrScrum}
                            className="max-w-lg"
                            rows={3}
                            placeholder="Enter project description"
                          />
                        </div>
                        {/* Save button for admins/scrum masters */}
                        {isAdminOrScrum && (
                          <div className="flex gap-3">
                            <Button
                              onClick={handleSaveProject}
                              disabled={isSaving || !editedProject.name.trim()}
                              className="mt-4"
                            >
                              {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                            {/* Reset button to restore original values */}
                            <Button
                              variant="outline"
                              onClick={() => setEditedProject({
                                name: project?.name || '',
                                description: project?.description || ''
                              })}
                              disabled={isSaving}
                              className="mt-4"
                            >
                              Reset
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Client Information Visibility - Admin Only */}
                    {currentUser?.role === 'ADMIN' && (
                      <div>
                        <h4 className="text-md font-medium mb-4">Client Information Visibility</h4>
                        <div className="border rounded-md p-4 max-w-3xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Allow other users to view client information</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                When enabled, all project members can see the Client Information section in the Overview tab. When disabled, only admins can view it.
                              </p>
                            </div>
                            <Switch
                              checked={clientInfoVisible}
                              onCheckedChange={toggleClientInfoVisibility}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Team Assignment Section */}
                    <div>
                      <h4 className="text-md font-medium mb-4">Team Assignment</h4>
                      <div className="border rounded-md p-4 max-w-3xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Current Team: {project?.teamId ?
                                teams?.find(team => team.id === project.teamId)?.name || 'Unknown Team' :
                                'No team assigned'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {project?.teamId ?
                                'Team members can be assigned to work items and access project resources.' :
                                'Assign a team to enable team member management and collaboration.'}
                            </p>
                          </div>
                          {isAdminOrScrum && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAssignTeamDialog(true)}
                              className="text-gray-600 hover:text-gray-700 border-gray-300 hover:border-gray-400"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              {project?.teamId ? 'Change Team' : 'Assign Team'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Team Section */}
                    <div>
                      <h4 className="text-md font-medium mb-4">Team Management</h4>
                      {project?.teamId ? (
                        <div className="border rounded-md overflow-hidden max-w-3xl">
                          {/* Current Team Members */}
                          <div className="bg-neutral-50 px-4 py-3 border-b">
                            <h5 className="text-sm font-medium">Current Team Members ({projectTeamMembers?.length || 0})</h5>
                          </div>
                          <div className="p-4">
                            {projectTeamMembers && projectTeamMembers.length > 0 ? (
                              <div className="space-y-2">
                                {projectTeamMembers.map(member => (
                                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                        {member.fullName?.substring(0, 1) || member.username?.substring(0, 1) || "?"}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{member.fullName || member.username}</p>
                                        <p className="text-xs text-gray-500 capitalize">{member.role?.toLowerCase().replace('_', ' ')}</p>
                                      </div>
                                    </div>
                                    {isAdminOrScrum && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRemoveTeamMember(member.id)}
                                        disabled={removingMemberId === member.id}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        {removingMemberId === member.id ? (
                                          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />

                                        ) : (
                                          <UserMinus className="h-3 w-3" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-neutral-500 text-center py-4">
                                No team members assigned to this project yet.
                              </p>
                            )}
                          </div>

                          {/* Add Team Member */}
                          {isAdminOrScrum && (
                            <div className="border-t bg-neutral-50 px-4 py-3">
                              <div className="flex items-center space-x-3">
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a user to add..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allUsers
                                      ?.filter(user => !projectTeamMembers?.some(member => member.id === user.id))
                                      ?.map(user => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                          <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs">
                                              {user.fullName?.substring(0, 1) || user.username?.substring(0, 1) || "?"}
                                            </div>
                                            <span>{user.fullName || user.username}</span>
                                          </div>
                                        </SelectItem>
                                      )) || []}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={handleAddTeamMember}
                                  disabled={!selectedUserId}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border rounded-md p-6 max-w-3xl text-center">
                          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <h5 className="text-lg font-medium text-gray-900 mb-2">No Team Assigned</h5>
                          <p className="text-sm text-gray-500 mb-4">
                            This project doesn't have a team assigned yet. Assign a team to enable member management and collaboration features.
                          </p>
                          {isAdminOrScrum && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAssignTeamDialog(true)}
                              className="text-gray-600 hover:text-gray-700 border-gray-300 hover:border-gray-400"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Assign Team
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Temporary Project Members Section */}
                    {isAdminOrScrum && (
                      <div>
                        <h4 className="text-md font-medium mb-4">Temporary Project Access</h4>
                        <div className="border rounded-md p-4 max-w-3xl bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-purple-900 mb-2">
                                Grant Temporary Access Without Team Membership
                              </p>
                              <p className="text-xs text-purple-700 mb-3">
                                Add users with temporary, limited access to this project without adding them to the team. 
                                Perfect for contractors, external reviewers, or temporary collaborators.
                              </p>
                              <div className="bg-white bg-opacity-60 rounded-md p-3 space-y-1 text-xs">
                                <p className="flex items-center gap-2">
                                  <span className="font-semibold text-green-700">✓ Team Members:</span> 
                                  <span>Full permanent access to all project features</span>
                                </p>
                                <p className="flex items-center gap-2">
                                  <span className="font-semibold text-purple-700">⏱ Project Members:</span> 
                                  <span>Limited temporary access with expiry dates</span>
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => setShowProjectMembersModal(true)}
                              className="ml-4 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Manage Project Members
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Danger Zone - Admin and Scrum Master Only */}
                    {isAdminOrScrum && (
                      <div>
                        <h4 className="text-md font-medium mb-4 text-red-600">Danger Zone</h4>
                        <div className="space-y-4 border border-red-200 rounded-md p-4">
                          {/* Debug info - remove after fixing */}
                          {(() => {
                            const status = project?.status;
                            const isArchived = status === 'ARCHIVED' ||
                              (status as string) === 'archived' ||
                              status?.toUpperCase() === 'ARCHIVED' ||
                              status?.toLowerCase() === 'archived';

                            return isArchived ? (
                              <div className="flex items-center justify-between py-4">
                                <div>
                                  <h4 className="text-sm font-medium text-green-800">Restore Project</h4>
                                  <p className="text-sm text-green-600">Restore this project to active views.</p>
                                </div>
                                <Button
                                  variant="outline"
                                  className="border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
                                  onClick={handleRestoreProject}
                                >
                                  Restore Project
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between py-4">
                                <div>
                                  <h4 className="text-sm font-medium text-red-800">Archive Project</h4>
                                  <p className="text-sm text-red-600">Archive this project to hide it from active views.</p>
                                </div>
                                <Button
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => openModal("archiveProject", { project })}
                                >
                                  Archive Project
                                </Button>
                              </div>
                            );
                          })()}

                          <div className="flex items-center justify-between py-4">
                            <div>
                              <h4 className="text-sm font-medium text-red-800">Delete Project</h4>
                              <p className="text-sm text-red-600">This action cannot be undone. All data will be permanently deleted.</p>
                            </div>
                            <Button
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={handleDeleteProject}
                            >
                              Delete Project
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

      {/* Modals */}
      {isOpen && modalType === "createItem" && (
        <CreateItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          projects={projects}
          workItems={workItems}
          currentProject={project}
        />
      )}

      {isOpen && modalType === "editItem" && (
        <EditItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          workItem={modalProps.workItem}
          projects={projects}
          workItems={workItems}
        />
      )}

      {isOpen && (modalType as string) === "viewItem" && (
        <ViewItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          workItem={modalProps.workItem}
          projects={projects}
          workItems={workItems}
          canEdit={modalProps.canEdit}
        />
      )}

      {isOpen && modalType === "deleteItem" && (
        <DeleteItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          workItem={modalProps.workItem}
        />
      )}

      {/* Quick Action Modal for creating items under parent work items */}
      <CreateItemModal
        isOpen={quickActionModal.isOpen}
        onClose={closeQuickAction}
        onSuccess={handleQuickActionSuccess}
        projects={projects}
        workItems={workItems}
        currentProject={project}
        preselectedParent={quickActionModal.parentStory ?? undefined}
        preselectedType={quickActionModal.type ?? undefined}
      />

      {isOpen && modalType === "archiveProject" && (
        <ArchiveProjectModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={async () => {
            // Invalidate both the projects list and specific project cache
            await queryClient.invalidateQueries({ queryKey: ['/projects'] });
            await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
            // Redirect to projects page after successful archive
            goToProjects();
          }}
          project={modalProps.project}
        />
      )}

      {/* Project Key Reset Dialog (Admin Only) */}
      <Dialog open={showKeyResetDialog} onOpenChange={setShowKeyResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Reset Project Key</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>This is an emergency function that will change the project key.</p>
              <p><strong>Warning:</strong> All future work items will use the new key. Existing work item IDs will not change.</p>
              <p className="text-red-600 font-medium">Only use this if the current key was entered incorrectly!</p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Project Key: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{project?.key}</span>
              </label>
            </div>
            <div>
              <label htmlFor="newProjectKey" className="block text-sm font-medium mb-2">
                New Project Key
              </label>
              <Input
                id="newProjectKey"
                value={newProjectKey}
                onChange={(e) => setNewProjectKey(e.target.value.toUpperCase())}
                placeholder="Enter new project key (e.g., PROJ)"
                className="font-mono"
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be 2-10 uppercase letters and numbers only
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowKeyResetDialog(false);
                setNewProjectKey("");
              }}
              disabled={isResettingKey}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetProjectKey}
              disabled={isResettingKey || !newProjectKey.trim()}
            >
              {isResettingKey ? "Resetting..." : "Reset Project Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Assignment Dialog (Admin/Scrum Master Only) */}
      <Dialog open={showAssignTeamDialog} onOpenChange={setShowAssignTeamDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {project?.teamId ? 'Change Project Team' : 'Assign Team to Project'}
            </DialogTitle>
            <DialogDescription>
              {project?.teamId
                ? 'Select a different team to assign to this project. This will change which team members have access to the project.'
                : 'Select a team to assign to this project. Team members will be able to access the project and be assigned to work items.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Team: <span className="font-semibold">{project?.teamId ?
                  teams?.find(team => team.id === project.teamId)?.name || 'Unknown Team' :
                  'No team assigned'}</span>
              </label>
            </div>
            <div>
              <label htmlFor="assignTeamId" className="block text-sm font-medium mb-2">
                Select Team
              </label>
              <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team (remove team assignment)</SelectItem>
                  {teams?.filter(team => team.id !== project?.teamId).map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{team.name}</span>
                      </div>
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignTeamDialog(false);
                setAssignTeamId("");
              }}
              disabled={isAssigningTeam}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignTeam}
              disabled={isAssigningTeam || !assignTeamId}
            >
              {isAssigningTeam ? "Assigning..." : (project?.teamId ? "Change Team" : "Assign Team")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actual Hours Dialog */}
      <Dialog open={showActualHoursDialog} onOpenChange={setShowActualHoursDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Actual Hours</DialogTitle>
            <DialogDescription>
              {pendingItemForHours ? `Enter actual hours spent on "${pendingItemForHours.title}"` : 'Enter actual hours spent'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="actualHours" className="block text-sm font-medium mb-2">
                Actual Hours
              </label>
              <Input
                id="actualHours"
                type="number"
                step="0.5"
                min="0"
                placeholder="Enter hours (e.g., 5.5)"
                value={actualHoursInputValue}
                onChange={(e) => setActualHoursInputValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowActualHoursDialog(false);
                setActualHoursInputValue("");
                setPendingItemForHours(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveActualHours}
            >
              Save & Mark Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Members Modal */}
      {project && (
        <ProjectMembersModal
          isOpen={showProjectMembersModal}
          onClose={() => setShowProjectMembersModal(false)}
          projectId={project.id}
          projectName={project.name}
          teamId={project.teamId}
        />
      )}
    </div>
  );
}
