export type ChannelType = 'email' | 'sms' | 'mms' | 'voice' | 'voicemail' | 'whatsapp' | 'webchat' | 'in_app'
export type MessageDirection = 'inbound' | 'outbound' | 'internal'
export type MessageStatus =
  | 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  | 'bounced' | 'spam' | 'no-answer' | 'busy' | 'completed' | 'in-progress'
export type QueueType = 'personal' | 'team' | 'unassigned' | 'escalations' | 'sla_breach' | 'scheduled' | 'drafts' | 'spam'
export type Priority = 'urgent' | 'high' | 'normal' | 'low'

export interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company?: string
  company_id?: string
  tier?: 'vip' | 'standard' | 'basic'
  tags?: string[]
  avatar_url?: string
  timezone?: string
  preferred_channel?: ChannelType
  consent?: {
    email?: boolean
    sms?: boolean
    voice?: boolean
    whatsapp?: boolean
  }
  dnc_list?: boolean
  last_contacted?: string
  lifecycle_stage?: 'lead' | 'prospect' | 'customer' | 'churned'
}

export interface Company {
  id: string
  name: string
  domain?: string
  industry?: string
  size?: string
  revenue?: number
  logo_url?: string
  website?: string
}

export interface Deal {
  id: string
  name: string
  stage: string
  value: number
  probability: number
  close_date?: string
  contact_id?: string
  company_id?: string
  owner_id?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  priority: Priority
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignee_id?: string
  related_to?: {
    type: 'contact' | 'company' | 'deal' | 'conversation'
    id: string
  }
}

export interface Attachment {
  id: string
  filename: string
  content_type: string
  size: number
  url: string
  thumbnail_url?: string
}

export interface Message {
  id: string
  conversation_id: string
  channel: ChannelType
  direction: MessageDirection
  status: MessageStatus
  from: {
    type: 'user' | 'contact' | 'system'
    id?: string
    name?: string
    email?: string
    phone?: string
    avatar_url?: string
  }
  to: Array<{
    type: 'user' | 'contact'
    id?: string
    name?: string
    email?: string
    phone?: string
  }>
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  subject?: string
  body?: string
  html_body?: string
  preview?: string
  attachments?: Attachment[]
  metadata?: {
    thread_id?: string
    message_id?: string
    in_reply_to?: string
    references?: string[]
    headers?: Record<string, string>
    call_sid?: string
    duration_seconds?: number
    recording_url?: string
    transcript?: string
    sentiment?: 'positive' | 'neutral' | 'negative'
    language?: string
    utm_params?: Record<string, string>
    link_clicks?: Array<{ url: string; clicked_at: string }>
    opened_at?: string[]
  }
  is_read?: boolean
  is_important?: boolean
  is_archived?: boolean
  is_internal?: boolean
  tags?: string[]
  created_at: string
  updated_at?: string
  scheduled_at?: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  failed_at?: string
  failed_reason?: string
}

