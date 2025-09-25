-- Add profile for existing user
-- User ID: c4c9f6ed-e003-4094-bfde-9ad25d5a3163
-- Email: jaatransport01@gmail.com

-- First ensure the default tenant exists
INSERT INTO tenants (id, name, subdomain, plan, settings)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Default Company',
  'default',
  'pro',
  '{"initial_setup": true}'::jsonb
)
ON CONFLICT (subdomain) DO NOTHING;

-- Create profile for the specific user
INSERT INTO profiles (id, email, tenant_id, full_name, role)
VALUES (
  'c4c9f6ed-e003-4094-bfde-9ad25d5a3163'::uuid,
  'jaatransport01@gmail.com',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Jase Aguilera',
  'owner'
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Verify the profile was created
SELECT * FROM profiles WHERE id = 'c4c9f6ed-e003-4094-bfde-9ad25d5a3163'::uuid;