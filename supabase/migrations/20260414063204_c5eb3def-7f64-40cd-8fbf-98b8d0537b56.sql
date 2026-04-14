
-- Create email status enum
CREATE TYPE public.email_status AS ENUM ('pending', 'sent', 'failed', 'retrying');

-- Create email_logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  template_name text NOT NULL,
  status public.email_status NOT NULL DEFAULT 'pending',
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  sent_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with ADMIN role can read logs
CREATE POLICY "admins_read_email_logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- System (service role) handles insert/update - no user policy needed for insert/update
-- Edge functions use service role key

-- Create email rate limit tracking
CREATE TABLE public.email_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limits
CREATE POLICY "admins_read_rate_limits" ON public.email_rate_limits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Index for faster lookups
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX idx_email_logs_created ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_rate_limits_recipient ON public.email_rate_limits(recipient_email, window_start);
