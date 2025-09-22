-- Create a default tenant if it doesn't exist
INSERT INTO tenants (id, name, subdomain, plan, settings)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Default Company',
  'default',
  'pro',
  '{"initial_setup": true}'::jsonb
)
ON CONFLICT (subdomain) DO NOTHING;

-- Update any profiles that don't have a tenant_id to use the default tenant
UPDATE profiles
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL for future inserts (optional)
-- ALTER TABLE profiles ALTER COLUMN tenant_id SET NOT NULL;

-- Create a function to automatically assign default tenant to new profiles
CREATE OR REPLACE FUNCTION assign_default_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    -- Check if default tenant exists, if not create it
    INSERT INTO tenants (id, name, subdomain, plan)
    VALUES (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
      'Default Company',
      'default',
      'pro'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Assign the default tenant
    NEW.tenant_id := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign tenant to new profiles
DROP TRIGGER IF EXISTS assign_tenant_on_profile_create ON profiles;
CREATE TRIGGER assign_tenant_on_profile_create
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_tenant();