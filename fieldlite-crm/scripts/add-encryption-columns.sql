-- Add encryption tracking columns to twilio_configurations table
-- These columns help track encryption version and migration status

-- Add encryption_version column if it doesn't exist
ALTER TABLE twilio_configurations
ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(10) DEFAULT NULL;

-- Add last_migration column if it doesn't exist
ALTER TABLE twilio_configurations
ADD COLUMN IF NOT EXISTS last_migration TIMESTAMP DEFAULT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN twilio_configurations.encryption_version IS 'Tracks the encryption version used (v2 for PBKDF2, NULL for legacy)';
COMMENT ON COLUMN twilio_configurations.last_migration IS 'Timestamp of last encryption migration';

-- Verify the columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'twilio_configurations'
ORDER BY ordinal_position;