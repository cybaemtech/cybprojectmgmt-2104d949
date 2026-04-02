import { useState, useEffect, useCallback } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, GripVertical, LayoutTemplate, Info, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getLocalUser } from "@/lib/local-store";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Template {
  id: number;
  name: string;
  description: string;
  color: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateTask {
  id: number;
  templateId: number;
  title: string;
  itemOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATES_KEY = "user-templates";
const TASKS_KEY = "user-template-tasks";

const COLORS = [
  "bg-orange-50 text-orange-900",
  "bg-blue-50 text-blue-900",
  "bg-green-50 text-green-900",
  "bg-purple-50 text-purple-900",
  "bg-pink-50 text-pink-900",
  "bg-teal-50 text-teal-900",
  "bg-yellow-50 text-yellow-900",
  "bg-red-50 text-red-900",
];

// ─── Storage helpers ────────────────────────────────────────────────────────
function getTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(t: Template[]) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)); }
function getTasks(): TemplateTask[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); } catch { return []; }
}
function saveTasksToStorage(t: TemplateTask[]) { localStorage.setItem(TASKS_KEY, JSON.stringify(t)); }

// ─── Sample data ────────────────────────────────────────────────────────────
function loadSamples(userId: number) {
  const now = new Date().toISOString();
  // Remove existing for user
  saveTemplates(getTemplates().filter(t => t.ownerId !== userId));
  const existingTasks = getTasks();

  const templates = getTemplates();
  const maxTplId = [...templates, ...getTemplates()].reduce((m, t) => Math.max(m, t.id), 0);

  const sampleTemplates: Template[] = [
    { id: maxTplId + 1, name: "Requirement Gathering", description: "Tasks for initial requirement analysis and client sign-off.", color: COLORS[0], ownerId: userId, createdAt: now, updatedAt: now },
    { id: maxTplId + 2, name: "Developer Checklist", description: "Standard development workflow tasks.", color: COLORS[1], ownerId: userId, createdAt: now, updatedAt: now },
    { id: maxTplId + 3, name: "QA & Testing", description: "Quality assurance and testing workflow.", color: COLORS[2], ownerId: userId, createdAt: now, updatedAt: now },
  ];

  const maxTaskId = existingTasks.reduce((m, t) => Math.max(m, t.id), 0);
  let taskId = maxTaskId;

  const sampleTasks: TemplateTask[] = [
    // Template 1 - Requirement Gathering
    ...(["Client Requirement Call", "Prepare Requirement Document", "Feasibility Analysis", "Design Review / Wireframes", "Estimation & Timeline", "Client Sign-Off"]
      .map((title, i) => ({ id: ++taskId, templateId: sampleTemplates[0].id, title, itemOrder: i + 1, isActive: true, createdAt: now, updatedAt: now }))),
    // Template 2 - Developer Checklist
    ...(["Setup Development Branch", "Database Schema Changes", "Backend API Implementation", "Frontend UI Development", "Unit Tests", "Code Review", "Deploy to Staging"]
      .map((title, i) => ({ id: ++taskId, templateId: sampleTemplates[1].id, title, itemOrder: i + 1, isActive: true, createdAt: now, updatedAt: now }))),
    // Template 3 - QA & Testing
    ...(["Create Test Plan", "Write Test Cases", "Functional Testing", "Regression Testing", "Performance Testing", "Bug Reporting", "Sign-Off"]
      .map((title, i) => ({ id: ++taskId, templateId: sampleTemplates[2].id, title, itemOrder: i + 1, isActive: true, createdAt: now, updatedAt: now }))),
  ];

  saveTemplates([...getTemplates(), ...sampleTemplates]);
  // Remove old tasks for these template IDs (shouldn't exist but safe)
  const newTaskTemplateIds = sampleTemplates.map(t => t.id);
  saveTasksToStorage([...existingTasks.filter(t => !newTaskTemplateIds.includes(t.templateId)), ...sampleTasks]);

  return { templates: sampleTemplates, tasks: sampleTasks };
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TemplateSettings() {
  const { toast } = useToast();
  const currentUser = getLocalUser();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tasks, setTasks] = useState<TemplateTask[]>([]);

  const reload = useCallback(() => {
    const userTemplates = getTemplates().filter(t => t.ownerId === currentUser.id);
    if (userTemplates.length === 0) {
      const { templates: st, tasks: stk } = loadSamples(currentUser.id);
      setTemplates(st);
      setTasks(stk);
    } else {
      setTemplates(userTemplates);
      const templateIds = userTemplates.map(t => t.id);
      setTasks(getTasks().filter(t => templateIds.includes(t.templateId)));
    }
  }, [currentUser.id]);

  useEffect(() => { reload(); }, [reload]);

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const createTemplate = (name: string, description: string) => {
    const all = getTemplates();
    const maxId = all.reduce((m, t) => Math.max(m, t.id), 0);
    const now = new Date().toISOString();
    const colorIdx = templates.length % COLORS.length;
    const newTpl: Template = { id: maxId + 1, name, description, color: COLORS[colorIdx], ownerId: currentUser.id, createdAt: now, updatedAt: now };
    saveTemplates([...all, newTpl]);
    reload();
    return newTpl;
  };

  const updateTemplate = (id: number, updates: Partial<Template>) => {
    const all = getTemplates();
    const idx = all.findIndex(t => t.id === id);
    if (idx >= 0) { all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }; saveTemplates(all); reload(); }
  };

  const deleteTemplate = (id: number) => {
    saveTemplates(getTemplates().filter(t => t.id !== id));
    saveTasksToStorage(getTasks().filter(t => t.templateId !== id));
    reload();
  };

  const duplicateTemplate = (tpl: Template) => {
    const allTpls = getTemplates();
    const allTasks = getTasks();
    const maxTplId = allTpls.reduce((m, t) => Math.max(m, t.id), 0);
    const maxTaskId = allTasks.reduce((m, t) => Math.max(m, t.id), 0);
    const now = new Date().toISOString();
    const newTpl: Template = { ...tpl, id: maxTplId + 1, name: `${tpl.name} (Copy)`, createdAt: now, updatedAt: now };
    const tplTasks = allTasks.filter(t => t.templateId === tpl.id);
    const newTasks = tplTasks.map((t, i) => ({ ...t, id: maxTaskId + i + 1, templateId: newTpl.id, createdAt: now, updatedAt: now }));
    saveTemplates([...allTpls, newTpl]);
    saveTasksToStorage([...allTasks, ...newTasks]);
    reload();
    toast({ title: "Duplicated", description: `"${tpl.name}" has been duplicated.` });
  };

  // ── Task CRUD ─────────────────────────────────────────────────────────────
  const addTask = (title: string, templateId: number) => {
    const all = getTasks();
    const maxId = all.reduce((m, t) => Math.max(m, t.id), 0);
    const sameTpl = all.filter(t => t.templateId === templateId);
    const maxOrder = sameTpl.reduce((m, t) => Math.max(m, t.itemOrder), 0);
    const now = new Date().toISOString();
    saveTasksToStorage([...all, { id: maxId + 1, templateId, title, itemOrder: maxOrder + 1, isActive: true, createdAt: now, updatedAt: now }]);
    reload();
  };

  const updateTask = (id: number, updates: Partial<TemplateTask>) => {
    const all = getTasks();
    const idx = all.findIndex(t => t.id === id);
    if (idx >= 0) { all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }; saveTasksToStorage(all); reload(); }
  };

  const deleteTask = (id: number) => {
    saveTasksToStorage(getTasks().filter(t => t.id !== id));
    reload();
  };

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [createTplDialog, setCreateTplDialog] = useState(false);
  const [editTplDialog, setEditTplDialog] = useState<Template | null>(null);
  const [deleteTplDialog, setDeleteTplDialog] = useState<Template | null>(null);
  const [addTaskDialog, setAddTaskDialog] = useState<{ open: boolean; templateId: number }>({ open: false, templateId: 0 });
  const [editTaskDialog, setEditTaskDialog] = useState<TemplateTask | null>(null);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<TemplateTask | null>(null);

  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editTaskTitle, setEditTaskTitle] = useState("");

  const handleCreateTemplate = () => {
    if (!tplName.trim()) return;
    createTemplate(tplName.trim(), tplDesc.trim());
    toast({ title: "Template Created", description: `"${tplName.trim()}" has been created.` });
    setTplName(""); setTplDesc(""); setCreateTplDialog(false);
  };

  const handleEditTemplate = () => {
    if (!editTplDialog || !tplName.trim()) return;
    updateTemplate(editTplDialog.id, { name: tplName.trim(), description: tplDesc.trim() });
    toast({ title: "Updated", description: "Template updated successfully." });
    setEditTplDialog(null); setTplName(""); setTplDesc("");
  };

  const handleDeleteTemplate = () => {
    if (!deleteTplDialog) return;
    deleteTemplate(deleteTplDialog.id);
    toast({ title: "Deleted", description: `"${deleteTplDialog.name}" and all its tasks removed.` });
    setDeleteTplDialog(null);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask(newTaskTitle.trim(), addTaskDialog.templateId);
    toast({ title: "Task Added", description: `"${newTaskTitle.trim()}" added.` });
    setNewTaskTitle(""); setAddTaskDialog({ open: false, templateId: 0 });
  };

  const handleEditTask = () => {
    if (!editTaskDialog || !editTaskTitle.trim()) return;
    updateTask(editTaskDialog.id, { title: editTaskTitle.trim() });
    toast({ title: "Updated", description: "Task updated." });
    setEditTaskDialog(null);
  };

  const handleDeleteTask = () => {
    if (!deleteTaskDialog) return;
    deleteTask(deleteTaskDialog.id);
    toast({ title: "Deleted", description: `"${deleteTaskDialog.title}" removed.` });
    setDeleteTaskDialog(null);
  };

  const handleToggleActive = (task: TemplateTask) => {
    updateTask(task.id, { isActive: !task.isActive });
  };

  const handleResetSamples = () => {
    // Clear user's templates & tasks, reload samples
    const allTpls = getTemplates().filter(t => t.ownerId !== currentUser.id);
    saveTemplates(allTpls);
    const userTplIds = templates.map(t => t.id);
    saveTasksToStorage(getTasks().filter(t => !userTplIds.includes(t.templateId)));
    loadSamples(currentUser.id);
    reload();
    toast({ title: "Reset", description: "Templates reset to samples." });
  };

  // ── Task Row ──────────────────────────────────────────────────────────────
  const TaskRow = ({ task }: { task: TemplateTask }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${task.isActive ? 'bg-background border-border' : 'bg-muted border-dashed border-border opacity-60'}`}>
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${!task.isActive ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={task.isActive} onCheckedChange={() => handleToggleActive(task)} />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTaskTitle(task.title); setEditTaskDialog(task); }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTaskDialog(task)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  // ── Template Card ─────────────────────────────────────────────────────────
  const TemplateCard = ({ template }: { template: Template }) => {
    const tplTasks = tasks.filter(t => t.templateId === template.id).sort((a, b) => a.itemOrder - b.itemOrder);
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className={`rounded-t-lg pb-3 ${template.color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <LayoutTemplate className="h-5 w-5 flex-shrink-0" />
              <CardTitle className="text-base truncate">{template.name}</CardTitle>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge variant="secondary">{tplTasks.filter(t => t.isActive).length} active</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <CardDescription className="text-inherit opacity-80 text-xs">{template.description || "No description"}</CardDescription>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicateTemplate(template)} title="Duplicate">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setTplName(template.name); setTplDesc(template.description); setEditTplDialog(template); }} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => setDeleteTplDialog(template)} title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2 flex-1">
          {tplTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks yet. <span className="text-xs">Click "Add Task" to start.</span>
            </div>
          )}
          {tplTasks.map(task => <TaskRow key={task.id} task={task} />)}
          <Button variant="outline" size="sm" className="w-full mt-3 border-dashed" onClick={() => { setNewTaskTitle(""); setAddTaskDialog({ open: true, templateId: template.id }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        </CardContent>
      </Card>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Work Item Templates</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your personal task templates — visible only to you. Create as many as you need.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetSamples}>
              <Download className="h-4 w-4 mr-1" /> Reset to Samples
            </Button>
            <Button size="sm" onClick={() => { setTplName(""); setTplDesc(""); setCreateTplDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Template
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">How templates work</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Create multiple templates for different workflows (requirements, development, QA, etc.).</li>
              <li>Each template contains a reusable checklist of tasks.</li>
              <li>Templates are private — only you can see and manage them.</li>
              <li>Duplicate a template to quickly create variations.</li>
            </ul>
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create your first template to get started.</p>
            <Button className="mt-4" onClick={() => { setTplName(""); setTplDesc(""); setCreateTplDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {templates.map(tpl => <TemplateCard key={tpl.id} template={tpl} />)}
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={createTplDialog} onOpenChange={setCreateTplDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create New Template</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input id="tpl-name" placeholder="e.g. Sprint Planning" value={tplName} onChange={e => setTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateTemplate()} autoFocus />
            </div>
            <div>
              <Label htmlFor="tpl-desc">Description (optional)</Label>
              <Textarea id="tpl-desc" placeholder="Describe the purpose of this template..." value={tplDesc} onChange={e => setTplDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTplDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={!tplName.trim()}><Plus className="h-4 w-4 mr-1" /> Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTplDialog} onOpenChange={o => !o && setEditTplDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="edit-tpl-name">Template Name</Label>
              <Input id="edit-tpl-name" value={tplName} onChange={e => setTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditTemplate()} autoFocus />
            </div>
            <div>
              <Label htmlFor="edit-tpl-desc">Description</Label>
              <Textarea id="edit-tpl-desc" value={tplDesc} onChange={e => setTplDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTplDialog(null)}>Cancel</Button>
            <Button onClick={handleEditTemplate} disabled={!tplName.trim()}><Pencil className="h-4 w-4 mr-1" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirm */}
      <AlertDialog open={!!deleteTplDialog} onOpenChange={o => !o && setDeleteTplDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>"{deleteTplDialog?.name}"</strong> and all its tasks? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Task Dialog */}
      <Dialog open={addTaskDialog.open} onOpenChange={o => setAddTaskDialog(v => ({ ...v, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-task-title">Task Title</Label>
            <Input id="new-task-title" placeholder="e.g. Review Requirements" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskDialog(v => ({ ...v, open: false }))}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTaskDialog} onOpenChange={o => !o && setEditTaskDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="edit-task-title">Task Title</Label>
            <Input id="edit-task-title" value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditTask()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTaskDialog(null)}>Cancel</Button>
            <Button onClick={handleEditTask} disabled={!editTaskTitle.trim()}><Pencil className="h-4 w-4 mr-1" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirm */}
      <AlertDialog open={!!deleteTaskDialog} onOpenChange={o => !o && setDeleteTaskDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>"{deleteTaskDialog?.title}"</strong> from the template?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
