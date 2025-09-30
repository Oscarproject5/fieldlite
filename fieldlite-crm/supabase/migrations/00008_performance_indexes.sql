-- Migration: Performance Indexes
-- Creates indexes to optimize query performance across the application
-- Focuses on common query patterns and N+1 query prevention

-- ============================================================================
-- MESSAGES TABLE INDEXES
-- ============================================================================

-- Composite indexes for common filtering patterns
CREATE INDEX IF NOT EXISTS messages_tenant_channel_idx
  ON messages(tenant_id, channel);

CREATE INDEX IF NOT EXISTS messages_tenant_direction_idx
  ON messages(tenant_id, direction);

CREATE INDEX IF NOT EXISTS messages_tenant_status_idx
  ON messages(tenant_id, status);

CREATE INDEX IF NOT EXISTS messages_tenant_created_idx
  ON messages(tenant_id, created_at DESC);

-- Optimize unread message queries
CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON messages(tenant_id, status)
  WHERE status = 'pending' OR status = 'delivered';

-- Optimize scheduled message queries
CREATE INDEX IF NOT EXISTS messages_scheduled_idx
  ON messages(scheduled_for)
  WHERE scheduled_for IS NOT NULL AND status = 'scheduled';

-- Phone number lookups (for conversations grouping)
CREATE INDEX IF NOT EXISTS messages_from_number_idx
  ON messages(tenant_id, from_number)
  WHERE from_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_to_number_idx
  ON messages(tenant_id, to_number)
  WHERE to_number IS NOT NULL;

-- Email lookups
CREATE INDEX IF NOT EXISTS messages_from_email_idx
  ON messages(tenant_id, from_email)
  WHERE from_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_to_email_idx
  ON messages(tenant_id, to_email)
  WHERE to_email IS NOT NULL;

-- Full-text search on message body
CREATE INDEX IF NOT EXISTS messages_body_search_idx
  ON messages USING GIN(to_tsvector('english', COALESCE(body, '')));

-- Optimize attachment queries
CREATE INDEX IF NOT EXISTS messages_attachments_idx
  ON messages USING GIN(attachments)
  WHERE attachments IS NOT NULL AND jsonb_array_length(attachments) > 0;

-- External ID lookups (Twilio, Resend message IDs)
CREATE INDEX IF NOT EXISTS messages_external_id_idx
  ON messages(external_id)
  WHERE external_id IS NOT NULL;

-- ============================================================================
-- CONTACTS TABLE INDEXES
-- ============================================================================

-- Basic tenant scoped queries
CREATE INDEX IF NOT EXISTS contacts_tenant_id_idx
  ON contacts(tenant_id);

-- Name searches (case-insensitive)
CREATE INDEX IF NOT EXISTS contacts_name_idx
  ON contacts(tenant_id, LOWER(name));

CREATE INDEX IF NOT EXISTS contacts_company_idx
  ON contacts(tenant_id, LOWER(company))
  WHERE company IS NOT NULL;

-- Phone number lookups (critical for SMS routing)
CREATE INDEX IF NOT EXISTS contacts_phone_idx
  ON contacts(tenant_id, phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS contacts_mobile_idx
  ON contacts(tenant_id, mobile)
  WHERE mobile IS NOT NULL;

-- Email lookups (critical for email routing)
CREATE INDEX IF NOT EXISTS contacts_email_idx
  ON contacts(tenant_id, LOWER(email))
  WHERE email IS NOT NULL;

-- Full-text search on contact details
CREATE INDEX IF NOT EXISTS contacts_search_idx
  ON contacts USING GIN(
    to_tsvector('english',
      COALESCE(name, '') || ' ' ||
      COALESCE(email, '') || ' ' ||
      COALESCE(company, '') || ' ' ||
      COALESCE(notes, '')
    )
  );

-- Tags for filtering
CREATE INDEX IF NOT EXISTS contacts_tags_idx
  ON contacts USING GIN(tags);

-- Custom fields search
CREATE INDEX IF NOT EXISTS contacts_custom_fields_idx
  ON contacts USING GIN(custom_fields);

-- ============================================================================
-- JOBS TABLE INDEXES
-- ============================================================================

-- Tenant scoped queries
CREATE INDEX IF NOT EXISTS jobs_tenant_id_idx
  ON jobs(tenant_id);

-- Status and priority filtering
CREATE INDEX IF NOT EXISTS jobs_status_idx
  ON jobs(tenant_id, status);

CREATE INDEX IF NOT EXISTS jobs_priority_idx
  ON jobs(tenant_id, priority)
  WHERE priority IN ('high', 'urgent');

-- Assignment queries
CREATE INDEX IF NOT EXISTS jobs_assigned_to_idx
  ON jobs(tenant_id, assigned_to);

-- Customer lookups
CREATE INDEX IF NOT EXISTS jobs_customer_id_idx
  ON jobs(tenant_id, customer_id);

-- Date range queries
CREATE INDEX IF NOT EXISTS jobs_scheduled_date_idx
  ON jobs(tenant_id, scheduled_date);

CREATE INDEX IF NOT EXISTS jobs_completed_date_idx
  ON jobs(tenant_id, completed_date)
  WHERE completed_date IS NOT NULL;

-- Composite index for dashboard queries (open jobs by assignee)
CREATE INDEX IF NOT EXISTS jobs_open_assigned_idx
  ON jobs(tenant_id, assigned_to, status)
  WHERE status IN ('pending', 'in_progress', 'scheduled');

-- Location-based queries (if we add geospatial features later)
CREATE INDEX IF NOT EXISTS jobs_location_idx
  ON jobs(tenant_id, service_address);

-- Full-text search on job details
CREATE INDEX IF NOT EXISTS jobs_search_idx
  ON jobs USING GIN(
    to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(service_address, '')
    )
  );

