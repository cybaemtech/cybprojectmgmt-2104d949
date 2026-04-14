
CREATE TABLE public.smtp_config (
  id integer PRIMARY KEY DEFAULT 1,
  host text NOT NULL DEFAULT 'smtp.gmail.com',
  port integer NOT NULL DEFAULT 587,
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  security text NOT NULL DEFAULT 'TLS',
  from_email text NOT NULL DEFAULT 'noreply@yourdomain.com',
  from_name text NOT NULL DEFAULT 'CYB Project Management',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT smtp_config_singleton CHECK (id = 1)
);

ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_smtp_config" ON public.smtp_config
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "admins_update_smtp_config" ON public.smtp_config
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "admins_insert_smtp_config" ON public.smtp_config
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

-- Insert default row
INSERT INTO public.smtp_config (id, host, port, username, password, security, from_email, from_name)
VALUES (1, 'smtp.gmail.com', 587, '', '', 'TLS', 'noreply@yourdomain.com', 'CYB Project Management');
