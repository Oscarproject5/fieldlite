-- Migration: Create Conversations Table and Update Messages
-- This migration creates the missing conversations table that the frontend expects
-- and updates the messages table to properly reference it

-- Create conversation_status enum
CREATE TYPE conversation_status AS ENUM (
  'open',
  'pending',
  'resolved',
  'closed',
  'archived',
  'snoozed'
);

-- Create queue_type enum
CREATE TYPE queue_type AS ENUM (
  'personal',
  'team',
  'unassigned',
  'escalations',
  'sla_breach',
  'scheduled',
  'drafts',
  'spam'
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact information
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Primary channel for this conversation
  channel message_channel NOT NULL DEFAULT 'sms',

  -- Conversation metadata
  subject TEXT,
  status conversation_status NOT NULL DEFAULT 'open',
  queue queue_type NOT NULL DEFAULT 'unassigned',
  priority priority NOT NULL DEFAULT 'normal',

  -- Assignment
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Timing
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,

  -- Counters
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,

  -- Flags
  is_starred BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  is_spam BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,

  -- Tags and metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- SLA tracking
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT conversations_tenant_id_idx CHECK (tenant_id IS NOT NULL)
);

-- Create indexes for conversations
CREATE INDEX conversations_tenant_id_idx ON conversations(tenant_id);
CREATE INDEX conversations_contact_id_idx ON conversations(contact_id);
CREATE INDEX conversations_assignee_id_idx ON conversations(assignee_id);
CREATE INDEX conversations_status_idx ON conversations(status);
CREATE INDEX conversations_queue_idx ON conversations(queue);
CREATE INDEX conversations_priority_idx ON conversations(priority);
CREATE INDEX conversations_channel_idx ON conversations(channel);
CREATE INDEX conversations_last_message_at_idx ON conversations(last_message_at DESC);
CREATE INDEX conversations_sla_due_at_idx ON conversations(sla_due_at) WHERE sla_due_at IS NOT NULL;
CREATE INDEX conversations_tags_idx ON conversations USING GIN(tags);
CREATE INDEX conversations_metadata_idx ON conversations USING GIN(metadata);

-- Create composite indexes for common queries
CREATE INDEX conversations_tenant_status_idx ON conversations(tenant_id, status);
CREATE INDEX conversations_tenant_queue_idx ON conversations(tenant_id, queue);
CREATE INDEX conversations_tenant_assignee_idx ON conversations(tenant_id, assignee_id);
CREATE INDEX conversations_unread_idx ON conversations(tenant_id, unread_count) WHERE unread_count > 0;

-- Full-text search index on subject
CREATE INDEX conversations_subject_search_idx ON conversations USING GIN(to_tsvector('english', COALESCE(subject, '')));

-- Add conversation_id to messages table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
    CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their tenant's conversations"
  ON conversations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations for their tenant"
  ON conversations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their tenant's conversations"
  ON conversations FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tenant's conversations"
  ON conversations FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Function to update conversation counters when messages are added
CREATE OR REPLACE FUNCTION update_conversation_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      first_message_at = COALESCE(first_message_at, NEW.created_at),
      unread_count = CASE
        WHEN NEW.direction = 'inbound' THEN unread_count + 1
        ELSE unread_count
      END,
      has_attachments = CASE
        WHEN NEW.has_attachments THEN TRUE
        ELSE has_attachments
      END
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations
    SET
      message_count = GREATEST(message_count - 1, 0),
      unread_count = CASE
        WHEN OLD.direction = 'inbound' AND OLD.status != 'read'
        THEN GREATEST(unread_count - 1, 0)
        ELSE unread_count
      END
    WHERE id = OLD.conversation_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation counters
CREATE TRIGGER update_conversation_counters_trigger
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_counters();

-- Function to mark conversation messages as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(conv_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET status = 'read'
  WHERE conversation_id = conv_id
    AND direction = 'inbound'
    AND status != 'read';

  UPDATE conversations
  SET unread_count = 0
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION mark_conversation_as_read(UUID) TO authenticated;

-- Data migration: Create conversations from existing messages
-- Group messages by contact and channel, create conversation entries
DO $$
DECLARE
  msg_record RECORD;
  conv_id UUID;
BEGIN
  -- Only run if messages exist but no conversations
  IF EXISTS (SELECT 1 FROM messages LIMIT 1) AND NOT EXISTS (SELECT 1 FROM conversations LIMIT 1) THEN

    -- Create conversations from grouped messages
    FOR msg_record IN
      SELECT
        tenant_id,
        channel,
        from_number,
        from_email,
        MIN(created_at) as first_at,
        MAX(created_at) as last_at,
        COUNT(*) as msg_count
      FROM messages
      GROUP BY tenant_id, channel, from_number, from_email
    LOOP
      -- Create conversation
      INSERT INTO conversations (
        tenant_id,
        channel,
        contact_phone,
        contact_email,
        status,
        queue,
        first_message_at,
        last_message_at,
        message_count,
        created_at
      ) VALUES (
        msg_record.tenant_id,
        msg_record.channel,
        msg_record.from_number,
        msg_record.from_email,
        'open',
        'unassigned',
        msg_record.first_at,
        msg_record.last_at,
        msg_record.msg_count,
        msg_record.first_at
      )
      RETURNING id INTO conv_id;

      -- Link messages to conversation
      UPDATE messages
      SET conversation_id = conv_id
      WHERE tenant_id = msg_record.tenant_id
        AND channel = msg_record.channel
        AND (from_number = msg_record.from_number OR from_email = msg_record.from_email);

    END LOOP;

    RAISE NOTICE 'Migrated messages to conversations';
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE conversations IS 'Central table for tracking communication threads across all channels (SMS, email, voice)';
COMMENT ON COLUMN conversations.queue IS 'Which queue this conversation belongs to for routing and organization';
COMMENT ON COLUMN conversations.sla_due_at IS 'When the SLA for this conversation expires';
COMMENT ON COLUMN conversations.sla_breached IS 'Whether the SLA has been breached for this conversation';
COMMENT ON COLUMN conversations.metadata IS 'Flexible JSON field for storing channel-specific or custom data';