-- FieldLite CRM Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for FieldLite CRM application

-- ====================================
-- EXTENSIONS
-- ====================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================
-- CUSTOM TYPES
-- ====================================

-- Contact type enum
CREATE TYPE contact_type AS ENUM ('lead', 'customer', 'vendor', 'partner');

-- Call status enum
CREATE TYPE call_status AS ENUM (
  'queued',
  'ringing',
  'in-progress',
  'completed',
  'failed',
  'busy',
  'no-answer',
  'canceled'
);

-- Call direction enum
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');

-- Deal stage enum
CREATE TYPE deal_stage AS ENUM (
  'new',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost'
);

-- Job status enum
CREATE TYPE job_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold'
);

-- Job priority enum
CREATE TYPE job_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Job type enum
CREATE TYPE job_type AS ENUM (
  'installation',
  'maintenance',
  'repair',
  'inspection',
  'consultation',
  'other'
);

-- Payment status enum
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'partial',
  'overdue',
  'cancelled'
);

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'paid',
  'partial',
  'overdue',
  'cancelled'
);

-- Estimate status enum
CREATE TYPE estimate_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired'
);

-- Payment method enum
CREATE TYPE payment_method AS ENUM (
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'ach',
  'wire',
  'other'
);

-- User role enum
CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'manager',
  'tech',
  'sales',
  'support'
);

-- Message channel enum
CREATE TYPE message_channel AS ENUM (
  'sms',
  'email',
  'voice',
  'whatsapp',
  'internal'
);

-- ====================================
-- CORE TABLES
-- ====================================

-- Tenants table (multi-tenant support)
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  subdomain text UNIQUE,
  plan text DEFAULT 'pro'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  role user_role DEFAULT 'tech'::user_role,
  permissions jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Companies table
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  industry text,
  size text,
  website text,
  phone text,
  email text,
  address jsonb,
  logo_url text,
  notes text,
  annual_revenue numeric,
  employee_count integer,
  tags text[] DEFAULT '{}'::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Contacts table
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  type contact_type DEFAULT 'lead'::contact_type,
  first_name text,
  last_name text,
  company text,
  email text,
  phone text,
  phones text[] DEFAULT '{}'::text[],
  address jsonb,
  job_title text,
  city text,
  state text,
  zip text,
  country text,
  timezone text,
  avatar_url text,
  lead_source text,
  lead_source_details jsonb,
  lifecycle_stage text CHECK (lifecycle_stage IN ('lead', 'prospect', 'customer', 'churned')),
  tier text CHECK (tier IN ('vip', 'standard', 'basic')),
  preferred_channel text CHECK (preferred_channel IN ('email', 'sms', 'voice', 'whatsapp')),
  do_not_disturb boolean DEFAULT false,
  opted_out_channels text[] DEFAULT '{}'::text[],
  language text DEFAULT 'en'::text,
  email_consent boolean DEFAULT true,
  sms_consent boolean DEFAULT true,
  voice_consent boolean DEFAULT true,
  whatsapp_consent boolean DEFAULT true,
  dnc_list boolean DEFAULT false,
  owner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status character varying DEFAULT 'new'::character varying,
  notes text,
  tags text[] DEFAULT '{}'::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  last_contacted timestamp with time zone,
  total_conversations integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ====================================
-- CRM TABLES
-- ====================================

