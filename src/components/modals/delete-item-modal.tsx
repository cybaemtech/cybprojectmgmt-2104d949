import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkItem } from "@/types/schema";
import { workItemStore } from "@/lib/local-store";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

interface DeleteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workItem?: WorkItem;
}

export function DeleteItemModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  workItem
}: DeleteItemModalProps) {
  const { toast } = useToast();
  
  // Count all descendants recursively
  const descendantInfo = useMemo(() => {
    if (!workItem) return { total: 0, breakdown: {} as Record<string, number> };
    const allItems = workItemStore.byProject(workItem.projectId);
    const breakdown: Record<string, number> = {};
    
    const collectChildren = (parentId: number) => {
      allItems
        .filter((w) => w.parentId === parentId)
        .forEach((child) => {
          breakdown[child.type] = (breakdown[child.type] || 0) + 1;
          collectChildren(child.id);
        });
    };
    collectChildren(workItem.id);
    
    const total = Object.values(breakdown).reduce((sum, c) => sum + c, 0);
    return { total, breakdown };
  }, [workItem]);
  
  const handleDelete = () => {
    if (!workItem) {
      toast({
        title: "Error",
        description: "No work item provided for deletion.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const deletedCount = workItemStore.deleteCascade(workItem.id);
      
      toast({
        title: "Item deleted",
        description: deletedCount > 1 
          ? `Deleted ${workItem.externalId} and ${deletedCount - 1} child item(s).`
          : "The item has been deleted successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error deleting work item:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Could not delete the item. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!workItem) return null;

  const typeLabel = workItem.type.charAt(0) + workItem.type.slice(1).toLowerCase();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center text-destructive mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <DialogTitle className="text-lg font-semibold">Delete {typeLabel}</DialogTitle>
          </div>
          <DialogDescription className="text-neutral-600">
            Are you sure you want to delete <span className="font-medium text-neutral-800">{workItem.externalId}: {workItem.title}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {/* Cascade warning for parent items */}
        {descendantInfo.total > 0 && (
          <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive border border-destructive/20 mb-3">
            <p className="font-medium mb-1">⚠️ Cascading Delete Warning:</p>
            <p>This will also permanently delete <strong>{descendantInfo.total}</strong> child item(s):</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {Object.entries(descendantInfo.breakdown).map(([type, count]) => (
                <li key={type}>{count} {type.charAt(0) + type.slice(1).toLowerCase()}(s)</li>
              ))}
            </ul>
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete{descendantInfo.total > 0 ? ` (${descendantInfo.total + 1} items)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
