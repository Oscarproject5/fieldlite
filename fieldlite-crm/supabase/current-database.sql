-- This script fixes the "No tenant found" error by ensuring all users have a tenant

-- Step 1: Create a default tenant if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
        INSERT INTO tenants (name, subdomain, plan, settings)
        VALUES (
            'My Company',
            'mycompany',
            'pro',
            '{"initial_setup": true}'::jsonb
        );
        RAISE NOTICE 'Created default tenant';
    END IF;
END $$;

-- Step 2: Get the first tenant's ID and update all profiles without a tenant
UPDATE profiles
SET tenant_id = (SELECT id FROM tenants LIMIT 1)
WHERE tenant_id IS NULL;

-- Step 3: Verify the fix
SELECT
    p.id as profile_id,
    p.email,
    p.tenant_id,
    t.name as tenant_name
FROM profiles p-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.call_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  call_id uuid,
  event_type text NOT NULL,
  event_data jsonb,
  twilio_callback_source text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT call_events_pkey PRIMARY KEY (id),
  CONSTRAINT call_events_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id)
);
CREATE TABLE public.call_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  call_id uuid,
  content text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT call_notes_pkey PRIMARY KEY (id),
  CONSTRAINT call_notes_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id),
  CONSTRAINT call_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.call_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid,
  scheduled_at timestamp with time zone NOT NULL,
  title character varying,
  notes text,
  status character varying DEFAULT 'pending'::character varying,
  reminder_sent boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_by uuid,
  tenant_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT call_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT call_schedules_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT call_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT call_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.calls (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  twilio_call_sid text UNIQUE,
  contact_id uuid,
  user_id uuid,
  from_number text NOT NULL,
  to_number text NOT NULL,
  direction USER-DEFINED NOT NULL,
  status USER-DEFINED DEFAULT 'queued'::call_status,
  duration_seconds integer,
  answered_at timestamp with time zone,
  ended_at timestamp with time zone,
  recording_url text,
  recording_duration integer,
  transcription text,
  voicemail_url text,
  price numeric,
  price_unit text DEFAULT 'USD'::text,
  notes text,
  tags ARRAY,
  deal_id uuid,
  job_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  outcome character varying,
  CONSTRAINT calls_pkey PRIMARY KEY (id),
  CONSTRAINT calls_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT calls_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT calls_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT calls_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id),
  CONSTRAINT calls_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.catalog_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  sku text,
  name text NOT NULL,
  category text,
  description text,
  unit_of_measure text DEFAULT 'each'::text,
  unit_price numeric,
  unit_cost numeric,
  tax_rate numeric DEFAULT 0,
  is_bundle boolean DEFAULT false,
  bundle_items jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT catalog_items_pkey PRIMARY KEY (id),
  CONSTRAINT catalog_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.contact_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid,
  content text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT contact_notes_pkey PRIMARY KEY (id),
  CONSTRAINT contact_notes_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT contact_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  type USER-DEFINED DEFAULT 'lead'::contact_type,
  first_name text,
  last_name text,
  company text,
  email text,
  phones ARRAY,
  address jsonb,
  lead_source text,
  lead_source_details jsonb,
  owner_user_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  notes text,
  tags ARRAY,
  last_contacted timestamp with time zone,
  source character varying,
  status character varying DEFAULT 'new'::character varying,
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT contacts_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id),
  CONSTRAINT contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.deals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  contact_id uuid,
  title text NOT NULL,
  description text,
  stage USER-DEFINED DEFAULT 'new'::deal_stage,
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  estimated_value numeric,
  actual_value numeric,
  expected_close_date date,
  closed_date date,
  lost_reason text,
  source text,
  campaign text,
  owner_user_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT deals_pkey PRIMARY KEY (id),
  CONSTRAINT deals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT deals_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT deals_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id),
  CONSTRAINT deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.estimate_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  estimate_id uuid NOT NULL,
  catalog_item_id uuid,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_of_measure text,
  unit_price numeric,
  unit_cost numeric,
  tax_rate numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  line_total numeric,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT estimate_items_pkey PRIMARY KEY (id),
  CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id),
  CONSTRAINT estimate_items_catalog_item_id_fkey FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id)
);
CREATE TABLE public.estimates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  deal_id uuid,
  estimate_number text NOT NULL,
  status USER-DEFINED DEFAULT 'draft'::estimate_status,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  valid_until date,
  terms text,
  notes text,
  signer_name text,
  signer_email text,
  signed_at timestamp with time zone,
  signature_data text,
  pdf_url text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT estimates_pkey PRIMARY KEY (id),
  CONSTRAINT estimates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT estimates_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id),
  CONSTRAINT estimates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.files (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  owner_id uuid,
  related_type text,
  related_id uuid,
  name text NOT NULL,
  url text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  job_id uuid,
  contact_id uuid,
  invoice_number text NOT NULL,
  status USER-DEFINED DEFAULT 'draft'::invoice_status,
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  amount_due numeric DEFAULT 0,
  due_date date,
  deposit_required numeric,
  terms text,
  notes text,
  pdf_url text,
  stripe_invoice_id text,
  quickbooks_id text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT invoices_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT invoices_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.job_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'blocked'::text])),
  assignee_user_id uuid,
  required_photo boolean DEFAULT false,
  photo_urls ARRAY,
  checklist jsonb,
  completed_at timestamp with time zone,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT job_tasks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_tasks_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  deal_id uuid,
  estimate_id uuid,
  job_number text NOT NULL,
  title text NOT NULL,
  description text,
  status USER-DEFINED DEFAULT 'scheduled'::job_status,
  scheduled_start timestamp with time zone,
  scheduled_end timestamp with time zone,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  address jsonb,
  assigned_to ARRAY DEFAULT ARRAY[]::uuid[],
  crew_lead_id uuid,
  required_photos ARRAY,
  required_checklists jsonb,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT jobs_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id),
  CONSTRAINT jobs_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id),
  CONSTRAINT jobs_crew_lead_id_fkey FOREIGN KEY (crew_lead_id) REFERENCES public.profiles(id),
  CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  thread_id uuid,
  direction text CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text])),
  channel USER-DEFINED,
  from_address text,
  to_address text,
  subject text,
  body text,
  attachments jsonb,
  related_type text,
  related_id uuid,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  invoice_id uuid,
  amount numeric NOT NULL,
  method USER-DEFINED,
  processor text DEFAULT 'stripe'::text,
  processor_payment_id text,
  status text DEFAULT 'pending'::text,
  paid_at timestamp with time zone,
  fee numeric,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  sku character varying UNIQUE,
  price numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  quantity integer DEFAULT 0,
  category character varying,
  status character varying DEFAULT 'active'::character varying,
  user_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  tenant_id uuid,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  role USER-DEFINED DEFAULT 'tech'::user_role,
  permissions jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subdomain text UNIQUE,
  plan text DEFAULT 'pro'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.time_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  job_id uuid,
  user_id uuid NOT NULL,
  clock_in timestamp with time zone NOT NULL,
  clock_out timestamp with time zone,
  duration_minutes integer,
  gps_start jsonb,
  gps_end jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT time_logs_pkey PRIMARY KEY (id),
  CONSTRAINT time_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT time_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.twilio_configurations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL UNIQUE,
  account_sid text NOT NULL,
  auth_token text NOT NULL,
  phone_number text,
  phone_number_sid text,
  webhook_base_url text,
  is_active boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  capabilities jsonb DEFAULT '{"sms": true, "voice": true}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  forwarding_number text,
  CONSTRAINT twilio_configurations_pkey PRIMARY KEY (id),
  CONSTRAINT twilio_configurations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
LEFT JOIN tenants t ON t.id = p.tenant_id;