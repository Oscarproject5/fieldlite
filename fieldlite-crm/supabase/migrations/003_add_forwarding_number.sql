-- Add forwarding_number column to twilio_configurations table
ALTER TABLE twilio_configurations
ADD COLUMN IF NOT EXISTS forwarding_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN twilio_configurations.forwarding_number IS 'Phone number to forward incoming calls to';