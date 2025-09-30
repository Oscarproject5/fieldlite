-- Migration: 00004_communication
-- Description: Add communication tables for calls, messages, and Twilio integration
-- Created: 2025-01-01

-- Create calls table
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

-- Create call events table
CREATE TABLE public.call_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id uuid REFERENCES public.calls(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  twilio_callback_source text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create call notes table
CREATE TABLE public.call_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid REFERENCES public.calls(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create call schedules table
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

-- Create messages table
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

-- Create Twilio configurations table
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

-- Add indexes
CREATE INDEX idx_calls_tenant_id ON public.calls(tenant_id);
CREATE INDEX idx_calls_contact_id ON public.calls(contact_id);
CREATE INDEX idx_calls_twilio_call_sid ON public.calls(twilio_call_sid);
CREATE INDEX idx_call_events_call_id ON public.call_events(call_id);
CREATE INDEX idx_call_notes_call_id ON public.call_notes(call_id);
CREATE INDEX idx_call_schedules_tenant_id ON public.call_schedules(tenant_id);
CREATE INDEX idx_call_schedules_contact_id ON public.call_schedules(contact_id);
CREATE INDEX idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);

-- Add triggers
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_twilio_configurations_updated_at BEFORE UPDATE ON public.twilio_configurations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage calls in their tenant" ON public.calls
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage call events in their tenant" ON public.call_events
  FOR ALL USING (
    call_id IN (
      SELECT id FROM public.calls WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage call notes in their tenant" ON public.call_notes
  FOR ALL USING (
    call_id IN (
      SELECT id FROM public.calls WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage call schedules in their tenant" ON public.call_schedules
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage messages in their tenant" ON public.messages
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage Twilio config in their tenant" ON public.twilio_configurations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );