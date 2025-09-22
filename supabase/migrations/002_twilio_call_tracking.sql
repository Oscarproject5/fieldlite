-- Add call direction type
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE call_status AS ENUM ('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled');

-- Create twilio_configurations table for multi-tenant Twilio setup
CREATE TABLE twilio_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  account_sid TEXT NOT NULL,
  auth_token TEXT NOT NULL, -- Will be encrypted at application level
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

-- Create calls table
CREATE TABLE calls (
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

-- Create call_events table for webhook tracking
CREATE TABLE call_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  twilio_callback_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_twilio_configurations_tenant ON twilio_configurations(tenant_id);
CREATE INDEX idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX idx_calls_contact_id ON calls(contact_id);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_direction ON calls(direction);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid);
CREATE INDEX idx_call_events_call_id ON call_events(call_id);

-- Enable RLS
ALTER TABLE twilio_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant isolation for twilio_configurations" ON twilio_configurations
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for calls" ON calls
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for call_events" ON call_events
  FOR ALL USING (EXISTS (
    SELECT 1 FROM calls
    WHERE calls.id = call_events.call_id
    AND calls.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

-- Add triggers for updated_at
CREATE TRIGGER update_twilio_configurations_updated_at BEFORE UPDATE ON twilio_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();