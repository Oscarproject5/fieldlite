-- Create contact_notes table for storing notes about contacts
CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add missing columns to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS source VARCHAR(100),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Add missing columns to calls table for contact linking
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS outcome VARCHAR(100);

-- Create call_notes table for detailed call tracking
CREATE TABLE IF NOT EXISTS call_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create call_schedules table for scheduling future calls
CREATE TABLE IF NOT EXISTS call_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  title VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  reminder_sent BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add RLS policies for contact_notes
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for their contacts" ON contact_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_notes.contact_id
      AND (contacts.user_id = auth.uid() OR contacts.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create notes for their contacts" ON contact_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_notes.contact_id
      AND (contacts.user_id = auth.uid() OR contacts.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update their own notes" ON contact_notes
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own notes" ON contact_notes
  FOR DELETE USING (created_by = auth.uid());

-- Add RLS policies for call_notes
ALTER TABLE call_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call notes for their calls" ON call_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_notes.call_id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = calls.tenant_id
      )
    )
  );

CREATE POLICY "Users can create call notes" ON call_notes
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own call notes" ON call_notes
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own call notes" ON call_notes
  FOR DELETE USING (created_by = auth.uid());

-- Add RLS policies for call_schedules
ALTER TABLE call_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their scheduled calls" ON call_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = call_schedules.tenant_id
    )
  );

CREATE POLICY "Users can create scheduled calls" ON call_schedules
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their scheduled calls" ON call_schedules
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their scheduled calls" ON call_schedules
  FOR DELETE USING (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_created_by ON contact_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_calls_contact_id ON calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_notes_call_id ON call_notes(call_id);
CREATE INDEX IF NOT EXISTS idx_call_schedules_contact_id ON call_schedules(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_schedules_scheduled_at ON call_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();