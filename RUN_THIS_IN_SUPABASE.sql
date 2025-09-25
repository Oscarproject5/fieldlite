-- IMPORTANT: Run this SQL in your Supabase SQL Editor to fix the "No tenant found" error

-- Step 1: Create a tenant (if none exists)
INSERT INTO tenants (name, subdomain, plan, settings)
SELECT 'My Company', 'mycompany', 'pro', '{"initial_setup": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM tenants);

-- Step 2: Assign the tenant to all profiles that don't have one
UPDATE profiles
SET tenant_id = (SELECT id FROM tenants LIMIT 1)
WHERE tenant_id IS NULL;

-- Step 3: Verify the fix worked
SELECT
    p.id,
    p.email,
    p.tenant_id,
    t.name as tenant_name
FROM profiles p
LEFT JOIN tenants t ON t.id = p.tenant_id;