-- Deals table
CREATE TABLE public.deals (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  stage deal_stage DEFAULT 'new'::deal_stage,
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  estimated_value numeric,
  actual_value numeric,
  expected_close_date date,
  closed_date date,
  lost_reason text,
  source text,
  campaign text,
  owner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Contact activities table
CREATE TABLE public.contact_activities (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('call', 'email', 'sms', 'meeting', 'note', 'task')),
  activity_date timestamp with time zone NOT NULL DEFAULT now(),
  subject text,
  description text,
  outcome text,
  duration integer,
  related_to_id uuid,
  related_to_type text,
  metadata jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Contact notes table
CREATE TABLE public.contact_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ====================================
-- JOB MANAGEMENT TABLES
-- ====================================

-- Jobs table
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

-- Job tasks table
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

-- ====================================
-- COMMUNICATION TABLES
-- ====================================

-- Calls table
CREATE TABLE public.calls (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  twilio_call_sid text UNIQUE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_number text NOT NULL,
  to_number text NOT NULL,
  direction call_direction NOT NULL,
  status call_status DEFAULT 'queued'::call_status,
  duration_seconds integer,
  answered_at timestamp with time zone,
  ended_at timestamp with time zone,
  recording_url text,
  recording_duration integer,
  transcription text,
  voicemail_url text,
  price numeric,
  price_unit text DEFAULT 'USD'::text,
  outcome character varying,
  notes text,
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Call events table
CREATE TABLE public.call_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id uuid REFERENCES public.calls(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  twilio_callback_source text,
  created_at timestamp with time zone DEFAULT now()
);

-- Call notes table
CREATE TABLE public.call_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid REFERENCES public.calls(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Call schedules table
CREATE TABLE public.call_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title character varying,
  notes text,
  scheduled_at timestamp with time zone NOT NULL,
  status character varying DEFAULT 'pending'::character varying,
  reminder_sent boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  thread_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  direction text CHECK (direction IN ('inbound', 'outbound')),
  channel message_channel,
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
  updated_at timestamp with time zone DEFAULT now()
);

-- ====================================
-- FINANCIAL TABLES
-- ====================================

-- Catalog items table
CREATE TABLE public.catalog_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
  updated_at timestamp with time zone DEFAULT now()
);

-- Estimates table
CREATE TABLE public.estimates (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  estimate_number text NOT NULL,
  status estimate_status DEFAULT 'draft'::estimate_status,
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
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Estimate items table
CREATE TABLE public.estimate_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
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
  updated_at timestamp with time zone DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status invoice_status DEFAULT 'draft'::invoice_status,
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
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Update jobs table to reference invoices
ALTER TABLE public.jobs ADD COLUMN invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Update jobs table to reference estimates
ALTER TABLE public.jobs ADD COLUMN estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL;

-- Payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  method payment_method,
  processor text DEFAULT 'stripe'::text,
  processor_payment_id text,
  status text DEFAULT 'pending'::text,
  paid_at timestamp with time zone,
  fee numeric,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ====================================
-- CONFIGURATION TABLES
-- ====================================

-- Twilio configurations table
CREATE TABLE public.twilio_configurations (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_sid text NOT NULL,
  auth_token text NOT NULL,
  phone_number text,
  phone_number_sid text,
  forwarding_number text,
  webhook_base_url text,
  is_active boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  capabilities jsonb DEFAULT '{"sms": true, "voice": true}'::jsonb,
  encryption_version character varying DEFAULT NULL::character varying,
  last_migration timestamp without time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ====================================
-- UTILITY TABLES
-- ====================================

-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Files table
CREATE TABLE public.files (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_type text,
  related_id uuid,
  name text NOT NULL,
  url text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Time logs table
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

-- Products table (legacy - may be replaced by catalog_items)
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name character varying NOT NULL,
  description text,
  sku character varying UNIQUE,
  price numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  quantity integer DEFAULT 0,
  category character varying,
  status character varying DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ====================================
-- INDEXES
-- ====================================

-- Tenant-based indexes for performance
CREATE INDEX idx_contacts_tenant_id ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);

CREATE INDEX idx_companies_tenant_id ON public.companies(tenant_id);

CREATE INDEX idx_deals_tenant_id ON public.deals(tenant_id);
CREATE INDEX idx_deals_contact_id ON public.deals(contact_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);

CREATE INDEX idx_jobs_tenant_id ON public.jobs(tenant_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX idx_jobs_scheduled_start ON public.jobs(scheduled_start);

CREATE INDEX idx_calls_tenant_id ON public.calls(tenant_id);
CREATE INDEX idx_calls_contact_id ON public.calls(contact_id);
CREATE INDEX idx_calls_twilio_call_sid ON public.calls(twilio_call_sid);

CREATE INDEX idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);

CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_job_id ON public.invoices(job_id);
CREATE INDEX idx_invoices_contact_id ON public.invoices(contact_id);

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ====================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (example - customize based on your needs)
-- These allow users to see only data from their tenant

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Tenant-based policies for other tables (example for contacts)
CREATE POLICY "Users can view contacts in their tenant" ON public.contacts
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts in their tenant" ON public.contacts
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their tenant" ON public.contacts
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their tenant" ON public.contacts
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ====================================
-- FUNCTIONS & TRIGGERS
-- ====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables with updated_at column
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_twilio_configurations_updated_at BEFORE UPDATE ON public.twilio_configurations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================
-- INITIAL DATA (Optional)
-- ====================================

-- Insert a default tenant if needed
-- INSERT INTO public.tenants (name, subdomain, plan)
-- VALUES ('Default Company', 'default', 'pro');