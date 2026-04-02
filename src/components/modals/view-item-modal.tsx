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
                  {statusLabels[workItem.status] || workItem.status}
                </Badge>
                {workItem.priority && (
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

              {/* Description */}
              {workItem.type !== 'TASK' && workItem.description && (
                <div>
                  <h4 className="text-sm font-semibold text-neutral-500 mb-1">
                    {workItem.type === 'FEATURE' ? 'Client Requirement Description' :
                      workItem.type === 'STORY' ? 'Requirement Point' : 'Description'}
                  </h4>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border">{workItem.description}</p>
                </div>
              )}

              {/* FEATURE: PDF & Prototype */}
              {workItem.type === 'FEATURE' && (
                <div className="space-y-3 p-4 bg-orange-50/30 rounded-lg border border-orange-100">
                  {(workItem as any)?.pdfUploadBlob && (
                    <div>
                      <h4 className="text-sm font-semibold text-orange-900 mb-1">Requirement Document</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{(workItem as any).pdfUploadPath || 'Document.pdf'}</span>
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
              )}

              {/* BUG specific */}
              {workItem.type === 'BUG' && (
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
                  {(workItem as any)?.screenshot_path && (
                    <div className="pt-2 border-t border-blue-200">
                      <h4 className="text-sm font-semibold text-neutral-500 mb-1">Screenshot / Attachment</h4>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => {
                          const b64 = (workItem as any).screenshot_blob;
                          if (b64) {
                            try {
                              let base64Content = b64.includes(',') ? b64.split(',')[1] : b64;
                              const binaryString = window.atob(base64Content);
                              const bytes = new Uint8Array(binaryString.length);
                              for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                              const fileType = (workItem as any).screenshot_path?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
                              const blob = new Blob([bytes], { type: fileType });
                              window.open(URL.createObjectURL(blob), '_blank');
                            } catch (e) { console.error("Could not view screenshot", e); }
                          }
                        }}
                      >
                        View Attachment
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STORY Efforts */}
              {workItem.type === 'STORY' && workItem.priority && (
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

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-500 mb-1">Project</h4>
                  <p className="text-sm">{project?.name || '—'}</p>
                </div>
                {parentItem && (
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-500 mb-1">
                      {workItem.type === 'FEATURE' ? 'Client Details' :
                        workItem.type === 'STORY' ? 'Client Requirement' :
                          workItem.type === 'TASK' || workItem.type === 'BUG' ? 'Change Request' : 'Parent'}
                    </h4>
                    <p className="text-sm">{parentItem.externalId}: {parentItem.title}</p>
                  </div>
                )}
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-500 mb-1">
                    Estimated Hours
                  </h4>
                  <p className="text-sm">
                    {isParentType && totalEstHours !== null
                      ? `${totalEstHours}h (aggregated)`
                      : workItem.estimate ? `${workItem.estimate}` : '—'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-500 mb-1">Actual Hours</h4>
                  <p className="text-sm">
                    {isParentType && totalActHours !== null
                      ? `${totalActHours}h (aggregated)`
                      : workItem.actualHours != null ? `${workItem.actualHours}` : '—'}
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

              {/* Tags */}
              {workItem.tags && (
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