-- ============================================================================
-- CALL_LOGS TABLE INDEXES
-- ============================================================================

-- Tenant scoped queries
CREATE INDEX IF NOT EXISTS call_logs_tenant_id_idx
  ON call_logs(tenant_id);

-- Phone number lookups
CREATE INDEX IF NOT EXISTS call_logs_from_idx
  ON call_logs(tenant_id, from_number);

CREATE INDEX IF NOT EXISTS call_logs_to_idx
  ON call_logs(tenant_id, to_number);

-- Direction and status filtering
CREATE INDEX IF NOT EXISTS call_logs_direction_idx
  ON call_logs(tenant_id, direction);

CREATE INDEX IF NOT EXISTS call_logs_status_idx
  ON call_logs(tenant_id, status);

-- Date range queries
CREATE INDEX IF NOT EXISTS call_logs_created_idx
  ON call_logs(tenant_id, created_at DESC);

-- Duration analysis
CREATE INDEX IF NOT EXISTS call_logs_duration_idx
  ON call_logs(tenant_id, duration)
  WHERE duration IS NOT NULL;

-- Recording lookups
CREATE INDEX IF NOT EXISTS call_logs_recording_idx
  ON call_logs(recording_url)
  WHERE recording_url IS NOT NULL;

-- External ID lookups (Twilio Call SIDs)
CREATE INDEX IF NOT EXISTS call_logs_call_sid_idx
  ON call_logs(call_sid);

-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================

-- Tenant queries (for multi-user features)
CREATE INDEX IF NOT EXISTS profiles_tenant_id_idx
  ON profiles(tenant_id);

-- Email lookups (for invitations, auth)
CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON profiles(LOWER(email));

-- Role-based queries
CREATE INDEX IF NOT EXISTS profiles_role_idx
  ON profiles(tenant_id, role);

-- Active user queries
CREATE INDEX IF NOT EXISTS profiles_active_idx
  ON profiles(tenant_id)
  WHERE NOT is_suspended;

-- ============================================================================
-- ACTIVITY_LOGS TABLE INDEXES (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    -- Tenant scoped queries
    CREATE INDEX IF NOT EXISTS activity_logs_tenant_id_idx
      ON activity_logs(tenant_id);

    -- Entity lookups
    CREATE INDEX IF NOT EXISTS activity_logs_entity_idx
      ON activity_logs(tenant_id, entity_type, entity_id);

    -- User activity
    CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx
      ON activity_logs(tenant_id, user_id);

    -- Action type filtering
    CREATE INDEX IF NOT EXISTS activity_logs_action_idx
      ON activity_logs(tenant_id, action);

    -- Time-based queries
    CREATE INDEX IF NOT EXISTS activity_logs_created_idx
      ON activity_logs(tenant_id, created_at DESC);

    -- Composite index for audit trails
    CREATE INDEX IF NOT EXISTS activity_logs_audit_idx
      ON activity_logs(tenant_id, entity_type, entity_id, created_at DESC);
  END IF;
END $$;

-- ============================================================================
-- TENANT_SETTINGS TABLE INDEXES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_settings') THEN
    -- Quick tenant lookups
    CREATE UNIQUE INDEX IF NOT EXISTS tenant_settings_tenant_id_idx
      ON tenant_settings(tenant_id);

    -- Feature flag queries
    CREATE INDEX IF NOT EXISTS tenant_settings_features_idx
      ON tenant_settings USING GIN(features);
  END IF;
END $$;

-- ============================================================================
-- ANALYTICS / REPORTING INDEXES
-- ============================================================================

-- Message volume analytics (by day)
CREATE INDEX IF NOT EXISTS messages_analytics_day_idx
  ON messages(tenant_id, DATE(created_at), channel);

-- Call volume analytics (by day)
CREATE INDEX IF NOT EXISTS call_logs_analytics_day_idx
  ON call_logs(tenant_id, DATE(created_at), direction);

-- Job completion analytics
CREATE INDEX IF NOT EXISTS jobs_analytics_completion_idx
  ON jobs(tenant_id, DATE(completed_date), status)
  WHERE completed_date IS NOT NULL;

-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Update table statistics for query planner optimization
ANALYZE messages;
ANALYZE conversations;
ANALYZE contacts;
ANALYZE jobs;
ANALYZE call_logs;
ANALYZE profiles;

-- Comments for documentation
COMMENT ON INDEX messages_body_search_idx IS 'Full-text search index for message content using PostgreSQL GIN index';
COMMENT ON INDEX contacts_search_idx IS 'Full-text search index for contact details including name, email, company, and notes';
COMMENT ON INDEX jobs_search_idx IS 'Full-text search index for job title, description, and service address';
COMMENT ON INDEX messages_unread_idx IS 'Partial index for efficient unread message queries';
COMMENT ON INDEX messages_scheduled_idx IS 'Partial index for scheduled message delivery queries';