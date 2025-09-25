-- Check if your token is now encrypted with v2 (PBKDF2)
SELECT
    tenant_id,
    SUBSTRING(auth_token, 1, 30) as token_preview,
    CASE
        WHEN auth_token LIKE 'v2:%' THEN '✅ SECURED with Enhanced Encryption!'
        WHEN auth_token LIKE '%:%:%' THEN '⚠️ Legacy encryption'
        WHEN LENGTH(auth_token) = 32 THEN '❌ Still plaintext'
        ELSE '❓ Unknown'
    END as status,
    encryption_version,
    updated_at
FROM twilio_configurations
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- You should see "✅ SECURED with Enhanced Encryption!" now!