-- Comprehensive fix for all database issues
-- Run this in Supabase SQL Editor

-- 1. Check if types exist before creating them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_direction') THEN
        CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
        CREATE TYPE call_status AS ENUM ('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled');
    END IF;
END$$;

-- 2. Create twilio_configurations table if it doesn't exist
CREATE TABLE IF NOT EXISTS twilio_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  account_sid TEXT NOT NULL,
  auth_token TEXT NOT NULL,
  phone_number TEXT,
  phone_number_sid TEXT,
  webhook_base_url TEXT,
  is_active BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  capabilities JSONB DEFAULT '{"voice": true, "sms": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- 3. Create calls table if it doesn't exist
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  twilio_call_sid TEXT UNIQUE,
  contact_id UUID REFERENCES contacts(id),
  user_id UUID REFERENCES profiles(id),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  direction call_direction NOT NULL,
  status call_status DEFAULT 'queued',
  duration_seconds INTEGER,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  recording_url TEXT,
  recording_duration INTEGER,
  transcription TEXT,
  voicemail_url TEXT,
  price DECIMAL(10,4),
  price_unit TEXT DEFAULT 'USD',
  notes TEXT,
  tags TEXT[],
  deal_id UUID REFERENCES deals(id),
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create call_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS call_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  twilio_callback_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS if not already enabled
ALTER TABLE twilio_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Tenant isolation for twilio_configurations" ON twilio_configurations;
CREATE POLICY "Tenant isolation for twilio_configurations" ON twilio_configurations
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for calls" ON calls;
CREATE POLICY "Tenant isolation for calls" ON calls
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation for call_events" ON call_events;
CREATE POLICY "Tenant isolation for call_events" ON call_events
  FOR ALL USING (EXISTS (
    SELECT 1 FROM calls
    WHERE calls.id = call_events.call_id
    AND calls.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

-- 7. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_twilio_configurations_tenant ON twilio_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_contact_id ON calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_direction ON calls(direction);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_sid ON calls(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON call_events(call_id);

-- 8. Verify the tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('twilio_configurations', 'calls', 'call_events');