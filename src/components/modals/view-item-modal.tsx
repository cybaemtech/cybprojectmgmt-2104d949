import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { Project, User, WorkItem } from "@/types/schema";
import { EditItemModal } from "./edit-item-modal";

interface ViewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workItem?: WorkItem;
  projects?: Project[];
  workItems?: WorkItem[];
  canEdit?: boolean;
}

const statusLabels: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  DONE: "Done",
  LEAD: "Lead",
  ONBOARDING: "Onboarding",
  ACTIVE: "Active",
  CHURNED: "Churned",
};

const priorityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const severityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const typeLabels: Record<string, string> = {
  EPIC: "Client Details",
  FEATURE: "Client Requirement",
  STORY: "Change Request",
  TASK: "Task",
  BUG: "Bug",
};

const typeColors: Record<string, string> = {
  EPIC: "bg-purple-100 text-purple-800",
  FEATURE: "bg-blue-100 text-blue-800",
  STORY: "bg-green-100 text-green-800",
  TASK: "bg-orange-100 text-orange-800",
  BUG: "bg-red-100 text-red-800",
};

// EPIC uses status values mapped to client status labels
const epicStatusLabels: Record<string, string> = {
  TODO: "Lead",
  IN_PROGRESS: "Onboarding",
  ON_HOLD: "Active",
  DONE: "Inactive / Churned",
};

function calculateTotalEstimatedHours(itemId: number, itemType: string, workItems: WorkItem[]): number {
  let totalHours = 0;
  if (itemType === 'EPIC') {
    const children = workItems.filter(i => i.type === 'FEATURE' && i.parentId === itemId);
    for (const c of children) totalHours += calculateTotalEstimatedHours(c.id, 'FEATURE', workItems);
  } else if (itemType === 'FEATURE') {
    const children = workItems.filter(i => i.type === 'STORY' && i.parentId === itemId);
    for (const c of children) totalHours += calculateTotalEstimatedHours(c.id, 'STORY', workItems);
  } else if (itemType === 'STORY') {
    const children = workItems.filter(i => (i.type === 'TASK' || i.type === 'BUG') && i.parentId === itemId);
    for (const c of children) totalHours += Number(c.estimate) || 0;
  } else {
    return Number(workItems.find(i => i.id === itemId)?.estimate) || 0;
  }
  return totalHours;
}

function calculateTotalActualHours(itemId: number, itemType: string, workItems: WorkItem[]): number {
  let totalHours = 0;
  if (itemType === 'EPIC') {
    const children = workItems.filter(i => i.type === 'FEATURE' && i.parentId === itemId);
    for (const c of children) totalHours += calculateTotalActualHours(c.id, 'FEATURE', workItems);
  } else if (itemType === 'FEATURE') {
    const children = workItems.filter(i => i.type === 'STORY' && i.parentId === itemId);
    for (const c of children) totalHours += calculateTotalActualHours(c.id, 'STORY', workItems);
  } else if (itemType === 'STORY') {
    const children = workItems.filter(i => (i.type === 'TASK' || i.type === 'BUG') && i.parentId === itemId);
    for (const c of children) {
      const h = parseFloat(String(c.actualHours));
      if (!isNaN(h) && h > 0) totalHours += h;
    }
  } else {
    const item = workItems.find(i => i.id === itemId);
    const h = parseFloat(String(item?.actualHours));
    return (!isNaN(h) && h > 0) ? h : 0;
  }
  return totalHours;
}

export function ViewItemModal({
  isOpen,
  onClose,
  onSuccess,
  workItem,
  projects = [],
  workItems = [],
  canEdit = false,
}: ViewItemModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  if (!workItem) return null;

  const project = projects.find(p => p.id === workItem.projectId);
  const parentItem = workItems.find(i => i.id === workItem.parentId);
  const isParentType = ['EPIC', 'FEATURE', 'STORY'].includes(workItem.type);
  const totalEstHours = isParentType ? calculateTotalEstimatedHours(workItem.id, workItem.type, workItems) : null;
  const totalActHours = isParentType ? calculateTotalActualHours(workItem.id, workItem.type, workItems) : null;

  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    onSuccess();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showEditModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden text-neutral-900 bg-white">
          <DialogHeader className="p-6 pb-0 bg-white">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-lg font-semibold">
                {workItem.externalId}: {workItem.title}
              </DialogTitle>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleEditClick}
                  title="Edit this item"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[80vh] px-6 py-4 bg-white">
            <div className="space-y-6 pb-4">
              {/* Type & Status badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={typeColors[workItem.type] || "bg-gray-100 text-gray-800"}>
                  {typeLabels[workItem.type] || workItem.type}
                </Badge>
                <Badge variant="outline">
                  {workItem.type === 'EPIC'
                    ? epicStatusLabels[workItem.status] || workItem.status
                    : statusLabels[workItem.status] || workItem.status}
                </Badge>
                {workItem.priority && workItem.type !== 'EPIC' && workItem.type !== 'STORY' && (
                  <Badge variant="secondary">
                    Priority: {priorityLabels[workItem.priority] || workItem.priority}
                  </Badge>
                )}
                {workItem.type === 'BUG' && workItem.severity && (
                  <Badge variant="destructive">
                    Severity: {severityLabels[workItem.severity] || workItem.severity}
                  </Badge>
                )}
              </div>

              {/* ═══════════════════ EPIC (Client Details) CRM Layout ═══════════════════ */}
              {workItem.type === 'EPIC' && (
                <div className="space-y-4">
                  {/* Core Client Information */}
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                    <h3 className="font-semibold text-sm text-primary">Core Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Industry / Sector</h4>
                        <p className="text-sm">{workItem.tags || '—'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Company Website</h4>
                        {workItem.githubUrl ? (
                          <a href={workItem.githubUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline">{workItem.githubUrl}</a>
                        ) : <p className="text-sm">—</p>}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="p-4 bg-accent/30 rounded-lg border border-accent space-y-3">
                    <h3 className="font-semibold text-sm text-accent-foreground">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Primary Contact Name</h4>
                        <p className="text-sm">{workItem.currentBehavior || '—'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Contact Email</h4>
                        {workItem.expectedBehavior ? (
                          <a href={`mailto:${workItem.expectedBehavior}`}
                            className="text-sm text-primary hover:underline">{workItem.expectedBehavior}</a>
                        ) : <p className="text-sm">—</p>}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Contact Phone</h4>
                        <p className="text-sm">{workItem.referenceUrl || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Relationship Management */}
                  <div className="p-4 bg-secondary/30 rounded-lg border border-secondary space-y-3">
                    <h3 className="font-semibold text-sm text-secondary-foreground">Relationship Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Client Status</h4>
                        <p className="text-sm">{epicStatusLabels[workItem.status] || workItem.status}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Project</h4>
                        <p className="text-sm">{project?.name || '—'}</p>
                      </div>
                    </div>
                    {workItem.description && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Client Description / Notes</h4>
                        <p className="text-sm whitespace-pre-wrap bg-white/50 p-3 rounded border">{workItem.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Aggregated Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Total Estimated Hours</h4>
                      <p className="text-sm">{totalEstHours !== null ? `${totalEstHours}h (aggregated)` : '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Total Actual Hours</h4>
                      <p className="text-sm">{totalActHours !== null ? `${totalActHours}h (aggregated)` : '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════ FEATURE (Client Requirement) ═══════════════════ */}
              {workItem.type === 'FEATURE' && (
                <>
                  {/* Description */}
                  {workItem.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Client Requirement Description</h4>
                      <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border">{workItem.description}</p>
                    </div>
                  )}

                  {/* PDF & Prototype */}
                  <div className="space-y-3 p-4 bg-orange-50/30 rounded-lg border border-orange-100">
                    {(workItem as any)?.pdfUploadBlob && (
                      <div>
                        <h4 className="text-sm font-semibold text-orange-900 mb-1">Requirement Document</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {((workItem as any).pdfUploadPath || 'Document.pdf').replace(/^pdf_\d+_/, '')}
                          </span>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() => {
                              const pdfData = (workItem as any).pdfUploadBlob;
                              if (!pdfData) return;
                              try {
                                const base64Content = pdfData.split(',')[1];
                                const binaryString = window.atob(base64Content);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                const blob = new Blob([bytes], { type: 'application/pdf' });
                                window.open(URL.createObjectURL(blob), '_blank');
                              } catch (e) { window.open(pdfData, '_blank'); }
                            }}
                          >
                            View Document
                          </Button>
                        </div>
                      </div>
                    )}
                    {(workItem as any)?.prototypeLink && (
                      <div>
                        <h4 className="text-sm font-semibold text-orange-900 mb-1">GitHub / Prototype Link</h4>
                        <a href={(workItem as any).prototypeLink} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline">{(workItem as any).prototypeLink}</a>
                      </div>
                    )}
                  </div>

                  {/* Project & Parent */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Project</h4>
                      <p className="text-sm">{project?.name || '—'}</p>
                    </div>
                    {parentItem && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Client Details</h4>
                        <p className="text-sm">{parentItem.externalId}: {parentItem.title}</p>
                      </div>
                    )}
                  </div>

                  {/* Hours & Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Estimated Hours</h4>
                      <p className="text-sm">
                        {totalEstHours !== null ? `${totalEstHours}h (aggregated)` : workItem.estimate ? `${workItem.estimate}` : '—'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Actual Hours</h4>
                      <p className="text-sm">
                        {totalActHours !== null ? `${totalActHours}h (aggregated)` : workItem.actualHours != null ? `${workItem.actualHours}` : '—'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Start Date</h4>
                      <p className="text-sm">{formatDate(workItem.startDate)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">End Date</h4>
                      <p className="text-sm">{formatDate(workItem.endDate)}</p>
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════════ STORY (Change Request) ═══════════════════ */}
              {workItem.type === 'STORY' && (
                <>
                  {/* Requirement Points (description) */}
                  {workItem.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Requirement Points</h4>
                      <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border">{workItem.description}</p>
                    </div>
                  )}

                  {/* Efforts */}
                  {workItem.priority && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Efforts</h4>
                      <p className="text-sm">
                        {workItem.priority === 'LOW' ? 'Simple' :
                          workItem.priority === 'MEDIUM' ? 'Medium' :
                            workItem.priority === 'HIGH' ? 'Semi-complex' :
                              workItem.priority === 'CRITICAL' ? 'Complex' : workItem.priority}
                      </p>
                    </div>
                  )}

                  {/* Project, Parent, Assignee */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Project</h4>
                      <p className="text-sm">{project?.name || '—'}</p>
                    </div>
                    {parentItem && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Client Requirement</h4>
                        <p className="text-sm">{parentItem.externalId}: {parentItem.title}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Assignee</h4>
                      <p className="text-sm">{workItem.createdByName || workItem.createdByEmail || '—'}</p>
                    </div>
                  </div>

                  {/* Hours & Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Estimated Hours</h4>
                      <p className="text-sm">
                        {totalEstHours !== null ? `${totalEstHours}h (aggregated)` : workItem.estimate ? `${workItem.estimate}` : '—'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Actual Hours</h4>
                      <p className="text-sm">
                        {totalActHours !== null ? `${totalActHours}h (aggregated)` : workItem.actualHours != null ? `${workItem.actualHours}` : '—'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Start Date</h4>
                      <p className="text-sm">{formatDate(workItem.startDate)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">End Date</h4>
                      <p className="text-sm">{formatDate(workItem.endDate)}</p>
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════════ TASK ═══════════════════ */}
              {workItem.type === 'TASK' && (
                <>
                  {/* Description (if any) */}
                  {workItem.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Description</h4>
                      <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border">{workItem.description}</p>
                    </div>
                  )}

                  {/* Project, Parent (Change Request), Assignee */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Project</h4>
                      <p className="text-sm">{project?.name || '—'}</p>
                    </div>
                    {parentItem && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Change Request</h4>
                        <p className="text-sm">{parentItem.externalId}: {parentItem.title}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Assignee</h4>
                      <p className="text-sm">{workItem.createdByName || workItem.createdByEmail || '—'}</p>
                    </div>
                  </div>

                  {/* Hours & Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Estimated Hours</h4>
                      <p className="text-sm">{workItem.estimate ? `${workItem.estimate}` : '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Actual Hours</h4>
                      <p className="text-sm">{workItem.actualHours != null ? `${workItem.actualHours}` : '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Start Date</h4>
                      <p className="text-sm">{formatDate(workItem.startDate)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">End Date</h4>
                      <p className="text-sm">{formatDate(workItem.endDate)}</p>
                    </div>
                  </div>
                </>
              )}

              {/* ═══════════════════ BUG ═══════════════════ */}
              {workItem.type === 'BUG' && (
                <>
                  {/* Bug details block */}
                  <div className="space-y-3 p-4 bg-blue-50 rounded border border-blue-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500">Bug Type</h4>
                        <p className="text-sm">{workItem.bugType === 'PROD_INCIDENT' ? 'Prod Incident' : workItem.bugType === 'DEFECT' ? 'Defect' : 'Bug'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500">Priority</h4>
                        <p className="text-sm">{priorityLabels[workItem.priority || ''] || '—'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500">Severity</h4>
                        <p className="text-sm">{severityLabels[workItem.severity || ''] || '—'}</p>
                      </div>
                    </div>

                    {/* Defect Description */}
                    {workItem.description && (
                      <div className="pt-2 border-t border-blue-200">
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Defect Description</h4>
                        <p className="text-sm whitespace-pre-wrap bg-white/50 p-3 rounded border">{workItem.description}</p>
                      </div>
                    )}

                    {(workItem.bugType === 'DEFECT' || workItem.bugType === 'PROD_INCIDENT') && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200">
                        <div>
                          <h4 className="text-sm font-semibold text-neutral-500">Current Behavior</h4>
                          <p className="text-sm whitespace-pre-wrap">{workItem.currentBehavior || '—'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-neutral-500">Expected Behavior</h4>
                          <p className="text-sm whitespace-pre-wrap">{workItem.expectedBehavior || '—'}</p>
                        </div>
                      </div>
                    )}
                    {/* Screenshot */}
                    {((workItem as any)?.screenshotBlob || (workItem as any)?.screenshotPath) && (
                      <div className="pt-2 border-t border-blue-200">
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Screenshot / Attachment</h4>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-xs"
                          onClick={() => {
                            const b64 = (workItem as any).screenshotBlob || (workItem as any).screenshot;
                            if (b64) {
                              try {
                                let base64Content = b64.includes(',') ? b64.split(',')[1] : b64;
                                const binaryString = window.atob(base64Content);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                const screenshotPath = (workItem as any).screenshotPath || '';
                                const fileType = screenshotPath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
                                const blob = new Blob([bytes], { type: fileType });
                                window.open(URL.createObjectURL(blob), '_blank');
                              } catch (e) { console.error("Could not view screenshot", e); }
                            } else if ((workItem as any).screenshotPath) {
                              window.open((workItem as any).screenshotPath, '_blank');
                            }
                          }}
                        >
                          View Attachment
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Project, Parent (Change Request), Assignee */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Project</h4>
                      <p className="text-sm">{project?.name || '—'}</p>
                    </div>
                    {parentItem && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-500 mb-1">Change Request</h4>
                        <p className="text-sm">{parentItem.externalId}: {parentItem.title}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Assignee</h4>
                      <p className="text-sm">{workItem.createdByName || workItem.createdByEmail || '—'}</p>
                    </div>
                  </div>

                  {/* Hours & Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Estimated Hours</h4>
                      <p className="text-sm">{workItem.estimate ? `${workItem.estimate}` : '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Actual Hours</h4>
                      <p className="text-sm">{workItem.actualHours != null ? `${workItem.actualHours}` : '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Start Date</h4>
                      <p className="text-sm">{formatDate(workItem.startDate)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">End Date</h4>
                      <p className="text-sm">{formatDate(workItem.endDate)}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Tags - for non-EPIC types (EPIC shows tags as Industry in CRM block) */}
              {workItem.type !== 'EPIC' && workItem.tags && (
                <div>
                  <h4 className="text-sm font-semibold text-neutral-500 mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {workItem.tags.split(',').map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Modal - opens when pencil is clicked */}
      {showEditModal && (
        <EditItemModal
          isOpen={showEditModal}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
          workItem={workItem}
          projects={projects}
          workItems={workItems}
        />
      )}
    </>
  );
}