export interface Conversation {
  id: string
  thread_id?: string
  channel: ChannelType
  subject?: string
  contact_id?: string
  contact?: Contact
  company_id?: string
  company?: Company
  deal_id?: string
  deal?: Deal
  assignee_id?: string
  assignee?: {
    id: string
    name: string
    avatar_url?: string
    status?: 'available' | 'busy' | 'away' | 'offline'
  }
  queue?: QueueType
  priority?: Priority
  status: 'open' | 'pending' | 'resolved' | 'closed' | 'spam'
  tags?: string[]
  sla?: {
    first_response_due?: string
    next_response_due?: string
    resolution_due?: string
    breached?: boolean
    paused?: boolean
  }
  messages: Message[]
  participants?: Array<{
    type: 'user' | 'contact'
    id: string
    name: string
    role?: 'primary' | 'cc' | 'observer'
  }>
  internal_notes?: Array<{
    id: string
    content: string
    author_id: string
    author?: { name: string; avatar_url?: string }
    created_at: string
    mentions?: string[]
  }>
  first_message_at?: string
  last_message_at?: string
  last_customer_message_at?: string
  response_time_seconds?: number
  resolution_time_seconds?: number
  message_count: number
  unread_count: number
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface Queue {
  id: string
  name: string
  type: QueueType
  description?: string
  color?: string
  icon?: string
  filters?: {
    channels?: ChannelType[]
    assignees?: string[]
    tags?: string[]
    priority?: Priority[]
    sla_status?: ('on_track' | 'at_risk' | 'breached')[]
    status?: string[]
  }
  sort_by?: 'created_at' | 'updated_at' | 'priority' | 'sla_due'
  sort_order?: 'asc' | 'desc'
  count?: number
  unread_count?: number
}

export interface Template {
  id: string
  name: string
  category?: string
  channel: ChannelType
  subject?: string
  body: string
  html_body?: string
  variables?: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'date' | 'select'
    default_value?: any
    options?: string[]
  }>
  attachments?: Attachment[]
  tags?: string[]
  is_active: boolean
  usage_count?: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface Snippet {
  id: string
  shortcut: string
  content: string
  category?: string
  usage_count?: number
  created_at: string
  updated_at: string
}

export interface Macro {
  id: string
  name: string
  description?: string
  icon?: string
  actions: Array<{
    type: 'assign' | 'tag' | 'priority' | 'status' | 'reply' | 'create_task' | 'create_deal'
    params: Record<string, any>
  }>
  conditions?: Array<{
    field: string
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than'
    value: any
  }>
  is_active: boolean
  usage_count?: number
  created_at: string
  updated_at: string
}

export interface AutomationRule {
  id: string
  name: string
  description?: string
  trigger: {
    type: 'message_received' | 'conversation_created' | 'sla_breach' | 'tag_added' | 'status_changed'
    conditions: Array<{
      field: string
      operator: string
      value: any
    }>
  }
  actions: Array<{
    type: string
    params: Record<string, any>
    delay_minutes?: number
  }>
  is_active: boolean
  runs_count?: number
  last_run_at?: string
  created_at: string
  updated_at: string
}

export interface Sequence {
  id: string
  name: string
  description?: string
  steps: Array<{
    id: string
    type: 'email' | 'sms' | 'call_task' | 'wait'
    template_id?: string
    content?: string
    delay_days: number
    conditions?: Array<{
      type: 'replied' | 'opened' | 'clicked' | 'custom'
      params?: Record<string, any>
    }>
  }>
  auto_pause_on_reply: boolean
  is_active: boolean
  enrollments_count?: number
  created_at: string
  updated_at: string
}

export interface SLAPolicy {
  id: string
  name: string
  description?: string
  conditions: Array<{
    field: string
    operator: string
    value: any
  }>
  targets: {
    first_response_minutes: number
    next_response_minutes: number
    resolution_hours: number
  }
  business_hours?: {
    timezone: string
    schedule: Record<string, { start: string; end: string }>
  }
  escalation?: {
    warning_percentage: number
    escalate_to?: string[]
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CommunicationEvent {
  id: string
  type: 'message_sent' | 'message_received' | 'call_started' | 'call_ended' | 'voicemail_left' |
        'email_opened' | 'link_clicked' | 'attachment_downloaded' | 'conversation_assigned' |
        'conversation_tagged' | 'sla_breach' | 'automation_triggered'
  entity_type: 'message' | 'conversation' | 'contact'
  entity_id: string
  actor?: {
    type: 'user' | 'contact' | 'system'
    id?: string
    name?: string
  }
  data?: Record<string, any>
  created_at: string
}

export interface ComposerState {
  channel: ChannelType
  to: Array<{ type: 'contact' | 'email' | 'phone'; value: string; label?: string }>
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  subject?: string
  body: string
  html_body?: string
  attachments: Attachment[]
  template_id?: string
  variables?: Record<string, any>
  signature_id?: string
  send_later?: string
  track_opens?: boolean
  track_clicks?: boolean
  is_draft: boolean
  draft_id?: string
  reply_to_message_id?: string
}

export interface CallState {
  status: 'idle' | 'dialing' | 'ringing' | 'connected' | 'on_hold' | 'transferring' | 'ended'
  call_id?: string
  direction?: 'inbound' | 'outbound'
  from?: string
  to?: string
  duration_seconds: number
  is_recording?: boolean
  is_muted?: boolean
  participants?: Array<{
    id: string
    name?: string
    number: string
    status: 'connected' | 'on_hold' | 'disconnected'
  }>
  dtmf_queue?: string
  transfer_to?: string
  conference_id?: string
}

export interface NotificationPreferences {
  desktop: boolean
  sound: boolean
  email_digest: 'realtime' | 'hourly' | 'daily' | 'never'
  channels: {
    email: boolean
    sms: boolean
    voice: boolean
    whatsapp: boolean
    webchat: boolean
  }
  mentions: boolean
  assignments: boolean
  sla_warnings: boolean
}

export interface KeyboardShortcut {
  key: string
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
  action: string
  description: string
  scope?: 'global' | 'composer' | 'conversation' | 'list'
}

export interface SearchFilters {
  query?: string
  channels?: ChannelType[]
  status?: string[]
  assignees?: string[]
  contacts?: string[]
  companies?: string[]
  tags?: string[]
  priority?: Priority[]
  date_range?: {
    from?: string
    to?: string
  }
  has_attachments?: boolean
  is_unread?: boolean
  is_important?: boolean
  is_archived?: boolean
  sla_status?: ('on_track' | 'at_risk' | 'breached')[]
}

export interface PaginationParams {
  page: number
  limit: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}