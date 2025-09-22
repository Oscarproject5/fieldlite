-- This script fixes the "No tenant found" error by ensuring all users have a tenant

-- Step 1: Create a default tenant if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
        INSERT INTO tenants (name, subdomain, plan, settings)
        VALUES (
            'My Company',
            'mycompany',
            'pro',
            '{"initial_setup": true}'::jsonb
        );
        RAISE NOTICE 'Created default tenant';
    END IF;
END $$;

-- Step 2: Get the first tenant's ID and update all profiles without a tenant
UPDATE profiles
SET tenant_id = (SELECT id FROM tenants LIMIT 1)
WHERE tenant_id IS NULL;

-- Step 3: Verify the fix
SELECT
    p.id as profile_id,
    p.email,
    p.tenant_id,
    t.name as tenant_name
FROM profiles p
LEFT JOIN tenants t ON t.id = p.tenant_id;