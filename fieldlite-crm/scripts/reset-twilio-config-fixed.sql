-- Reset Twilio Configuration for tenant
-- This will update the encrypted token to plaintext so it can be re-encrypted with the new key

-- First, check current configuration
SELECT
    tenant_id,
    account_sid,
    phone_number,
    auth_token,
    is_active,
    created_at,
    updated_at
FROM twilio_configurations
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Update with plaintext token temporarily
-- The app will re-encrypt it with the correct key when you save settings
UPDATE twilio_configurations
SET
    auth_token = 'ef3642ad83ba617ec4de79b20ef2c468',
    updated_at = NOW()
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Verify the update
SELECT
    tenant_id,
    account_sid,
    phone_number,
    auth_token,
    is_active
FROM twilio_configurations
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';