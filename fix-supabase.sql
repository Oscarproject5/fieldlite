-- Fix Supabase profiles and tenant setup

-- 1. Create a default tenant if it doesn't exist
INSERT INTO tenants (id, name, subdomain, plan, settings)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Default Company',
  'default',
  'pro',
  '{"initial_setup": true}'::jsonb
)
ON CONFLICT (subdomain) DO NOTHING;

-- 2. Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile with default tenant
  INSERT INTO public.profiles (id, email, tenant_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Insert profiles for existing users that don't have one
INSERT INTO profiles (id, email, tenant_id)
SELECT
  u.id,
  u.email,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 6. Fix RLS policy for profiles to allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 7. Create policy to allow profile creation during signup
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 8. Create policy for anonymous users to check if profile exists (for signup flow)
CREATE POLICY "Authenticated users can check profile existence" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'role' = 'authenticated');