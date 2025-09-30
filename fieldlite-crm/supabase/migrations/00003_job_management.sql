-- Migration: 00003_job_management
-- Description: Add job management tables and features
-- Created: 2025-01-01

-- Create jobs table (without foreign keys to invoices/estimates yet)
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  job_number text NOT NULL,
  title text NOT NULL,
  description text,
  status job_status DEFAULT 'scheduled'::job_status,
  priority job_priority DEFAULT 'medium'::job_priority,
  type job_type DEFAULT 'other'::job_type,
  customer_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_name character varying,
  customer_email character varying,
  customer_phone character varying,
  scheduled_start timestamp with time zone,
  scheduled_end timestamp with time zone,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  address jsonb,
  assigned_to uuid[] DEFAULT ARRAY[]::uuid[],
  crew_lead_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id uuid,
  estimated_duration integer,
  estimated_cost numeric,
  actual_cost numeric,
  payment_status payment_status,
  required_skills text[] DEFAULT '{}'::text[],
  required_equipment text[] DEFAULT '{}'::text[],
  required_photos text[],
  required_checklists jsonb,
  internal_notes text,
  notes text,
  tags text[] DEFAULT '{}'::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create job tasks table
CREATE TABLE public.job_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  assignee_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  required_photo boolean DEFAULT false,
  photo_urls text[],
  checklist jsonb,
  completed_at timestamp with time zone,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create time logs table
CREATE TABLE public.time_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in timestamp with time zone NOT NULL,
  clock_out timestamp with time zone,
  duration_minutes integer,
  gps_start jsonb,
  gps_end jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_jobs_tenant_id ON public.jobs(tenant_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX idx_jobs_scheduled_start ON public.jobs(scheduled_start);
CREATE INDEX idx_job_tasks_job_id ON public.job_tasks(job_id);
CREATE INDEX idx_time_logs_tenant_id ON public.time_logs(tenant_id);
CREATE INDEX idx_time_logs_job_id ON public.time_logs(job_id);
CREATE INDEX idx_time_logs_user_id ON public.time_logs(user_id);

-- Add triggers
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_job_tasks_updated_at BEFORE UPDATE ON public.job_tasks
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_time_logs_updated_at BEFORE UPDATE ON public.time_logs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage jobs in their tenant" ON public.jobs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage job tasks in their tenant" ON public.job_tasks
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage time logs in their tenant" ON public.time_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );