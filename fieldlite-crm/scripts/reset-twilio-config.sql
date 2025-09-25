-- Reset Twilio Configuration for tenant
-- This will clear the encrypted token and allow you to re-save with the new encryption key

-- First, check current configuration
SELECT
    tenant_id,
    account_sid,
    phone_number,
    auth_token,
    encryption_version,
    last_migration
FROM twilio_configurations
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Update with plaintext token temporarily
-- The app will re-encrypt it with the correct key when you save settings
UPDATE twilio_configurations
SET
    auth_token = 'ef3642ad83ba617ec4de79b20ef2c468',
    encryption_version = NULL,
    last_migration = NULL
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Verify the update
SELECT
    tenant_id,
    account_sid,
    phone_number,
    auth_token,
    encryption_version,
    is_active
FROM twilio_configurations
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';