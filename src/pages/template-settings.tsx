import { useState, useEffect, useCallback } from "react";

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
import { Plus, Pencil, Trash2, GripVertical, ShieldCheck, Code2, Info, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getLocalUser } from "@/lib/local-store";

// ─── Types ──────────────────────────────────────────────────────────────────
interface TemplateTask {
  id: number;
  templateNo: number;
  title: string;
  itemOrder: number;
  isActive: boolean;
  ownerId: number; // user who created this template task
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "work-item-templates";

// ─── Local Storage helpers ──────────────────────────────────────────────────
function getAllTasks(): TemplateTask[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: TemplateTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getTasksForUser(userId: number): TemplateTask[] {
  return getAllTasks().filter(t => t.ownerId === userId);
}

// ─── Sample Templates ───────────────────────────────────────────────────────
function loadSampleTemplates(userId: number): TemplateTask[] {
  const now = new Date().toISOString();
  const existing = getAllTasks();
  const maxId = existing.reduce((m, t) => Math.max(m, t.id), 0);

  const samples: Omit<TemplateTask, "id">[] = [
    // Template #1 — Admin / Requirement Gathering
    { templateNo: 1, title: "Client Requirement Call", itemOrder: 1, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 1, title: "Prepare Requirement Document", itemOrder: 2, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 1, title: "Feasibility Analysis", itemOrder: 3, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 1, title: "Design Review / Wireframes", itemOrder: 4, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 1, title: "Estimation & Timeline", itemOrder: 5, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 1, title: "Client Sign-Off", itemOrder: 6, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    // Template #2 — Developer Tasks
    { templateNo: 2, title: "Setup Development Branch", itemOrder: 1, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 2, title: "Database Schema Changes", itemOrder: 2, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 2, title: "Backend API Implementation", itemOrder: 3, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 2, title: "Frontend UI Development", itemOrder: 4, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 2, title: "Unit Tests", itemOrder: 5, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 2, title: "Code Review", itemOrder: 6, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 2, title: "QA Testing", itemOrder: 7, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
    { templateNo: 2, title: "Deploy to Staging", itemOrder: 8, isActive: true, ownerId: userId, createdAt: now, updatedAt: now },
  ];

  const newTasks: TemplateTask[] = samples.map((s, i) => ({ ...s, id: maxId + i + 1 }));
  saveTasks([...existing, ...newTasks]);
  return newTasks;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TemplateSettings() {
  const { toast } = useToast();
  const currentUser = getLocalUser();
  const [tasks, setTasks] = useState<TemplateTask[]>([]);

  const reload = useCallback(() => {
    const userTasks = getTasksForUser(currentUser.id);
    if (userTasks.length === 0) {
      // Auto-load samples on first visit
      const samples = loadSampleTemplates(currentUser.id);
      setTasks(samples);
    } else {
      setTasks(userTasks);
    }
  }, [currentUser.id]);

  useEffect(() => { reload(); }, [reload]);

  const t1 = tasks.filter(t => t.templateNo === 1).sort((a, b) => a.itemOrder - b.itemOrder);
  const t2 = tasks.filter(t => t.templateNo === 2).sort((a, b) => a.itemOrder - b.itemOrder);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addTask = (title: string, templateNo: number) => {
    const all = getAllTasks();
    const maxId = all.reduce((m, t) => Math.max(m, t.id), 0);
    const sameTemplate = tasks.filter(t => t.templateNo === templateNo);
    const maxOrder = sameTemplate.reduce((m, t) => Math.max(m, t.itemOrder), 0);
    const now = new Date().toISOString();
    const newTask: TemplateTask = {
      id: maxId + 1, templateNo, title, itemOrder: maxOrder + 1,
      isActive: true, ownerId: currentUser.id, createdAt: now, updatedAt: now,
    };
    saveTasks([...all, newTask]);
    reload();
  };

  const updateTask = (id: number, updates: Partial<TemplateTask>) => {
    const all = getAllTasks();
    const idx = all.findIndex(t => t.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
      saveTasks(all);
      reload();
    }
  };

  const deleteTask = (id: number) => {
    saveTasks(getAllTasks().filter(t => t.id !== id));
    reload();
  };

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [addDialog, setAddDialog] = useState<{ open: boolean; templateNo: number }>({ open: false, templateNo: 1 });
  const [editDialog, setEditDialog] = useState<TemplateTask | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<TemplateTask | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask(newTitle.trim(), addDialog.templateNo);
    toast({ title: 'Task added', description: `"${newTitle.trim()}" added to Template #${addDialog.templateNo}` });
    setNewTitle('');
    setAddDialog({ open: false, templateNo: 1 });
  };

  const handleEdit = () => {
    if (!editDialog || !editTitle.trim()) return;
    updateTask(editDialog.id, { title: editTitle.trim() });
    toast({ title: 'Updated', description: 'Template task updated successfully' });
    setEditDialog(null);
  };

  const handleToggleActive = (task: TemplateTask) => {
    updateTask(task.id, { isActive: !task.isActive });
    toast({ title: 'Updated', description: `Task ${task.isActive ? 'disabled' : 'enabled'}` });
  };

  const handleDelete = () => {
    if (!deleteDialog) return;
    deleteTask(deleteDialog.id);
    toast({ title: 'Deleted', description: `"${deleteDialog.title}" removed` });
    setDeleteDialog(null);
  };

  const handleLoadSamples = () => {
    // Remove existing user templates first, then load fresh samples
    const all = getAllTasks().filter(t => t.ownerId !== currentUser.id);
    saveTasks(all);
    const samples = loadSampleTemplates(currentUser.id);
    setTasks(samples);
    toast({ title: 'Samples Loaded', description: 'Sample templates have been loaded.' });
  };

  // ── Task List Row ─────────────────────────────────────────────────────────
  const TaskRow = ({ task }: { task: TemplateTask }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${task.isActive ? 'bg-background border-border' : 'bg-muted border-dashed border-border opacity-60'}`}>
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${!task.isActive ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={task.isActive} onCheckedChange={() => handleToggleActive(task)} />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTitle(task.title); setEditDialog(task); }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog(task)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  // ── Template Panel ────────────────────────────────────────────────────────
  const TemplatePanel = ({ templateNo, tasks: panelTasks, icon: Icon, color, label, description }: {
    templateNo: number; tasks: TemplateTask[]; icon: any; color: string; label: string; description: string;
  }) => (
    <Card className="h-full">
      <CardHeader className={`rounded-t-lg pb-3 ${color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-base">Template #{templateNo} — {label}</CardTitle>
          </div>
          <Badge variant="secondary">{panelTasks.filter(t => t.isActive).length} active</Badge>
        </div>
        <CardDescription className="text-inherit opacity-80 text-xs mt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {panelTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tasks configured yet.<br />
            <span className="text-xs">Click "Add Task" to get started.</span>
          </div>
        )}
        {panelTasks.map(task => <TaskRow key={task.id} task={task} />)}
        <Button variant="outline" size="sm" className="w-full mt-3 border-dashed" onClick={() => { setNewTitle(''); setAddDialog({ open: true, templateNo }); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Task
        </Button>
      </CardContent>
    </Card>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Work Item Templates</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your personal task templates — visible only to you. Configure tasks that can be used when creating work items.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLoadSamples}>
            <Download className="h-4 w-4 mr-1" /> Reset to Samples
          </Button>
        </div>

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">How templates work</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li><strong>Template #1</strong> — Requirement Gathering tasks for when a Client Requirement (FEATURE) is created.</li>
              <li><strong>Template #2</strong> — Developer task checklist for Change Requests (STORY).</li>
              <li>Each user manages their own templates independently.</li>
            </ul>
          </div>
        </div>

        <Tabs defaultValue="both">
          <TabsList className="mb-4">
            <TabsTrigger value="both">Both Templates</TabsTrigger>
            <TabsTrigger value="t1">Template #1 (Requirement)</TabsTrigger>
            <TabsTrigger value="t2">Template #2 (Developer)</TabsTrigger>
          </TabsList>

          <TabsContent value="both">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TemplatePanel templateNo={1} tasks={t1} icon={ShieldCheck} color="bg-orange-50 text-orange-900" label="Requirement Gathering" description="Tasks for initial requirement analysis and client sign-off." />
              <TemplatePanel templateNo={2} tasks={t2} icon={Code2} color="bg-blue-50 text-blue-900" label="Developer Checklist" description="Standard development workflow tasks." />
            </div>
          </TabsContent>
          <TabsContent value="t1">
            <div className="max-w-lg">
              <TemplatePanel templateNo={1} tasks={t1} icon={ShieldCheck} color="bg-orange-50 text-orange-900" label="Requirement Gathering" description="Tasks for initial requirement analysis and client sign-off." />
            </div>
          </TabsContent>
          <TabsContent value="t2">
            <div className="max-w-lg">
              <TemplatePanel templateNo={2} tasks={t2} icon={Code2} color="bg-blue-50 text-blue-900" label="Developer Checklist" description="Standard development workflow tasks." />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={addDialog.open} onOpenChange={o => setAddDialog(v => ({ ...v, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Task to Template #{addDialog.templateNo}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-task-title">Task Title</Label>
            <Input id="new-task-title" placeholder="e.g. Client Requirement Call" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(v => ({ ...v, open: false }))}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newTitle.trim()}><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editDialog} onOpenChange={o => !o && setEditDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Template Task</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="edit-task-title">Task Title</Label>
            <Input id="edit-task-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEdit()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editTitle.trim()}><Pencil className="h-4 w-4 mr-1" /> Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteDialog} onOpenChange={o => !o && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template Task</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>"{deleteDialog?.title}"</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
