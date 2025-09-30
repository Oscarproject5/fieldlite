-- Migration: 00002_crm_features
-- Description: Add CRM features including deals, activities, and notes
-- Created: 2025-01-01

-- Create deals table
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

-- Create contact activities table
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

-- Create contact notes table
CREATE TABLE public.contact_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_deals_tenant_id ON public.deals(tenant_id);
CREATE INDEX idx_deals_contact_id ON public.deals(contact_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_contact_activities_tenant_id ON public.contact_activities(tenant_id);
CREATE INDEX idx_contact_activities_contact_id ON public.contact_activities(contact_id);
CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes(contact_id);

-- Add triggers
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_contact_activities_updated_at BEFORE UPDATE ON public.contact_activities
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage deals in their tenant" ON public.deals
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage activities in their tenant" ON public.contact_activities
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage notes in their tenant" ON public.contact_notes
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );