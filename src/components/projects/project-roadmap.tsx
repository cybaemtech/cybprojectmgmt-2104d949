import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutTemplate, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  RoadmapEditor,
  NewTemplateModal,
  type Template,
  type RoadmapProject,
} from "@/pages/strategic-roadmap";
import { supabaseCustom as supabase } from "@/lib/supabase-custom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProjectRoadmapProps {
  projectId: number;
  projectName?: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  canEdit: boolean;
}

// One opinionated SDLC template for "Load Sample Template"
function buildSampleTemplate(anchorISO?: string | null): Omit<Template, "id"> {
  // Anchor the timeline to the project start date when available, else today
  const anchor = anchorISO ? new Date(anchorISO) : new Date();
  if (Number.isNaN(anchor.getTime())) anchor.setTime(Date.now());

  const addDays = (base: Date, days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // Each phase rolls forward off the previous one
  let cursor = 0;
  const phase = (lenDays: number): { startDate: string; endDate: string } => {
    const start = addDays(anchor, cursor);
    const end = addDays(anchor, cursor + lenDays);
    cursor += lenDays + 1;
    return { startDate: start, endDate: end };
  };

  let nextId = 1;
  const make = (
    name: string,
    stream: string,
    lenDays: number,
    actionPoints: string[],
  ): RoadmapProject => ({
    id: nextId++,
    name,
    stream,
    ...phase(lenDays),
    actionPoints,
  });

  return {
    name: "Project Roadmap",
    description: "Sample SDLC roadmap — edit freely.",
    streams: ["Planning", "Development", "QA", "Delivery"],
    projects: [
      make("Kick-off Planning", "Planning", 6, [
        "Stakeholder introductions",
        "Scope & success criteria alignment",
        "Communication & cadence setup",
      ]),
      make("Requirement Gathering", "Planning", 10, [
        "Discovery workshops",
        "BRD / functional spec drafting",
        "Sign-off from client",
      ]),
      make("SDLC – Design", "Development", 12, [
        "Architecture & data model",
        "Wireframes & UI design",
        "Tech stack & API contracts",
      ]),
      make("SDLC – Build", "Development", 28, [
        "Sprint planning",
        "Feature development",
        "Code reviews & integration",
      ]),
      make("SDLC – Testing", "QA", 12, [
        "Test plan & cases",
        "Automated regression",
        "UAT with client",
      ]),
      make("Demo to Client", "Delivery", 4, [
        "Staging walkthrough",
        "Collect feedback",
        "Triage action items",
      ]),
      make("Next Feature Implementation", "Development", 14, [
        "Backlog grooming",
        "Phase-2 development",
        "Rollout plan",
      ]),
    ],
  };
}

interface RoadmapRow {
  id: number;
  project_id: number;
  name: string;
  description: string;
  tasks: { streams: string[]; projects: RoadmapProject[] };
}

function rowToTemplate(row: RoadmapRow): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    streams: row.tasks?.streams || [],
    projects: row.tasks?.projects || [],
  };
}

export function ProjectRoadmap({
  projectId,
  projectStartDate,
  canEdit,
}: ProjectRoadmapProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  const [rowId, setRowId] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [missingTable, setMissingTable] = useState(false);

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_roadmaps")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) {
      // Table not yet created on the external Supabase — show a friendly hint
      if (error.code === "42P01" || /relation .* does not exist/i.test(error.message || "")) {
        setMissingTable(true);
        setLoading(false);
        return;
      }
      console.error("[project-roadmap] load failed:", error);
      setLoading(false);
      return;
    }
    if (data) {
      setRowId(data.id);
      setTemplate(rowToTemplate(data as RoadmapRow));
    } else {
      setRowId(null);
      setTemplate(null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const createRoadmap = async (init: {
    name: string;
    description: string;
    streams: string[];
    projects?: RoadmapProject[];
  }) => {
    const payload = {
      project_id: projectId,
      name: init.name,
      description: init.description,
      tasks: { streams: init.streams, projects: init.projects || [] },
      created_by: user?.id || null,
    };
    const { data, error } = await supabase
      .from("project_roadmaps")
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error("[project-roadmap] create failed:", error);
      toast({
        title: "Could not create roadmap",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRowId(data.id);
    setTemplate(rowToTemplate(data as RoadmapRow));
    setShowNewModal(false);
    toast({ title: "Roadmap created" });
  };

  const handleLoadSample = async () => {
    const sample = buildSampleTemplate(projectStartDate);
    await createRoadmap({
      name: sample.name,
      description: sample.description,
      streams: sample.streams,
      projects: sample.projects,
    });
  };

  const handleDelete = async () => {
    if (!rowId) return;
    if (!confirm("Delete this project roadmap? This cannot be undone.")) return;
    const { error } = await supabase
      .from("project_roadmaps")
      .delete()
      .eq("id", rowId);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRowId(null);
    setTemplate(null);
    toast({ title: "Roadmap deleted" });
  };

  // Debounced persist on edits
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUpdate = useCallback(
    (updated: Template) => {
      setTemplate(updated);
      if (!rowId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const { error } = await supabase
          .from("project_roadmaps")
          .update({
            name: updated.name,
            description: updated.description,
            tasks: { streams: updated.streams, projects: updated.projects },
            updated_at: new Date().toISOString(),
          })
          .eq("id", rowId);
        if (error) console.error("[project-roadmap] update failed:", error);
      }, 500);
    },
    [rowId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Loading project roadmap…
      </div>
    );
  }

  if (missingTable) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 border border-dashed rounded-xl bg-muted/20 text-sm">
        <h3 className="font-semibold text-base mb-2">Project Roadmap table not found</h3>
        <p className="text-muted-foreground mb-3">
          The <code>project_roadmaps</code> table doesn't exist on the backend yet. Run the SQL
          provided in the plan on your Supabase project and refresh this page.
        </p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-2xl mx-auto my-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <LayoutTemplate className="text-muted-foreground" size={32} />
        </div>
        <h3 className="text-lg font-semibold mb-2">No roadmap yet</h3>
        <p className="text-muted-foreground mb-6">
          {canEdit
            ? "Build a roadmap from scratch or start with our SDLC sample template."
            : "The project manager hasn't created a roadmap for this project yet."}
        </p>
        {canEdit && (
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setShowNewModal(true)}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Create Roadmap
            </button>
            <button
              onClick={handleLoadSample}
              className="px-5 py-2 border border-input text-foreground text-sm font-medium rounded-lg hover:bg-accent flex items-center gap-2"
            >
              <Sparkles size={16} /> Load Sample Template
            </button>
          </div>
        )}
        {showNewModal && (
          <NewTemplateModal
            onConfirm={(data) =>
              createRoadmap({ ...data, projects: [] })
            }
            onCancel={() => setShowNewModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
      {canEdit && (
        <div className="absolute right-4 top-2 z-20">
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center gap-1.5"
            title="Delete this project roadmap"
          >
            <Trash2 size={14} /> Reset
          </button>
        </div>
      )}
      <RoadmapEditor template={template} onUpdate={handleUpdate} onBack={() => { /* no-op: lives inside tab */ }} hideTitle />
    </div>
  );
}
