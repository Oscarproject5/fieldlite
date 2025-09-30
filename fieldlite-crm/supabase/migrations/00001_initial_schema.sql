-- Migration: 00001_initial_schema
-- Description: Initial database schema setup for FieldLite CRM
-- Created: 2025-01-01

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE contact_type AS ENUM ('lead', 'customer', 'vendor', 'partner');
CREATE TYPE call_status AS ENUM ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled');
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE deal_stage AS ENUM ('new', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE job_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold');
CREATE TYPE job_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE job_type AS ENUM ('installation', 'maintenance', 'repair', 'inspection', 'consultation', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'overdue', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled');
CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired');
CREATE TYPE payment_method AS ENUM ('cash', 'check', 'credit_card', 'debit_card', 'ach', 'wire', 'other');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'tech', 'sales', 'support');
CREATE TYPE message_channel AS ENUM ('sms', 'email', 'voice', 'whatsapp', 'internal');

-- Create tenants table
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  subdomain text UNIQUE,
  plan text DEFAULT 'pro'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create profiles table
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

-- Create companies table
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

-- Create contacts table
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

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX idx_contacts_tenant_id ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_companies_tenant_id ON public.companies(tenant_id);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view contacts in their tenant" ON public.contacts
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );