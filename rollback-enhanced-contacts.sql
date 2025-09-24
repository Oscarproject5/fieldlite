-- Rollback Script for Enhanced Contacts Schema Migration
-- This script safely removes all changes made by the enhanced contacts migration

-- Drop triggers first
DROP TRIGGER IF EXISTS update_contact_search_vector_trigger ON contacts;
DROP TRIGGER IF EXISTS track_call_activity ON calls;
DROP TRIGGER IF EXISTS update_call_analytics_trigger ON calls;

-- Drop functions
DROP FUNCTION IF EXISTS update_contact_search_vector() CASCADE;
DROP FUNCTION IF EXISTS track_contact_activity() CASCADE;
DROP FUNCTION IF EXISTS calculate_lead_score(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_call_analytics() CASCADE;

-- Drop policies for new tables
DROP POLICY IF EXISTS "Users can view companies in their tenant" ON companies;
DROP POLICY IF EXISTS "Users can create companies in their tenant" ON companies;
DROP POLICY IF EXISTS "Users can update companies in their tenant" ON companies;
DROP POLICY IF EXISTS "Users can view call consents in their tenant" ON call_consents;
DROP POLICY IF EXISTS "Users can manage call consents in their tenant" ON call_consents;
DROP POLICY IF EXISTS "Users can view call analytics in their tenant" ON call_analytics;
DROP POLICY IF EXISTS "Users can view contact activities in their tenant" ON contact_activities;
DROP POLICY IF EXISTS "Users can create contact activities in their tenant" ON contact_activities;
DROP POLICY IF EXISTS "System can manage rate limits" ON rate_limits;

-- Drop indexes for new tables
DROP INDEX IF EXISTS idx_companies_tenant_id;
DROP INDEX IF EXISTS idx_companies_name;
DROP INDEX IF EXISTS idx_companies_tags;
DROP INDEX IF EXISTS idx_call_consents_contact;
DROP INDEX IF EXISTS idx_call_consents_phone;
DROP INDEX IF EXISTS idx_call_consents_active;
DROP INDEX IF EXISTS idx_call_analytics_tenant_date;
DROP INDEX IF EXISTS idx_call_analytics_user;
DROP INDEX IF EXISTS idx_call_analytics_contact;
DROP INDEX IF EXISTS idx_contact_activities_contact;
DROP INDEX IF EXISTS idx_contact_activities_type;
DROP INDEX IF EXISTS idx_contact_activities_date;
DROP INDEX IF EXISTS idx_rate_limits_key;
DROP INDEX IF EXISTS idx_rate_limits_last_request;

-- Drop indexes for contacts table additions
DROP INDEX IF EXISTS idx_contacts_company_id;
DROP INDEX IF EXISTS idx_contacts_lifecycle_stage;
DROP INDEX IF EXISTS idx_contacts_lead_score;
DROP INDEX IF EXISTS idx_contacts_last_contacted;
DROP INDEX IF EXISTS idx_contacts_tags;
DROP INDEX IF EXISTS idx_contacts_search;

-- Drop new tables
DROP TABLE IF EXISTS contact_activities CASCADE;
DROP TABLE IF EXISTS call_analytics CASCADE;
DROP TABLE IF EXISTS call_consents CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Remove foreign key constraint on contacts.company_id before dropping companies
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_company_id_fkey;

-- Drop companies table
DROP TABLE IF EXISTS companies CASCADE;

-- Remove new columns from contacts table
ALTER TABLE contacts
DROP COLUMN IF EXISTS company_id,
DROP COLUMN IF EXISTS job_title,
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS linkedin_url,
DROP COLUMN IF EXISTS preferred_contact_method,
DROP COLUMN IF EXISTS timezone,
DROP COLUMN IF EXISTS last_contacted_at,
DROP COLUMN IF EXISTS contact_frequency,
DROP COLUMN IF EXISTS lead_score,
DROP COLUMN IF EXISTS lifecycle_stage,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS custom_fields,
DROP COLUMN IF EXISTS search_vector;

-- Verify cleanup
DO $$
BEGIN
  RAISE NOTICE 'Rollback completed successfully';
  RAISE NOTICE 'The following objects have been removed:';
  RAISE NOTICE '- Tables: companies, call_consents, call_analytics, contact_activities, rate_limits';
  RAISE NOTICE '- Contact columns: company_id, job_title, department, linkedin_url, etc.';
  RAISE NOTICE '- All associated indexes, functions, triggers, and policies';
END $$;