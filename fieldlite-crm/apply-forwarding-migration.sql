-- Apply this migration to your Supabase database
-- You can run this in the Supabase SQL editor

-- Add forwarding_number column to twilio_configurations table
ALTER TABLE twilio_configurations
ADD COLUMN IF NOT EXISTS forwarding_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN twilio_configurations.forwarding_number IS 'Phone number to forward incoming calls to';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'twilio_configurations'
AND column_name = 'forwarding_number';