-- Verify Twilio Configuration Status
-- Run this after re-saving your Twilio settings to confirm encryption

SELECT
    tenant_id,
    account_sid,
    phone_number,
    -- Show first 20 chars of auth_token to verify it's encrypted
    SUBSTRING(auth_token, 1, 20) as auth_token_preview,
    -- Check if it starts with v2: (new encryption)
    CASE
        WHEN auth_token LIKE 'v2:%' THEN '✅ Enhanced (PBKDF2)'
        WHEN auth_token LIKE '%:%:%' THEN '⚠️ Legacy encryption'
        WHEN LENGTH(auth_token) = 32 THEN '❌ Plaintext - needs encryption'
        ELSE '❓ Unknown format'
    END as encryption_status,
    encryption_version,
    last_migration,
    is_active,
    updated_at
FROM twilio_configurations
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- If you see "✅ Enhanced (PBKDF2)", your encryption is working correctly!
-- If you see "❌ Plaintext", you need to re-save your Twilio settings