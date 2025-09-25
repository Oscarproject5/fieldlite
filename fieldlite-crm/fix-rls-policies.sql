-- Fix RLS policies for Twilio tables
-- The 406 error happens when RLS blocks access

-- 1. Temporarily disable RLS to test
ALTER TABLE twilio_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_events DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Tenant isolation for twilio_configurations" ON twilio_configurations;
DROP POLICY IF EXISTS "Tenant isolation for calls" ON calls;
DROP POLICY IF EXISTS "Tenant isolation for call_events" ON call_events;

-- 3. Re-enable RLS
ALTER TABLE twilio_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;

-- 4. Create more permissive policies for authenticated users
-- Allow authenticated users to access twilio_configurations for their tenant
CREATE POLICY "Users can view their tenant twilio config" ON twilio_configurations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert twilio config for their tenant" ON twilio_configurations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their tenant twilio config" ON twilio_configurations
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant twilio config" ON twilio_configurations
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 5. Create policies for calls table
CREATE POLICY "Users can view calls for their tenant" ON calls
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calls for their tenant" ON calls
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update calls for their tenant" ON calls
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 6. Create policies for call_events
CREATE POLICY "Users can view call events for their tenant" ON call_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_events.call_id
      AND calls.tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert call events for their tenant" ON call_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_events.call_id
      AND calls.tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- 7. Test the access - this should return empty array if no config exists yet
SELECT * FROM twilio_configurations
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;