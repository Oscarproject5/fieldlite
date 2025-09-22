# Database Migration Instructions for Forwarding Number Feature

## Problem
The error "Failed to update forwarding number" occurs because the database is missing the `forwarding_number` column in the `twilio_configurations` table.

## Solution

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the following SQL:

```sql
-- Add forwarding_number column to twilio_configurations table
ALTER TABLE twilio_configurations
ADD COLUMN IF NOT EXISTS forwarding_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN twilio_configurations.forwarding_number IS 'Phone number to forward incoming calls to';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'twilio_configurations'
AND column_name = 'forwarding_number';
```

4. Click "Run" to execute the migration
5. You should see a result showing the new column has been added

### Method 2: Using Supabase CLI (Alternative)

If you have Supabase CLI installed:

```bash
# From the fieldlite-crm directory
supabase db push
```

This will apply all pending migrations including `003_add_forwarding_number.sql`

## Verification

After applying the migration:

1. Go back to your application
2. Navigate to Settings > Twilio Configuration > Settings tab
3. Enter your forwarding number (e.g., +19565591695)
4. Click "Save Forwarding Number"
5. The number should save successfully

## Important Notes

- **Twilio Setup Required**: You must complete the Twilio setup in the Setup tab first before you can configure a forwarding number
- **Phone Number Format**: Include the country code (e.g., +1 for US numbers)
- **Database Column**: The migration adds a `forwarding_number` column to store this data per tenant

## Troubleshooting

If you still see errors after applying the migration:

1. Check that your Twilio configuration is active (Setup tab should show "Twilio is currently configured and active")
2. Ensure you're logged in with an owner or manager role
3. Check the browser console for any additional error messages
4. Verify the migration was applied by running the verification query above

## Files Modified

- `app/api/twilio/configure/route.ts` - Added forwarding number support
- `app/api/twilio/voice/answer/route.ts` - Uses forwarding number for call routing
- `app/settings/twilio/page.tsx` - Added UI for forwarding number configuration
- `supabase/migrations/003_add_forwarding_number.sql` - Database migration