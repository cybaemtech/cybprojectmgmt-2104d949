import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, GripVertical, ShieldCheck, Code2, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiDelete, apiCall } from "@/lib/api-config";
import { User, Team, Project } from "@/types/schema";

// ─── Types ──────────────────────────────────────────────────────────────────
interface TemplateTask {
  id: number;
  templateNo: number;
  title: string;
  itemOrder: number;
  isActive: boolean;
  managedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────
const BASE = '/work-item-templates';

async function fetchTemplates(no?: number): Promise<TemplateTask[]> {
  return apiGet(no ? `${BASE}?template=${no}` : BASE);
}

async function apiCreateTask(body: { title: string; template_no: number }): Promise<TemplateTask> {
  return apiPost(BASE, body);
}

async function apiUpdateTask(id: number, body: Partial<TemplateTask>): Promise<TemplateTask> {
  return apiCall('PUT' as any, `${BASE}?id=${id}`, body);
}

async function apiDeleteTask(id: number): Promise<void> {
  return apiDelete(`${BASE}?id=${id}`);
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TemplateSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
  });
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/teams'],
    queryFn: () => apiGet('/teams'),
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/projects'],
    queryFn: () => apiGet('/projects'),
  });

  const isAdminOrScrum = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER');

  const { data: allTasks = [], isLoading } = useQuery<TemplateTask[]>({
    queryKey: ['/work-item-templates'],
    queryFn: () => fetchTemplates(),
  });

  const t1 = allTasks.filter(t => t.templateNo === 1).sort((a, b) => a.itemOrder - b.itemOrder);
  const t2 = allTasks.filter(t => t.templateNo === 2).sort((a, b) => a.itemOrder - b.itemOrder);

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['/work-item-templates'] });

  const createMut = useMutation({ mutationFn: apiCreateTask, onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiUpdateTask(id, body),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({ mutationFn: apiDeleteTask, onSuccess: invalidate });

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [addDialog, setAddDialog] = useState<{ open: boolean; templateNo: number }>({ open: false, templateNo: 1 });
  const [editDialog, setEditDialog] = useState<TemplateTask | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<TemplateTask | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await createMut.mutateAsync({ title: newTitle.trim(), template_no: addDialog.templateNo });
      toast({ title: 'Task added', description: `"${newTitle.trim()}" added to Template #${addDialog.templateNo}` });
      setNewTitle('');
      setAddDialog({ open: false, templateNo: 1 });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!editDialog || !editTitle.trim()) return;
    try {
      await updateMut.mutateAsync({ id: editDialog.id, body: { title: editTitle.trim() } });
      toast({ title: 'Updated', description: 'Template task updated successfully' });
      setEditDialog(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (task: TemplateTask) => {
    try {
      await updateMut.mutateAsync({ id: task.id, body: { is_active: task.isActive ? 0 : 1 } });
      toast({ title: 'Updated', description: `Task ${task.isActive ? 'disabled' : 'enabled'}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await deleteMut.mutateAsync(deleteDialog.id);
      toast({ title: 'Deleted', description: `"${deleteDialog.title}" removed` });
      setDeleteDialog(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // ── Task List Row ─────────────────────────────────────────────────────────
  const TaskRow = ({ task, canEdit }: { task: TemplateTask; canEdit: boolean }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${task.isActive ? 'bg-white border-neutral-200' : 'bg-neutral-50 border-dashed border-neutral-300 opacity-60'
      }`}>
      <GripVertical className="h-4 w-4 text-neutral-300 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${!task.isActive ? 'line-through text-neutral-400' : ''}`}>
          {task.title}
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2">
          <Switch
            checked={task.isActive}
            onCheckedChange={() => handleToggleActive(task)}
            id={`active-${task.id}`}
          />
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => { setEditTitle(task.title); setEditDialog(task); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialog(task)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

  // ── Template Panel ────────────────────────────────────────────────────────
  const TemplatePanel = ({
    templateNo, tasks, icon: Icon, color, label, description, canManage,
  }: {
    templateNo: number;
    tasks: TemplateTask[];
    icon: any;
    color: string;
    label: string;
    description: string;
    canManage: boolean;
  }) => (
    <Card className="h-full">
      <CardHeader className={`rounded-t-lg pb-3 ${color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-base">Template #{templateNo} — {label}</CardTitle>
          </div>
          <Badge variant="secondary">{tasks.filter(t => t.isActive).length} active</Badge>
        </div>
        <CardDescription className="text-inherit opacity-80 text-xs mt-1">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {tasks.length === 0 && (
          <div className="text-center py-8 text-neutral-400 text-sm">
            No tasks configured yet.<br />
            {canManage && <span className="text-xs">Click "Add Task" to get started.</span>}
          </div>
        )}
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} canEdit={canManage} />
        ))}

        {canManage && (
          <Button
            variant="outline" size="sm" className="w-full mt-3 border-dashed"
            onClick={() => { setNewTitle(''); setAddDialog({ open: true, templateNo }); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        )}

        {!canManage && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            This template is managed by your Administrator.
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Work Item Templates</h1>
              <p className="text-gray-500 text-sm mt-1">
                Configure the tasks that are automatically created when a new
                <strong> Client Requirement (FEATURE)</strong> is added to a project.
              </p>
            </div>

            {/* Info banner */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">How templates work</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li><strong>Template #1</strong> tasks are auto-created (as TASKs) under the "Initial Requirement Gathering" story whenever a <em>Client Requirement (FEATURE)</em> is created.</li>
                  <li><strong>Template #2</strong> tasks are the developer's own task list — they can create these manually per Change Request (STORY).</li>
                </ul>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="both">
                <TabsList className="mb-4">
                  <TabsTrigger value="both">Both Templates</TabsTrigger>
                  <TabsTrigger value="t1">Template #1 (Admin)</TabsTrigger>
                  <TabsTrigger value="t2">Template #2 (Developer)</TabsTrigger>
                </TabsList>

                <TabsContent value="both">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TemplatePanel
                      templateNo={1} tasks={t1}
                      icon={ShieldCheck} color="bg-orange-50 text-orange-900"
                      label="Admin Managed"
                      description="Auto-created when a Client Requirement is added. Only Admins & Scrum Masters can edit."
                      canManage={!!isAdminOrScrum}
                    />
                    <TemplatePanel
                      templateNo={2} tasks={t2}
                      icon={Code2} color="bg-blue-50 text-blue-900"
                      label="Developer Managed"
                      description="Reference task list developers use when creating their own tasks under a Change Request."
                      canManage={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="t1">
                  <div className="max-w-lg">
                    <TemplatePanel
                      templateNo={1} tasks={t1}
                      icon={ShieldCheck} color="bg-orange-50 text-orange-900"
                      label="Admin Managed"
                      description="Auto-created when a Client Requirement is added. Only Admins & Scrum Masters can edit."
                      canManage={!!isAdminOrScrum}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="t2">
                  <div className="max-w-lg">
                    <TemplatePanel
                      templateNo={2} tasks={t2}
                      icon={Code2} color="bg-blue-50 text-blue-900"
                      label="Developer Managed"
                      description="Reference task list developers use when creating their own tasks under a Change Request."
                      canManage={true}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

      {/* Add Task Dialog */}
      <Dialog open={addDialog.open} onOpenChange={o => setAddDialog(v => ({ ...v, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task to Template #{addDialog.templateNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-task-title">Task Title</Label>
            <Input
              id="new-task-title"
              placeholder="e.g. Client Requirement Call"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(v => ({ ...v, open: false }))}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newTitle.trim() || createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editDialog} onOpenChange={o => !o && setEditDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Template Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="edit-task-title">Task Title</Label>
            <Input
              id="edit-task-title"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEdit()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editTitle.trim() || updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteDialog} onOpenChange={o => !o && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteDialog?.title}"</strong>?
              This will no longer be auto-created for new items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
