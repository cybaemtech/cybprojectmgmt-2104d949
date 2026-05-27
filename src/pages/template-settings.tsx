import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

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
import { Plus, Pencil, Trash2, GripVertical, LayoutTemplate, Info, Download, Copy, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabaseCustom as supabase } from "@/lib/supabase-custom";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ──────────────────────────────────────────────────────────────────
interface TemplateTask {
  id: number;
  title: string;
  itemOrder: number;
  isActive: boolean;
  estimatedHours?: number;
}

type TemplateScope = 'GLOBAL' | 'PRIVATE';

interface Template {
  id: number;          // DB id
  name: string;
  description: string;
  color: string;
  isLocked: boolean;
  scope: TemplateScope;
  createdBy: string | null;
  tasks: TemplateTask[];
  createdAt: string;
  updatedAt: string;
}

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

// ─── DB row → app model ─────────────────────────────────────────────────────
function mapRow(row: any, index: number): Template {
  const tasks: TemplateTask[] = Array.isArray(row.tasks) ? row.tasks : [];
  const scope: TemplateScope = row.scope === 'GLOBAL' ? 'GLOBAL' : 'PRIVATE';
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    color: COLORS[index % COLORS.length],
    isLocked: row.is_locked ?? false,
    scope,
    createdBy: row.created_by ?? null,
    tasks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Sample data ────────────────────────────────────────────────────────────
function buildSamples(userId: string) {
  const reqGatheringHours = [4, 8, 6, 8, 4, 2];
  const devChecklistHours = [2, 8, 16, 16, 8, 4, 2];
  const qaTestingHours = [4, 8, 8, 6, 4, 4, 2];

  return [
    {
      name: "Requirement Gathering",
      description: "Tasks for initial requirement analysis and client sign-off.",
      is_locked: true,
      created_by: userId,
      tasks: ["Client Requirement Call", "Prepare Requirement Document", "Feasibility Analysis", "Design Review / Wireframes", "Estimation & Timeline", "Client Sign-Off"]
        .map((title, i) => ({ id: i + 1, title, itemOrder: i + 1, isActive: true, estimatedHours: reqGatheringHours[i] })),
    },
    {
      name: "Developer Checklist",
      description: "Standard development workflow tasks.",
      is_locked: false,
      created_by: userId,
      tasks: ["Setup Development Branch", "Database Schema Changes", "Backend API Implementation", "Frontend UI Development", "Unit Tests", "Code Review", "Deploy to Staging"]
        .map((title, i) => ({ id: i + 1, title, itemOrder: i + 1, isActive: true, estimatedHours: devChecklistHours[i] })),
    },
    {
      name: "QA & Testing",
      description: "Quality assurance and testing workflow.",
      is_locked: false,
      created_by: userId,
      tasks: ["Create Test Plan", "Write Test Cases", "Functional Testing", "Regression Testing", "Performance Testing", "Bug Reporting", "Sign-Off"]
        .map((title, i) => ({ id: i + 1, title, itemOrder: i + 1, isActive: true, estimatedHours: qaTestingHours[i] })),
    },
  ];
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TemplateSettings() {
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const isAdmin = (user?.role ?? "USER") === "ADMIN" || isDemoMode;

  // Get current user id (skipped in demo mode)
  useEffect(() => {
    if (isDemoMode) {
      setUserId("demo-user");
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [isDemoMode]);

  // ── Fetch from DB (or load samples in demo mode) ──────────────────────────
  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    if (isDemoMode) {
      const samples = buildSamples(userId);
      const seeded: Template[] = samples.map((s, i) => ({
        id: i + 1,
        name: s.name,
        description: s.description,
        color: COLORS[i % COLORS.length],
        isLocked: s.is_locked,
        scope: 'GLOBAL',
        createdBy: userId,
        tasks: s.tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setTemplates(seeded);
      setLoading(false);
      return;
    }

    // RLS filters: returns GLOBAL rows for everyone + the caller's own PRIVATE rows.
    const { data, error } = await supabase
      .from("work_item_templates")
      .select("*")
      .order("scope", { ascending: true })   // GLOBAL before PRIVATE
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load templates:", error);
      setLoading(false);
      return;
    }

    setTemplates((data || []).map(mapRow));
    setLoading(false);
  }, [userId, isDemoMode]);

  useEffect(() => { reload(); }, [reload]);


  // ── Helper: persist tasks for a template ──────────────────────────────────
  const persistTasks = async (templateId: number, tasks: TemplateTask[]) => {
    if (isDemoMode) return;
    const { error } = await supabase
      .from("work_item_templates")
      .update({ tasks, updated_at: new Date().toISOString() })
      .eq("id", templateId);
    if (error) console.error("Failed to save tasks:", error);
  };

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const createTemplate = async (name: string, description: string, scope: TemplateScope = 'PRIVATE') => {
    if (!userId) return;
    const finalScope: TemplateScope = scope === 'GLOBAL' && isAdmin ? 'GLOBAL' : 'PRIVATE';
    if (isDemoMode) {
      const nextId = templates.reduce((m, t) => Math.max(m, t.id), 0) + 1;
      const now = new Date().toISOString();
      setTemplates(prev => [...prev, {
        id: nextId, name, description, color: COLORS[prev.length % COLORS.length],
        isLocked: false, scope: finalScope, createdBy: userId, tasks: [], createdAt: now, updatedAt: now,
      }]);
      return;
    }
    const { data, error } = await supabase
      .from("work_item_templates")
      .insert({ name, description, created_by: userId, tasks: [], is_locked: false, scope: finalScope })
      .select("*")
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTemplates(prev => [...prev, mapRow(data, prev.length)]);
  };

  const updateTemplate = async (id: number, updates: { name?: string; description?: string }) => {
    const tpl = templates.find(t => t.id === id);
    if (tpl?.scope === 'GLOBAL' && !isAdmin) {
      toast({ title: "Read-only", description: "Global templates can only be edited by admins.", variant: "destructive" });
      return;
    }
    if (tpl?.isLocked && updates.name && updates.name !== tpl.name) {
      toast({ title: "Locked", description: `"${tpl.name}" is a mandatory template and cannot be renamed.`, variant: "destructive" });
      return;
    }
    if (!isDemoMode) {
      const { error } = await supabase
        .from("work_item_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  };

  const deleteTemplate = async (id: number) => {
    const tpl = templates.find(t => t.id === id);
    if (tpl?.scope === 'GLOBAL') {
      toast({ title: "Locked", description: "Global templates cannot be deleted.", variant: "destructive" });
      return;
    }
    if (tpl?.isLocked) {
      toast({ title: "Locked", description: `"${tpl.name}" is a mandatory template and cannot be deleted.`, variant: "destructive" });
      return;
    }
    if (!isDemoMode) {
      const { error } = await supabase.from("work_item_templates").delete().eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const duplicateTemplate = async (tpl: Template) => {
    if (!userId) return;
    const newTasks = tpl.tasks.map(t => ({ ...t }));
    if (isDemoMode) {
      const nextId = templates.reduce((m, t) => Math.max(m, t.id), 0) + 1;
      const now = new Date().toISOString();
      setTemplates(prev => [...prev, {
        id: nextId, name: `${tpl.name} (Copy)`, description: tpl.description,
        color: COLORS[prev.length % COLORS.length], isLocked: false,
        scope: 'PRIVATE', createdBy: userId, tasks: newTasks,
        createdAt: now, updatedAt: now,
      }]);
      toast({ title: "Duplicated", description: `"${tpl.name}" copied as a private template.` });
      return;
    }
    // Duplicates are always private copies owned by the current user.
    const { data, error } = await supabase
      .from("work_item_templates")
      .insert({ name: `${tpl.name} (Copy)`, description: tpl.description, created_by: userId, tasks: newTasks, is_locked: false, scope: 'PRIVATE' })
      .select("*")
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTemplates(prev => [...prev, mapRow(data, prev.length)]);
    toast({ title: "Duplicated", description: `"${tpl.name}" has been duplicated.` });
  };


  // ── Task CRUD (in-memory + persist) ───────────────────────────────────────
  const addTask = (title: string, templateId: number) => {
    setTemplates(prev => prev.map(tpl => {
      if (tpl.id !== templateId) return tpl;
      const maxId = tpl.tasks.reduce((m, t) => Math.max(m, t.id), 0);
      const maxOrder = tpl.tasks.reduce((m, t) => Math.max(m, t.itemOrder), 0);
      const newTask: TemplateTask = { id: maxId + 1, title, itemOrder: maxOrder + 1, isActive: true };
      const newTasks = [...tpl.tasks, newTask];
      persistTasks(tpl.id, newTasks);
      return { ...tpl, tasks: newTasks };
    }));
  };

  const updateTask = (templateId: number, taskId: number, updates: Partial<TemplateTask>) => {
    setTemplates(prev => prev.map(tpl => {
      if (tpl.id !== templateId) return tpl;
      const newTasks = tpl.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
      persistTasks(tpl.id, newTasks);
      return { ...tpl, tasks: newTasks };
    }));
  };

  const deleteTask = (templateId: number, taskId: number) => {
    setTemplates(prev => prev.map(tpl => {
      if (tpl.id !== templateId) return tpl;
      const newTasks = tpl.tasks.filter(t => t.id !== taskId);
      persistTasks(tpl.id, newTasks);
      return { ...tpl, tasks: newTasks };
    }));
  };

  const reorderTasks = (templateId: number, startIndex: number, endIndex: number) => {
    setTemplates(prev => prev.map(tpl => {
      if (tpl.id !== templateId) return tpl;
      const sorted = [...tpl.tasks].sort((a, b) => a.itemOrder - b.itemOrder);
      const [moved] = sorted.splice(startIndex, 1);
      sorted.splice(endIndex, 0, moved);
      const newTasks = sorted.map((t, i) => ({ ...t, itemOrder: i + 1 }));
      persistTasks(tpl.id, newTasks);
      return { ...tpl, tasks: newTasks };
    }));
  };

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [createTplDialog, setCreateTplDialog] = useState(false);
  const [editTplDialog, setEditTplDialog] = useState<Template | null>(null);
  const [deleteTplDialog, setDeleteTplDialog] = useState<Template | null>(null);
  const [addTaskDialog, setAddTaskDialog] = useState<{ open: boolean; templateId: number }>({ open: false, templateId: 0 });
  const [editTaskDialog, setEditTaskDialog] = useState<{ task: TemplateTask; templateId: number } | null>(null);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{ task: TemplateTask; templateId: number } | null>(null);

  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplScope, setTplScope] = useState<TemplateScope>('PRIVATE');
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editTaskTitle, setEditTaskTitle] = useState("");

  const handleCreateTemplate = async () => {
    if (!tplName.trim()) return;
    await createTemplate(tplName.trim(), tplDesc.trim(), isAdmin ? tplScope : 'PRIVATE');
    toast({ title: "Template Created", description: `"${tplName.trim()}" has been created.` });
    setTplName(""); setTplDesc(""); setTplScope('PRIVATE'); setCreateTplDialog(false);
  };

  const handleEditTemplate = async () => {
    if (!editTplDialog || !tplName.trim()) return;
    await updateTemplate(editTplDialog.id, { name: tplName.trim(), description: tplDesc.trim() });
    toast({ title: "Updated", description: "Template updated successfully." });
    setEditTplDialog(null); setTplName(""); setTplDesc("");
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTplDialog) return;
    await deleteTemplate(deleteTplDialog.id);
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
    updateTask(editTaskDialog.templateId, editTaskDialog.task.id, { title: editTaskTitle.trim() });
    toast({ title: "Updated", description: "Task updated." });
    setEditTaskDialog(null);
  };

  const handleDeleteTask = () => {
    if (!deleteTaskDialog) return;
    deleteTask(deleteTaskDialog.templateId, deleteTaskDialog.task.id);
    toast({ title: "Deleted", description: `"${deleteTaskDialog.task.title}" removed.` });
    setDeleteTaskDialog(null);
  };

  const handleResetSamples = async () => {
    if (!userId || !isDemoMode) return;
    const samples = buildSamples(userId);
    const now = new Date().toISOString();
    setTemplates(samples.map((s, i) => ({
      id: i + 1, name: s.name, description: s.description,
      color: COLORS[i % COLORS.length], isLocked: s.is_locked,
      scope: 'GLOBAL', createdBy: userId,
      tasks: s.tasks, createdAt: now, updatedAt: now,
    })));
    toast({ title: "Reset", description: "Templates reset to samples." });
  };

  // ── Task Row ──────────────────────────────────────────────────────────────
  const TaskRow = ({ task, index, templateId, readOnly }: { task: TemplateTask; index: number; templateId: number; readOnly: boolean }) => (
    <Draggable draggableId={`task-${templateId}-${task.id}`} index={index} isDragDisabled={readOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`grid grid-cols-[32px_1fr_90px_56px_72px] items-center border-b border-border/50 transition-colors ${task.isActive ? 'hover:bg-muted/30' : 'bg-muted/20 opacity-60'} ${snapshot.isDragging ? 'shadow-lg ring-1 ring-primary/20 bg-background' : ''}`}
        >
          <div {...provided.dragHandleProps} className={`flex items-center justify-center h-full ${readOnly ? 'opacity-20 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing opacity-30 hover:opacity-100'} transition-opacity`}>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="py-3 pr-4">
            <p className={`text-sm font-medium ${!task.isActive ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={task.estimatedHours ?? ""}
              disabled={readOnly}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                updateTask(templateId, task.id, { estimatedHours: val });
              }}
              placeholder="0"
              className="h-7 w-14 text-xs text-center px-1 font-mono tabular-nums bg-muted/50 border-border/60"
            />
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">hr</span>
          </div>
          <div className="flex justify-center">
            <Switch checked={task.isActive} disabled={readOnly} onCheckedChange={() => updateTask(templateId, task.id, { isActive: !task.isActive })} className="scale-90" />
          </div>
          <div className="flex justify-end gap-0.5 pr-2">
            {!readOnly && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditTaskTitle(task.title); setEditTaskDialog({ task, templateId }); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTaskDialog({ task, templateId })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );

  // ── Template Card ─────────────────────────────────────────────────────────
  const TemplateCard = ({ template }: { template: Template }) => {
    const tplTasks = [...template.tasks].sort((a, b) => a.itemOrder - b.itemOrder);
    const activeTasks = tplTasks.filter(t => t.isActive);
    const totalHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const isGlobal = template.scope === 'GLOBAL';
    const readOnly = isGlobal && !isAdmin;
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className={`rounded-t-lg pb-3 ${template.color} space-y-2`}>
          <div className="flex items-start gap-2 min-w-0">
            <LayoutTemplate className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <CardTitle className="text-base leading-snug break-words flex-1 min-w-0">{template.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge
              variant={isGlobal ? "default" : "outline"}
              className={isGlobal ? "bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-1.5 py-0" : "text-[10px] px-1.5 py-0"}
              title={isGlobal ? "Visible to everyone" : "Only you can see this template"}
            >
              {isGlobal ? "Global" : "Private"}
            </Badge>
            <Badge variant="secondary">{activeTasks.length} active</Badge>
            <Badge variant="outline" className="ml-1 font-mono tabular-nums">{totalHours}h total</Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CardDescription className="text-inherit opacity-80 text-xs truncate">{template.description || "No description"}</CardDescription>
              {readOnly && (
                <span title="Read-only — managed by an administrator">
                  <Lock className="h-3.5 w-3.5 text-amber-700 opacity-80" />
                </span>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicateTemplate(template)} title="Duplicate as private">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {!readOnly && !template.isLocked && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setTplName(template.name); setTplDesc(template.description); setEditTplDialog(template); }} title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {!readOnly && !isGlobal && !template.isLocked && (
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => setDeleteTplDialog(template)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          {tplTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm px-4">
              No tasks yet. {!readOnly && <span className="text-xs">Click "Add Task" to start.</span>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[32px_1fr_90px_56px_72px] items-center px-0 py-1.5 border-b border-border bg-muted/30">
                <div />
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Task</div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hours</div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Active</div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right pr-2">Ops</div>
              </div>
              <DragDropContext onDragEnd={(result: DropResult) => {
                if (readOnly) return;
                if (!result.destination || result.source.index === result.destination.index) return;
                reorderTasks(template.id, result.source.index, result.destination.index);
              }}>
                <Droppable droppableId={`template-${template.id}`} isDropDisabled={readOnly}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {tplTasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} templateId={template.id} readOnly={readOnly} />)}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </>
          )}
          <div className="mt-auto flex items-center justify-between px-3 py-2.5 border-t border-border bg-muted/10">
            {readOnly ? (
              <span className="text-xs text-muted-foreground italic">Read-only template</span>
            ) : (
              <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold hover:text-primary" onClick={() => { setNewTaskTitle(""); setAddTaskDialog({ open: true, templateId: template.id }); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
              </Button>
            )}
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1.5">Total</span>
              <span className="text-sm font-semibold font-mono tabular-nums">{totalHours}h</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Work Item Templates</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Shared global templates plus your own private ones. Private templates are visible only to you.
            </p>
          </div>
          <div className="flex gap-2">
            {isDemoMode && (
              <Button variant="outline" size="sm" onClick={handleResetSamples}>
                <Download className="h-4 w-4 mr-1" /> Reset to Samples
              </Button>
            )}
            <Button size="sm" onClick={() => { setTplName(""); setTplDesc(""); setCreateTplDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Template
            </Button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">How templates work</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li><strong>Global</strong> templates (Requirement Gathering, Developer Checklist, QA &amp; Testing) are shared with everyone and managed by admins.</li>
              <li><strong>Private</strong> templates you create are visible only to you — peers and admins cannot see them.</li>
              <li>Duplicating any template creates a private copy you fully own.</li>
            </ul>
          </div>
        </div>


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
            {isAdmin && (
              <div>
                <Label>Visibility</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTplScope('PRIVATE')}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${tplScope === 'PRIVATE' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'}`}
                  >
                    <div className="font-medium">Private</div>
                    <div className="text-xs text-muted-foreground">Only you can see it</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTplScope('GLOBAL')}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${tplScope === 'GLOBAL' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'}`}
                  >
                    <div className="font-medium">Global</div>
                    <div className="text-xs text-muted-foreground">Shared with everyone</div>
                  </button>
                </div>
              </div>
            )}
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
            <AlertDialogDescription>Remove <strong>"{deleteTaskDialog?.task.title}"</strong> from the template?</AlertDialogDescription>
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
