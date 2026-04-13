
CREATE TABLE public.work_item_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own work item templates"
  ON public.work_item_templates FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create their own work item templates"
  ON public.work_item_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own work item templates"
  ON public.work_item_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own work item templates"
  ON public.work_item_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
