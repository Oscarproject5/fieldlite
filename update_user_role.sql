-- Update user role to owner
UPDATE public.profiles
SET role = 'owner'
WHERE id = 'c4c9f6ed-e003-4094-bfde-9ad25d5a3163';

-- Verify the update
SELECT id, email, full_name, role, tenant_id
FROM public.profiles
WHERE id = 'c4c9f6ed-e003-4094-bfde-9ad25d5a3163';