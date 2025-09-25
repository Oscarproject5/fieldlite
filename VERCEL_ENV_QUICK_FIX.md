# Quick Fix for Twilio Authentication Error

## The Problem
Your Twilio auth token was encrypted with a different key before you set ENCRYPTION_KEY. Now the system can't decrypt it.

## Immediate Fix (Choose One):

### Option 1: Add Environment Variable Override in Vercel (FASTEST)
Add this to your Vercel environment variables:
```
TWILIO_AUTH_TOKEN_a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11=ef3642ad83ba617ec4de79b20ef2c468
```

This will bypass encryption entirely for your tenant.

### Option 2: Reset Token in Database
1. Run the SQL script in Supabase SQL Editor:
```sql
UPDATE twilio_configurations
SET
    auth_token = 'ef3642ad83ba617ec4de79b20ef2c468',
    encryption_version = NULL
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
```

2. Then go to your Twilio Settings page and click "Save" to re-encrypt with the new key.

### Option 3: Use a Different Encryption Key
Change your ENCRYPTION_KEY in Vercel to:
```
ENCRYPTION_KEY=fieldlite-crm-2024-encryption-key
```
This uses the default key that was used to encrypt your original token.

## Permanent Solution
After using the quick fix:
1. Go to Settings > Twilio in your app
2. Re-enter your Twilio credentials
3. Click Save
4. This will encrypt with your new ENCRYPTION_KEY

## Verification
After applying the fix, test by:
1. Making an outbound call
2. Checking the health endpoint: https://fieldlite.vercel.app/api/encryption/health